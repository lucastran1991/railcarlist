'use client';

import { Box, Text, VStack, HStack } from '@chakra-ui/react';
import type { CameraInfo } from '@/lib/three/terminalScene';

export type CameraInfoPanelProps = {
  info: CameraInfo | null;
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <HStack justify="space-between" spacing={3}>
      <Text fontSize="xs" color="gray.400">{label}</Text>
      <Text fontSize="xs" color="white" fontFamily="mono">{value}</Text>
    </HStack>
  );
}

export default function CameraInfoPanel({ info }: CameraInfoPanelProps) {
  if (!info) return null;

  return (
    <Box
      position="fixed"
      right={3}
      top={3}
      zIndex={20}
      w="180px"
      p={3}
      borderRadius="lg"
      bg="rgba(0, 0, 0, 0.5)"
      backdropFilter="blur(10px)"
      borderWidth="1px"
      borderColor="whiteAlpha.100"
      boxShadow="md"
      pointerEvents="auto"
    >
      <Text
        fontSize="xs"
        fontWeight="700"
        textTransform="uppercase"
        letterSpacing="wider"
        mb={2}
        color="gray.400"
      >
        Camera Info
      </Text>
      <VStack align="stretch" spacing={1}>
        <Row label="Angle" value={`${info.angle}°`} />
        <Row label="Radius" value={`${info.radius}`} />
        <Row label="Height" value={`${info.height}`} />
        <Box borderTop="1px solid" borderColor="whiteAlpha.100" my={1} />
        <Row label="X" value={`${info.x}`} />
        <Row label="Y" value={`${info.y}`} />
        <Row label="Z" value={`${info.z}`} />
      </VStack>
    </Box>
  );
}
