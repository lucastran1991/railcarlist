'use client';

import {
  Box,
  Flex,
  Link,
  Heading,
  Container,
  useColorModeValue,
} from '@chakra-ui/react';
import NextLink from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navigation() {
  const pathname = usePathname();
  const bg = useColorModeValue('gray.100', 'gray.900');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  const navItems = [
    { href: '/railcars', label: 'Railcars' },
    { href: '/railcars/new', label: 'New railcar' },
    { href: '/railcars/import', label: 'Import XLSX' },
  ];

  return (
    <Box bg={bg} borderBottom="1px" borderColor={borderColor} py={4}>
      <Container maxW="container.xl">
        <Flex align="center" justify="space-between">
          <Heading size="md" color="blue.500">
            Railcarlist
          </Heading>
          <Flex gap={6}>
            {navItems.map((item) => {
              const isActive = pathname === item.href || (item.href === '/railcars' && pathname.startsWith('/railcars'));
              return (
                <Link
                  as={NextLink}
                  href={item.href}
                  key={item.href}
                  fontWeight={isActive ? 'bold' : 'normal'}
                  color={isActive ? 'blue.500' : 'gray.600'}
                  _hover={{ color: 'blue.600' }}
                >
                  {item.label}
                </Link>
              );
            })}
          </Flex>
        </Flex>
      </Container>
    </Box>
  );
}
