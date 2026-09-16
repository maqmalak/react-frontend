import {
  useFrappeCreateDoc,
  useFrappeDeleteDoc,
  useFrappeGetDoc,
  useFrappeGetDocList,
  useFrappeUpdateDoc,
} from "frappe-react-sdk";

/**
 * `WhatsApp Account` (frappe_whatsapp app) — one row per Meta WhatsApp Business
 * number. `token` is a Password field: the server never returns its value on
 * read, so forms must treat a blank token input as "leave unchanged" rather
 * than clearing it.
 */
export interface CrmWhatsAppAccount {
  name: string;
  account_name?: string;
  token?: string;
  url?: string;
  version?: string;
  phone_id?: string;
  business_id?: string;
  app_id?: string;
  webhook_verify_token?: string;
  status?: "Active" | "Inactive";
  is_default_incoming?: 0 | 1;
  is_default_outgoing?: 0 | 1;
  allow_auto_read_receipt?: 0 | 1;
}

const WHATSAPP_ACCOUNT_FIELDS: (keyof CrmWhatsAppAccount)[] = [
  "name",
  "account_name",
  "url",
  "version",
  "phone_id",
  "business_id",
  "app_id",
  "webhook_verify_token",
  "status",
  "is_default_incoming",
  "is_default_outgoing",
  "allow_auto_read_receipt",
];

export function useWhatsAppAccounts() {
  const { data, error, isLoading, mutate } = useFrappeGetDocList<CrmWhatsAppAccount>(
    "WhatsApp Account",
    {
      fields: WHATSAPP_ACCOUNT_FIELDS as unknown as (keyof CrmWhatsAppAccount)[],
      orderBy: { field: "account_name", order: "asc" },
      limit: 0,
    },
    "micromax.crm.whatsapp-accounts",
  );

  return { accounts: data ?? [], error, isLoading, mutate };
}

export function useWhatsAppAccountMutations() {
  const { createDoc, loading: creating } = useFrappeCreateDoc<CrmWhatsAppAccount>();
  const { updateDoc, loading: updating } = useFrappeUpdateDoc<CrmWhatsAppAccount>();
  const { deleteDoc, loading: deleting } = useFrappeDeleteDoc();

  const create = (values: Partial<CrmWhatsAppAccount>) => createDoc("WhatsApp Account", values as CrmWhatsAppAccount);
  const update = (name: string, values: Partial<CrmWhatsAppAccount>) =>
    updateDoc("WhatsApp Account", name, values);
  const remove = (name: string) => deleteDoc("WhatsApp Account", name);

  return { create, update, remove, saving: creating || updating, deleting };
}

/** `WhatsApp Settings` (frappe_whatsapp) — single doc picking the account used when no other is specified. */
export interface CrmWhatsAppDefaults {
  name: string;
  default_incoming_account?: string;
  default_outgoing_account?: string;
}

export function useWhatsAppDefaults() {
  const { data, error, isLoading, mutate } = useFrappeGetDoc<CrmWhatsAppDefaults>(
    "WhatsApp Settings",
    "WhatsApp Settings",
    "micromax.crm.whatsapp-settings",
  );
  const { updateDoc, loading: saving } = useFrappeUpdateDoc<CrmWhatsAppDefaults>();

  const save = async (values: Partial<CrmWhatsAppDefaults>) => {
    const doc = await updateDoc("WhatsApp Settings", "WhatsApp Settings", values);
    void mutate();
    return doc;
  };

  return { settings: data, error, isLoading, mutate, save, saving };
}

/** `FCRM Settings` (frappe/crm) — single doc for the CRM app's own general/branding/currency defaults. */
export interface CrmGeneralSettings {
  name: string;
  currency?: string;
  enable_forecasting?: 0 | 1;
  enable_sales_hierarchy?: 0 | 1;
  auto_update_expected_deal_value?: 0 | 1;
  update_timestamp_on_new_communication?: 0 | 1;
  auto_mark_replied_on_response?: 0 | 1;
  auto_reopen_on_new_communication?: 0 | 1;
  crm_timeline_timestamp_format?: "Relative" | "Exact";
  crm_timeline_sort_order?: "Oldest First" | "Newest First";
}

export function useCrmGeneralSettings() {
  const { data, error, isLoading, mutate } = useFrappeGetDoc<CrmGeneralSettings>(
    "FCRM Settings",
    "FCRM Settings",
    "micromax.crm.fcrm-settings",
  );
  const { updateDoc, loading: saving } = useFrappeUpdateDoc<CrmGeneralSettings>();

  const save = async (values: Partial<CrmGeneralSettings>) => {
    const doc = await updateDoc("FCRM Settings", "FCRM Settings", values);
    void mutate();
    return doc;
  };

  return { settings: data, error, isLoading, mutate, save, saving };
}
