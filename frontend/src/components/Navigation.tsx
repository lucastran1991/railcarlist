'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ChevronDown, LogOut, Zap, Activity, Droplets, Gauge, Flame, Menu, X } from 'lucide-react';
import { getUser, logout } from '@/lib/auth';

export default function Navigation() {
  const pathname = usePathname();
  const isHome = pathname === '/';
  const isLogin = pathname === '/login';
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setUser(getUser()); }, []);
  useEffect(() => { setMobileNavOpen(false); }, [pathname]);

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

  const userMenu = (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-white/10 transition-colors"
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[#5CE5A0] to-[#56CDE7] flex items-center justify-center text-[#080A11] text-sm font-bold">
          {user?.name?.charAt(0) ?? 'A'}
        </div>
        <ChevronDown size={14} className={cn('text-white/60 transition-transform hidden sm:block', menuOpen && 'rotate-180')} />
      </button>

      {menuOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-[#1B1E27] border border-[#2C2E39] rounded-xl shadow-ntx py-1 z-50">
          <div className="px-4 py-3 border-b border-[#2C2E39]">
            <p className="text-sm font-semibold text-[#F5F5F7]">{user?.name ?? 'Admin'}</p>
            <p className="text-xs text-[#454A5F]">{user?.role ?? 'Administrator'}</p>
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
  );

  // Home page: logo top-left, user top-right, no nav bar
  if (isHome) {
    return (
      <>
        <div className="fixed top-4 left-4 z-30 pointer-events-auto">
          <Link href="/" className="hover:opacity-90">
            <span className="text-lg font-semibold gradient-text">Vopak Terminal</span>
          </Link>
        </div>
        <div className="fixed top-3 right-4 z-30 pointer-events-auto">
          {userMenu}
        </div>
      </>
    );
  }

  // Other pages: full nav bar with mobile hamburger
  return (
    <>
      <nav className="py-3 border-b border-[#2C2E39] z-30 pointer-events-auto glass">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="hover:opacity-90">
              <span className="text-lg font-semibold gradient-text">Vopak Terminal</span>
            </Link>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-all duration-200',
                      isActive
                        ? 'font-bold text-white bg-gradient-to-r from-[#5CE5A0]/10 to-[#56CDE7]/10 border border-[#5CE5A0]/30 shadow-[0_0_12px_rgba(92,229,160,0.15)]'
                        : 'font-normal text-[#F5F5F7]/70 hover:text-[#5DDFFF] hover:bg-white/5 border border-transparent'
                    )}
                  >
                    <Icon size={14} />
                    {item.label}
                  </Link>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              {userMenu}
              {/* Mobile hamburger */}
              <button
                onClick={() => setMobileNavOpen(!mobileNavOpen)}
                className="md:hidden p-2 rounded-md hover:bg-white/10 text-[#F5F5F7]/70 transition-colors"
              >
                {mobileNavOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile nav drawer */}
      {mobileNavOpen && (
        <div className="md:hidden fixed inset-x-0 top-[57px] z-30 glass border-b border-[#2C2E39] pointer-events-auto animate-[fadeIn_0.15s_ease-out]">
          <div className="px-4 py-3 flex flex-col gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2 px-4 py-3 rounded-lg text-sm transition-all duration-200',
                    isActive
                      ? 'font-bold text-white bg-gradient-to-r from-[#5CE5A0]/10 to-[#56CDE7]/10 border border-[#5CE5A0]/30 shadow-[0_0_12px_rgba(92,229,160,0.15)]'
                      : 'font-normal text-[#F5F5F7]/70 hover:text-white hover:bg-white/5 border border-transparent'
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
