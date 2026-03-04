'use client';

import { 
  Users, 
  Settings,
  Package,
  Truck,
  DollarSign,
  TrendingUp, 
  Menu, 
  Bell, 
  Search, 
  ChevronDown,
  ChevronRight,
  CircleDot
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

const maxtronSidebarMenu = [
  {
    title: "Dashboard",
    icon: TrendingUp,
    path: "/maxtron",
    roles: ["HR", "ADMIN", "PURCHASE", "PRODUCTION", "SALES", "ACCOUNTS"]
  },
  {
    title: "HR & Administration",
    icon: Users,
    roles: ["HR", "ADMIN", "SUPERVISOR"],
    children: [
      { title: "Employee Information", path: "/maxtron/hr-payroll/employee" },
      { title: "Company Information", path: "/maxtron/hr-payroll/company" },
      { title: "Attendance Details", path: "/maxtron/hr-payroll/attendance" },
      { title: "Marketing Team Visits", path: "/maxtron/hr-payroll/marketing-visits" },
      { title: "Employee List", path: "/maxtron/hr-payroll/reports/employees" },
      { title: "Attendance Summary", path: "/maxtron/hr-payroll/reports/attendance" },
      { title: "Marketing Visit Report", path: "/maxtron/hr-payroll/reports/marketing" }
    ]
  },
  {
    title: "Inventory & Procurement",
    icon: Package,
    roles: ["PURCHASE", "STORE", "AUDITOR"],
    children: [
      { title: "Raw Material Details", path: "/maxtron/inventory/raw-material" },
      { title: "Supplier Information", path: "/maxtron/inventory/suppliers" },
      { title: "Raw Material Order", path: "/maxtron/inventory/order" },
      { title: "Purchase Entry", path: "/maxtron/inventory/purchase" },
      { title: "Material Consumption", path: "/maxtron/inventory/consumption" },
      { title: "Purchase Returns", path: "/maxtron/inventory/returns" },
      { title: "Stock List", path: "/maxtron/inventory/reports/stock" },
      { title: "Purchase Report", path: "/maxtron/inventory/reports/purchase" },
      { title: "Consumption Report", path: "/maxtron/inventory/reports/consumption" }
    ]
  },
  {
    title: "Production MES",
    icon: Settings,
    roles: ["PRODUCTION", "SHIFT", "OPERATOR"],
    children: [
      { title: "Finished Product Details", path: "/maxtron/production/product" },
      { title: "Production (Extrusion)", path: "/maxtron/production/extrusion" },
      { title: "Cutting & Sealing", path: "/maxtron/production/cutting" },
      { title: "Packing Details", path: "/maxtron/production/packing" },
      { title: "Damages & Wastage", path: "/maxtron/production/wastage" },
      { title: "Production Summary", path: "/maxtron/production/reports/summary" },
      { title: "Packing Summary", path: "/maxtron/production/reports/packing" },
      { title: "Wastage Analysis", path: "/maxtron/production/reports/wastage" }
    ]
  },
  {
    title: "Sales & Logistics",
    icon: Truck,
    roles: ["SALES", "DISPATCH", "MARKETING"],
    children: [
      { title: "Customer Information", path: "/maxtron/sales/customers" },
      { title: "Vehicle Information", path: "/maxtron/sales/vehicles" },
      { title: "Customer Order Entry", path: "/maxtron/sales/order" },
      { title: "Sales / Invoice Entry", path: "/maxtron/sales/invoice" },
      { title: "Delivery Details", path: "/maxtron/sales/delivery" },
      { title: "Sales Returns", path: "/maxtron/sales/returns" },
      { title: "Order Report", path: "/maxtron/sales/reports/orders" },
      { title: "Billing Summary", path: "/maxtron/sales/reports/billing" },
      { title: "Delivery Report", path: "/maxtron/sales/reports/delivery" }
    ]
  },
  {
    title: "Finance & Accounts",
    icon: DollarSign,
    roles: ["ACCOUNTS", "FINANCE"],
    children: [
      { title: "Customer Collection Entry", path: "/maxtron/finance/collection" },
      { title: "Supplier Payment Entry", path: "/maxtron/finance/payment" },
      { title: "Petty Cash Entry", path: "/maxtron/finance/petty-cash" },
      { title: "Customer Ledger", path: "/maxtron/finance/reports/customer-ledger" },
      { title: "Supplier Ledger", path: "/maxtron/finance/reports/supplier-ledger" },
      { title: "Financial Summary", path: "/maxtron/finance/reports/summary" },
      { title: "Period Wise Scorecard", path: "/maxtron/finance/reports/scorecard" }
    ]
  }
];

// -------------------------------------------------------------
// KEIL SEPARATE MODULES (Placeholder structures to show separation)
// -------------------------------------------------------------
const keilSidebarMenu = [
  {
    title: "KEIL Dashboard",
    icon: TrendingUp,
    path: "/keil",
    roles: ["HR", "ADMIN", "OPERATIONS"]
  },
  {
    title: "KEIL Operations",
    icon: Settings,
    roles: ["ADMIN", "MANAGER"],
    children: [
      { title: "Project Assignments", path: "/keil/projects" },
      { title: "Resource Allocation", path: "/keil/resources" }
    ]
  },
  {
    title: "KEIL Supply Chain",
    icon: Truck,
    roles: ["ADMIN", "LOGISTICS"],
    children: [
      { title: "Vendor Management", path: "/keil/vendors" },
      { title: "Shipment Tracking", path: "/keil/tracking" }
    ]
  }
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  
  const pathname = usePathname();
  const router = useRouter();
  const activeEntity = pathname?.startsWith('/keil') ? 'keil' : 'maxtron';

  useEffect(() => {
    setMounted(true);
    const token = localStorage.getItem('token');
    if (!token && pathname !== '/login') {
      router.push('/login');
    } else if (token && pathname === '/login') {
      router.push('/maxtron');
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

  const toggleExpand = (title: string) => {
    setExpanded(prev => ({ ...prev, [title]: !prev[title] }));
  };

  if (!mounted) return null;

  if (pathname === '/login') {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex bg-background font-sans text-foreground">
      {/* Sidebar */}
      <aside className="w-72 bg-primary text-primary-foreground hidden md:flex flex-col shadow-xl overflow-y-auto custom-scrollbar">
        <div className="flex flex-col flex-shrink-0 border-b border-primary/20 bg-primary sticky top-0 z-10">
          <div className="p-6 flex items-center justify-center pb-4">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center mr-3 text-primary font-bold text-xl shadow-inner transition-colors">
              {activeEntity === 'maxtron' ? 'M' : 'K'}
            </div>
            <h1 className="text-2xl font-bold tracking-wider transition-all">
              {activeEntity === 'maxtron' ? 'Maxtron' : 'KEIL'}
            </h1>
          </div>
          
          {/* Entity Switcher */}
          <div className="flex px-4 pb-4 space-x-2">
            <button 
              onClick={() => router.push('/maxtron')}
              className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${
                activeEntity === 'maxtron' 
                  ? 'bg-secondary text-white shadow-md' 
                  : 'bg-primary/40 text-primary-foreground/50 hover:text-white hover:bg-primary/60'
              }`}
            >
              MAXTRON
            </button>
            <button 
              onClick={() => router.push('/keil')}
              className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${
                activeEntity === 'keil' 
                  ? 'bg-secondary text-white shadow-md' 
                  : 'bg-primary/40 text-primary-foreground/50 hover:text-white hover:bg-primary/60'
              }`}
            >
              KEIL
            </button>
          </div>
        </div>
        
        <nav className="flex-1 py-6 px-3">
          <ul className="space-y-1">
            {(activeEntity === 'maxtron' ? maxtronSidebarMenu : keilSidebarMenu).map((moduleItem, idx) => {
              const isModuleExpanded = expanded[moduleItem.title];
              
              if (!moduleItem.children) {
                // Top level simple link (Dashboard)
                const isActive = pathname === moduleItem.path;
                return (
                  <li key={idx}>
                    <Link
                      href={moduleItem.path || '#'}
                      className={`flex items-center px-4 py-3 rounded-lg transition-colors duration-200 ${
                        isActive 
                          ? 'bg-secondary text-white shadow-md' 
                          : 'hover:bg-primary/50 text-primary-foreground/90 hover:text-white'
                      }`}
                    >
                      <moduleItem.icon className="w-5 h-5 mr-3 shrink-0" />
                      <span className="font-medium text-sm">{moduleItem.title}</span>
                    </Link>
                  </li>
                );
              }

              return (
                <li key={idx} className="flex flex-col">
                  {/* Parent Module Item */}
                  <div 
                    onClick={() => toggleExpand(moduleItem.title)}
                    className="flex items-center justify-between px-4 py-3 rounded-lg cursor-pointer transition-colors duration-200 hover:bg-primary/50 text-primary-foreground/90 hover:text-white select-none"
                  >
                    <div className="flex items-center">
                      <moduleItem.icon className="w-5 h-5 mr-3 shrink-0" />
                      <span className="font-medium text-sm">{moduleItem.title}</span>
                    </div>
                    {isModuleExpanded ? (
                      <ChevronDown className="w-4 h-4 shrink-0 transition-transform duration-200" />
                    ) : (
                      <ChevronRight className="w-4 h-4 shrink-0 transition-transform duration-200" />
                    )}
                  </div>

                  {/* Nested Links */}
                  {isModuleExpanded && (
                    <ul className="ml-8 mt-1 space-y-1 mb-2 border-l border-white/10 pl-2">
                       {moduleItem.children.map((link, lIdx) => {
                          const isActive = pathname === link.path;
                          return (
                            <li key={lIdx}>
                              <Link
                                href={link.path || '#'}
                                className={`flex items-center px-4 py-2 rounded-md transition-colors duration-200 ${
                                  isActive 
                                    ? 'bg-secondary/80 text-white font-medium' 
                                    : 'hover:bg-primary/40 text-primary-foreground/70 hover:text-white'
                                }`}
                              >
                                <CircleDot className={`w-3 h-3 mr-2 shrink-0 ${isActive ? 'text-white' : 'text-white/30'}`} />
                                <span className="text-xs truncate">{link.title}</span>
                              </Link>
                            </li>
                          );
                        })}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>
        
        <div className="p-6 text-sm text-primary-foreground/60 flex-shrink-0 bg-primary sticky bottom-0 border-t border-primary/20">
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
