'use client';

import { useState } from 'react';
import {
  Container,
  Box,
  Heading,
  Button,
  FormControl,
  FormLabel,
  Input,
  VStack,
  useToast,
} from '@chakra-ui/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createRailcar } from '@/lib/api';
import { toDatetimeLocalValue, fromDatetimeLocalToISO } from '@/lib/format';

export default function NewRailcarPage() {
  const [name, setName] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [spot, setSpot] = useState('');
  const [product, setProduct] = useState('');
  const [tank, setTank] = useState('');
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({ title: 'Name is required', status: 'warning' });
      return;
    }
    setLoading(true);
    try {
      await createRailcar({ name: name.trim(), startTime: startTime.trim(), endTime: endTime.trim(), spot: spot.trim(), product: product.trim(), tank: tank.trim() });
      toast({ title: 'Railcar created', status: 'success' });
      router.push('/railcars');
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : 'Create failed', status: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box bg="gray.50" minH="calc(100vh - 64px)">
      <Container maxW="container.md" py={6}>
        <Heading size="lg" mb={6} color="gray.800">
          Create new railcar
        </Heading>
      <form onSubmit={handleSubmit}>
        <VStack spacing={4} align="stretch">
          <FormControl isRequired>
            <FormLabel>Name</FormLabel>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. RC-101"
            />
          </FormControl>
          <FormControl>
            <FormLabel>Start time</FormLabel>
            <Input
              type="datetime-local"
              value={toDatetimeLocalValue(startTime)}
              onChange={(e) => setStartTime(fromDatetimeLocalToISO(e.target.value))}
            />
          </FormControl>
          <FormControl>
            <FormLabel>End time</FormLabel>
            <Input
              type="datetime-local"
              value={toDatetimeLocalValue(endTime)}
              onChange={(e) => setEndTime(fromDatetimeLocalToISO(e.target.value))}
            />
          </FormControl>
          <FormControl>
            <FormLabel>Spot (optional)</FormLabel>
            <Input
              value={spot}
              onChange={(e) => setSpot(e.target.value)}
              placeholder="e.g. SPOT8"
            />
          </FormControl>
          <FormControl>
            <FormLabel>Product (optional)</FormLabel>
            <Input
              value={product}
              onChange={(e) => setProduct(e.target.value)}
              placeholder="e.g. ASPHALT"
            />
          </FormControl>
          <FormControl>
            <FormLabel>Tank (optional)</FormLabel>
            <Input
              value={tank}
              onChange={(e) => setTank(e.target.value)}
              placeholder="e.g. 20"
            />
          </FormControl>
          <Box pt={2}>
            <Button type="submit" colorScheme="brand" isLoading={loading} mr={3}>
              Create
            </Button>
            <Button as={Link} href="/railcars" variant="outline">
              Cancel
            </Button>
          </Box>
        </VStack>
      </form>
      </Container>
    </Box>
  );
}
