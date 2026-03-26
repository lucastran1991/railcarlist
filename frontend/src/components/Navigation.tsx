'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ChevronDown, LogOut, Zap, Activity, Droplets, Gauge, Flame, Menu, X, Bell, AlertTriangle, Info, CheckCircle, Clock, Sparkles, GitBranch } from 'lucide-react';
import { getUser, logout } from '@/lib/auth';
import { API_BASE_URL, apiFetch } from '@/lib/config';
import ThemeToggle from './ThemeToggle';
import StyleToggle from './StyleToggle';
import TerminalSelector from './TerminalSelector';

interface AlertItem {
  id: number;
  type: 'critical' | 'warning' | 'info' | 'resolved';
  title: string;
  description: string;
  source: string;
  sourceId: string;
  createdAt: number;
  resolvedAt: number;
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs > 1 ? 's' : ''} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

export default function Navigation() {
  const pathname = usePathname();
  const isLogin = pathname === '/login';
  const [menuOpen, setMenuOpen] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const menuRef = useRef<HTMLDivElement>(null);
  const alertRef = useRef<HTMLDivElement>(null);

  const alertIcon = (type: AlertItem['type']) => {
    switch (type) {
      case 'critical': return <AlertTriangle size={14} className="text-[var(--color-danger,#E53E3E)] shrink-0" />;
      case 'warning': return <AlertTriangle size={14} className="text-[var(--color-warning,#F6AD55)] shrink-0" />;
      case 'info': return <Info size={14} className="text-[var(--color-secondary,#56CDE7)] shrink-0" />;
      case 'resolved': return <CheckCircle size={14} className="text-[var(--color-accent,#5CE5A0)] shrink-0" />;
    }
  };

  const unreadCount = alerts.filter(a => a.type !== 'resolved').length;

  useEffect(() => { setUser(getUser()); }, []);
  useEffect(() => { setMobileNavOpen(false); }, [pathname]);

  // Fetch alerts from API
  useEffect(() => {
    apiFetch(`${API_BASE_URL}/api/alerts?limit=5`)
      .then(r => r.json())
      .then(data => setAlerts(Array.isArray(data?.data) ? data.data : []))
      .catch(() => {});
  }, []);

  // Close all dropdowns when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
      if (alertRef.current && !alertRef.current.contains(e.target as Node)) setAlertOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (isLogin) return null;

  const navItems = [
    { href: '/electricity', label: 'Electricity', icon: Zap },
    { href: '/sub-station', label: 'Sub Station', icon: Activity },
    { href: '/steam', label: 'Steam', icon: Droplets },
    { href: '/tank', label: 'Tank', icon: Gauge },
    { href: '/boiler', label: 'Boiler', icon: Flame },
    { href: '/pipeline', label: 'Pipeline', icon: GitBranch },
    { href: '/chat', label: 'AI', icon: Sparkles },
  ];

  // Close other dropdowns when opening one
  const openAlert = () => { setAlertOpen(!alertOpen); setMenuOpen(false); };
  const openMenu = () => { setMenuOpen(!menuOpen); setAlertOpen(false); };

  return (
    <>
      <nav className="py-1.5 z-30 pointer-events-auto fixed top-0 left-0 right-0 topbar-surface border-b border-border/50">
        <div className="mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Link href="/" className="hover:opacity-90">
                <span className="text-lg font-semibold gradient-text">Vopak</span>
              </Link>
              <TerminalSelector />
            </div>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-0.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={item.label}
                    className={cn(
                      'nav-item flex items-center gap-1 px-2 lg:px-2.5 py-1.5 rounded-lg text-[13px] transition-all duration-200 border',
                      isActive
                        ? 'nav-item-active font-bold text-foreground'
                        : 'nav-item-inactive font-semibold text-foreground/70 border-transparent'
                    )}
                  >
                    <Icon size={14} />
                    <span className="hidden lg:inline">{item.label}</span>
                  </Link>
                );
              })}
            </div>

            <div className="flex items-center gap-1.5">
              {/* Alert bell */}
              <div className="relative" ref={alertRef}>
                <button
                  onClick={openAlert}
                  className="relative w-9 h-9 flex items-center justify-center rounded-lg border border-border hover:bg-muted transition-colors"
                >
                  <Bell size={16} className="text-foreground/70" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[var(--color-danger,#E53E3E)] text-[9px] font-bold text-white flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </button>
                {alertOpen && (
                  <div className="absolute right-0 mt-5 w-[340px] max-h-[420px] rounded-xl border border-border/50 dropdown-surface shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-foreground">Alerts</h3>
                      <span className="text-[10px] text-muted-foreground">{unreadCount} unread</span>
                    </div>
                    <div className="overflow-y-auto max-h-[340px] divide-y divide-border/30">
                      {alerts.length === 0 && (
                        <div className="px-4 py-6 text-center text-xs text-muted-foreground">No alerts</div>
                      )}
                      {alerts.map((alert) => (
                        <div
                          key={alert.id}
                          className={cn(
                            'px-4 py-3 hover:bg-muted/30 transition cursor-pointer',
                            alert.type === 'resolved' && 'opacity-60'
                          )}
                        >
                          <div className="flex gap-2.5">
                            <div className="mt-0.5">{alertIcon(alert.type)}</div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium text-foreground leading-tight">{alert.title}</p>
                              <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{alert.description}</p>
                              <div className="flex items-center gap-1 mt-1.5">
                                <Clock size={10} className="text-muted-foreground/50" />
                                <span className="text-[10px] text-muted-foreground/50">{timeAgo(alert.createdAt)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="px-4 py-2.5 border-t border-border/50">
                      <Link
                        href="/alerts"
                        onClick={() => setAlertOpen(false)}
                        className="block w-full text-xs text-center text-[var(--color-accent,#5CE5A0)] hover:underline font-medium"
                      >
                        View all alerts
                      </Link>
                    </div>
                  </div>
                )}
              </div>
              <StyleToggle />
              <ThemeToggle />

              {/* User menu */}
              <div className="relative" ref={menuRef}>
                <button
                  onClick={openMenu}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted transition-colors"
                >
                  {user?.avatar_url ? (
                    <img src={user.avatar_url} alt={user.name} className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[var(--color-gradient-from,#5CE5A0)] to-[var(--color-gradient-to,#56CDE7)] flex items-center justify-center text-primary-foreground text-sm font-bold">
                      {user?.name?.charAt(0) ?? 'A'}
                    </div>
                  )}
                  <ChevronDown size={14} className={cn('text-foreground/60 transition-transform hidden sm:block', menuOpen && 'rotate-180')} />
                </button>

                {menuOpen && (
                  <div className="absolute right-0 mt-5 w-56 dropdown-surface border border-border/50 rounded-xl shadow-xl py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="px-4 py-3 border-b border-border/50">
                      <p className="text-sm font-semibold text-foreground">{user?.name ?? 'Admin'}</p>
                      <p className="text-xs text-muted-foreground">{user?.role ?? 'Administrator'}</p>
                    </div>
                    <button
                      onClick={() => { setMenuOpen(false); logout(); }}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-400 hover:bg-muted/30 transition-colors"
                    >
                      <LogOut size={14} />
                      Sign out
                    </button>
                  </div>
                )}
              </div>

              {/* Mobile hamburger */}
              <button
                onClick={() => setMobileNavOpen(!mobileNavOpen)}
                className="md:hidden p-2 rounded-md hover:bg-muted text-foreground/70 transition-colors"
              >
                {mobileNavOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile nav drawer */}
      {mobileNavOpen && (
        <div className="md:hidden fixed inset-x-0 top-[48px] z-30 dropdown-surface border-b border-border/50 pointer-events-auto animate-[fadeIn_0.15s_ease-out]">
          <div className="px-4 py-3 flex flex-col gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'nav-item flex items-center gap-2 px-4 py-3 rounded-lg text-sm transition-all duration-200 border',
                    isActive
                      ? 'nav-item-active font-bold text-foreground'
                      : 'nav-item-inactive font-normal text-foreground/70 border-transparent'
                  )}
                >
                  <Icon size={16} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
