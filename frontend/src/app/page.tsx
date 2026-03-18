'use client';

import { Container, Heading, Text, VStack, SimpleGrid, Box, Button } from '@chakra-ui/react';
import NextLink from 'next/link';
import { FiList, FiPlus, FiUpload } from 'react-icons/fi';

export default function HomePage() {
  return (
    <Box position="relative" minH="calc(100vh - 64px)" overflow="hidden">
      <Container maxW="container.xl" py={16}>
        <VStack spacing={12} align="stretch">
          <VStack
            spacing={4}
            textAlign="center"
            py={8}
            px={4}
            borderRadius="xl"
            bg="rgba(255,255,255,0.9)"
            backdropFilter="blur(12px)"
            boxShadow="lg"
            borderWidth="1px"
            borderColor="whiteAlpha.600"
          >
            <Heading size="2xl" color="gray.800" fontWeight={600}>
              Manage your railcar schedule
            </Heading>
            <Text fontSize="lg" color="gray.600" maxW="xl" mx="auto">
              View, create, and import railcar data. Built for terminal operations and scheduling.
            </Text>
            <Button as={NextLink} href="/railcars" colorScheme="brand" size="lg" mt={2}>
              Go to Railcar list
            </Button>
          </VStack>

          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6} pt={4}>
            <Box
              as={NextLink}
              href="/railcars"
              p={6}
              bg="white"
              borderRadius="lg"
              boxShadow="card"
              borderWidth="1px"
              borderColor="gray.200"
              _hover={{ borderColor: 'brand.500', boxShadow: 'md' }}
              transition="all 0.2s"
            >
              <VStack align="start" spacing={3}>
                <Box color="brand.500" fontSize="2xl">
                  <FiList />
                </Box>
                <Heading size="md" color="gray.800">
                  Railcar list
                </Heading>
                <Text fontSize="sm" color="gray.600">
                  View and manage all railcars with pagination and sorting.
                </Text>
              </VStack>
            </Box>
            <Box
              as={NextLink}
              href="/railcars/new"
              p={6}
              bg="white"
              borderRadius="lg"
              boxShadow="card"
              borderWidth="1px"
              borderColor="gray.200"
              _hover={{ borderColor: 'brand.500', boxShadow: 'md' }}
              transition="all 0.2s"
            >
              <VStack align="start" spacing={3}>
                <Box color="brand.500" fontSize="2xl">
                  <FiPlus />
                </Box>
                <Heading size="md" color="gray.800">
                  Create new
                </Heading>
                <Text fontSize="sm" color="gray.600">
                  Add a new railcar with name, start/end time, spot, product, and tank.
                </Text>
              </VStack>
            </Box>
            <Box
              as={NextLink}
              href="/railcars/import"
              p={6}
              bg="white"
              borderRadius="lg"
              boxShadow="card"
              borderWidth="1px"
              borderColor="gray.200"
              _hover={{ borderColor: 'brand.500', boxShadow: 'md' }}
              transition="all 0.2s"
            >
              <VStack align="start" spacing={3}>
                <Box color="brand.500" fontSize="2xl">
                  <FiUpload />
                </Box>
                <Heading size="md" color="gray.800">
                  Import XLSX
                </Heading>
                <Text fontSize="sm" color="gray.600">
                  Upload a spreadsheet. Standard or Savana monthly format supported.
                </Text>
              </VStack>
            </Box>
          </SimpleGrid>
        </VStack>
      </Container>
    </Box>
  );
}
