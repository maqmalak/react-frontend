import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useFrappeGetDoc, useFrappeGetDocList } from "frappe-react-sdk";
import { ExternalLink, Factory, Globe, Handshake, Landmark, MapPin, UserPlus, Users } from "lucide-react";
import { SectionCard } from "@/components/common/section-card";
import { StatusBadge } from "@/components/common/status-badge";
import { Avatar } from "@/components/ui/avatar";
import { avatarTone } from "@/components/common/avatar-tone";
import { fileURL } from "@/services/frappe";
import { formatMoney } from "@/utils/currency";
import type { CrmOrganization } from "@/types/frappe";

const enc = encodeURIComponent;

function Detail({ icon, label, children, wide }: { icon: ReactNode; label: string; children: ReactNode; wide?: boolean }) {
  return (
    <div className={`min-w-0 ${wide ? "sm:col-span-2" : ""}`}>
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </p>
      <div className="mt-0.5 min-w-0 text-sm font-medium">{children}</div>
    </div>
  );
}

const Empty = () => <span className="font-normal text-muted-foreground">—</span>;

/**
 * The organization's portfolio on a Lead/Deal page: its profile (industry, website, size, revenue,
 * territory, address) plus everything else the company has in the CRM — its other leads and its deals,
 * each linking to that record. `currentLead` / `currentDeal` are left out of their own lists.
 */
export function OrganizationPortfolioCard({
  organization,
  currentLead,
  currentDeal,
}: {
  organization?: string;
  currentLead?: string;
  currentDeal?: string;
}) {
  const org = organization?.trim() || undefined;

  // A null key skips the request; without it the SDK would fetch the whole doctype list when `org` is empty.
  const { data: doc, isLoading } = useFrappeGetDoc<CrmOrganization>("CRM Organization", org, org ? undefined : null);
  const { data: leads } = useFrappeGetDocList<{ name: string; lead_name?: string; status?: string; converted?: number }>(
    "CRM Lead",
    {
      fields: ["name", "lead_name", "status", "converted"],
      filters: [["organization", "=", org ?? ""]],
      orderBy: { field: "modified", order: "desc" },
      limit: 50,
    },
    org ? `micromax.crm.org.leads.${org}` : null,
  );
  const { data: deals } = useFrappeGetDocList<{ name: string; status?: string; deal_value?: number; currency?: string }>(
    "CRM Deal",
    {
      fields: ["name", "status", "deal_value", "currency"],
      filters: [["organization", "=", org ?? ""]],
      orderBy: { field: "modified", order: "desc" },
      limit: 50,
    },
    org ? `micromax.crm.org.deals.${org}` : null,
  );

  if (!org) return null;

  const otherLeads = (leads ?? []).filter((l) => l.name !== currentLead);
  const otherDeals = (deals ?? []).filter((d) => d.name !== currentDeal);
  const openDealValue = (deals ?? [])
    .filter((d) => d.status !== "Lost")
    .reduce((sum, d) => sum + Number(d.deal_value ?? 0), 0);
  const displayName = doc?.organization_name || org;
  const website = doc?.website;

  return (
    <SectionCard
      title="Organization"
      actions={
        <Link
          to={`/crm/organizations?open=${enc(org)}`}
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          View / edit <ExternalLink className="h-3 w-3" />
        </Link>
      }
    >
      {isLoading ? (
        <div className="h-32 w-full animate-pulse rounded bg-muted" />
      ) : (
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <Avatar
              name={displayName}
              src={doc?.organization_logo ? fileURL(doc.organization_logo) : undefined}
              size="lg"
              className={avatarTone(displayName)}
            />
            <div className="min-w-0">
              <p className="truncate text-base font-semibold">{displayName}</p>
              <p className="truncate text-xs text-muted-foreground">
                {doc?.industry || "No industry set"}
                {doc?.territory ? ` · ${doc.territory}` : ""}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
            <Detail icon={<Factory className="h-3.5 w-3.5" />} label="Industry">
              {doc?.industry || <Empty />}
            </Detail>
            <Detail icon={<Globe className="h-3.5 w-3.5" />} label="Website">
              {website ? (
                <a
                  href={/^https?:\/\//i.test(website) ? website : `https://${website}`}
                  target="_blank"
                  rel="noreferrer"
                  className="block truncate text-primary hover:underline"
                >
                  {website.replace(/^https?:\/\//i, "")}
                </a>
              ) : (
                <Empty />
              )}
            </Detail>
            <Detail icon={<Users className="h-3.5 w-3.5" />} label="No. of employees">
              {doc?.no_of_employees || <Empty />}
            </Detail>
            <Detail icon={<Landmark className="h-3.5 w-3.5" />} label="Annual revenue">
              {doc?.annual_revenue ? formatMoney(Number(doc.annual_revenue), doc.currency || undefined) : <Empty />}
            </Detail>
            <Detail icon={<MapPin className="h-3.5 w-3.5" />} label="Territory">
              {doc?.territory || <Empty />}
            </Detail>
            <Detail icon={<MapPin className="h-3.5 w-3.5" />} label="Address" wide>
              {doc?.address ? <span className="whitespace-pre-line break-words">{doc.address}</span> : <Empty />}
            </Detail>
          </div>

          <div className="grid grid-cols-1 gap-4 border-t border-border pt-4 sm:grid-cols-2">
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <UserPlus className="h-3.5 w-3.5" /> Other leads ({otherLeads.length})
              </p>
              {otherLeads.length === 0 ? (
                <p className="text-xs text-muted-foreground">No other leads at this organization.</p>
              ) : (
                <ul className="space-y-1.5">
                  {otherLeads.map((l) => (
                    <li key={l.name}>
                      <Link
                        to={`/crm/leads/${enc(l.name)}`}
                        className="flex items-center justify-between gap-2 rounded-md border border-border px-2.5 py-1.5 text-sm hover:bg-accent"
                      >
                        <span className="min-w-0 truncate">{l.lead_name || l.name}</span>
                        <StatusBadge status={l.status} />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <Handshake className="h-3.5 w-3.5" /> Deals ({otherDeals.length})
                {openDealValue > 0 && (
                  <span className="ml-auto font-medium text-emerald-600 dark:text-emerald-400">
                    {formatMoney(openDealValue, deals?.find((d) => d.currency)?.currency || undefined)} open
                  </span>
                )}
              </p>
              {otherDeals.length === 0 ? (
                <p className="text-xs text-muted-foreground">No deals with this organization yet.</p>
              ) : (
                <ul className="space-y-1.5">
                  {otherDeals.map((d) => (
                    <li key={d.name}>
                      <Link
                        to={`/crm/deals/${enc(d.name)}`}
                        className="flex items-center justify-between gap-2 rounded-md border border-border px-2.5 py-1.5 text-sm hover:bg-accent"
                      >
                        <span className="min-w-0 truncate">
                          {d.name}
                          {d.deal_value ? (
                            <span className="ml-1.5 text-xs text-muted-foreground">{formatMoney(Number(d.deal_value), d.currency || undefined)}</span>
                          ) : null}
                        </span>
                        <StatusBadge status={d.status} />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </SectionCard>
  );
}
