'use client';

import { useState, useRef } from 'react';
import {
  Container,
  Box,
  Heading,
  Button,
  VStack,
  Text,
  useToast,
  Alert,
  AlertIcon,
  List,
  ListItem,
  ListIcon,
  Card,
  CardBody,
  CardHeader,
  Flex,
  Icon,
  Input,
} from '@chakra-ui/react';
import Link from 'next/link';
import { FiAlertCircle, FiUploadCloud, FiFileSpreadsheet } from 'react-icons/fi';
import { importRailcarsXLSX } from '@/lib/api';

export default function ImportRailcarsPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [result, setResult] = useState<{ created: number; errors?: string[] } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    setFile(f || null);
    setResult(null);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped && (dropped.name.endsWith('.xlsx') || dropped.name.endsWith('.xls'))) {
      setFile(dropped);
      setResult(null);
    } else if (dropped) {
      toast({ title: 'Please use .xlsx or .xls file', status: 'warning' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast({ title: 'Choose an XLSX file', status: 'warning' });
      return;
    }
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast({ title: 'File must be .xlsx or .xls', status: 'warning' });
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await importRailcarsXLSX(file);
      setResult({ created: res.created, errors: res.errors });
      if (res.created > 0) {
        toast({ title: `Imported ${res.created} railcar(s)`, status: 'success' });
      }
      if (inputRef.current) inputRef.current.value = '';
      setFile(null);
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : 'Import failed', status: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxW="container.md" py={8}>
      <Heading size="lg" mb={2}>
        Import railcar list
      </Heading>
      <Text mb={6} color="gray.600" fontSize="sm">
        Upload a spreadsheet with columns: <strong>name</strong>, <strong>startTime</strong> (or start_time), <strong>endTime</strong> (or end_time). First row is the header.
      </Text>

      <Card variant="outline" shadow="sm" borderRadius="xl" overflow="hidden" mb={6}>
        <CardBody p={0}>
          <Box
            as="form"
            onSubmit={handleSubmit}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <Flex
              as="label"
              cursor="pointer"
              direction="column"
              align="center"
              justify="center"
              minH="200px"
              px={6}
              py={8}
              bg={dragActive ? 'blue.50' : 'gray.50'}
              borderWidth="2px"
              borderStyle="dashed"
              borderColor={dragActive ? 'blue.400' : 'gray.200'}
              borderRadius="lg"
              mx={4}
              mt={4}
              mb={4}
              transition="all 0.2s"
              _hover={{ bg: 'gray.100', borderColor: 'gray.300' }}
            >
              <Input
                ref={inputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                position="absolute"
                width="0"
                height="0"
                opacity={0}
                aria-hidden="true"
              />
              {file ? (
                <VStack spacing={2}>
                  <Icon as={FiFileSpreadsheet} boxSize={10} color="green.500" />
                  <Text fontWeight="medium" color="gray.700">
                    {file.name}
                  </Text>
                  <Text fontSize="sm" color="gray.500">
                    Click the area or drop another file to replace
                  </Text>
                </VStack>
              ) : (
                <VStack spacing={3}>
                  <Icon as={FiUploadCloud} boxSize={12} color="gray.400" />
                  <Text fontWeight="medium" color="gray.600">
                    Drag & drop your file here, or click to browse
                  </Text>
                  <Text fontSize="sm" color="gray.500">
                    .xlsx or .xls only
                  </Text>
                </VStack>
              )}
            </Flex>
            <Flex gap={3} px={4} pb={4} justify="flex-start" flexWrap="wrap">
              <Button
                type="submit"
                colorScheme="blue"
                isLoading={loading}
                isDisabled={!file}
                size="md"
              >
                Import
              </Button>
              <Button as={Link} href="/railcars" variant="outline" size="md">
                Back to list
              </Button>
            </Flex>
          </Box>
        </CardBody>
      </Card>

      {result && (
        <VStack align="stretch" spacing={4}>
          <Alert status="success" borderRadius="lg" shadow="sm">
            <AlertIcon />
            Created {result.created} railcar(s).
          </Alert>
          {result.errors && result.errors.length > 0 && (
            <Card variant="outline" shadow="sm" borderRadius="lg" overflow="hidden">
              <CardHeader py={3} px={4} bg="orange.50" borderBottomWidth="1px">
                <Text fontWeight="bold" fontSize="sm" color="orange.800">
                  {result.errors.length} row error(s)
                </Text>
              </CardHeader>
              <CardBody py={3} px={4}>
                <List spacing={2}>
                  {result.errors.slice(0, 20).map((msg, i) => (
                    <ListItem key={i} display="flex" alignItems="flex-start" fontSize="sm">
                      <ListIcon as={FiAlertCircle} color="orange.500" mt={0.5} />
                      {msg}
                    </ListItem>
                  ))}
                  {result.errors.length > 20 && (
                    <ListItem color="gray.500" fontSize="sm">
                      ... and {result.errors.length - 20} more
                    </ListItem>
                  )}
                </List>
              </CardBody>
            </Card>
          )}
        </VStack>
      )}
    </Container>
  );
}
