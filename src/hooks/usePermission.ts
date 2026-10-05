'use client';

import { usePermissions } from '@/providers/PermissionProvider';
import { useState, useEffect } from 'react';

export function usePermission() {
    const { hasPermission, loading } = usePermissions();
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('user');
            if (stored) {
                try { setUser(JSON.parse(stored)); } catch (e) { }
            }
        }
    }, []);

    const roleName = (user?.role_name || user?.user_types?.name || '').toLowerCase();
    const isMarketing = roleName.includes('marketing');
    const isAdmin = roleName === 'admin' || user?.email?.toLowerCase() === 'admin@maxtron.com';

    return { hasPermission, user, loading, isMarketing, isAdmin };
}
