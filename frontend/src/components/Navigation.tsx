'use client';

import { Box, Flex, Link, Heading, Container } from '@chakra-ui/react';
import NextLink from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navigation() {
  const pathname = usePathname();

  const navItems = [
    { href: '/railcars', label: 'Railcars' },
    { href: '/railcars/new', label: 'New railcar' },
    { href: '/railcars/import', label: 'Import XLSX' },
  ];

  return (
    <Box bg="nav.bg" borderBottom="1px" borderColor="nav.border" py={3}>
      <Container maxW="container.xl">
        <Flex align="center" justify="space-between">
          <Link
            as={NextLink}
            href="/"
            _hover={{ opacity: 0.9 }}
          >
            <Heading size="md" color="nav.linkActive" fontWeight={600} as="span">
              Railcar Schedule
            </Heading>
          </Link>
          <Flex gap={6}>
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  as={NextLink}
                  href={item.href}
                  key={item.href}
                  fontWeight={isActive ? 600 : 400}
                  color={isActive ? 'nav.linkActive' : 'nav.link'}
                  _hover={{ color: 'nav.linkHover' }}
                  px={3}
                  py={2}
                  borderRadius="md"
                  borderBottomWidth={isActive ? '2px' : 0}
                  borderBottomStyle="solid"
                  borderBottomColor={isActive ? 'brand.500' : 'transparent'}
                  bg={isActive ? 'whiteAlpha.200' : 'transparent'}
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
