import { Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { LoginPage } from "@/pages/Auth/LoginPage";
import { DesktopPage } from "@/pages/Desktop/DesktopPage";
import { DashboardPage } from "@/pages/Dashboard/DashboardPage";
import { LCProformaListPage } from "@/pages/LCProforma/LCProformaListPage";
import { LCProformaFormPage } from "@/pages/LCProforma/LCProformaFormPage";
import { ItemsPage } from "@/pages/Masters/ItemsPage";
import { CustomersPage } from "@/pages/Masters/CustomersPage";
import { SuppliersPage } from "@/pages/Masters/SuppliersPage";
import { ComingSoonPage, FullPageLoader } from "@/pages/common/ComingSoonPage";
import { RequireRole } from "@/components/common/require-role";

// Heavier / less-frequently visited modules are code-split.
const ExportOrdersPage = lazy(() => import("@/pages/Export/ExportOrdersPage").then((m) => ({ default: m.ExportOrdersPage })));
const ExportPackingPage = lazy(() => import("@/pages/Export/ExportPackingPage").then((m) => ({ default: m.ExportPackingPage })));
const ExportShipmentsPage = lazy(() => import("@/pages/Export/ExportShipmentsPage").then((m) => ({ default: m.ExportShipmentsPage })));
const ExportShipmentDetailPage = lazy(() => import("@/pages/Export/ExportShipmentDetailPage").then((m) => ({ default: m.ExportShipmentDetailPage })));
const PurchaseOrdersPage = lazy(() => import("@/pages/Import/PurchaseOrdersPage").then((m) => ({ default: m.PurchaseOrdersPage })));
const PurchaseOrderFormPage = lazy(() => import("@/pages/Import/PurchaseOrderFormPage").then((m) => ({ default: m.PurchaseOrderFormPage })));
const PurchaseOrderDetailPage = lazy(() => import("@/pages/Import/PurchaseOrderDetailPage").then((m) => ({ default: m.PurchaseOrderDetailPage })));
const ImportShipmentsPage = lazy(() => import("@/pages/Import/ImportShipmentsPage").then((m) => ({ default: m.ImportShipmentsPage })));
const ImportShipmentDetailPage = lazy(() => import("@/pages/Import/ImportShipmentDetailPage").then((m) => ({ default: m.ImportShipmentDetailPage })));
const ImportShipmentFormPage = lazy(() => import("@/pages/Import/ImportShipmentFormPage").then((m) => ({ default: m.ImportShipmentFormPage })));
const ImportCostSheetsPage = lazy(() => import("@/pages/Import/ImportCostSheetsPage").then((m) => ({ default: m.ImportCostSheetsPage })));
const ImportCostSheetDetailPage = lazy(() => import("@/pages/Import/ImportCostSheetDetailPage").then((m) => ({ default: m.ImportCostSheetDetailPage })));
const ImportCostSheetFormPage = lazy(() => import("@/pages/Import/ImportCostSheetFormPage").then((m) => ({ default: m.ImportCostSheetFormPage })));
const PurchaseReceiptsPage = lazy(() => import("@/pages/Purchase/PurchaseReceiptsPage").then((m) => ({ default: m.PurchaseReceiptsPage })));
const PurchaseReceiptFormPage = lazy(() => import("@/pages/Purchase/PurchaseReceiptFormPage").then((m) => ({ default: m.PurchaseReceiptFormPage })));
const PurchaseReceiptDetailPage = lazy(() => import("@/pages/Purchase/PurchaseReceiptDetailPage").then((m) => ({ default: m.PurchaseReceiptDetailPage })));
const PurchaseInvoicesPage = lazy(() => import("@/pages/Purchase/PurchaseInvoicesPage").then((m) => ({ default: m.PurchaseInvoicesPage })));
const PurchaseInvoiceFormPage = lazy(() => import("@/pages/Purchase/PurchaseInvoiceFormPage").then((m) => ({ default: m.PurchaseInvoiceFormPage })));
const PurchaseInvoiceDetailPage = lazy(() => import("@/pages/Purchase/PurchaseInvoiceDetailPage").then((m) => ({ default: m.PurchaseInvoiceDetailPage })));
const LandedCostVouchersPage = lazy(() => import("@/pages/Purchase/LandedCostVouchersPage").then((m) => ({ default: m.LandedCostVouchersPage })));
const LandedCostVoucherFormPage = lazy(() => import("@/pages/Purchase/LandedCostVoucherFormPage").then((m) => ({ default: m.LandedCostVoucherFormPage })));
const LandedCostVoucherDetailPage = lazy(() => import("@/pages/Purchase/LandedCostVoucherDetailPage").then((m) => ({ default: m.LandedCostVoucherDetailPage })));
const WorkOrdersPage = lazy(() => import("@/pages/Production/WorkOrdersPage").then((m) => ({ default: m.WorkOrdersPage })));
const UsersPage = lazy(() => import("@/pages/Admin/UsersPage").then((m) => ({ default: m.UsersPage })));
const UserFormPage = lazy(() => import("@/pages/Admin/UserFormPage").then((m) => ({ default: m.UserFormPage })));
const UserDetailPage = lazy(() => import("@/pages/Admin/UserDetailPage").then((m) => ({ default: m.UserDetailPage })));
const RolesPage = lazy(() => import("@/pages/Admin/RolesPage").then((m) => ({ default: m.RolesPage })));
const RoleDetailPage = lazy(() => import("@/pages/Admin/RoleDetailPage").then((m) => ({ default: m.RoleDetailPage })));


/**
 * Application route table.
 *
 * Detail pages for custom DocTypes (Export Shipment, Import Shipment,
 * Import Cost Sheet) reuse the LC Proforma master-detail pattern and will be
 * mounted at their :name routes as they are built out.
 */
export function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />

      {/* Authenticated shell */}
      <Route element={<AppShell />}>
        <Route index element={<DesktopPage />} />
        <Route path="dashboard" element={<DashboardPage />} />

        {/* Import */}
        <Route path="import/purchase-orders" element={<Suspense fallback={<FullPageLoader />}><PurchaseOrdersPage /></Suspense>} />
        <Route path="import/purchase-orders/new" element={<Suspense fallback={<FullPageLoader />}><PurchaseOrderFormPage /></Suspense>} />
        <Route path="import/purchase-orders/:name" element={<Suspense fallback={<FullPageLoader />}><PurchaseOrderDetailPage /></Suspense>} />
        <Route path="import/purchase-orders/:name/edit" element={<Suspense fallback={<FullPageLoader />}><PurchaseOrderFormPage /></Suspense>} />
        <Route path="import/shipments" element={<Suspense fallback={<FullPageLoader />}><ImportShipmentsPage /></Suspense>} />
        <Route path="import/shipments/new" element={<Suspense fallback={<FullPageLoader />}><ImportShipmentFormPage /></Suspense>} />
        <Route path="import/shipments/:name" element={<Suspense fallback={<FullPageLoader />}><ImportShipmentDetailPage /></Suspense>} />
        <Route path="import/shipments/:name/edit" element={<Suspense fallback={<FullPageLoader />}><ImportShipmentFormPage /></Suspense>} />
        <Route path="import/cost-sheets" element={<Suspense fallback={<FullPageLoader />}><ImportCostSheetsPage /></Suspense>} />
        <Route path="import/cost-sheets/new" element={<Suspense fallback={<FullPageLoader />}><ImportCostSheetFormPage /></Suspense>} />
        <Route path="import/cost-sheets/:name" element={<Suspense fallback={<FullPageLoader />}><ImportCostSheetDetailPage /></Suspense>} />
        <Route path="import/cost-sheets/:name/edit" element={<Suspense fallback={<FullPageLoader />}><ImportCostSheetFormPage /></Suspense>} />

        {/* Purchase */}
        <Route path="purchase/receipts" element={<Suspense fallback={<FullPageLoader />}><PurchaseReceiptsPage /></Suspense>} />
        <Route path="purchase/receipts/new" element={<Suspense fallback={<FullPageLoader />}><PurchaseReceiptFormPage /></Suspense>} />
        <Route path="purchase/receipts/:name" element={<Suspense fallback={<FullPageLoader />}><PurchaseReceiptDetailPage /></Suspense>} />
        <Route path="purchase/receipts/:name/edit" element={<Suspense fallback={<FullPageLoader />}><PurchaseReceiptFormPage /></Suspense>} />
        <Route path="purchase/invoices" element={<Suspense fallback={<FullPageLoader />}><PurchaseInvoicesPage /></Suspense>} />
        <Route path="purchase/invoices/new" element={<Suspense fallback={<FullPageLoader />}><PurchaseInvoiceFormPage /></Suspense>} />
        <Route path="purchase/invoices/:name" element={<Suspense fallback={<FullPageLoader />}><PurchaseInvoiceDetailPage /></Suspense>} />
        <Route path="purchase/invoices/:name/edit" element={<Suspense fallback={<FullPageLoader />}><PurchaseInvoiceFormPage /></Suspense>} />
        <Route path="purchase/landed-costs" element={<Suspense fallback={<FullPageLoader />}><LandedCostVouchersPage /></Suspense>} />
        <Route path="purchase/landed-costs/new" element={<Suspense fallback={<FullPageLoader />}><LandedCostVoucherFormPage /></Suspense>} />
        <Route path="purchase/landed-costs/:name" element={<Suspense fallback={<FullPageLoader />}><LandedCostVoucherDetailPage /></Suspense>} />
        <Route path="purchase/landed-costs/:name/edit" element={<Suspense fallback={<FullPageLoader />}><LandedCostVoucherFormPage /></Suspense>} />

        {/* Export */}
        <Route path="export/lc-proforma" element={<LCProformaListPage />} />
        <Route path="export/lc-proforma/new" element={<LCProformaFormPage />} />
        <Route path="export/lc-proforma/:name" element={<LCProformaFormPage />} />
        <Route path="export/orders" element={<Suspense fallback={<FullPageLoader />}><ExportOrdersPage /></Suspense>} />
        <Route path="export/orders/:name" element={<Suspense fallback={<FullPageLoader />}><ExportOrdersPage /></Suspense>} />
        <Route path="export/packing" element={<Suspense fallback={<FullPageLoader />}><ExportPackingPage /></Suspense>} />
        <Route path="export/shipments" element={<Suspense fallback={<FullPageLoader />}><ExportShipmentsPage /></Suspense>} />
        <Route path="export/shipments/:name" element={<Suspense fallback={<FullPageLoader />}><ExportShipmentDetailPage /></Suspense>} />

        {/* Production */}
        <Route path="production/work-orders" element={<Suspense fallback={<FullPageLoader />}><WorkOrdersPage /></Suspense>} />
        <Route path="production/status" element={<ComingSoonPage title="Production Status" description="Live progress across work orders" />} />

        {/* Inventory */}
        <Route path="inventory/stock" element={<ComingSoonPage title="Stock" description="Stock balances from ERPNext Bin / Stock Ledger Entry" />} />
        <Route path="inventory/movement" element={<ComingSoonPage title="Material Movement" description="Stock Entry / Material movement history" />} />

        {/* Reports */}
        <Route path="reports/import" element={<ComingSoonPage title="Import Reports" />} />
        <Route path="reports/export" element={<ComingSoonPage title="Export Reports" />} />
        <Route path="reports/shipments" element={<ComingSoonPage title="Shipment Reports" />} />
        <Route path="reports/lc" element={<ComingSoonPage title="LC Reports" />} />

        {/* Masters */}
        <Route path="masters/items" element={<ItemsPage />} />
        <Route path="masters/customers" element={<CustomersPage />} />
        <Route path="masters/suppliers" element={<SuppliersPage />} />

        {/* Settings */}
        <Route path="settings" element={<ComingSoonPage title="Settings" description="Company defaults and workspace preferences" />} />

        {/* Administration */}
        <Route
          path="admin/users"
          element={
            <RequireRole roles={["System Manager"]}>
              <Suspense fallback={<FullPageLoader />}>
                <UsersPage />
              </Suspense>
            </RequireRole>
          }
        />
        <Route
          path="admin/users/new"
          element={
            <RequireRole roles={["System Manager"]}>
              <Suspense fallback={<FullPageLoader />}>
                <UserFormPage />
              </Suspense>
            </RequireRole>
          }
        />
        <Route
          path="admin/users/:name"
          element={
            <RequireRole roles={["System Manager"]}>
              <Suspense fallback={<FullPageLoader />}>
                <UserDetailPage />
              </Suspense>
            </RequireRole>
          }
        />
        <Route
          path="admin/roles"
          element={
            <RequireRole roles={["System Manager"]}>
              <Suspense fallback={<FullPageLoader />}>
                <RolesPage />
              </Suspense>
            </RequireRole>
          }
        />
        <Route
          path="admin/roles/:name"
          element={
            <RequireRole roles={["System Manager"]}>
              <Suspense fallback={<FullPageLoader />}>
                <RoleDetailPage />
              </Suspense>
            </RequireRole>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
