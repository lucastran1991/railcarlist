'use client';

import {
  Box,
  VStack,
  Text,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  FormControl,
  FormLabel,
  Button,
  ButtonGroup,
  Switch,
  HStack,
  IconButton,
} from '@chakra-ui/react';
import {
  FiZoomIn,
  FiZoomOut,
  FiRotateCcw,
  FiRotateCw,
  FiRefreshCw,
} from 'react-icons/fi';
import type {
  HomeSceneCameraApi,
  SnowThiccLevel,
  WindMode,
} from '@/lib/three/homeScene';

const SNOW_LABELS: Record<SnowThiccLevel, string> = {
  1: 'Light',
  2: 'Medium',
  3: 'Blizzard',
};

export type HomeSceneControlsProps = {
  treeCount: number;
  onTreeCountChange: (n: number) => void;
  snowThicc: SnowThiccLevel;
  onSnowThiccChange: (level: SnowThiccLevel) => void;
  isNight: boolean;
  onNightModeChange: (night: boolean) => void;
  windMode: WindMode;
  onWindModeChange: (mode: WindMode) => void;
  cameraApi: HomeSceneCameraApi | null;
};

export default function HomeSceneControls({
  treeCount,
  onTreeCountChange,
  snowThicc,
  onSnowThiccChange,
  isNight,
  onNightModeChange,
  windMode,
  onWindModeChange,
  cameraApi,
}: HomeSceneControlsProps) {
  const windOptions: { mode: WindMode; label: string }[] = [
    { mode: 'off', label: 'Off' },
    { mode: 'calm', label: 'Calm' },
    { mode: 'breezy', label: 'Breezy' },
    { mode: 'gale', label: 'Gale' },
  ];
  return (
    <Box
      position="fixed"
      left={3}
      top={{ base: '76px', md: '84px' }}
      zIndex={20}
      w={{ base: '210px', sm: '236px' }}
      p={3}
      borderRadius="lg"
      bg={isNight ? 'rgba(15,25,40,0.88)' : 'rgba(255,255,255,0.92)'}
      backdropFilter="blur(10px)"
      borderWidth="1px"
      borderColor={isNight ? 'whiteAlpha.200' : 'gray.200'}
      boxShadow="md"
    >
      <Text fontSize="xs" fontWeight="700" textTransform="uppercase" letterSpacing="wider" mb={3} color={isNight ? 'gray.300' : 'gray.600'}>
        Scene
      </Text>
      <VStack align="stretch" spacing={4}>
        <FormControl>
          <FormLabel fontSize="sm" mb={1} color={isNight ? 'gray.200' : 'gray.700'}>
            Trees: {treeCount}
          </FormLabel>
          <Slider
            aria-label="Number of trees"
            value={treeCount}
            min={3}
            max={10}
            step={1}
            onChange={onTreeCountChange}
            colorScheme="brand"
            size="sm"
          >
            <SliderTrack bg={isNight ? 'whiteAlpha.200' : 'gray.200'}>
              <SliderFilledTrack />
            </SliderTrack>
            <SliderThumb boxSize={4} />
          </Slider>
        </FormControl>

        <FormControl>
          <FormLabel fontSize="sm" mb={1} color={isNight ? 'gray.200' : 'gray.700'}>
            Snow
          </FormLabel>
          <ButtonGroup size="xs" isAttached variant="outline" w="100%">
            {([1, 2, 3] as const).map((level) => (
              <Button
                key={level}
                flex={1}
                onClick={() => onSnowThiccChange(level)}
                variant={snowThicc === level ? 'solid' : 'outline'}
                colorScheme="brand"
                color={isNight && snowThicc !== level ? 'gray.300' : undefined}
                borderColor={isNight ? 'whiteAlpha.300' : undefined}
              >
                {SNOW_LABELS[level]}
              </Button>
            ))}
          </ButtonGroup>
        </FormControl>

        <FormControl>
          <FormLabel fontSize="sm" mb={1} color={isNight ? 'gray.200' : 'gray.700'}>
            Wind
          </FormLabel>
          <ButtonGroup size="xs" variant="outline" flexWrap="wrap" spacing={1} gap={1}>
            {windOptions.map(({ mode, label }) => (
              <Button
                key={mode}
                onClick={() => onWindModeChange(mode)}
                variant={windMode === mode ? 'solid' : 'outline'}
                colorScheme="brand"
                color={isNight && windMode !== mode ? 'gray.300' : undefined}
                borderColor={isNight ? 'whiteAlpha.300' : undefined}
                flex="1 1 45%"
                minW="42%"
              >
                {label}
              </Button>
            ))}
          </ButtonGroup>
        </FormControl>

        <FormControl>
          <FormLabel fontSize="sm" mb={1} color={isNight ? 'gray.200' : 'gray.700'}>
            Camera
          </FormLabel>
          <HStack spacing={1} flexWrap="wrap" gap={1}>
            <IconButton
              aria-label="Zoom in"
              icon={<FiZoomIn />}
              size="sm"
              variant="outline"
              colorScheme="brand"
              isDisabled={!cameraApi}
              onClick={() => cameraApi?.cameraZoomIn()}
              borderColor={isNight ? 'whiteAlpha.300' : undefined}
            />
            <IconButton
              aria-label="Zoom out"
              icon={<FiZoomOut />}
              size="sm"
              variant="outline"
              colorScheme="brand"
              isDisabled={!cameraApi}
              onClick={() => cameraApi?.cameraZoomOut()}
              borderColor={isNight ? 'whiteAlpha.300' : undefined}
            />
            <IconButton
              aria-label="Rotate camera left"
              icon={<FiRotateCcw />}
              size="sm"
              variant="outline"
              colorScheme="brand"
              isDisabled={!cameraApi}
              onClick={() => cameraApi?.cameraRotateLeft()}
              borderColor={isNight ? 'whiteAlpha.300' : undefined}
            />
            <IconButton
              aria-label="Rotate camera right"
              icon={<FiRotateCw />}
              size="sm"
              variant="outline"
              colorScheme="brand"
              isDisabled={!cameraApi}
              onClick={() => cameraApi?.cameraRotateRight()}
              borderColor={isNight ? 'whiteAlpha.300' : undefined}
            />
            <IconButton
              aria-label="Reset camera view"
              icon={<FiRefreshCw />}
              size="sm"
              variant="outline"
              colorScheme="brand"
              isDisabled={!cameraApi}
              onClick={() => cameraApi?.cameraReset()}
              borderColor={isNight ? 'whiteAlpha.300' : undefined}
            />
          </HStack>
        </FormControl>

        <FormControl>
          <HStack justify="space-between" align="center">
            <FormLabel fontSize="sm" mb={0} color={isNight ? 'gray.200' : 'gray.700'}>
              Night mode
            </FormLabel>
            <Switch
              colorScheme="brand"
              isChecked={isNight}
              onChange={(e) => onNightModeChange(e.target.checked)}
              size="md"
            />
          </HStack>
        </FormControl>
      </VStack>
    </Box>
  );
}
