'use client';

import { Box } from '@chakra-ui/react';
import { usePathname } from 'next/navigation';
import { ChakraProvider } from '@chakra-ui/react';
import theme from '@/theme';
import Navigation from './Navigation';
import HomeRouteScene from './HomeRouteScene';

export default function Providers({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isHome = pathname === '/';

  return (
    <ChakraProvider theme={theme}>
      {!isHome && <Navigation />}
      {isHome && <HomeRouteScene />}
      <Box
        as="main"
        position="relative"
        zIndex={1}
        bg={isHome ? 'transparent' : 'gray.50'}
        minH={isHome ? '100vh' : 'calc(100vh - 64px)'}
        pointerEvents={isHome ? 'none' : 'auto'}
      >
        {children}
      </Box>
    </ChakraProvider>
  );
}
