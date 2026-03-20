'use client';

import { usePathname } from 'next/navigation';
import Navigation from './Navigation';
import HomeRouteScene from './HomeRouteScene';

export default function Providers({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isHome = pathname === '/';

  return (
    <>
      {!isHome && <Navigation />}
      {isHome && <HomeRouteScene />}
      <main
        className={`relative z-[1] ${isHome ? 'bg-transparent min-h-screen pointer-events-none' : 'bg-gray-50 min-h-[calc(100vh-64px)] pointer-events-auto'}`}
      >
        {children}
      </main>
    </>
  );
}
