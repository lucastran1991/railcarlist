'use client';

import {
  Box,
  VStack,
  Text,
  HStack,
  IconButton,
} from '@chakra-ui/react';
import {
  FiZoomIn,
  FiZoomOut,
  FiRotateCcw,
  FiRotateCw,
  FiChevronUp,
  FiChevronDown,
  FiRefreshCw,
} from 'react-icons/fi';
import type { TerminalCameraApi } from '@/lib/three/terminalScene';

export type TerminalSceneControlsProps = {
  cameraApi: TerminalCameraApi | null;
};

export default function TerminalSceneControls({ cameraApi }: TerminalSceneControlsProps) {
  const btn = (label: string, icon: React.ReactElement, onClick: () => void) => (
    <IconButton
      aria-label={label}
      icon={icon}
      size="sm"
      variant="outline"
      colorScheme="whiteAlpha"
      color="gray.300"
      borderColor="whiteAlpha.300"
      _hover={{ bg: 'whiteAlpha.200', borderColor: 'whiteAlpha.500' }}
      isDisabled={!cameraApi}
      onClick={onClick}
    />
  );

  return (
    <Box
      position="fixed"
      left={3}
      top={3}
      zIndex={20}
      w="200px"
      p={3}
      borderRadius="lg"
      bg="rgba(0, 0, 0, 0.5)"
      backdropFilter="blur(10px)"
      borderWidth="1px"
      borderColor="whiteAlpha.100"
      boxShadow="md"
    >
      <Text
        fontSize="xs"
        fontWeight="700"
        textTransform="uppercase"
        letterSpacing="wider"
        mb={3}
        color="gray.400"
      >
        Camera
      </Text>
      <VStack align="stretch" spacing={2}>
        <HStack spacing={1} justify="center">
          {btn('Zoom in', <FiZoomIn />, () => cameraApi?.zoomIn())}
          {btn('Zoom out', <FiZoomOut />, () => cameraApi?.zoomOut())}
        </HStack>
        <HStack spacing={1} justify="center">
          {btn('Rotate left', <FiRotateCcw />, () => cameraApi?.rotateLeft())}
          {btn('Rotate right', <FiRotateCw />, () => cameraApi?.rotateRight())}
        </HStack>
        <HStack spacing={1} justify="center">
          {btn('Tilt up', <FiChevronUp />, () => cameraApi?.tiltUp())}
          {btn('Tilt down', <FiChevronDown />, () => cameraApi?.tiltDown())}
        </HStack>
        <HStack spacing={1} justify="center">
          {btn('Reset camera', <FiRefreshCw />, () => cameraApi?.reset())}
        </HStack>
      </VStack>
    </Box>
  );
}
