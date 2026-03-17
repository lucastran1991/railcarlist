'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Container,
  Box,
  Heading,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Link,
  Spinner,
  Text,
  useToast,
  IconButton,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  useDisclosure,
  Flex,
  HStack,
  Select,
} from '@chakra-ui/react';
import NextLink from 'next/link';
import { FiPlus, FiUpload, FiTrash2 } from 'react-icons/fi';
import { getRailcarsPaginated, deleteRailcar, deleteAllRailcars } from '@/lib/api';
import type { Railcar } from '@/types/api';

const DEFAULT_PAGE_SIZE = 5;
const PAGE_SIZE_OPTIONS = [5, 10, 25, 50];
const SORT_BY = 'startTime';

function formatTime(iso: string): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return isNaN(d.getTime()) ? iso : d.toLocaleString();
  } catch {
    return iso;
  }
}

export default function RailcarsListPage() {
  const [railcars, setRailcars] = useState<Railcar[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteAllLoading, setDeleteAllLoading] = useState(false);
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isOpen: isDeleteAllOpen, onOpen: onDeleteAllOpen, onClose: onDeleteAllClose } = useDisclosure();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const cancelDeleteAllRef = useRef<HTMLButtonElement>(null);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const startItem = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total);

  const fetchList = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getRailcarsPaginated(page, pageSize, SORT_BY);
      setRailcars(res.items);
      setTotal(res.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load railcars');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, [page, pageSize]);

  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = Number(e.target.value);
    if (PAGE_SIZE_OPTIONS.includes(value)) {
      setPageSize(value);
      setPage(1);
    }
  };

  // If current page is empty after fetch (e.g. after delete) and there are more pages, go to previous page
  useEffect(() => {
    if (!loading && railcars.length === 0 && total > 0 && page > 1) {
      setPage((p) => p - 1);
    }
  }, [loading, railcars.length, total, page]);

  const handleDeleteClick = (id: string) => {
    setDeleteId(id);
    onOpen();
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    setDeleteLoading(true);
    try {
      await deleteRailcar(deleteId);
      toast({ title: 'Railcar deleted', status: 'success' });
      setDeleteId(null);
      onClose();
      fetchList();
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : 'Delete failed', status: 'error' });
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDeleteAllConfirm = async () => {
    setDeleteAllLoading(true);
    try {
      const res = await deleteAllRailcars();
      toast({ title: `Deleted ${res.deleted} railcar(s)`, status: 'success' });
      onDeleteAllClose();
      setPage(1);
      fetchList();
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : 'Delete all failed', status: 'error' });
    } finally {
      setDeleteAllLoading(false);
    }
  };

  return (
    <Box bg="gray.50" minH="calc(100vh - 64px)">
      <Container maxW="container.xl" py={6}>
        <Box mb={6} display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={4}>
          <Heading size="lg" color="gray.800">Railcar list</Heading>
          <Box>
            <Button as={NextLink} href="/railcars/new" leftIcon={<FiPlus />} colorScheme="brand" mr={3}>
            Create new
          </Button>
          <Button as={NextLink} href="/railcars/import" leftIcon={<FiUpload />} variant="outline" mr={3}>
            Import XLSX
          </Button>
          <Button
            leftIcon={<FiTrash2 />}
            variant="outline"
            colorScheme="red"
            onClick={onDeleteAllOpen}
            isDisabled={total === 0}
          >
            Delete All
          </Button>
        </Box>
      </Box>

      {loading && (
        <Box py={8} textAlign="center">
          <Spinner size="xl" />
        </Box>
      )}
      {error && (
        <Text color="red.500" mb={4}>
          {error}
        </Text>
      )}
      {!loading && !error && (
        <TableContainer>
          <Table variant="simple">
            <Thead>
              <Tr>
                <Th>Name</Th>
                <Th>Start time</Th>
                <Th>End time</Th>
                <Th>Spot</Th>
                <Th>Product</Th>
                <Th>Tank</Th>
                <Th isNumeric>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {railcars.length === 0 ? (
                <Tr>
                  <Td colSpan={7} textAlign="center" color="gray.500">
                    No railcars yet. Create one or import from XLSX.
                  </Td>
                </Tr>
              ) : (
                railcars.map((rc) => (
                  <Tr key={rc.id}>
                    <Td fontWeight="medium">{rc.name}</Td>
                    <Td>{formatTime(rc.startTime)}</Td>
                    <Td>{formatTime(rc.endTime)}</Td>
                    <Td>{rc.spot ?? '—'}</Td>
                    <Td>{rc.product ?? '—'}</Td>
                    <Td>{rc.tank ?? '—'}</Td>
                    <Td isNumeric>
                      <IconButton
                        aria-label="Delete"
                        icon={<FiTrash2 />}
                        size="sm"
                        colorScheme="red"
                        variant="ghost"
                        onClick={() => handleDeleteClick(rc.id)}
                      />
                    </Td>
                  </Tr>
                ))
              )}
            </Tbody>
          </Table>
        </TableContainer>
      )}

      {!loading && !error && total > 0 && (
        <Flex mt={4} justify="space-between" align="center" flexWrap="wrap" gap={3}>
          <HStack spacing={4}>
            <Text fontSize="sm" color="gray.600">
              Showing {startItem}–{endItem} of {total}
            </Text>
            <HStack spacing={2} align="center">
              <Text as="label" htmlFor="page-size" fontSize="sm" color="gray.600" whiteSpace="nowrap">
                Per page
              </Text>
              <Select
                id="page-size"
                size="sm"
                width="auto"
                minW="4rem"
                value={pageSize}
                onChange={handlePageSizeChange}
              >
                {PAGE_SIZE_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </Select>
            </HStack>
          </HStack>
          <HStack spacing={2}>
            <Button
              size="sm"
              variant="outline"
              isDisabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Text fontSize="sm" px={2}>
              Page {page} of {totalPages}
            </Text>
            <Button
              size="sm"
              variant="outline"
              isDisabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </Button>
          </HStack>
        </Flex>
      )}

      <AlertDialog isOpen={isOpen} onClose={onClose} leastDestructiveRef={cancelRef}>
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader>Delete railcar</AlertDialogHeader>
            <AlertDialogBody>Are you sure? This cannot be undone.</AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onClose}>Cancel</Button>
              <Button colorScheme="red" onClick={handleDeleteConfirm} isLoading={deleteLoading} ml={3}>
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>

      <AlertDialog isOpen={isDeleteAllOpen} onClose={onDeleteAllClose} leastDestructiveRef={cancelDeleteAllRef}>
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader>Delete all railcars</AlertDialogHeader>
            <AlertDialogBody>
              This will permanently delete all {total} railcar(s). This cannot be undone.
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={cancelDeleteAllRef} onClick={onDeleteAllClose}>Cancel</Button>
              <Button colorScheme="red" onClick={handleDeleteAllConfirm} isLoading={deleteAllLoading} ml={3}>
                Delete All
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
      </Container>
    </Box>
  );
}
