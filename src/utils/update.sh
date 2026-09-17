#!/usr/bin/env bash
#
# update.sh — production update/deploy script for this project, meant to be
# re-run any time you ship new code, on the same bare-metal box `install.sh`
# originally provisioned (site "demo", Frappe v16 backend, bench at
# ~/frappe-bench, React frontend at ~/react-frontend served by nginx).
#
# It does two independent, idempotent things:
#
#   A. Redeploy the React frontend  — git pull, npm ci, npm run build.
#      Safe to re-run any time; this is the normal "ship a frontend change"
#      path. Runs by default.
#
#   B. Swap the custom backend app  — uninstall+remove the old `apparel` app
#      and fetch+install `micromax` in its place, then migrate and rebuild.
#      This is a ONE-TIME, DESTRUCTIVE migration (uninstalling `apparel`
#      deletes every doctype/record that app owns) — it only runs when you
#      explicitly opt in with REMOVE_APPAREL=1, and once `apparel` is gone
#      this step becomes a no-op on every later run.
#
# Run as root (same as install.sh):
#   sudo bash update.sh                        # frontend only
#   sudo REMOVE_APPAREL=1 bash update.sh        # frontend + one-time app swap
#
# Idempotency: safe to re-run — already-applied steps (app already removed,
# already installed, frontend already up to date) are skipped rather than
# failing.

set -euo pipefail

# ============================================================== Configuration
# Same defaults/override style as install.sh — override via env vars, e.g.:
#   SITE_NAME=demo APEX_DOMAIN=micromaxonline.uk bash update.sh
FRAPPE_USER="${FRAPPE_USER:-maqmalak}"
FRAPPE_HOME="/home/${FRAPPE_USER}"
BENCH_DIR="${BENCH_DIR:-${FRAPPE_HOME}/frappe-bench}"
SITE_NAME="${SITE_NAME:-demo}"
NODE_MAJOR="${NODE_MAJOR:-24}"

FRONTEND_REPO="${FRONTEND_REPO:-https://github.com/maqmalak/react-frontend.git}"
FRONTEND_DIR="${FRONTEND_DIR:-${FRAPPE_HOME}/react-frontend}"
FRONTEND_BRANCH="${FRONTEND_BRANCH:-main}"

MICROMAX_REPO="${MICROMAX_REPO:-https://github.com/maqmalak/micromax.git}"
MICROMAX_BRANCH="${MICROMAX_BRANCH:-main}"

# The app being replaced. Override if it's actually named differently on
# your site (`bench --site <site> list-apps` will show the exact name).
APPAREL_APP="${APPAREL_APP:-apparel}"
MICROMAX_APP="${MICROMAX_APP:-micromax}"

# Opt-in switch for section B (see header comment) — deliberately off by
# default because uninstall-app is destructive (drops that app's data).
REMOVE_APPAREL="${REMOVE_APPAREL:-0}"
# uninstall-app takes a full site backup before deleting apparel's data by
# default — set to 1 to skip it (faster, but no rollback if this goes wrong).
SKIP_APPAREL_BACKUP="${SKIP_APPAREL_BACKUP:-0}"

# ==================================================================== Helpers
log()  { echo -e "\n\033[1;36m==>\033[0m $*"; }
warn() { echo -e "\033[1;33mWARN:\033[0m $*" >&2; }
die()  { echo -e "\033[1;31mERROR:\033[0m $*" >&2; exit 1; }

[[ $EUID -eq 0 ]] || die "Run this as root (sudo bash update.sh)."
id "$FRAPPE_USER" &>/dev/null || die "System user '${FRAPPE_USER}' does not exist — is install.sh's setup actually on this box?"
[[ -d "$BENCH_DIR" ]] || die "No bench at ${BENCH_DIR} — run install.sh first."

UV_BIN_DIR="${FRAPPE_HOME}/.local/bin"
BENCH_BIN="${UV_BIN_DIR}/bench"

as_frappe() { sudo -iu "$FRAPPE_USER" -- "$@"; }
# Same PATH-forcing trick as install.sh: a non-interactive `sudo -iu` shell
# doesn't source ~/.bashrc, which is where uv's and nvm's installers append
# their PATH lines, so NODE_BIN_DIR has to be resolved once up front (below)
# and threaded through explicitly.
as_frappe_sh() {
  sudo -iu "$FRAPPE_USER" env "PATH=${UV_BIN_DIR}:${NODE_BIN_DIR:-}:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin" bash -c "$1"
}
# `bench build` / supervisor restarts touch root-owned paths — same reasoning
# as install.sh's as_root_sh.
as_root_sh() {
  env "PATH=${UV_BIN_DIR}:${NODE_BIN_DIR:-}:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin" bash -c "$1"
}

