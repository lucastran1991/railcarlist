'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { LogOut, ChevronDown, Menu, Bell, AlertTriangle, Info, CheckCircle, Clock } from 'lucide-react';
import { getUser, logout } from '@/lib/auth';
import ThemeToggle from './ThemeToggle';
import StyleToggle from './StyleToggle';
import Sidebar, { SIDEBAR_STORAGE_KEY } from './Sidebar';

export default function Navigation() {
  const pathname = usePathname();
  const isHome = pathname === '/';
  const isLogin = pathname === '/login';
  const [menuOpen, setMenuOpen] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const alertRef = useRef<HTMLDivElement>(null);

  const alerts = [
    { id: 1, type: 'critical' as const, title: 'Boiler 3 — High Stack Temperature', desc: 'Stack temp exceeded 220°C alarm threshold', time: '2 min ago' },
    { id: 2, type: 'warning' as const, title: 'Tank TK-201 — Level Above 90%', desc: 'Diesel tank at 92% capacity, approaching overflow limit', time: '18 min ago' },
    { id: 3, type: 'warning' as const, title: 'Sub Station TR-03 — High Load', desc: 'Transformer loading at 85%, above 80% warning', time: '45 min ago' },
    { id: 4, type: 'info' as const, title: 'Scheduled Maintenance — Boiler 4', desc: 'Boiler 4 offline for planned maintenance until Mar 25', time: '2 hrs ago' },
    { id: 5, type: 'resolved' as const, title: 'Power Factor Restored', desc: 'Power factor returned to 0.94 after capacitor bank switched', time: '3 hrs ago' },
  ];

  const alertIcon = (type: 'critical' | 'warning' | 'info' | 'resolved') => {
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

  // Sync sidebar collapsed state for layout offset
  useEffect(() => {
    const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY);
    setSidebarCollapsed(stored === 'true');

    const observer = new MutationObserver(() => {
      const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY);
      setSidebarCollapsed(stored === 'true');
    });

    // Watch for sidebar width changes via DOM attribute
    const interval = setInterval(() => {
      const s = localStorage.getItem(SIDEBAR_STORAGE_KEY);
      setSidebarCollapsed(s === 'true');
    }, 500);

    return () => { observer.disconnect(); clearInterval(interval); };
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
      if (alertRef.current && !alertRef.current.contains(e.target as Node)) setAlertOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (isLogin) return null;

  const sidebarWidth = sidebarCollapsed ? 60 : 220;

  return (
    <>
      {/* Sidebar */}
      <Sidebar mobileOpen={mobileNavOpen} onMobileClose={() => setMobileNavOpen(false)} />

      {/* Top bar */}
      <nav
        className={cn(
          'fixed top-0 right-0 z-30 h-14 border-b border-border/50 topbar-surface',
          'transition-all duration-300',
        )}
        style={{ left: `${sidebarWidth}px` }}
      >
        <div className="h-full px-4 flex items-center justify-between">
          {/* Left: mobile hamburger + breadcrumb */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
            >
              <Menu size={18} />
            </button>

            {/* Breadcrumb-style page indicator */}
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
              <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
              {pathname !== '/' && (
                <>
                  <span>/</span>
                  <span className="text-foreground font-medium capitalize">
                    {pathname.split('/')[1]?.replace('-', ' ')}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-1.5">
            {/* Alert bell */}
            <div className="relative" ref={alertRef}>
              <button
                onClick={() => { setAlertOpen(!alertOpen); setMenuOpen(false); }}
                className="relative w-9 h-9 flex items-center justify-center rounded-lg hover:bg-muted/50 transition-colors"
              >
                <Bell size={16} className="text-muted-foreground" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-[var(--color-danger,#E53E3E)] text-[9px] font-bold text-white flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>
              {alertOpen && (
                <div className="absolute right-0 mt-2 w-[340px] max-h-[420px] rounded-xl border border-border/50 dropdown-surface shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-foreground">Alerts</h3>
                    <span className="text-[10px] text-muted-foreground">{unreadCount} unread</span>
                  </div>
                  <div className="overflow-y-auto max-h-[340px] divide-y divide-border/30">
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
                            <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{alert.desc}</p>
                            <div className="flex items-center gap-1 mt-1.5">
                              <Clock size={10} className="text-muted-foreground/50" />
                              <span className="text-[10px] text-muted-foreground/50">{alert.time}</span>
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
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-1.5 pl-1.5 pr-1 py-1 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="w-7 h-7 rounded-full bg-gradient-to-r from-[var(--color-gradient-from,#5CE5A0)] to-[var(--color-gradient-to,#56CDE7)] flex items-center justify-center text-primary-foreground text-xs font-bold">
                  {user?.name?.charAt(0) ?? 'A'}
                </div>
                <ChevronDown size={12} className={cn('text-muted-foreground transition-transform hidden sm:block', menuOpen && 'rotate-180')} />
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-52 rounded-xl border border-border/50 dropdown-surface shadow-xl py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
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
          </div>
        </div>
      </nav>
    </>
  );
}
