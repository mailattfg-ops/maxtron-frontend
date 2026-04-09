import {
    Users,
    Settings,
    Package,
    Truck,
    DollarSign,
    TrendingUp,
    Briefcase
} from 'lucide-react';
import { NavItem } from './types';

export const maxtronSidebarMenu: NavItem[] = [
    {
        title: "Dashboard",
        icon: TrendingUp,
        path: "/maxtron",
        permissionKey: "dashboard_view"
    },
    {
        title: "HR & Administration",
        icon: Users,
        permissionKey: "hr_view",
        children: [
            { title: "Employee Management", path: "/maxtron/hr-payroll/employee", permissionKey: "hr_employee_view" },
            { title: "Company Information", path: "/maxtron/hr-payroll/company", permissionKey: "hr_company_view" },
            { title: "Attendance Details", path: "/maxtron/hr-payroll/attendance", permissionKey: "hr_attendance_view" },
            { title: "Attendance Summary", path: "/maxtron/hr-payroll/reports/attendance", permissionKey: "hr_attendance_view" },
        ]
    },
    {
        title: "Marketing Management",
        icon: Briefcase,
        permissionKey: "marketing_view",
        children: [
            { title: "Marketing Operations", path: "/maxtron/hr-payroll/marketing-visits", permissionKey: "marketing_view" },
            { title: "Visit & Quotation Reports", path: "/maxtron/marketing/reports", permissionKey: "marketing_view" },
        ]
    },
    {
        title: "Inventory & Procurement",
        icon: Package,
        permissionKey: "inv_view",
        children: [
            { title: "Raw Material Details", path: "/maxtron/inventory/raw-material", permissionKey: "inv_rm_view" },
            { title: "Supplier Information", path: "/maxtron/inventory/suppliers", permissionKey: "inv_supplier_view" },
            { title: "Raw Material Order", path: "/maxtron/inventory/order", permissionKey: "inv_order_view" },
            { title: "Purchase Entry", path: "/maxtron/inventory/purchase", permissionKey: "inv_purchase_view" },
            { title: "Purchase Returns", path: "/maxtron/inventory/returns", permissionKey: "inv_purchase_view" },
            { title: "Material Consumption", path: "/maxtron/inventory/consumption", permissionKey: "inv_consumption_view" },
            { title: "Stock List", path: "/maxtron/inventory/reports/stock", permissionKey: "inv_rm_view" },
            { title: "Purchase Report", path: "/maxtron/inventory/reports/purchase", permissionKey: "inv_purchase_view" },
            { title: "Consumption Report", path: "/maxtron/inventory/reports/consumption", permissionKey: "inv_consumption_view" }
        ]
    },
    {
        title: "Production MES",
        icon: Settings,
        permissionKey: "prod_view",
        children: [
            { title: "Production (Extrusion)", path: "/maxtron/production/extrusion", permissionKey: "prod_extrusion_view" },
            { title: "Printing Section", path: "/maxtron/production/printing", permissionKey: "prod_extrusion_view" },
            { title: "Cutting & Sealing", path: "/maxtron/production/cutting", permissionKey: "prod_cutting_view" },
            { title: "Packing Details", path: "/maxtron/production/packing", permissionKey: "prod_packing_view" },
            { title: "Damages & Wastage", path: "/maxtron/production/wastage", permissionKey: "prod_product_view" },
            { title: "Miscellaneous Expenses", path: "/maxtron/production/expenses", permissionKey: "prod_extrusion_view" },
            { title: "Production Summary", path: "/maxtron/production/reports/summary", permissionKey: "prod_extrusion_view" },
            { title: "Packing Summary", path: "/maxtron/production/reports/packing", permissionKey: "prod_packing_view" },
            { title: "Finished Good Stock List", path: "/maxtron/production/reports/fg-stock", permissionKey: "prod_product_view" },
            { title: "Wastage Analysis", path: "/maxtron/production/reports/wastage", permissionKey: "prod_product_view" }
        ]
    },
    {
        title: "Sales & Logistics",
        icon: Truck,
        permissionKey: "sales_view",
        children: [
            { title: "Customer Information", path: "/maxtron/sales/customers", permissionKey: "sales_customers_view" },
            { title: "Vehicle Information", path: "/maxtron/sales/vehicles", permissionKey: "sales_vehicles_view" },
            { title: "Customer Order Entry", path: "/maxtron/sales/order", permissionKey: "sales_orders_view" },
            { title: "Sales / Invoice Entry", path: "/maxtron/sales/invoice", permissionKey: "sales_invoice_view" },
            { title: "Delivery Details", path: "/maxtron/sales/delivery", permissionKey: "sales_orders_view" },
            { title: "Sales Returns", path: "/maxtron/sales/returns", permissionKey: "sales_invoice_view" },
            { title: "Order Report", path: "/maxtron/sales/reports/orders", permissionKey: "sales_orders_view" },
            { title: "Billing Summary", path: "/maxtron/sales/reports/billing", permissionKey: "sales_invoice_view" },
            { title: "Delivery Report", path: "/maxtron/sales/reports/delivery", permissionKey: "sales_orders_view" }
        ]
    },
    {
        title: "Finance & Accounts",
        icon: DollarSign,
        permissionKey: "fin_view",
        children: [
            { title: "Payroll Management", path: "/maxtron/finance/payroll", permissionKey: "fin_payment_view" },
            { title: "Customer Collection Entry", path: "/maxtron/finance/collection", permissionKey: "fin_collection_view" },
            { title: "Supplier Payment Entry", path: "/maxtron/finance/payment", permissionKey: "fin_payment_view" },
            { title: "Petty Cash Entry", path: "/maxtron/finance/petty-cash", permissionKey: "fin_petty_cash_view" },
            { title: "Customer Ledger", path: "/maxtron/finance/reports/customer-ledger", permissionKey: "fin_collection_view" },
            { title: "Supplier Ledger", path: "/maxtron/finance/reports/supplier-ledger", permissionKey: "fin_payment_view" },
            { title: "Financial Summary", path: "/maxtron/finance/reports/summary", permissionKey: "fin_petty_cash_view" },
            { title: "Period Wise Scorecard", path: "/maxtron/finance/reports/scorecard", permissionKey: "fin_collection_view" },
            { title: "Miscellaneous Expenses", path: "/maxtron/finance/reports/miscellaneous-expenses", permissionKey: "fin_petty_cash_view" }
        ]
    },
    {
        title: "System Administration",
        icon: Settings,
        roles: ["admin"],
        children: [
            { title: "User Roles", path: "/maxtron/admin/user-types", permissionKey: "admin_permissions" },
            { title: "Employee Categories", path: "/maxtron/admin/employee-categories", permissionKey: "admin_permissions" },
            { title: "Raw Materials Types", path: "/maxtron/admin/rm-type-codes", permissionKey: "admin_permissions" },
            { title: "Finished Products", path: "/maxtron/production/product", permissionKey: "admin_permissions" },
            { title: "Permission Console", path: "/maxtron/admin/permissions", permissionKey: "admin_permissions" },
        ]
    }
];
