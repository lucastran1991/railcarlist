'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export default function Navigation() {
  const pathname = usePathname();
  const isHome = pathname === '/';

  const navItems = [
    { href: '/railcars', label: 'Railcars' },
    { href: '/railcars/new', label: 'New railcar' },
    { href: '/railcars/import', label: 'Import XLSX' },
  ];

  return (
    <nav className={cn(
      'py-3 border-b z-30 pointer-events-auto',
      isHome
        ? 'fixed top-0 left-0 right-0 bg-black/30 backdrop-blur-md border-white/10'
        : 'relative bg-nav-bg border-nav-border'
    )}>
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="hover:opacity-90">
            <span className="text-lg font-semibold text-white">
              Railcar Schedule
            </span>
          </Link>
          <div className="flex gap-6">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'px-3 py-2 rounded-md text-sm transition-colors',
                    isActive
                      ? 'font-semibold text-white border-b-2 border-brand-500 bg-white/10'
                      : 'font-normal text-white/70 hover:text-white'
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
