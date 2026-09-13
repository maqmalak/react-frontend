#!/usr/bin/env bash
#
# install.sh — bare-metal (no Docker) production installer for this project's
# ERPNext/Frappe stack: site "demo", Frappe v16 backend, the custom
# `apparel` app, the `apparel-erp-frontend` React app served via nginx, and
# every app this project actually runs (matching apps.txt / apps.json).
#
# Verified against this repo before writing (see conversation): Frappe v16
# requires Python ==3.14.* and Node >=24 — neither is in Ubuntu's default
# repos, so both are installed from their upstream sources below. App
# branches were read from this repo's own apps.json (the authoritative
# build manifest), not guessed.
#
# Run as root on a fresh Ubuntu 22.04/24.04 server:
#   sudo bash install.sh
#
# Idempotency: safe to re-run — steps that already succeeded (user exists,
# bench dir exists, app already fetched, site already exists) are skipped
# rather than failing.

set -euo pipefail

# ============================================================== Configuration
# Override any of these via environment variables before running, e.g.:
#   DOMAIN=crm.example.com SITE_NAME=demo bash install.sh
FRAPPE_USER="${FRAPPE_USER:-maqmalak}"
BENCH_DIR="${BENCH_DIR:-/home/${FRAPPE_USER}/frappe-bench}"
SITE_NAME="${SITE_NAME:-demo}"
DOMAIN="${DOMAIN:-micromaxonline.uk}"          # server_name in nginx — real public FQDN
FRAPPE_BRANCH="${FRAPPE_BRANCH:-version-16}"
PYTHON_VERSION="${PYTHON_VERSION:-3.14}"
NODE_MAJOR="${NODE_MAJOR:-24}"

FRONTEND_REPO="${FRONTEND_REPO:-https://github.com/maqmalak/apparel-erp-frontend.git}"
FRONTEND_DIR="${FRONTEND_DIR:-/home/${FRAPPE_USER}/react_frontend}"
APPAREL_REPO="${APPAREL_REPO:-https://github.com/maqmalak/apparel.git}"

# Secrets — generated if not supplied, printed once at the end. Pass your
# own via env vars if you need to know them in advance:
#   MARIADB_ROOT_PASSWORD=... ADMIN_PASSWORD=... bash install.sh
MARIADB_ROOT_PASSWORD="${MARIADB_ROOT_PASSWORD:-$(openssl rand -base64 18)}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-$(openssl rand -base64 18)}"

# Apps to install, in an order that respects real dependencies (apparel's
# custom fields target CRM Lead + core ERPNext doctypes, so it must come
# last; hrms needs erpnext+payments already installed). Branches copied
# verbatim from this repo's apps.json — the one exception is erpnext, which
# isn't in that file because the Docker base image already bundles it; here
# it's fetched explicitly on the same version-16 track as frappe/hrms/payments.
declare -A APP_REPO=(
  [erpnext]="https://github.com/frappe/erpnext.git"
  [payments]="https://github.com/frappe/payments.git"
  [hrms]="https://github.com/frappe/hrms.git"
  [lms]="https://github.com/frappe/lms.git"
  [wiki]="https://github.com/frappe/wiki.git"
  [telephony]="https://github.com/frappe/telephony.git"
  [helpdesk]="https://github.com/frappe/helpdesk.git"
  [insights]="https://github.com/frappe/insights.git"
  [crm]="https://github.com/frappe/crm.git"
  [whatsapp]="https://github.com/frappe/whatsapp.git"
)
declare -A APP_BRANCH=(
  [erpnext]="version-16"
  [payments]="version-16"
  [hrms]="version-16"
  [lms]="main"
  [wiki]="develop"
  [telephony]="main"
  [helpdesk]="main"
  [insights]="main"
  [crm]="main"
  [whatsapp]="main"
)
# Installed in this exact order (see comment above on why apparel is last).
APP_INSTALL_ORDER=(erpnext payments hrms lms wiki telephony helpdesk insights crm whatsapp apparel)

# Optional extras present in this project's build manifest (apps.json) but
# not installed on the live site this was modeled on — self-hosting a full
# mail server (frappe/mail) or the letters/print_designer apps is a bigger
# commitment than "send email via an Email Account", so these are opt-in.
# Set INSTALL_MAIL_APP=1 (etc.) to include them.
INSTALL_MAIL_APP="${INSTALL_MAIL_APP:-0}"

# ==================================================================== Helpers
log()  { echo -e "\n\033[1;36m==>\033[0m $*"; }
warn() { echo -e "\033[1;33mWARN:\033[0m $*" >&2; }
die()  { echo -e "\033[1;31mERROR:\033[0m $*" >&2; exit 1; }
as_frappe() { sudo -iu "$FRAPPE_USER" -- "$@"; }

[[ $EUID -eq 0 ]] || die "Run this as root (sudo bash install.sh)."
command -v apt-get >/dev/null || die "This script targets Debian/Ubuntu (apt-get not found)."

# ============================================================ 1. System deps
log "Installing system packages"
apt-get update -y
DEBIAN_FRONTEND=noninteractive apt-get install -y \
  git curl wget ca-certificates gnupg lsb-release software-properties-common \
  build-essential libssl-dev libffi-dev \
  redis-server \
  nginx \