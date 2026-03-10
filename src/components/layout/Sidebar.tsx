import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronDown, ChevronRight, CircleDot, X } from 'lucide-react';
import { NavItem } from '@/config/navigation/types';

interface SidebarProps {
  menuItems: NavItem[];
  activeEntity: string;
  expanded: Record<string, boolean>;
  toggleExpand: (title: string) => void;
  canShowItem: (allowedRoles?: string[], permissionKey?: string) => boolean;
  hasPermission: (permissionKey: string, action: string) => boolean;
  router: any;
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar = ({ 
  menuItems, 
  activeEntity, 
  expanded, 
  toggleExpand, 
  canShowItem,
  hasPermission,
  router,
  isOpen = false,
  onClose,
}: SidebarProps) => {

  const pathname = usePathname();

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="w-72 bg-primary text-primary-foreground hidden md:flex flex-col shadow-xl overflow-y-auto no-scrollbar flex-shrink-0">
        <SidebarContent
          menuItems={menuItems}
          activeEntity={activeEntity}
          expanded={expanded}
          toggleExpand={toggleExpand}
          canShowItem={canShowItem}
          hasPermission={hasPermission}
          router={router}
          pathname={pathname}
        />
      </aside>

      {/* Mobile slide-in drawer */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-primary text-primary-foreground
        flex flex-col shadow-2xl overflow-y-auto no-scrollbar
        transform transition-transform duration-300 ease-in-out md:hidden
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Close button */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-primary font-bold text-base shadow-inner">
              {activeEntity === 'maxtron' ? 'M' : 'K'}
            </div>
            <h1 className="text-xl font-bold tracking-wider">
              {activeEntity === 'maxtron' ? 'Maxtron' : 'KEIL'}
            </h1>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <SidebarContent
          menuItems={menuItems}
          activeEntity={activeEntity}
          expanded={expanded}
          toggleExpand={toggleExpand}
          canShowItem={canShowItem}
          hasPermission={hasPermission}
          router={router}
          pathname={pathname}
          isMobile
          onClose={onClose}
        />
      </aside>
    </>
  );
};

function SidebarContent({
  menuItems, activeEntity, expanded, toggleExpand, canShowItem,
  hasPermission, router, pathname, isMobile = false, onClose
}: any) {
  return (
    <>
      {!isMobile && (
        <div className="flex flex-col flex-shrink-0 border-b border-primary/20 bg-primary sticky top-0 z-10">
          <div className="p-6 flex items-center justify-center pb-4">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center mr-3 text-primary font-bold text-xl shadow-inner transition-colors">
              {activeEntity === 'maxtron' ? 'M' : 'K'}
            </div>
            <h1 className="text-2xl font-bold tracking-wider transition-all">
              {activeEntity === 'maxtron' ? 'Maxtron' : 'KEIL'}
            </h1>
          </div>
          {hasPermission('company_switching', 'can_view') && (
            <div className="flex px-4 pb-4 space-x-2">
              <button
                onClick={() => router.push('/maxtron')}
                className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${
                  activeEntity === 'maxtron'
                    ? 'bg-secondary text-white shadow-md'
                    : 'bg-primary/40 text-primary-foreground/50 hover:text-white hover:bg-primary/60'
                }`}
              >MAXTRON</button>
              <button
                onClick={() => router.push('/keil')}
                className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${
                  activeEntity === 'keil'
                    ? 'bg-secondary text-white shadow-md'
                    : 'bg-primary/40 text-primary-foreground/50 hover:text-white hover:bg-primary/60'
                }`}
              >KEIL</button>
            </div>
          )}
        </div>
      )}

      {isMobile && hasPermission('company_switching', 'can_view') && (
        <div className="flex px-4 py-3 space-x-2 border-b border-white/10">
          <button
            onClick={() => { router.push('/maxtron'); onClose?.(); }}
            className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${activeEntity === 'maxtron' ? 'bg-secondary text-white shadow-md' : 'bg-primary/40 text-primary-foreground/50 hover:text-white hover:bg-primary/60'}`}
          >MAXTRON</button>
          <button
            onClick={() => { router.push('/keil'); onClose?.(); }}
            className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${activeEntity === 'keil' ? 'bg-secondary text-white shadow-md' : 'bg-primary/40 text-primary-foreground/50 hover:text-white hover:bg-primary/60'}`}
          >KEIL</button>
        </div>
      )}

      <nav className="flex-1 py-6 px-3">
        <ul className="space-y-1">
          {menuItems.map((moduleItem: NavItem, idx: number) => {
            const isModuleExpanded = expanded[moduleItem.title];

            if (!moduleItem.children) {
              if (!canShowItem(moduleItem.roles, moduleItem.permissionKey)) return null;
              const isActive = pathname === moduleItem.path;
              return (
                <li key={idx}>
                  <Link
                    href={moduleItem.path || '#'}
                    onClick={onClose}
                    className={`flex items-center px-4 py-3 rounded-lg transition-colors duration-200 ${
                      isActive ? 'bg-secondary text-white shadow-md' : 'hover:bg-primary/50 text-primary-foreground/90 hover:text-white'
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
                  {isModuleExpanded
                    ? <ChevronDown className="w-4 h-4 shrink-0 transition-transform duration-200" />
                    : <ChevronRight className="w-4 h-4 shrink-0 transition-transform duration-200" />}
                </div>
                {isModuleExpanded && (
                  <ul className="ml-8 mt-1 space-y-1 mb-2 border-l border-white/10 pl-2">
                    {moduleItem.children?.map((link: any, lIdx: number) => {
                      if (!canShowItem(link.roles, link.permissionKey)) return null;
                      const isActive = pathname === link.path;
                      return (
                        <li key={lIdx}>
                          <Link
                            href={link.path || '#'}
                            onClick={onClose}
                            className={`flex items-center px-4 py-2 rounded-md transition-colors duration-200 ${
                              isActive ? 'bg-secondary/80 text-white font-medium' : 'hover:bg-primary/40 text-primary-foreground/70 hover:text-white'
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
    </>
  );
}
