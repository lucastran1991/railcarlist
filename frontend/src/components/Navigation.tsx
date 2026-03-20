'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export default function Navigation() {
  const pathname = usePathname();

  const navItems = [
    { href: '/railcars', label: 'Railcars' },
    { href: '/railcars/new', label: 'New railcar' },
    { href: '/railcars/import', label: 'Import XLSX' },
  ];

  return (
    <nav className="bg-nav-bg border-b border-nav-border py-3">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="hover:opacity-90">
            <span className="text-lg font-semibold text-nav-link-active">
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
                      ? 'font-semibold text-nav-link-active border-b-2 border-brand-500 bg-white/10'
                      : 'font-normal text-nav-link hover:text-nav-link-hover'
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
