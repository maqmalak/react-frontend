import { SimpleListPage } from "@/pages/common/SimpleListPage";
import { useItems } from "@/hooks/useItems";

/** Item master (standard ERPNext Item DocType). */
export function ItemsPage() {
  return (
    <SimpleListPage
      doctype="Item"
      title="Items"
      subtitle="Micromax product master — ERPNext Item records"
      fields={["name", "item_name", "item_group", "stock_uom", "is_stock_item", "disabled"]}
      columns={[
        { key: "name", label: "Item Code", render: (r) => <span className="font-medium">{r.name}</span> },
        { key: "item_name", label: "Item Name" },
        { key: "item_group", label: "Item Group" },
        { key: "stock_uom", label: "UOM" },
      ]}
    />
  );
}

/** Re-exported hook access so tree-shaking keeps useItems wired for search. */
export { useItems };
