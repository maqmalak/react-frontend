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
const CrmLeadsPage = lazy(() => import("@/pages/CRM/LeadsPage").then((m) => ({ default: m.LeadsPage })));
const CrmLeadDetailPage = lazy(() => import("@/pages/CRM/LeadDetailPage").then((m) => ({ default: m.LeadDetailPage })));
const CrmLeadFormPage = lazy(() => import("@/pages/CRM/LeadFormPage").then((m) => ({ default: m.LeadFormPage })));
const CrmDealsPage = lazy(() => import("@/pages/CRM/DealsPage").then((m) => ({ default: m.DealsPage })));
const CrmDealDetailPage = lazy(() => import("@/pages/CRM/DealDetailPage").then((m) => ({ default: m.DealDetailPage })));
const CrmDealFormPage = lazy(() => import("@/pages/CRM/DealFormPage").then((m) => ({ default: m.DealFormPage })));
const CrmTasksPage = lazy(() => import("@/pages/CRM/TasksPage").then((m) => ({ default: m.default })));
const CrmNotesPage = lazy(() => import("@/pages/CRM/NotesPage").then((m) => ({ default: m.default })));
const CrmCallLogsPage = lazy(() => import("@/pages/CRM/CallLogsPage").then((m) => ({ default: m.default })));
const CrmContractsPage = lazy(() => import("@/pages/CRM/ContractsPage").then((m) => ({ default: m.default })));
const CrmContactsPage = lazy(() => import("@/pages/CRM/ContactsPage").then((m) => ({ default: m.default })));
const CrmOrganizationsPage = lazy(() => import("@/pages/CRM/OrganizationsPage").then((m) => ({ default: m.default })));
const CrmFollowUpsPage = lazy(() => import("@/pages/CRM/FollowUpsPage").then((m) => ({ default: m.default })));
const CrmCalendarPage = lazy(() => import("@/pages/CRM/CalendarPage").then((m) => ({ default: m.default })));
const UsersPage = lazy(() => import("@/pages/Admin/UsersPage").then((m) => ({ default: m.UsersPage })));
const UserFormPage = lazy(() => import("@/pages/Admin/UserFormPage").then((m) => ({ default: m.UserFormPage })));
const UserDetailPage = lazy(() => import("@/pages/Admin/UserDetailPage").then((m) => ({ default: m.UserDetailPage })));
const RolesPage = lazy(() => import("@/pages/Admin/RolesPage").then((m) => ({ default: m.RolesPage })));
const RoleDetailPage = lazy(() => import("@/pages/Admin/RoleDetailPage").then((m) => ({ default: m.RoleDetailPage })));
const AccountProfilePage = lazy(() => import("@/pages/Account/AccountProfilePage").then((m) => ({ default: m.AccountProfilePage })));

