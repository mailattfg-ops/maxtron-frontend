'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

interface PermissionContextType {
    permissions: any[];
    hasPermission: (permissionKey: string, action: string) => boolean;
    loading: boolean;
    refreshPermissions: () => Promise<void>;
}

const PermissionContext = createContext<PermissionContextType>({
    permissions: [],
    hasPermission: () => false,
    loading: true,
    refreshPermissions: async () => {}
});

export const PermissionProvider = ({ children }: { children: React.ReactNode }) => {
    const [permissions, setPermissions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const pathname = usePathname();
    const activeEntity = pathname?.startsWith('/keil') ? 'keil' : 'maxtron';

    const fetchUserPermissions = async () => {
        const token = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');
        if (!token || !storedUser) {
            setLoading(false);
            return;
        }

        try {
            const user = JSON.parse(storedUser);
            const roleId = user.user_type_id || user.type;
            if (!roleId) {
                setLoading(false);
                return;
            }

            const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/${activeEntity}/permissions/${roleId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setPermissions(data.data);
            }
        } catch (err) {
            console.error('Permission fetch failed:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUserPermissions();
        
        // Polling for permission updates (every 30s)
        const interval = setInterval(fetchUserPermissions, 30000);
        return () => clearInterval(interval);
    }, [pathname]);

    const hasPermission = (permissionKey: string, action: string) => {
        const storedUser = localStorage.getItem('user');
        if (!storedUser) return false;
        const user = JSON.parse(storedUser);
        
        const isAdmin = user?.role_name?.toLowerCase() === 'admin' || user?.email?.toLowerCase() === 'admin@maxtron.com';
        if (isAdmin) return true;

        if (permissionKey === 'company_switching') return true;

        const field = `can_${action}`;
        const perm = permissions.find(p => p.permission_key === permissionKey);
        
        return perm ? !!perm[field] : false;
    };

    return (
        <PermissionContext.Provider value={{ permissions, hasPermission, loading, refreshPermissions: fetchUserPermissions }}>
            {children}
        </PermissionContext.Provider>
    );
};

export const usePermissions = () => useContext(PermissionContext);
