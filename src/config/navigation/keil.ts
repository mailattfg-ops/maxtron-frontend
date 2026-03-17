import {
    Users,
    Settings,
    TrendingUp,
    Truck
} from 'lucide-react';
import { NavItem } from './types';

export const keilSidebarMenu: NavItem[] = [
    {
        title: "KEIL Dashboard",
        icon: TrendingUp,
        path: "/keil",
        permissionKey: "dashboard_view"
    },
    {
        title: "HR & Administration",
        icon: Users,
        permissionKey: "hr_view",
        children: [
            { title: "Employee Management", path: "/keil/hr-payroll/employee", permissionKey: "hr_employee_view" },
            { title: "Branch Registry", path: "/keil/operations/branch", permissionKey: "prod_product_view" },
            { title: "Company Information", path: "/keil/hr-payroll/company", permissionKey: "hr_company_view" },
            { title: "Attendance Details", path: "/keil/hr-payroll/attendance", permissionKey: "hr_attendance_view" },
            { title: "Attendance Summary", path: "/keil/hr-payroll/reports/attendance", permissionKey: "hr_attendance_view" },
            { title: "Expense Heads", path: "/keil/hr-payroll/expense-heads", permissionKey: "hr_expense_view" },
            { title: "Expenditure Entry", path: "/keil/hr-payroll/expenditures", permissionKey: "hr_expense_view" },
            { title: "Payroll Management", path: "/keil/hr-payroll/payroll", permissionKey: "hr_payroll_view" },
        ]
    },
    {
        title: "Operations & Route Management",
        icon: Settings,
        permissionKey: "prod_view",
        children: [
            { title: "HCE Registry", path: "/keil/operations/hce", permissionKey: "prod_product_view" },
            { title: "Route Registry", path: "/keil/operations/route", permissionKey: "prod_product_view" },
            { title: "Route Assignments", path: "/keil/operations/assignments", permissionKey: "prod_product_view" },
            { title: "Daily Collection Entry", path: "/keil/operations/collection", permissionKey: "prod_product_view" },
            { title: "Route Collection Map", path: "/keil/operations/reports/route", permissionKey: "prod_product_view" },
            { title: "HCE Service Ledger", path: "/keil/operations/reports/ledger", permissionKey: "prod_product_view" }
        ]
    },
    {
        title: "Fleet & Maintenance",
        icon: Truck,
        permissionKey: "prod_view", // Placeholder permission
        children: [
            { title: "Vehicle Master", path: "/keil/fleet/vehicles", permissionKey: "prod_product_view" },
            { title: "Vehicle Daily Logs", path: "/keil/fleet/logs", permissionKey: "prod_product_view" },
            { title: "Repair & Workshop", path: "/keil/fleet/repairs", permissionKey: "prod_product_view" },
            { title: "Fleet Intelligence", path: "/keil/fleet/reports", permissionKey: "prod_product_view" }
        ]
    },
    {
        title: "System Administration",
        icon: Settings,
        roles: ["admin"],
        children: [
            { title: "User Roles", path: "/keil/admin/user-types", permissionKey: "admin_permissions" },
            { title: "Employee Category", path: "/keil/admin/employee-categories", permissionKey: "admin_permissions" },
            { title: "Permission Console", path: "/keil/admin/permissions", permissionKey: "admin_permissions" },
        ]
    }
];
