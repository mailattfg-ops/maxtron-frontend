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
                console.warn('[PermissionProvider] No Role ID found for user.');
                setLoading(false);
                return;
            }

            const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || 'http://localhost:5000';
            const apiUrl = `${baseUrl}/api/${activeEntity}/permissions/${roleId}`;
            
            console.log(`[PermissionProvider] Fetching permissions from: ${apiUrl}`);
            
            const res = await fetch(apiUrl, {
                method: 'GET',
                headers: { 
                    'Authorization': `Bearer ${token}`.trim(),
                    'Accept': 'application/json'
                }
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                console.error(`[PermissionProvider] API Error (${res.status}):`, errorData);
                return;
            }

            const data = await res.json();
            if (data.success) {
                setPermissions(data.data);
            }
        } catch (err: any) {
            console.error('[PermissionProvider] Network Error:', err.message);
            // Fallback for demo users if backend is unreachable
            if (storedUser.includes('admin@maxtron.com')) {
                console.info('[PermissionProvider] Granting full permissions to demo admin despite fetch failure.');
                setPermissions([{ permission_key: '*', can_view: true, can_create: true, can_edit: true, can_delete: true }]);
            }
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
