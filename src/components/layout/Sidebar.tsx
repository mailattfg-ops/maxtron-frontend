import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronDown, ChevronRight, CircleDot } from 'lucide-react';
import { NavItem } from '@/config/navigation/types';

interface SidebarProps {
  menuItems: NavItem[];
  activeEntity: string;
  expanded: Record<string, boolean>;
  toggleExpand: (title: string) => void;
  canShowItem: (allowedRoles?: string[], permissionKey?: string) => boolean;
  hasPermission: (permissionKey: string, action: string) => boolean;
  router: any;
}

export const Sidebar = ({ 
  menuItems, 
  activeEntity, 
  expanded, 
  toggleExpand, 
  canShowItem,
  hasPermission,
  router 
}: SidebarProps) => {

  const pathname = usePathname();

  return (
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
        {hasPermission('company_switching', 'can_view') && (
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
        )}
      </div>
      
      <nav className="flex-1 py-6 px-3">
        <ul className="space-y-1">
          {menuItems.map((moduleItem, idx) => {
            const isModuleExpanded = expanded[moduleItem.title];
            
            if (!moduleItem.children) {
              if (!canShowItem(moduleItem.roles, moduleItem.permissionKey)) return null;

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

            if (!canShowItem(moduleItem.roles, moduleItem.permissionKey)) return null;

            return (
              <li key={idx} className="flex flex-col">
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
                        if (!canShowItem(link.roles, link.permissionKey)) return null;

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
  );
};
