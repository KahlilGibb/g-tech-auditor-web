import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { 
  LayoutDashboard, 
  ClipboardCheck, 
  Users, 
  Settings, 
  LogOut, 
  Menu, 
  Bell, 
  Search,
  ShieldCheck,
  ChevronRight,
  CheckSquare,
  FileText,
  Shield,
  GraduationCap
} from 'lucide-react';
import { cn } from '../utils/cn';

const SidebarItem: React.FC<{ 
  to: string; 
  icon: React.ElementType; 
  label: string; 
  active?: boolean;
}> = ({ to, icon: Icon, label, active }) => (
  <Link
    to={to}
    className={cn(
      "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
      active 
        ? "bg-primary-blue text-white shadow-md shadow-primary-blue/20" 
        : "text-muted-foreground hover:bg-white hover:text-foreground"
    )}
  >
    <Icon className={cn("w-5 h-5", active ? "text-white" : "group-hover:text-primary-blue")} />
    <span className="font-medium">{label}</span>
    {active && <ChevronRight className="ml-auto w-4 h-4 text-white/70" />}
  </Link>
);

const DashboardLayout: React.FC = () => {
  const { logout, user } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const location = useLocation();

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/inspections', icon: ClipboardCheck, label: 'Inspections' },
    { to: '/templates', icon: FileText, label: 'Templates' },
    { to: '/actions', icon: CheckSquare, label: 'Actions' },
    { to: '/cps', icon: Shield, label: 'CPS' },
    { to: '/training', icon: GraduationCap, label: 'Training' },
    { to: '/users', icon: Users, label: 'Users' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="flex min-h-screen bg-surface">
      {/* Mobile Backdrop */}
      {!isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(true)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white border-r border-divider transform transition-transform duration-300 lg:translate-x-0",
        !isSidebarOpen && "-translate-x-full"
      )}>
        <div className="flex flex-col h-full p-4">
          <div className="flex items-center gap-3 px-4 py-6 mb-2">
            <div className="w-10 h-10 bg-primary-blue rounded-xl flex items-center justify-center shadow-lg shadow-primary-blue/20">
              <ShieldCheck className="text-white w-6 h-6" />
            </div>
            <span className="text-xl font-bold tracking-tight text-foreground">G-Tech</span>
          </div>

          <nav className="flex-1 space-y-1">
            {navItems.map((item) => (
              <SidebarItem 
                key={item.to}
                {...item}
                active={location.pathname === item.to}
              />
            ))}
          </nav>

          <div className="pt-4 border-t border-divider">
            <button
              onClick={logout}
              className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-danger-red hover:bg-danger-red/5 transition-all group"
            >
              <LogOut className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-divider flex items-center justify-between px-4 lg:px-8 sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-surface rounded-lg lg:hidden"
            >
              <Menu className="w-6 h-6 text-muted-foreground" />
            </button>
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <input 
                type="text" 
                placeholder="Search inspections..." 
                className="pl-10 pr-4 py-2 bg-surface border-none rounded-lg text-sm focus:ring-2 focus:ring-primary-blue/20 w-64"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button className="p-2 hover:bg-surface rounded-lg relative">
              <Bell className="w-5 h-5 text-muted-foreground" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-danger-red rounded-full border-2 border-white"></span>
            </button>
            <div className="h-8 w-[1px] bg-divider mx-2"></div>
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-foreground leading-none">{user?.name}</p>
                <p className="text-xs text-muted-foreground mt-1 capitalize">{user?.role}</p>
              </div>
              <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center font-bold text-primary-blue border border-divider">
                {user?.name?.charAt(0)}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8 bg-surface">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
