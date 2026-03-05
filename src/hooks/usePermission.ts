'use client';

import { useState, useEffect } from 'react';

export function usePermission() {
    const [user, setUser] = useState<any>(() => {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('user');
            if (stored) {
                try { return JSON.parse(stored); } catch (e) { return null; }
            }
        }
        return null;
    });

    const isAdmin = user?.role_name?.toLowerCase() === 'admin' || user?.email?.toLowerCase() === 'admin@maxtron.com';

    const hasPermission = (permissionKey: string, action: string = 'can_view') => {
        // Basic role-based access: Admin has full access, others are restricted for now
        // You can extend this logic to check specific roles for specific keys if needed
        if (isAdmin) return true;

        // Simple mapping example:
        // if (permissionKey.startsWith('hr_') && user?.role_name?.toLowerCase() === 'hr') return true;

        return false;
    };

    return { hasPermission, user };
}
