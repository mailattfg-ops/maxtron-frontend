'use client';

import { 
  Briefcase, 
  Package, 
  ShoppingCart, 
  Users, 
  DollarSign, 
  TrendingUp, 
  Menu, 
  Bell, 
  Search, 
  ChevronDown
} from 'lucide-react';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<any>(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    const token = localStorage.getItem('token');
    if (!token && pathname !== '/login') {
      router.push('/login');
    } else if (token && pathname === '/login') {
      router.push('/');
    } else if (token) {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch (e) {}
      }
    }
  }, [pathname, router]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  if (!mounted) return null;

  if (pathname === '/login') {
    return <>{children}</>;
  }

  const navItems = [
    { icon: TrendingUp, label: 'Dashboard', href: '/' },
    { icon: Package, label: 'Inventory', href: '/inventory' },
    { icon: ShoppingCart, label: 'Sales', href: '/sales' },
    { icon: Briefcase, label: 'Production', href: '/production' },
    { icon: Users, label: 'HR & Payroll', href: '/hr-payroll' },
    { icon: DollarSign, label: 'Finance', href: '/finance' },
  ];

  return (
    <div className="min-h-screen flex bg-background font-sans text-foreground">
      {/* Sidebar */}
      <aside className="w-64 bg-primary text-primary-foreground hidden md:flex flex-col shadow-xl">
        <div className="p-6 flex items-center justify-center border-b border-primary/20">
          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center mr-3 text-primary font-bold text-xl shadow-inner">
            M
          </div>
          <h1 className="text-2xl font-bold tracking-wider">Maxtron</h1>
        </div>
        
        <nav className="flex-1 py-6">
          <ul className="space-y-2">
            {navItems.map((item, idx) => {
              const isActive = pathname === item.href;
              return (
                <li key={idx}>
                  <Link
                    href={item.href}
                    className={`flex items-center px-6 py-3 transition-colors duration-200 ${
                      isActive 
                        ? 'bg-secondary border-l-4 border-white' 
                        : 'hover:bg-primary/50 text-primary-foreground/80 hover:text-white'
                    }`}
                  >
                    <item.icon className="w-5 h-5 mr-3" />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        
        <div className="p-6 text-sm text-primary-foreground/60">
          <p>ERP Version 1.0.0</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-20 bg-white shadow-sm flex items-center justify-between px-8 z-10 shrink-0">
          <div className="flex items-center">
            <button className="md:hidden mr-4 text-foreground/70 hover:text-primary">
              <Menu className="w-6 h-6" />
            </button>
            <div className="relative relative-search">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-foreground/40">
                <Search className="w-4 h-4" />
              </div>
              <Input 
                type="text" 
                className="bg-background border-none rounded-full pl-10 pr-4 py-5 w-64 focus-visible:ring-secondary/50 transition-all text-sm" 
                placeholder="Search resources..."
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-6">
            <button className="relative text-foreground/70 hover:text-primary transition-colors">
              <Bell className="w-6 h-6" />
              <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="flex items-center cursor-pointer group">
                  <Avatar className="w-10 h-10 border shadow-sm">
                    <AvatarFallback className="bg-accent text-primary font-bold">
                      {user ? user.name.substring(0, 2).toUpperCase() : 'AD'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="ml-3 hidden sm:block">
                    <p className="text-sm font-semibold">{user ? user.name : 'Admin User'}</p>
                    <p className="text-xs text-foreground/50">{user ? user.email : 'Administrator'}</p>
                  </div>
                  <ChevronDown className="w-4 h-4 ml-2 text-foreground/50 transition-colors group-data-[state=open]:rotate-180" />
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 mt-2">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Profile Settings</DropdownMenuItem>
                <DropdownMenuItem>Theme Options</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:bg-red-50 focus:text-red-600 cursor-pointer text-sm font-medium">
                  Log Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <div className="flex-1 overflow-auto bg-background p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