[[ -x "$BENCH_BIN" ]] || die "bench not found at ${BENCH_BIN} — is install.sh's uv setup actually on this box?"

log "Resolving the frappe user's nvm-installed node ${NODE_MAJOR} (needed to run npm/yarn as ${FRAPPE_USER})"
# Merely sourcing nvm.sh does NOT put any node version on PATH — nvm only
# does that on an explicit `nvm use`. Skipping this step (as an earlier
# version of this script did) silently falls through to whatever `node`
# happens to be first on the login shell's plain PATH (e.g. an apt-installed
# system node), which is exactly how a stray v22 got picked up instead of
# the v24 install.sh set up — the frappe/yarn build then fails engine checks.
NODE_BIN_DIR="$(as_frappe bash -c "export NVM_DIR=\"\$HOME/.nvm\"; . \"\$NVM_DIR/nvm.sh\"; nvm use ${NODE_MAJOR} >/dev/null 2>&1; dirname \"\$(command -v node)\"")"
[[ -n "$NODE_BIN_DIR" ]] || die "Could not resolve node via nvm for ${FRAPPE_USER} — is nvm installed, and is node ${NODE_MAJOR} installed (nvm install ${NODE_MAJOR})?"
RESOLVED_NODE_VERSION="$(as_frappe_sh "'${NODE_BIN_DIR}/node' --version")"
log "Using node ${RESOLVED_NODE_VERSION} from ${NODE_BIN_DIR}"
[[ "$RESOLVED_NODE_VERSION" == v${NODE_MAJOR}.* ]] || warn "Resolved node ${RESOLVED_NODE_VERSION}, expected v${NODE_MAJOR}.x — double check 'nvm alias default' for ${FRAPPE_USER} (sudo -iu ${FRAPPE_USER} nvm alias default ${NODE_MAJOR})."

# ======================================================== A. Frontend deploy
log "A. Updating React frontend (${FRONTEND_DIR})"
if [[ ! -d "$FRONTEND_DIR" ]]; then
  log "Frontend not cloned yet — cloning ${FRONTEND_REPO}"
  as_frappe git clone --branch "$FRONTEND_BRANCH" "$FRONTEND_REPO" "$FRONTEND_DIR"
else
  BEFORE_SHA="$(as_frappe git -C "$FRONTEND_DIR" rev-parse HEAD)"
  as_frappe git -C "$FRONTEND_DIR" fetch origin "$FRONTEND_BRANCH"
  as_frappe git -C "$FRONTEND_DIR" checkout "$FRONTEND_BRANCH"
  as_frappe git -C "$FRONTEND_DIR" reset --hard "origin/${FRONTEND_BRANCH}"
  AFTER_SHA="$(as_frappe git -C "$FRONTEND_DIR" rev-parse HEAD)"
  if [[ "$BEFORE_SHA" == "$AFTER_SHA" ]]; then
    log "Frontend already at latest ${FRONTEND_BRANCH} (${AFTER_SHA:0:8}) — rebuilding anyway in case local deps/config changed"
  else
    log "Frontend updated ${BEFORE_SHA:0:8} -> ${AFTER_SHA:0:8}"
  fi
fi

[[ -f "${FRONTEND_DIR}/.env.production" ]] || warn "${FRONTEND_DIR}/.env.production is missing — re-run install.sh's frontend section, or restore it, before building."

log "Installing dependencies and building (npm ci && npm run build)"
as_frappe_sh "cd '${FRONTEND_DIR}' && npm ci --silent && npm run build"

log "Re-applying nginx (www-data) read access to the new build output"
chmod -R o+rx "$FRAPPE_HOME"

log "Frontend deployed — nginx serves ${FRONTEND_DIR}/dist directly off disk, no reload needed."

# =============================================== B. apparel -> micromax swap
if [[ "$REMOVE_APPAREL" != "1" ]]; then
  log "B. Skipping apparel -> micromax app swap (set REMOVE_APPAREL=1 to run it)"
