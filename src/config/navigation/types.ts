import { LucideIcon } from 'lucide-react';

export interface NavChild {
    title: string;
    path: string;
    roles?: string[];
    permissionKey?: string;
}

export interface NavItem {
    title: string;
    icon: LucideIcon;
    path?: string;
    roles?: string[];
    children?: NavChild[];
    permissionKey?: string;
}
