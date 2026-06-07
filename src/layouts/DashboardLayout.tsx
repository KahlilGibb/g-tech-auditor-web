import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  BellRing,
  Building2,
  CalendarClock,
  CheckCheck,
  CheckCircle2,
  CheckSquare,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  FileText,
  FolderOpen,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  MapPinned,
  Menu,
  MessageSquare,
  Search,
  Settings,
  Shield,
  ShieldCheck,
  UserCog,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useNotificationStore } from '../stores/notificationStore';
import { useProfileStore } from '../stores/profileStore';
import { cn } from '../utils/cn';
import { appSwal } from '../lib/appSwal';
import { getApiErrorMessage } from '../lib/apiResponse';

const SidebarItem: React.FC<{
  to: string;
  icon: React.ElementType;
  label: string;
  active?: boolean;
  onClick?: () => void;
}> = ({ to, icon: Icon, label, active, onClick }) => (
  <Link
    to={to}
    onClick={onClick}
    className={cn(
      'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition',
      active
        ? 'bg-primary-blue/10 text-primary-blue ring-1 ring-primary-blue/15'
        : 'text-muted-foreground hover:bg-surface hover:text-foreground',
    )}
  >
    <Icon
      className={cn(
        'h-[18px] w-[18px] shrink-0',
        active ? 'text-primary-blue' : 'text-muted-foreground group-hover:text-foreground',
      )}
    />
    <span className="flex-1 truncate">{label}</span>
    {active && <ChevronRight className="h-3.5 w-3.5 text-primary-blue/70" />}
  </Link>
);

const NotificationPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { t } = useTranslation();
  const { notifications, fetchNotifications, markAsRead, markAllAsRead, isLoading } =
    useNotificationStore();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const todayNotifs = notifications.filter(notification => notification.group === 'today');
  const earlierNotifs = notifications.filter(notification => notification.group === 'earlier');
  const unreadCount = notifications.filter(notification => !notification.is_read).length;

  const TypeIcon = ({ type }: { type: string }) => {
    if (type === 'assignment') return <ClipboardList className="h-4 w-4" />;
    if (type === 'due') return <CalendarClock className="h-4 w-4" />;
    if (type === 'comment') return <MessageSquare className="h-4 w-4" />;
    if (type === 'completed') return <CheckCircle2 className="h-4 w-4" />;
    return <Bell className="h-4 w-4" />;
  };

  const renderGroup = (label: string, items: typeof notifications) => {
    if (!items.length) return null;

    return (
      <div>
        <p className="border-b border-divider bg-surface px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          {label}
        </p>
        {items.map(notification => (
          <button
            key={notification.id}
            onClick={() => {
              markAsRead(notification.id);
            }}
            className={cn(
              'flex w-full items-start gap-3 border-b border-divider px-4 py-3 text-left transition last:border-0 hover:bg-surface',
              !notification.is_read && 'bg-primary-blue/[0.04]',
            )}
          >
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface text-primary-blue">
              <TypeIcon type={notification.type} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-start justify-between gap-2">
                <span
                  className={cn(
                    'text-sm leading-snug text-foreground',
                    notification.is_read ? 'font-medium' : 'font-semibold',
                  )}
                >
                  {notification.title}
                </span>
                {!notification.is_read && (
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary-blue" />
                )}
              </span>
              <span className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                {notification.message}
              </span>
              <span className="mt-1 block text-[10px] text-muted-foreground">
                {notification.time}
              </span>
            </span>
          </button>
        ))}
      </div>
    );
  };

  return (
    <div
      ref={panelRef}
      className="absolute right-0 top-full z-50 mt-2 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-lg border border-divider bg-white shadow-xl shadow-slate-900/10"
    >
      <div className="flex items-center justify-between border-b border-divider px-4 py-3">
        <div className="flex items-center gap-2">
          <BellRing className="h-4 w-4 text-primary-blue" />
          <span className="text-sm font-semibold text-foreground">{t('nav.notifications')}</span>
          {unreadCount > 0 && (
            <span className="rounded-full bg-primary-blue px-1.5 py-0.5 text-[10px] font-semibold text-white">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllAsRead()}
            className="flex items-center gap-1 text-xs font-semibold text-primary-blue hover:text-primary-blue-dark"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            {t('nav.markAll')}
          </button>
        )}
      </div>

      <div className="max-h-[400px] overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-blue border-t-transparent" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
            <Bell className="mb-3 h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm font-semibold text-foreground">{t('nav.noNotifications')}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t('nav.allRead')}</p>
          </div>
        ) : (
          <>
            {renderGroup(t('nav.today'), todayNotifs)}
            {renderGroup(t('nav.earlier'), earlierNotifs)}
          </>
        )}
      </div>
    </div>
  );
};

