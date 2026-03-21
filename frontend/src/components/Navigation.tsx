'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ChevronDown, LogOut, User, Zap, Activity, Droplets, Gauge, Flame } from 'lucide-react';
import { getUser, logout } from '@/lib/auth';

export default function Navigation() {
  const pathname = usePathname();
  const isHome = pathname === '/';
  const isLogin = pathname === '/login';
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const user = getUser();

  // Close menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
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
  ];

  return (
    <nav className={cn(
      'py-3 border-b border-[#30363d] z-30 pointer-events-auto bg-[#161b22]',
      isHome && 'fixed top-0 left-0 right-0'
    )}>
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="hover:opacity-90">
            <span className="text-lg font-semibold text-white">
              Vopak Terminal
            </span>
          </Link>

          <div className="flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-2 rounded-md text-sm transition-colors',
                    isActive
                      ? 'font-semibold text-white border-b-2 border-[#0969da] bg-white/10'
                      : 'font-normal text-white/70 hover:text-white hover:bg-white/5'
                  )}
                >
                  <Icon size={14} />
                  {item.label}
                </Link>
              );
            })}
          </div>

          {/* User avatar + dropdown */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-white/10 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-[#0969da] flex items-center justify-center text-white text-sm font-bold">
                {user?.name?.charAt(0) ?? 'A'}
              </div>
              <ChevronDown size={14} className={cn('text-white/60 transition-transform', menuOpen && 'rotate-180')} />
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-[#1c2128] border border-[#30363d] rounded-lg shadow-xl py-1 z-50">
                <div className="px-4 py-3 border-b border-[#30363d]">
                  <p className="text-sm font-semibold text-white">{user?.name ?? 'Admin'}</p>
                  <p className="text-xs text-white/50">{user?.role ?? 'Administrator'}</p>
                </div>
                <button
                  onClick={() => { setMenuOpen(false); logout(); }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-400 hover:bg-white/5 transition-colors"
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
  );
}
