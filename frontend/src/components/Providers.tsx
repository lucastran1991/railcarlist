'use client';

import { usePathname } from 'next/navigation';
import Navigation from './Navigation';
import HomeRouteScene from './HomeRouteScene';

export default function Providers({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isHome = pathname === '/';
  const isLogin = pathname === '/login';

  return (
    <>
      {!isLogin && <Navigation />}
      {isHome && !isLogin && <HomeRouteScene />}
      <main
        className={`relative z-[1] ${
          isLogin
            ? ''
            : isHome
              ? 'bg-transparent min-h-screen pointer-events-none'
              : 'bg-[#080A11] min-h-[calc(100vh-64px)] pointer-events-auto'
        }`}
      >
        {children}
      </main>
    </>
  );
}
