import { Menu, Search, Bell, ChevronDown, Moon, Sun } from 'lucide-react';
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

interface NavbarProps {
  user: any;
  handleLogout: () => void;
  onMenuToggle?: () => void;
}

export const Navbar = ({ user, handleLogout, onMenuToggle }: NavbarProps) => {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="h-16 xl:h-20 bg-card/80 backdrop-blur-md shadow-sm border-b border-border/40 flex items-center justify-between px-4 xl:px-8 z-10 shrink-0 sticky top-0">
      <div className="flex items-center">
        <button onClick={onMenuToggle} className="xl:hidden mr-4 text-foreground/70 hover:text-primary transition-colors">
          <Menu className="w-6 h-6" />
        </button>
        {/* <div className="relative hidden sm:block">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-foreground/40">
            <Search className="w-4 h-4" />
          </div>
          <Input 
            type="text" 
            className="bg-background border-none rounded-full pl-10 pr-4 py-5 w-48 md:w-64 focus-visible:ring-secondary/50 transition-all text-sm" 
            placeholder="Search resources..."
          />
        </div> */}
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
        
        {/* <button className="relative text-foreground/70 hover:text-primary transition-colors">
          <Bell className="w-6 h-6" />
          <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
        </button> */}
        
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
            {/* <DropdownMenuSeparator />
            <DropdownMenuItem>Profile Settings</DropdownMenuItem>
            <DropdownMenuItem>Theme Options</DropdownMenuItem>
            <DropdownMenuSeparator /> */}
            <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:bg-red-50 focus:text-red-600 cursor-pointer text-sm font-medium">
              Log Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};
