'use client';

import { ThemeProvider } from 'next-themes';
import { usePathname } from 'next/navigation';
import Navigation from './Navigation';
import HomeRouteScene from './HomeRouteScene';
import { useSystemConfig } from '@/lib/useSystemConfig';
import { useThemeInit } from '@/lib/useStyleTheme';

export default function Providers({ children }: { children: React.ReactNode }) {
  useSystemConfig();
  useThemeInit(); // loads colors from system.cfg.json → CSS vars
  const pathname = usePathname();
  const isHome = pathname === '/';
  const isLogin = pathname === '/login';

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      {!isLogin && <Navigation />}
      {isHome && !isLogin && <HomeRouteScene />}
      <main
        className={`relative z-[1] ${
          isLogin
            ? ''
            : isHome
              ? 'bg-transparent min-h-screen pointer-events-none'
              : 'min-h-[calc(100vh-48px)] pt-[48px] pointer-events-auto'
        }`}
      >
        {children}
      </main>
    </ThemeProvider>
  );
}
