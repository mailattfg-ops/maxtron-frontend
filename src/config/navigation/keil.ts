import {
    Users,
    Settings,
    TrendingUp
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
            { title: "Company Information", path: "/keil/hr-payroll/company", permissionKey: "hr_company_view" },
            { title: "Attendance Details", path: "/keil/hr-payroll/attendance", permissionKey: "hr_attendance_view" },
            { title: "Attendance Summary", path: "/keil/hr-payroll/reports/attendance", permissionKey: "hr_attendance_view" },
        ]
    },
    {
        title: "Operations",
        icon: Settings,
        permissionKey: "prod_view",
        children: [
            { title: "Project Assignments", path: "/keil/projects", permissionKey: "prod_product_view" },
            { title: "Resource Allocation", path: "/keil/resources", permissionKey: "prod_product_view" }
        ]
    },
    {
        title: "System Administration",
        icon: Settings,
        roles: ["admin"],
        children: [
            { title: "User Roles", path: "/keil/admin/user-types", permissionKey: "admin_permissions" },
            { title: "Permission Console", path: "/keil/admin/permissions", permissionKey: "admin_permissions" },
        ]
    }
];