// Accounting
const AccountingDashboardPage = lazy(() => import("@/pages/Accounting/AccountingDashboardPage").then((m) => ({ default: m.AccountingDashboardPage })));
const GettingStartedPage = lazy(() => import("@/pages/Accounting/GettingStartedPage").then((m) => ({ default: m.GettingStartedPage })));
const ChartOfAccountsPage = lazy(() => import("@/pages/Accounting/ChartOfAccountsPage").then((m) => ({ default: m.ChartOfAccountsPage })));
const CostCentersPage = lazy(() => import("@/pages/Accounting/CostCentersPage").then((m) => ({ default: m.CostCentersPage })));
const FiscalYearsPage = lazy(() => import("@/pages/Accounting/FiscalYearsPage").then((m) => ({ default: m.FiscalYearsPage })));
const PaymentTermsPage = lazy(() => import("@/pages/Accounting/PaymentTermsPage").then((m) => ({ default: m.PaymentTermsPage })));
const ModeOfPaymentPage = lazy(() => import("@/pages/Accounting/ModeOfPaymentPage").then((m) => ({ default: m.ModeOfPaymentPage })));
const TaxTemplatesPage = lazy(() => import("@/pages/Accounting/TaxTemplatesPage").then((m) => ({ default: m.TaxTemplatesPage })));
const JournalEntriesPage = lazy(() => import("@/pages/Accounting/JournalEntriesPage").then((m) => ({ default: m.JournalEntriesPage })));
const JournalEntryFormPage = lazy(() => import("@/pages/Accounting/JournalEntryFormPage").then((m) => ({ default: m.JournalEntryFormPage })));
const ReportGeneralLedgerPage = lazy(() => import("@/pages/Accounting/ReportGeneralLedgerPage").then((m) => ({ default: m.ReportGeneralLedgerPage })));
const ReportTrialBalancePage = lazy(() => import("@/pages/Accounting/ReportTrialBalancePage").then((m) => ({ default: m.ReportTrialBalancePage })));
const ReportBalanceSheetPage = lazy(() => import("@/pages/Accounting/ReportBalanceSheetPage").then((m) => ({ default: m.ReportBalanceSheetPage })));
const ReportProfitAndLossPage = lazy(() => import("@/pages/Accounting/ReportProfitAndLossPage").then((m) => ({ default: m.ReportProfitAndLossPage })));
const ReportCashFlowPage = lazy(() => import("@/pages/Accounting/ReportCashFlowPage").then((m) => ({ default: m.ReportCashFlowPage })));


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

        {/* Accounting */}
        <Route path="accounting" element={<Suspense fallback={<FullPageLoader />}><AccountingDashboardPage /></Suspense>} />
        <Route path="accounting/getting-started" element={<Suspense fallback={<FullPageLoader />}><GettingStartedPage /></Suspense>} />
        <Route path="accounting/chart-of-accounts" element={<Suspense fallback={<FullPageLoader />}><ChartOfAccountsPage /></Suspense>} />
        <Route path="accounting/cost-centers" element={<Suspense fallback={<FullPageLoader />}><CostCentersPage /></Suspense>} />
        <Route path="accounting/fiscal-years" element={<Suspense fallback={<FullPageLoader />}><FiscalYearsPage /></Suspense>} />
        <Route path="accounting/payment-terms" element={<Suspense fallback={<FullPageLoader />}><PaymentTermsPage /></Suspense>} />
        <Route path="accounting/mode-of-payment" element={<Suspense fallback={<FullPageLoader />}><ModeOfPaymentPage /></Suspense>} />
        <Route
          path="accounting/tax-templates/sales"
          element={
            <Suspense fallback={<FullPageLoader />}>
              <TaxTemplatesPage doctype="Sales Taxes and Charges Template" title="Sales Tax Templates" subtitle="Taxes and charges applied on sales invoices and export orders" />
            </Suspense>
          }
        />
        <Route
          path="accounting/tax-templates/purchase"
          element={
            <Suspense fallback={<FullPageLoader />}>
              <TaxTemplatesPage doctype="Purchase Taxes and Charges Template" title="Purchase Tax Templates" subtitle="Taxes and charges applied on purchase invoices" />
            </Suspense>
          }
        />
        <Route path="accounting/journal-entries" element={<Suspense fallback={<FullPageLoader />}><JournalEntriesPage /></Suspense>} />
        <Route path="accounting/journal-entries/new" element={<Suspense fallback={<FullPageLoader />}><JournalEntryFormPage /></Suspense>} />
        <Route path="accounting/journal-entries/:name" element={<Suspense fallback={<FullPageLoader />}><JournalEntryFormPage /></Suspense>} />
        <Route path="accounting/reports/general-ledger" element={<Suspense fallback={<FullPageLoader />}><ReportGeneralLedgerPage /></Suspense>} />
        <Route path="accounting/reports/trial-balance" element={<Suspense fallback={<FullPageLoader />}><ReportTrialBalancePage /></Suspense>} />
        <Route path="accounting/reports/profit-and-loss" element={<Suspense fallback={<FullPageLoader />}><ReportProfitAndLossPage /></Suspense>} />
        <Route path="accounting/reports/balance-sheet" element={<Suspense fallback={<FullPageLoader />}><ReportBalanceSheetPage /></Suspense>} />
        <Route path="accounting/reports/cash-flow" element={<Suspense fallback={<FullPageLoader />}><ReportCashFlowPage /></Suspense>} />
        <Route path="accounting/setup/settings" element={<ComingSoonPage title="Accounts Settings" description="Company-wide accounting policies — rounding, credit limits, stock/GL sync" />} />
        <Route path="accounting/setup/dimensions" element={<ComingSoonPage title="Accounting Dimensions" description="Custom dimensions (e.g. Territory, Project) for deeper financial reporting" />} />

        {/* Settings */}
        <Route path="settings" element={<ComingSoonPage title="Settings" description="Company defaults and workspace preferences" />} />
        <Route path="settings/company" element={<ComingSoonPage title="Company" description="Default company, fiscal year and address" />} />
        <Route path="settings/notifications" element={<ComingSoonPage title="Notifications" description="Alert preferences and email digests" />} />

        {/* My Account */}
        <Route
          path="account"
          element={
            <Suspense fallback={<FullPageLoader />}>
              <AccountProfilePage />
            </Suspense>
          }
        />
        <Route path="account/security" element={<ComingSoonPage title="Security" description="Password and two-factor authentication" />} />

        {/* New module previews (Desktop / login only for now) */}
        <Route path="selling" element={<ComingSoonPage title="Selling" description="Quotations, sales orders and customers" />} />

        {/* CRM */}
        <Route path="crm" element={<Navigate to="/crm/leads" replace />} />
        <Route path="crm/leads" element={<Suspense fallback={<FullPageLoader />}><CrmLeadsPage /></Suspense>} />
        <Route path="crm/leads/new" element={<Suspense fallback={<FullPageLoader />}><CrmLeadFormPage /></Suspense>} />
        <Route path="crm/leads/:name" element={<Suspense fallback={<FullPageLoader />}><CrmLeadDetailPage /></Suspense>} />
        <Route path="crm/leads/:name/edit" element={<Suspense fallback={<FullPageLoader />}><CrmLeadFormPage /></Suspense>} />
        <Route path="crm/deals" element={<Suspense fallback={<FullPageLoader />}><CrmDealsPage /></Suspense>} />
        <Route path="crm/deals/new" element={<Suspense fallback={<FullPageLoader />}><CrmDealFormPage /></Suspense>} />
        <Route path="crm/deals/:name" element={<Suspense fallback={<FullPageLoader />}><CrmDealDetailPage /></Suspense>} />
        <Route path="crm/deals/:name/edit" element={<Suspense fallback={<FullPageLoader />}><CrmDealFormPage /></Suspense>} />
        <Route path="crm/contacts" element={<Suspense fallback={<FullPageLoader />}><CrmContactsPage /></Suspense>} />
        <Route path="crm/contracts" element={<Suspense fallback={<FullPageLoader />}><CrmContractsPage /></Suspense>} />
        <Route path="crm/organizations" element={<Suspense fallback={<FullPageLoader />}><CrmOrganizationsPage /></Suspense>} />
        <Route path="crm/notes" element={<Suspense fallback={<FullPageLoader />}><CrmNotesPage /></Suspense>} />
        <Route path="crm/tasks" element={<Suspense fallback={<FullPageLoader />}><CrmTasksPage /></Suspense>} />
        <Route path="crm/call-logs" element={<Suspense fallback={<FullPageLoader />}><CrmCallLogsPage /></Suspense>} />
        <Route path="crm/follow-ups" element={<Suspense fallback={<FullPageLoader />}><CrmFollowUpsPage /></Suspense>} />
        <Route path="crm/calendar" element={<Suspense fallback={<FullPageLoader />}><CrmCalendarPage /></Suspense>} />
        <Route path="crm/dashboard" element={<ComingSoonPage title="CRM Dashboard" description="Pipeline analytics (coming soon)" />} />

        <Route path="subcontracting" element={<ComingSoonPage title="Subcontracting" description="Subcontracting orders and receipts" />} />
        <Route path="assets" element={<ComingSoonPage title="Assets" description="Fixed asset register, depreciation and maintenance" />} />
        <Route path="support" element={<ComingSoonPage title="Support" description="Issues and customer support tickets" />} />
        <Route path="hr" element={<ComingSoonPage title="HR" description="Employee records, attendance and leave" />} />
        <Route path="payroll" element={<ComingSoonPage title="Payroll" description="Salary structures, slips and payroll entries" />} />

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
