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
const MaterialRequestsPage = lazy(() => import("@/pages/Import/MaterialRequestsPage").then((m) => ({ default: m.MaterialRequestsPage })));
const MaterialRequestFormPage = lazy(() => import("@/pages/Import/MaterialRequestFormPage").then((m) => ({ default: m.MaterialRequestFormPage })));
const MaterialRequestDetailPage = lazy(() => import("@/pages/Import/MaterialRequestDetailPage").then((m) => ({ default: m.MaterialRequestDetailPage })));
const RequestForQuotationsPage = lazy(() => import("@/pages/Import/RequestForQuotationsPage").then((m) => ({ default: m.RequestForQuotationsPage })));
const RequestForQuotationFormPage = lazy(() => import("@/pages/Import/RequestForQuotationFormPage").then((m) => ({ default: m.RequestForQuotationFormPage })));
const RequestForQuotationDetailPage = lazy(() => import("@/pages/Import/RequestForQuotationDetailPage").then((m) => ({ default: m.RequestForQuotationDetailPage })));
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
const SalesOrdersPage = lazy(() => import("@/pages/Selling/SalesOrdersPage").then((m) => ({ default: m.SalesOrdersPage })));
const SalesOrderFormPage = lazy(() => import("@/pages/Selling/SalesOrderFormPage").then((m) => ({ default: m.SalesOrderFormPage })));
const SalesOrderDetailPage = lazy(() => import("@/pages/Selling/SalesOrderDetailPage").then((m) => ({ default: m.SalesOrderDetailPage })));
const DeliveryNotesPage = lazy(() => import("@/pages/Selling/DeliveryNotesPage").then((m) => ({ default: m.DeliveryNotesPage })));
const DeliveryNoteFormPage = lazy(() => import("@/pages/Selling/DeliveryNoteFormPage").then((m) => ({ default: m.DeliveryNoteFormPage })));
const DeliveryNoteDetailPage = lazy(() => import("@/pages/Selling/DeliveryNoteDetailPage").then((m) => ({ default: m.DeliveryNoteDetailPage })));
const SalesInvoicesPage = lazy(() => import("@/pages/Selling/SalesInvoicesPage").then((m) => ({ default: m.SalesInvoicesPage })));
const SalesInvoiceFormPage = lazy(() => import("@/pages/Selling/SalesInvoiceFormPage").then((m) => ({ default: m.SalesInvoiceFormPage })));
const SalesInvoiceDetailPage = lazy(() => import("@/pages/Selling/SalesInvoiceDetailPage").then((m) => ({ default: m.SalesInvoiceDetailPage })));
const StockEntriesPage = lazy(() => import("@/pages/Inventory/StockEntriesPage").then((m) => ({ default: m.StockEntriesPage })));
const StockEntryFormPage = lazy(() => import("@/pages/Inventory/StockEntryFormPage").then((m) => ({ default: m.StockEntryFormPage })));
const StockEntryDetailPage = lazy(() => import("@/pages/Inventory/StockEntryDetailPage").then((m) => ({ default: m.StockEntryDetailPage })));
const ReportStockLedgerPage = lazy(() => import("@/pages/Inventory/ReportStockLedgerPage").then((m) => ({ default: m.ReportStockLedgerPage })));
const CompanyWebsitePage = lazy(() => import("@/pages/Website/CompanyWebsitePage").then((m) => ({ default: m.CompanyWebsitePage })));
const CrmLeadsPage = lazy(() => import("@/pages/CRM/LeadsPage").then((m) => ({ default: m.LeadsPage })));
const CrmLeadDetailPage = lazy(() => import("@/pages/CRM/LeadDetailPage").then((m) => ({ default: m.LeadDetailPage })));
const CrmLeadFormPage = lazy(() => import("@/pages/CRM/LeadFormPage").then((m) => ({ default: m.LeadFormPage })));
const CrmDealsPage = lazy(() => import("@/pages/CRM/DealsPage").then((m) => ({ default: m.DealsPage })));
const CrmDealDetailPage = lazy(() => import("@/pages/CRM/DealDetailPage").then((m) => ({ default: m.DealDetailPage })));
const CrmDealFormPage = lazy(() => import("@/pages/CRM/DealFormPage").then((m) => ({ default: m.DealFormPage })));
const CrmDashboardPageLazy = lazy(() => import("@/pages/CRM/DashboardPage").then((m) => ({ default: m.CrmDashboardPage })));
const HrEmployeesPage = lazy(() => import("@/pages/HR/EmployeesPage").then((m) => ({ default: m.default })));
const HrEmployeeDetailPage = lazy(() => import("@/pages/HR/EmployeeDetailPage").then((m) => ({ default: m.default })));
const HrDepartmentsPage = lazy(() => import("@/pages/HR/DepartmentsPage").then((m) => ({ default: m.default })));
const HrDesignationsPage = lazy(() => import("@/pages/HR/DesignationsPage").then((m) => ({ default: m.default })));
const HrBranchesPage = lazy(() => import("@/pages/HR/BranchesPage").then((m) => ({ default: m.default })));
const HrAttendancePage = lazy(() => import("@/pages/HR/AttendancePage").then((m) => ({ default: m.default })));
const HrEmployeeCheckinsPage = lazy(() => import("@/pages/HR/EmployeeCheckinsPage").then((m) => ({ default: m.default })));
const HrLeaveApplicationsPage = lazy(() => import("@/pages/HR/LeaveApplicationsPage").then((m) => ({ default: m.default })));
const HrLeaveAllocationsPage = lazy(() => import("@/pages/HR/LeaveAllocationsPage").then((m) => ({ default: m.default })));
const HrHolidayListsPage = lazy(() => import("@/pages/HR/HolidayListsPage").then((m) => ({ default: m.default })));
const HrExpenseClaimsPage = lazy(() => import("@/pages/HR/ExpenseClaimsPage").then((m) => ({ default: m.default })));
const HrEmployeeAdvancesPage = lazy(() => import("@/pages/HR/EmployeeAdvancesPage").then((m) => ({ default: m.default })));
const HrGratuityPage = lazy(() => import("@/pages/HR/GratuityPage").then((m) => ({ default: m.default })));
const HrShiftAssignmentsPage = lazy(() => import("@/pages/HR/ShiftAssignmentsPage").then((m) => ({ default: m.default })));
const PayrollSalaryComponentsPage = lazy(() => import("@/pages/Payroll/SalaryComponentsPage").then((m) => ({ default: m.default })));
const PayrollSalaryStructuresPage = lazy(() => import("@/pages/Payroll/SalaryStructuresPage").then((m) => ({ default: m.default })));
const PayrollSalaryStructureAssignmentsPage = lazy(() => import("@/pages/Payroll/SalaryStructureAssignmentsPage").then((m) => ({ default: m.default })));
const PayrollSalarySlipsPage = lazy(() => import("@/pages/Payroll/SalarySlipsPage").then((m) => ({ default: m.default })));
const PayrollSalarySlipDetailPage = lazy(() => import("@/pages/Payroll/SalarySlipDetailPage").then((m) => ({ default: m.default })));
const PayrollPayrollEntriesPage = lazy(() => import("@/pages/Payroll/PayrollEntriesPage").then((m) => ({ default: m.default })));
const CrmTasksPage = lazy(() => import("@/pages/CRM/TasksPage").then((m) => ({ default: m.default })));
const CrmNotesPage = lazy(() => import("@/pages/CRM/NotesPage").then((m) => ({ default: m.default })));
const CrmCallLogsPage = lazy(() => import("@/pages/CRM/CallLogsPage").then((m) => ({ default: m.default })));
const CrmContractsPage = lazy(() => import("@/pages/CRM/ContractsPage").then((m) => ({ default: m.default })));
const CrmContactsPage = lazy(() => import("@/pages/CRM/ContactsPage").then((m) => ({ default: m.default })));
const CrmOrganizationsPage = lazy(() => import("@/pages/CRM/OrganizationsPage").then((m) => ({ default: m.default })));
const CrmFollowUpsPage = lazy(() => import("@/pages/CRM/FollowUpsPage").then((m) => ({ default: m.default })));
const CrmProspectScraperPage = lazy(() => import("@/pages/CRM/ProspectScraperPage").then((m) => ({ default: m.default })));
const CrmCalendarPage = lazy(() => import("@/pages/CRM/CalendarPage").then((m) => ({ default: m.default })));
const CrmLeadSourcesPage = lazy(() => import("@/pages/CRM/LeadSourcesPage").then((m) => ({ default: m.default })));
const CrmLeadStatusesPage = lazy(() => import("@/pages/CRM/LeadStatusesPage").then((m) => ({ default: m.default })));
const CrmTerritoriesPage = lazy(() => import("@/pages/CRM/TerritoriesPage").then((m) => ({ default: m.default })));
const CrmIndustriesPage = lazy(() => import("@/pages/CRM/IndustriesPage").then((m) => ({ default: m.default })));
const CrmSalutationsPage = lazy(() => import("@/pages/CRM/SalutationsPage").then((m) => ({ default: m.default })));
const UsersPage = lazy(() => import("@/pages/Admin/UsersPage").then((m) => ({ default: m.UsersPage })));
const UserFormPage = lazy(() => import("@/pages/Admin/UserFormPage").then((m) => ({ default: m.UserFormPage })));
const UserDetailPage = lazy(() => import("@/pages/Admin/UserDetailPage").then((m) => ({ default: m.UserDetailPage })));
const RolesPage = lazy(() => import("@/pages/Admin/RolesPage").then((m) => ({ default: m.RolesPage })));
const RoleDetailPage = lazy(() => import("@/pages/Admin/RoleDetailPage").then((m) => ({ default: m.RoleDetailPage })));
const AccountProfilePage = lazy(() => import("@/pages/Account/AccountProfilePage").then((m) => ({ default: m.AccountProfilePage })));