else
  log "B. Swapping backend app: removing '${APPAREL_APP}', installing '${MICROMAX_APP}'"

  INSTALLED_APPS="$(as_frappe_sh "cd '$BENCH_DIR' && '$BENCH_BIN' --site '$SITE_NAME' list-apps" 2>/dev/null | awk '{print $1}')"

  if [[ -d "${BENCH_DIR}/apps/${APPAREL_APP}" ]]; then
    warn "About to permanently delete all '${APPAREL_APP}' data on site '${SITE_NAME}'. This cannot be undone (a pre-uninstall site backup is taken automatically, unless SKIP_APPAREL_BACKUP=1)."

    # Step 1 (site-level, does the actual data deletion): `uninstall-app` is
    # the frappe-core command that drops the app's doctypes/tables from the
    # site's database. It's NOT a hard failure when it can't proceed — it
    # prints a yellow warning and exits 0 (no-op) if the app isn't installed,
    # or if some other installed app declares `apparel` in its own
    # `required_apps` hook — so we capture its output and react to that
    # second case explicitly instead of silently trusting a clean exit code.
    log "Uninstalling '${APPAREL_APP}' from site '${SITE_NAME}' (frappe core: bench --site uninstall-app)"
    NO_BACKUP_FLAG=""
    [[ "${SKIP_APPAREL_BACKUP:-0}" == "1" ]] && NO_BACKUP_FLAG="--no-backup"
    UNINSTALL_OUT="$(as_frappe_sh "cd '$BENCH_DIR' && '$BENCH_BIN' --site '$SITE_NAME' uninstall-app '${APPAREL_APP}' --yes ${NO_BACKUP_FLAG}" 2>&1)" \
      || die "'bench --site ${SITE_NAME} uninstall-app ${APPAREL_APP}' failed:\n${UNINSTALL_OUT}"
    echo "$UNINSTALL_OUT"

    if grep -q "is a dependency of" <<<"$UNINSTALL_OUT"; then
      BLOCKER="$(grep -oP "is a dependency of \K[^.]+" <<<"$UNINSTALL_OUT" | head -1)"
      warn "'${APPAREL_APP}' is declared in '${BLOCKER}'s required_apps hook, so bench's normal safety check refused to remove it. Retrying with --force, which only skips that check — the actual data deletion is identical either way. If '${BLOCKER}' genuinely needs apparel at runtime, expect it to break until it's updated/removed too."
      UNINSTALL_OUT="$(as_frappe_sh "cd '$BENCH_DIR' && '$BENCH_BIN' --site '$SITE_NAME' uninstall-app '${APPAREL_APP}' --yes --force ${NO_BACKUP_FLAG}" 2>&1)" \
        || die "Forced uninstall also failed:\n${UNINSTALL_OUT}"
      echo "$UNINSTALL_OUT"
    fi

    # NOTE: we deliberately do NOT re-check `bench --site list-apps` here.
    # That command (and `remove-app`'s own "is it installed anywhere" guard,
    # below) reads the `Installed Applications` doctype's cached child table
    # — a bookkeeping record that `frappe.get_installed_apps()` (the check
    # `uninstall-app` itself just used, above) does not always keep in sync.
    # A "not installed" or "Uninstalled App" message above is the real,
    # authoritative signal that apparel's data is gone; trust that instead.

    # Step 2 (bench-level, deletes the app's code): `remove-app` only takes
    # --no-backup/--force (no --yes). Its own "installed anywhere?" guard
    # uses that same stale cache, so it can refuse even when step 1 already
    # confirmed there's nothing left to uninstall — in that specific case
    # (error text "is installed on site"), retry with --force, which just
    # skips this redundant guard and deletes the already-uninstalled app's
    # source. Default behavior archives it under archived/apps/ rather than
    # hard-deleting, a nice free rollback path.
    log "Removing app '${APPAREL_APP}' from the bench (deletes apps/${APPAREL_APP}, updates apps.txt)"
    if ! REMOVE_OUT="$(as_frappe_sh "cd '$BENCH_DIR' && '$BENCH_BIN' remove-app '${APPAREL_APP}'" 2>&1)"; then
      echo "$REMOVE_OUT"
      if grep -q "is installed on site" <<<"$REMOVE_OUT"; then
        warn "'bench remove-app' is going by the stale Installed Applications cache, not the real check uninstall-app already passed. Retrying with --force."
        as_frappe_sh "cd '$BENCH_DIR' && '$BENCH_BIN' remove-app '${APPAREL_APP}' --force" \
          || die "'bench remove-app ${APPAREL_APP} --force' also failed — resolve manually before re-running with REMOVE_APPAREL=1."
      else
        die "'bench remove-app ${APPAREL_APP}' failed — resolve manually before re-running with REMOVE_APPAREL=1."
      fi
    else
      echo "$REMOVE_OUT"
    fi
  else
    log "'${APPAREL_APP}' not present at apps/${APPAREL_APP} — already removed, skipping"
  fi

  MICROMAX_HAS_ORIGIN=0
  if [[ -d "${BENCH_DIR}/apps/${MICROMAX_APP}" ]] \
    && as_frappe git -C "${BENCH_DIR}/apps/${MICROMAX_APP}" remote get-url origin >/dev/null 2>&1; then
    MICROMAX_HAS_ORIGIN=1
  fi

  if [[ -d "${BENCH_DIR}/apps/${MICROMAX_APP}" && "$MICROMAX_HAS_ORIGIN" == "1" ]]; then
    log "'${MICROMAX_APP}' already fetched — pulling latest instead of re-cloning"
    as_frappe git -C "${BENCH_DIR}/apps/${MICROMAX_APP}" fetch origin "$MICROMAX_BRANCH"
    as_frappe git -C "${BENCH_DIR}/apps/${MICROMAX_APP}" checkout "$MICROMAX_BRANCH"
    as_frappe git -C "${BENCH_DIR}/apps/${MICROMAX_APP}" reset --hard "origin/${MICROMAX_BRANCH}"
  else
    if [[ -d "${BENCH_DIR}/apps/${MICROMAX_APP}" ]]; then
      # A directory exists but isn't a plain clone with 'origin' set — most
      # likely a leftover from a `bench get-app` that cloned the app but then
      # failed later (e.g. the asset-build step). Safe to wipe and re-fetch
      # cleanly, since (checked above/below) it isn't registered on the site
      # yet — there's no site data tied to this on-disk copy.
      if grep -qx "$MICROMAX_APP" <<<"$INSTALLED_APPS"; then
        die "'apps/${MICROMAX_APP}' exists without a git 'origin' remote, but '${MICROMAX_APP}' IS installed on site '${SITE_NAME}' — refusing to delete its code out from under a live install. Investigate manually (cd ${BENCH_DIR}/apps/${MICROMAX_APP} && git remote -v)."
      fi
      warn "'apps/${MICROMAX_APP}' exists but isn't a normal git clone (no 'origin' remote) — likely a partial fetch left over from an earlier failed run. Removing it and re-fetching cleanly."
      rm -rf "${BENCH_DIR}/apps/${MICROMAX_APP}"
    fi
    log "Fetching app '${MICROMAX_APP}' (${MICROMAX_BRANCH})"
    as_frappe_sh "cd '$BENCH_DIR' && '$BENCH_BIN' get-app --branch '${MICROMAX_BRANCH}' '${MICROMAX_REPO}'"
  fi

  if grep -qx "$MICROMAX_APP" <<<"$INSTALLED_APPS"; then
    log "'${MICROMAX_APP}' already installed on site '${SITE_NAME}' — skipping install-app"
  else
    log "Installing '${MICROMAX_APP}' on site '${SITE_NAME}'"
    as_frappe_sh "cd '$BENCH_DIR' && '$BENCH_BIN' --site '$SITE_NAME' install-app '${MICROMAX_APP}'"
  fi

  log "Running bench migrate for site '${SITE_NAME}'"
  as_frappe_sh "cd '$BENCH_DIR' && '$BENCH_BIN' --site '$SITE_NAME' migrate"

  log "Rebuilding backend app assets (bench build --app ${MICROMAX_APP})"
  as_frappe_sh "cd '$BENCH_DIR' && '$BENCH_BIN' build --app '${MICROMAX_APP}'"

  log "Clearing cache and restarting bench workers/web processes"
  as_frappe_sh "cd '$BENCH_DIR' && '$BENCH_BIN' --site '$SITE_NAME' clear-cache"
  as_root_sh "supervisorctl restart all" || warn "supervisorctl restart failed — restart the bench's supervisor group manually."
fi

# ==================================================================== Summary
log "Done."
cat <<EOF

  Frontend:  ${FRONTEND_DIR} (rebuilt, served by nginx from dist/)
  Site:      ${SITE_NAME}
  Bench:     ${BENCH_DIR}
EOF
if [[ "$REMOVE_APPAREL" == "1" ]]; then
  cat <<EOF
  App swap:  '${APPAREL_APP}' removed, '${MICROMAX_APP}' installed and migrated.
EOF
else
  cat <<EOF
  App swap:  not run this time — re-run with REMOVE_APPAREL=1 when you're
             ready to permanently remove '${APPAREL_APP}' and switch to
             '${MICROMAX_APP}'.
EOF
fi
