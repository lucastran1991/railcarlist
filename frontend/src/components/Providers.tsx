'use client';

import { ThemeProvider } from 'next-themes';
import { usePathname } from 'next/navigation';
import Navigation from './Navigation';
import HomeRouteScene from './HomeRouteScene';
import { useSystemConfig } from '@/lib/useSystemConfig';

export default function Providers({ children }: { children: React.ReactNode }) {
  useSystemConfig();
  const pathname = usePathname();
  const isHome = pathname === '/';
  const isLogin = pathname === '/login';

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      {!isLogin && <Navigation />}
      {isHome && !isLogin && <HomeRouteScene />}
      <div
        className={
          isLogin
            ? ''
            : isHome
              ? 'fixed inset-0 z-[1] pointer-events-none'
              : 'page-content'
        }
      >
        <main className={isHome ? 'pointer-events-none' : ''}>
          {children}
        </main>
      </div>
    </ThemeProvider>
  );
}