// Accounting
const AccountingDashboardPage = lazy(() => import("@/pages/Accounting/AccountingDashboardPage").then((m) => ({ default: m.AccountingDashboardPage })));
const GettingStartedPage = lazy(() => import("@/pages/Accounting/GettingStartedPage").then((m) => ({ default: m.GettingStartedPage })));
const NotificationsPage = lazy(() => import("@/pages/Settings/NotificationsPage").then((m) => ({ default: m.NotificationsPage })));
const ChartOfAccountsPage = lazy(() => import("@/pages/Accounting/ChartOfAccountsPage").then((m) => ({ default: m.ChartOfAccountsPage })));
const CostCentersPage = lazy(() => import("@/pages/Accounting/CostCentersPage").then((m) => ({ default: m.CostCentersPage })));
const FiscalYearsPage = lazy(() => import("@/pages/Accounting/FiscalYearsPage").then((m) => ({ default: m.FiscalYearsPage })));
const PaymentTermsPage = lazy(() => import("@/pages/Accounting/PaymentTermsPage").then((m) => ({ default: m.PaymentTermsPage })));
const ModeOfPaymentPage = lazy(() => import("@/pages/Accounting/ModeOfPaymentPage").then((m) => ({ default: m.ModeOfPaymentPage })));
const TaxTemplatesPage = lazy(() => import("@/pages/Accounting/TaxTemplatesPage").then((m) => ({ default: m.TaxTemplatesPage })));
const JournalEntriesPage = lazy(() => import("@/pages/Accounting/JournalEntriesPage").then((m) => ({ default: m.JournalEntriesPage })));
const JournalEntryFormPage = lazy(() => import("@/pages/Accounting/JournalEntryFormPage").then((m) => ({ default: m.JournalEntryFormPage })));
const PaymentEntriesPage = lazy(() => import("@/pages/Accounting/PaymentEntriesPage").then((m) => ({ default: m.PaymentEntriesPage })));
const PaymentEntryFormPage = lazy(() => import("@/pages/Accounting/PaymentEntryFormPage").then((m) => ({ default: m.PaymentEntryFormPage })));
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
      {/* Marketing site for MicroMax Erp Pvt Ltd — public, code-split. */}
      <Route
        path="/website"
        element={
          <Suspense fallback={<FullPageLoader />}>
            <CompanyWebsitePage />
          </Suspense>
        }
      />

      {/* Authenticated shell */}
      <Route element={<AppShell />}>
        <Route index element={<DesktopPage />} />
        <Route path="dashboard" element={<DashboardPage />} />

        {/* Import */}
        <Route path="import/material-requests" element={<Suspense fallback={<FullPageLoader />}><MaterialRequestsPage /></Suspense>} />
        <Route path="import/material-requests/new" element={<Suspense fallback={<FullPageLoader />}><MaterialRequestFormPage /></Suspense>} />
        <Route path="import/material-requests/:name" element={<Suspense fallback={<FullPageLoader />}><MaterialRequestDetailPage /></Suspense>} />
        <Route path="import/material-requests/:name/edit" element={<Suspense fallback={<FullPageLoader />}><MaterialRequestFormPage /></Suspense>} />
        <Route path="import/rfqs" element={<Suspense fallback={<FullPageLoader />}><RequestForQuotationsPage /></Suspense>} />
        <Route path="import/rfqs/new" element={<Suspense fallback={<FullPageLoader />}><RequestForQuotationFormPage /></Suspense>} />
        <Route path="import/rfqs/:name" element={<Suspense fallback={<FullPageLoader />}><RequestForQuotationDetailPage /></Suspense>} />
        <Route path="import/rfqs/:name/edit" element={<Suspense fallback={<FullPageLoader />}><RequestForQuotationFormPage /></Suspense>} />
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
        <Route path="inventory/stock-entries" element={<Suspense fallback={<FullPageLoader />}><StockEntriesPage /></Suspense>} />
        <Route path="inventory/stock-entries/new" element={<Suspense fallback={<FullPageLoader />}><StockEntryFormPage /></Suspense>} />
        <Route path="inventory/stock-entries/:name" element={<Suspense fallback={<FullPageLoader />}><StockEntryDetailPage /></Suspense>} />
        <Route path="inventory/stock-entries/:name/edit" element={<Suspense fallback={<FullPageLoader />}><StockEntryFormPage /></Suspense>} />
        <Route path="inventory/reports/stock-ledger" element={<Suspense fallback={<FullPageLoader />}><ReportStockLedgerPage /></Suspense>} />

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
        <Route path="accounting/payment-entries" element={<Suspense fallback={<FullPageLoader />}><PaymentEntriesPage /></Suspense>} />
        <Route path="accounting/payment-entries/new" element={<Suspense fallback={<FullPageLoader />}><PaymentEntryFormPage /></Suspense>} />
        <Route path="accounting/payment-entries/:name" element={<Suspense fallback={<FullPageLoader />}><PaymentEntryFormPage /></Suspense>} />
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
        <Route path="settings/notifications" element={<Suspense fallback={<FullPageLoader />}><NotificationsPage /></Suspense>} />

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
        <Route path="selling/sales-orders" element={<Suspense fallback={<FullPageLoader />}><SalesOrdersPage /></Suspense>} />
        <Route path="selling/sales-orders/new" element={<Suspense fallback={<FullPageLoader />}><SalesOrderFormPage /></Suspense>} />
        <Route path="selling/sales-orders/:name" element={<Suspense fallback={<FullPageLoader />}><SalesOrderDetailPage /></Suspense>} />
        <Route path="selling/sales-orders/:name/edit" element={<Suspense fallback={<FullPageLoader />}><SalesOrderFormPage /></Suspense>} />
        <Route path="selling/delivery-notes" element={<Suspense fallback={<FullPageLoader />}><DeliveryNotesPage /></Suspense>} />
        <Route path="selling/delivery-notes/new" element={<Suspense fallback={<FullPageLoader />}><DeliveryNoteFormPage /></Suspense>} />
        <Route path="selling/delivery-notes/:name" element={<Suspense fallback={<FullPageLoader />}><DeliveryNoteDetailPage /></Suspense>} />
        <Route path="selling/delivery-notes/:name/edit" element={<Suspense fallback={<FullPageLoader />}><DeliveryNoteFormPage /></Suspense>} />
        <Route path="selling/sales-invoices" element={<Suspense fallback={<FullPageLoader />}><SalesInvoicesPage /></Suspense>} />
        <Route path="selling/sales-invoices/new" element={<Suspense fallback={<FullPageLoader />}><SalesInvoiceFormPage /></Suspense>} />
        <Route path="selling/sales-invoices/:name" element={<Suspense fallback={<FullPageLoader />}><SalesInvoiceDetailPage /></Suspense>} />
        <Route path="selling/sales-invoices/:name/edit" element={<Suspense fallback={<FullPageLoader />}><SalesInvoiceFormPage /></Suspense>} />

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
        <Route path="crm/prospect-scraper" element={<Suspense fallback={<FullPageLoader />}><CrmProspectScraperPage /></Suspense>} />
        <Route path="crm/calendar" element={<Suspense fallback={<FullPageLoader />}><CrmCalendarPage /></Suspense>} />
        <Route path="crm/masters/lead-sources" element={<Suspense fallback={<FullPageLoader />}><CrmLeadSourcesPage /></Suspense>} />
        <Route path="crm/masters/lead-statuses" element={<Suspense fallback={<FullPageLoader />}><CrmLeadStatusesPage /></Suspense>} />
        <Route path="crm/masters/territories" element={<Suspense fallback={<FullPageLoader />}><CrmTerritoriesPage /></Suspense>} />
        <Route path="crm/masters/industries" element={<Suspense fallback={<FullPageLoader />}><CrmIndustriesPage /></Suspense>} />
        <Route path="crm/masters/salutations" element={<Suspense fallback={<FullPageLoader />}><CrmSalutationsPage /></Suspense>} />
        <Route path="crm/dashboard" element={<Suspense fallback={<FullPageLoader />}><CrmDashboardPageLazy /></Suspense>} />

        <Route path="subcontracting" element={<ComingSoonPage title="Subcontracting" description="Subcontracting orders and receipts" />} />
        <Route path="assets" element={<ComingSoonPage title="Assets" description="Fixed asset register, depreciation and maintenance" />} />
        <Route path="support" element={<ComingSoonPage title="Support" description="Issues and customer support tickets" />} />
        {/* HR */}
        <Route path="hr" element={<Navigate to="/hr/employees" replace />} />
        <Route path="hr/employees" element={<Suspense fallback={<FullPageLoader />}><HrEmployeesPage /></Suspense>} />
        <Route path="hr/employees/:name" element={<Suspense fallback={<FullPageLoader />}><HrEmployeeDetailPage /></Suspense>} />
        <Route path="hr/departments" element={<Suspense fallback={<FullPageLoader />}><HrDepartmentsPage /></Suspense>} />
        <Route path="hr/designations" element={<Suspense fallback={<FullPageLoader />}><HrDesignationsPage /></Suspense>} />
        <Route path="hr/branches" element={<Suspense fallback={<FullPageLoader />}><HrBranchesPage /></Suspense>} />
        <Route path="hr/attendance" element={<Suspense fallback={<FullPageLoader />}><HrAttendancePage /></Suspense>} />
        <Route path="hr/checkins" element={<Suspense fallback={<FullPageLoader />}><HrEmployeeCheckinsPage /></Suspense>} />
        <Route path="hr/leave-applications" element={<Suspense fallback={<FullPageLoader />}><HrLeaveApplicationsPage /></Suspense>} />
        <Route path="hr/leave-allocations" element={<Suspense fallback={<FullPageLoader />}><HrLeaveAllocationsPage /></Suspense>} />
        <Route path="hr/holiday-lists" element={<Suspense fallback={<FullPageLoader />}><HrHolidayListsPage /></Suspense>} />
        <Route path="hr/expense-claims" element={<Suspense fallback={<FullPageLoader />}><HrExpenseClaimsPage /></Suspense>} />
        <Route path="hr/advances" element={<Suspense fallback={<FullPageLoader />}><HrEmployeeAdvancesPage /></Suspense>} />
        <Route path="hr/gratuity" element={<Suspense fallback={<FullPageLoader />}><HrGratuityPage /></Suspense>} />
        <Route path="hr/shift-assignments" element={<Suspense fallback={<FullPageLoader />}><HrShiftAssignmentsPage /></Suspense>} />

        {/* Payroll */}
        <Route path="payroll" element={<Navigate to="/payroll/salary-slips" replace />} />
        <Route path="payroll/salary-components" element={<Suspense fallback={<FullPageLoader />}><PayrollSalaryComponentsPage /></Suspense>} />
        <Route path="payroll/salary-structures" element={<Suspense fallback={<FullPageLoader />}><PayrollSalaryStructuresPage /></Suspense>} />
        <Route path="payroll/salary-structure-assignments" element={<Suspense fallback={<FullPageLoader />}><PayrollSalaryStructureAssignmentsPage /></Suspense>} />
        <Route path="payroll/salary-slips" element={<Suspense fallback={<FullPageLoader />}><PayrollSalarySlipsPage /></Suspense>} />
        <Route path="payroll/salary-slips/:name" element={<Suspense fallback={<FullPageLoader />}><PayrollSalarySlipDetailPage /></Suspense>} />
        <Route path="payroll/entries" element={<Suspense fallback={<FullPageLoader />}><PayrollPayrollEntriesPage /></Suspense>} />

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
