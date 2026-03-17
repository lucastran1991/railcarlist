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
import { format } from 'date-fns';
import { createRailcar } from '@/lib/api';

// Format ISO or datetime-local string for input type="datetime-local" (YYYY-MM-DDTHH:mm)
function toDatetimeLocalValue(isoOrEmpty: string): string {
  if (!isoOrEmpty.trim()) return '';
  try {
    const d = new Date(isoOrEmpty);
    return format(d, "yyyy-MM-dd'T'HH:mm");
  } catch {
    return '';
  }
}

// Convert datetime-local input value to ISO 8601 for API
function fromDatetimeLocalToISO(localValue: string): string {
  if (!localValue.trim()) return '';
  try {
    return new Date(localValue).toISOString();
  } catch {
    return localValue;
  }
}

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
    <Container maxW="container.md" py={6}>
      <Heading size="lg" mb={6}>
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
            <Button type="submit" colorScheme="blue" isLoading={loading} mr={3}>
              Create
            </Button>
            <Button as={Link} href="/railcars" variant="outline">
              Cancel
            </Button>
          </Box>
        </VStack>
      </form>
    </Container>
  );
}
