'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Zap, Activity, Droplets, Gauge, Flame, GitBranch, Bell, Sparkles,
  PanelLeftClose, PanelLeftOpen, Home,
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/electricity', label: 'Electricity', icon: Zap },
  { href: '/sub-station', label: 'Sub Station', icon: Activity },
  { href: '/steam', label: 'Steam', icon: Droplets },
  { href: '/tank', label: 'Tank', icon: Gauge },
  { href: '/boiler', label: 'Boiler', icon: Flame },
  { href: '/pipeline', label: 'Pipeline', icon: GitBranch },
  { href: '/alerts', label: 'Alerts', icon: Bell },
  { href: '/chat', label: 'AI Assistant', icon: Sparkles },
];

const STORAGE_KEY = 'vopak_sidebar_collapsed';

interface SidebarProps {
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export default function Sidebar({ mobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'true') setCollapsed(true);
  }, []);

  useEffect(() => { onMobileClose(); }, [pathname]);

  const toggle = () => {
    setCollapsed(c => {
      const next = !c;
      localStorage.setItem(STORAGE_KEY, String(next));
      document.documentElement.setAttribute('data-sidebar', next ? 'collapsed' : 'expanded');
      return next;
    });
  };

  // Sync data attribute on mount
  useEffect(() => {
    document.documentElement.setAttribute('data-sidebar', collapsed ? 'collapsed' : 'expanded');
  }, [collapsed]);

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo + collapse toggle */}
      <div className={cn('flex items-center px-3 h-14 border-b border-border/50 shrink-0', collapsed ? 'justify-center' : 'justify-between')}>
        {!collapsed && (
          <Link href="/" className="hover:opacity-90">
            <span className="text-sm font-bold gradient-text">Vopak Terminal</span>
          </Link>
        )}
        <button
          onClick={toggle}
          className="hidden md:flex w-8 h-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              onClick={() => onMobileClose()}
              className={cn(
                'group flex items-center gap-3 rounded-lg transition-all duration-200',
                collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5',
                isActive
                  ? 'font-semibold text-foreground bg-[var(--color-accent,#5CE5A0)]/10 border border-[var(--color-accent,#5CE5A0)]/25'
                  : 'font-normal text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-transparent'
              )}
            >
              <Icon size={18} className={cn(
                'shrink-0 transition-colors',
                isActive ? 'text-[var(--color-accent,#5CE5A0)]' : 'text-muted-foreground group-hover:text-foreground'
              )} />
              {!collapsed && (
                <span className="text-sm truncate">{item.label}</span>
              )}
              {isActive && collapsed && (
                <div className="absolute left-0 w-[3px] h-5 rounded-r-full bg-[var(--color-accent,#5CE5A0)]" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom: version */}
      <div className={cn('px-3 py-3 border-t border-border/50 shrink-0', collapsed && 'px-2')}>
        {!collapsed ? (
          <p className="text-[9px] text-muted-foreground/50">Vopak Terminal PoC v1.0</p>
        ) : (
          <p className="text-[9px] text-muted-foreground/50 text-center">v1</p>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className={cn(
        'hidden md:flex flex-col fixed top-0 left-0 h-screen z-40 border-r border-border/50 transition-all duration-300',
        'sidebar-surface',
        collapsed ? 'w-[60px]' : 'w-[220px]'
      )}>
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px]"
            onClick={onMobileClose}
          />
          <aside className="md:hidden fixed top-0 left-0 h-screen w-[260px] z-50 border-r border-border/50 sidebar-surface animate-[sidebarSlideIn_0.2s_ease-out]">
            {sidebarContent}
          </aside>
        </>
      )}
    </>
  );
}

export { STORAGE_KEY as SIDEBAR_STORAGE_KEY };
