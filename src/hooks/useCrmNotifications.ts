import { useCallback } from "react";
import useSWR from "swr";
import { useFrappeEventListener } from "frappe-react-sdk";
import { getCrmNotifications, markCrmNotificationsRead, type CrmNotificationRow } from "@/services/api";

const KEY = "apparel.crm.notifications";

/**
 * Follow-up/reminder & assignment notifications for the current user
 * (`CRM Notification`, populated by the CRM app's assignment/mention hooks
 * and by our own `crm_reminders` scheduled job — see the backend Phase 4
 * addition). The server publishes a realtime `crm_notification` socketio
 * event on every insert; we just refetch the list when that fires.
 */
export function useCrmNotifications() {
  const { data, error, isLoading, mutate } = useSWR<CrmNotificationRow[]>(KEY, getCrmNotifications, {
    refreshInterval: 60_000,
  });

  useFrappeEventListener("crm_notification", () => {
    void mutate();
  });

  const markRead = useCallback(
    async (name?: string) => {
      await markCrmNotificationsRead(name);
      void mutate();
    },
    [mutate],
  );

  const unreadCount = (data ?? []).filter((n) => !n.read).length;

  return { notifications: data ?? [], unreadCount, isLoading, error, markRead, mutate };
}
