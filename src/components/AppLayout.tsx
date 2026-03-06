'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { maxtronSidebarMenu } from '@/config/navigation/maxtron';
import { keilSidebarMenu } from '@/config/navigation/keil';
import { Sidebar } from './layout/Sidebar';
import { Navbar } from './layout/Navbar';
import { PermissionProvider, usePermissions } from '@/providers/PermissionProvider';

function LayoutContent({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  
  const pathname = usePathname();
  const router = useRouter();
  const activeEntity = pathname?.startsWith('/keil') ? 'keil' : 'maxtron';
  const { hasPermission } = usePermissions();

  useEffect(() => {
    setMounted(true);
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (!token && pathname !== '/login') {
      router.push('/login');
    } else if (token && pathname === '/login') {
      router.push('/maxtron');
    } else if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, [pathname, router]);

  const canShowItem = (allowedRoles?: string[], permissionKey?: string) => {
    // Check dynamic permission first
    if (permissionKey) {
        return hasPermission(permissionKey, 'view');
    }

    // Role-based fallback
    if (!user) return false;
    const userRole = (user?.role_name || '').toLowerCase();
    const isAdmin = userRole === 'admin' || user?.email?.toLowerCase() === 'admin@maxtron.com';
    if (isAdmin) return true;

    if (!allowedRoles || allowedRoles.length === 0) return true;
    return allowedRoles.some(role => role.toLowerCase() === userRole);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  const toggleExpand = (title: string) => {
    setExpanded(prev => ({ ...prev, [title]: !prev[title] }));
  };

  if (!mounted) return null;

  if (pathname === '/login') {
    return <>{children}</>;
  }

  const currentMenu = activeEntity === 'maxtron' ? maxtronSidebarMenu : keilSidebarMenu;

  return (
    <div className="min-h-screen flex bg-background font-sans text-foreground">
      <Sidebar 
        menuItems={currentMenu}
        activeEntity={activeEntity}
        expanded={expanded}
        toggleExpand={toggleExpand}
        canShowItem={canShowItem}
        hasPermission={hasPermission}
        router={router}
      />

      <main className="flex-1 flex flex-col overflow-hidden">
        <Navbar user={user} handleLogout={handleLogout} />

        <div className="flex-1 overflow-auto bg-background p-8">
          {children}
        </div>
      </main>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
    return (
        <PermissionProvider>
            <LayoutContent>{children}</LayoutContent>
        </PermissionProvider>
    );
}
