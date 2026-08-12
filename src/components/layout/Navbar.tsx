import { Menu, Search, Bell, ChevronDown, Moon, Sun, User, Shield, Mail, LogOut, Building2, CheckCircle2 } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface NavbarProps {
  user: any;
  handleLogout: () => void;
  onMenuToggle?: () => void;
}

export const Navbar = ({ user, handleLogout, onMenuToggle }: NavbarProps) => {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <>
      <header className="h-16 xl:h-20 bg-card/80 backdrop-blur-md shadow-sm border-b border-border/40 flex items-center justify-between px-4 xl:px-8 z-10 shrink-0 sticky top-0">
        <div className="flex items-center">
          <button onClick={onMenuToggle} className="xl:hidden mr-4 text-foreground/70 hover:text-primary transition-colors">
            <Menu className="w-6 h-6" />
          </button>
        </div>

        <div className="flex items-center space-x-6">
          {mounted && false && (
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2.5 rounded-xl bg-accent/50 text-accent-foreground hover:bg-accent transition-all duration-300 group"
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? (
                <Sun className="w-5 h-5 group-hover:rotate-45 transition-transform" />
              ) : (
                <Moon className="w-5 h-5 group-hover:-rotate-12 transition-transform" />
              )}
            </button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="flex items-center cursor-pointer group">
                <Avatar className="w-10 h-10 border shadow-sm">
                  <AvatarFallback className="bg-accent text-primary font-bold">
                    {user ? user.name?.substring(0, 2).toUpperCase() : 'AD'}
                  </AvatarFallback>
                </Avatar>
                <div className="ml-3 hidden sm:block">
                  <p className="text-sm font-semibold">{user ? user.name : 'Admin User'}</p>
                  <p className="text-xs text-foreground/50">{user ? (user.user_types?.name || user.role_name || user.email) : 'Administrator'}</p>
                </div>
                <ChevronDown className="w-4 h-4 ml-2 text-foreground/50 transition-colors group-data-[state=open]:rotate-180" />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 mt-2 bg-white shadow-xl border-slate-100 p-1.5 rounded-xl">
              <DropdownMenuLabel className="font-bold text-xs text-slate-500 uppercase tracking-widest px-2 py-1.5">
                My Account
              </DropdownMenuLabel>
              <DropdownMenuItem 
                onClick={() => setIsAccountOpen(true)}
                className="cursor-pointer text-xs font-semibold text-slate-700 hover:bg-primary/5 hover:text-primary flex items-center gap-2 p-2 rounded-lg"
              >
                <User className="w-4 h-4 text-primary" /> Profile & Account Info
              </DropdownMenuItem>
              <DropdownMenuSeparator className="my-1 bg-slate-100" />
              <DropdownMenuItem 
                onClick={handleLogout} 
                className="text-red-600 focus:bg-red-50 focus:text-red-600 cursor-pointer text-xs font-bold flex items-center gap-2 p-2 rounded-lg"
              >
                <LogOut className="w-4 h-4" /> Log Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Account Info Modal */}
      <Dialog open={isAccountOpen} onOpenChange={setIsAccountOpen}>
        <DialogContent className="sm:max-w-md bg-white border-primary/20 shadow-2xl p-6 rounded-2xl">
          <DialogHeader className="border-b pb-4">
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <User className="w-5 h-5 text-primary" /> My Account
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex items-center gap-4 bg-primary/5 p-4 rounded-xl border border-primary/10">
              <Avatar className="w-14 h-14 border-2 border-primary/20 shadow-md">
                <AvatarFallback className="bg-primary text-white text-lg font-black">
                  {user?.name ? user.name.substring(0, 2).toUpperCase() : 'AD'}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-base text-slate-900 truncate">{user?.name || 'Administrator'}</h3>
                <p className="text-xs text-muted-foreground truncate">{user?.email || 'admin@maxtron.com'}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="bg-primary/10 text-primary text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider">
                    {user?.user_types?.name || user?.role_name || 'System Admin'}
                  </span>
                  <span className="bg-emerald-50 text-emerald-700 text-[10px] font-black px-2 py-0.5 rounded-md uppercase flex items-center gap-1">
                    <CheckCircle2 className="w-2.5 h-2.5" /> Active
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Employee Code</span>
                <p className="font-mono font-bold text-slate-800 mt-0.5">{user?.employee_code || 'N/A'}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Phone</span>
                <p className="font-medium text-slate-800 mt-0.5">{user?.phone || 'N/A'}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 col-span-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Tenant / Entity</span>
                <p className="font-bold text-primary mt-0.5 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5" /> Maxtron Rubber Pvt Ltd
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={() => setIsAccountOpen(false)} className="rounded-full px-5 h-9 text-xs font-bold">
              Close
            </Button>
            <Button variant="destructive" onClick={handleLogout} className="rounded-full px-5 h-9 text-xs font-bold gap-1.5">
              <LogOut className="w-3.5 h-3.5" /> Log Out
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
