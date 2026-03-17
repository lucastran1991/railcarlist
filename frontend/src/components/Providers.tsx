'use client';

import { ChakraProvider } from '@chakra-ui/react';
import theme from '@/theme';
import Navigation from './Navigation';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ChakraProvider theme={theme}>
      <Navigation />
      {children}
    </ChakraProvider>
  );
}