const DashboardLayout: React.FC = () => {
  const { t } = useTranslation();
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  const { profile } = useProfileStore();
  const unreadCount = useNotificationStore(state =>
    state.notifications.filter(notification => !notification.is_read).length,
  );
  const fetchNotifications = useNotificationStore(state => state.fetchNotifications);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const displayName = profile.fullName || (user?.name ?? 'Inspector');
  const role = profile.role || user?.role || 'Inspector';
  const initials = displayName
    .split(' ')
    .map(name => name[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  const mainNavItems = [
    { to: '/', icon: LayoutDashboard, labelKey: 'home' },
    { to: '/inspections', icon: ClipboardCheck, labelKey: 'inspections' },
    { to: '/templates', icon: FileText, labelKey: 'templates' },
    { to: '/documents', icon: FolderOpen, labelKey: 'documents' },
    { to: '/actions', icon: CheckSquare, labelKey: 'actions' },
    { to: '/cps', icon: Shield, labelKey: 'cps' },
    { to: '/training', icon: GraduationCap, labelKey: 'training' },
  ];

  const adminNavItems = [
    { to: '/users', icon: Users, labelKey: 'users' },
    { to: '/roles', icon: UserCog, labelKey: 'roles' },
    { to: '/organizations', icon: Building2, labelKey: 'organizations' },
    { to: '/branches', icon: Building2, labelKey: 'branches' },
    { to: '/sites', icon: MapPinned, labelKey: 'sites' },
    { to: '/settings', icon: Settings, labelKey: 'settings' },
  ];

  const closeSidebar = () => setIsSidebarOpen(false);

  const handleLogout = async () => {
    const confirmed = await appSwal.confirmLogout();
    if (!confirmed) return;

    try {
      await logout();
      await appSwal.successLogout();
    } catch (error) {
      await appSwal.error({
        title: t('swal.error.logoutFailed.title'),
        text: getApiErrorMessage(error, t('swal.error.logoutFailed.text')),
      });
    }
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen bg-background">
      {isSidebarOpen && (
        <button
          aria-label="Tutup menu"
          className="fixed inset-0 z-30 bg-slate-950/30 backdrop-blur-[1px] lg:hidden"
          onClick={closeSidebar}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-divider bg-white shadow-xl shadow-slate-900/10 lg:static lg:shadow-none',
          'transform transition-transform duration-300 ease-in-out lg:translate-x-0',
          !isSidebarOpen && '-translate-x-full',
        )}
      >
        <div className="flex h-16 items-center gap-3 border-b border-divider px-5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-blue text-white shadow-sm">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <span className="block text-base font-semibold leading-none tracking-tight text-foreground">
              G-Tech
            </span>
            <span className="mt-1 block text-[11px] font-medium text-muted-foreground">
              Auditor System
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4">
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            {t('nav.menuUtama')}
          </p>
          <nav className="space-y-1">
            {mainNavItems.map(item => (
              <SidebarItem
                key={item.to}
                to={item.to}
                icon={item.icon}
                label={t(`nav.${item.labelKey}`)}
                active={location.pathname === item.to}
                onClick={() => {
                  if (window.innerWidth < 1024) closeSidebar();
                }}
              />
            ))}
          </nav>

          <p className="mt-6 px-3 pb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            {t('nav.administrasi')}
          </p>
          <nav className="space-y-1">
            {adminNavItems.map(item => (
              <SidebarItem
                key={item.to}
                to={item.to}
                icon={item.icon}
                label={t(`nav.${item.labelKey}`)}
                active={location.pathname === item.to}
                onClick={() => {
                  if (window.innerWidth < 1024) closeSidebar();
                }}
              />
            ))}
          </nav>
        </div>

        <div className="border-t border-divider p-3">
          <Link
            to="/profile"
            onClick={() => {
              if (window.innerWidth < 1024) closeSidebar();
            }}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition hover:bg-surface"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-primary-blue/20 bg-primary-blue/10">
              {profile.avatarBase64 ? (
                <img
                  src={`data:image/jpeg;base64,${profile.avatarBase64}`}
                  alt={displayName}
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                <span className="text-xs font-semibold text-primary-blue">{initials}</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold leading-none text-foreground">
                {displayName}
              </p>
              <p className="mt-1 truncate text-[11px] capitalize text-muted-foreground">{role}</p>
            </div>
          </Link>

          <button
            onClick={handleLogout}
            className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-danger-red transition hover:bg-danger-red/5"
          >
            <LogOut className="h-[18px] w-[18px] shrink-0" />
            <span>{t('nav.logout')}</span>
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-divider bg-white/95 px-4 backdrop-blur lg:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setIsSidebarOpen(prev => !prev)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-surface hover:text-foreground lg:hidden"
              aria-label="Buka menu"
            >
              {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder={t('nav.searchPlaceholder')}
                className="h-10 w-72 rounded-lg border border-divider bg-surface pl-9 pr-4 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary-blue focus:bg-white focus:ring-4 focus:ring-primary-blue/10"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setIsNotifOpen(prev => !prev)}
                className={cn(
                  'relative inline-flex h-10 w-10 items-center justify-center rounded-lg transition',
                  isNotifOpen
                    ? 'bg-primary-blue/10 text-primary-blue'
                    : 'text-muted-foreground hover:bg-surface hover:text-foreground',
                )}
                aria-label={t('nav.notifications')}
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-danger-red ring-2 ring-white" />
                )}
              </button>
              {isNotifOpen && <NotificationPanel onClose={() => setIsNotifOpen(false)} />}
            </div>

            <div className="mx-1 h-6 w-px bg-divider" />

            <Link
              to="/profile"
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition hover:bg-surface"
            >
              <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-primary-blue/20 bg-primary-blue/10">
                {profile.avatarBase64 ? (
                  <img
                    src={`data:image/jpeg;base64,${profile.avatarBase64}`}
                    alt={displayName}
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  <span className="text-xs font-semibold text-primary-blue">{initials}</span>
                )}
              </div>
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold leading-none text-foreground">{displayName}</p>
                <p className="mt-1 text-[11px] capitalize text-muted-foreground">{role}</p>
              </div>
            </Link>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-background p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
