import useSWR from "swr";
import { useFrappeGetDocList } from "frappe-react-sdk";
import { getCrmActivities, addCrmComment } from "@/services/api";
import type { CrmNote } from "@/types/frappe";

export interface CrmDocinfoComment {
  name: string;
  creation: string;
  content: string;
  owner: string;
  comment_type: string;
}

/**
 * Comment/activity feed for a Lead or Deal detail page.
 *
 * `crm.api.activities.get_activities` turns out to return a standard Frappe
 * "docinfo" bundle (`{docinfo: {comments, versions, communications, ...}}` —
 * confirmed against the live backend), not the `{activities, calls, notes,
 * tasks}` shape its own naming suggests. We only need the comment thread
 * here — Follow-ups (CRM Task) and Notes (FCRM Note) are fetched directly by
 * doctype below, the same reliable pattern the rest of this app uses, rather
 * than depending on this endpoint's exact bundle shape for those too.
 */
export function useCrmActivities(name?: string) {
  const key = name ? `apparel.crm.activities.${name}` : null;
  const { data, error, isLoading, mutate } = useSWR(key, () => getCrmActivities(name!));

  const comments = (data?.docinfo?.comments ?? []) as CrmDocinfoComment[];

  const addComment = async (content: string, referenceDoctype: string) => {
    if (!name) return;
    await addCrmComment(referenceDoctype, name, content);
    void mutate();
  };

  return { comments, isLoading, error, addComment, mutate };
}

/** Notes (`FCRM Note`) linked to a Lead or Deal. */
export function useCrmNotes(referenceDoctype: string, referenceDocname?: string) {
  return useFrappeGetDocList<CrmNote>(
    "FCRM Note",
    {
      fields: ["name", "title", "content", "owner", "modified"] as (keyof CrmNote)[],
      filters: referenceDocname
        ? ([
            ["reference_doctype", "=", referenceDoctype],
            ["reference_docname", "=", referenceDocname],
          ] as any)
        : ([["name", "=", ""]] as any),
      limit: 50,
      orderBy: { field: "modified", order: "desc" },
    },
    referenceDocname ? `apparel.crm.notes.${referenceDoctype}.${referenceDocname}` : null,
  );
}
