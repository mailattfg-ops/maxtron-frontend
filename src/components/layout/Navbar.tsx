import { Menu, Search, Bell, ChevronDown } from 'lucide-react';
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
  return (
    <header className="h-16 md:h-20 bg-white shadow-sm flex items-center justify-between px-4 md:px-8 z-10 shrink-0">
      <div className="flex items-center">
        <button onClick={onMenuToggle} className="md:hidden mr-4 text-foreground/70 hover:text-primary transition-colors">
          <Menu className="w-6 h-6" />
        </button>
        <div className="relative hidden sm:block">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-foreground/40">
            <Search className="w-4 h-4" />
          </div>
          <Input 
            type="text" 
            className="bg-background border-none rounded-full pl-10 pr-4 py-5 w-48 md:w-64 focus-visible:ring-secondary/50 transition-all text-sm" 
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
  );
};
