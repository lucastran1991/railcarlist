'use client';

import { useMemo } from 'react';
import { Box, Text, VStack, HStack, Badge, Divider, Icon } from '@chakra-ui/react';
import {
  FiActivity, FiThermometer, FiZap, FiWind, FiDroplet, FiAlertTriangle,
} from 'react-icons/fi';
import type { ClickedObject } from '@/lib/three/terminalScene';

export type ObjectPopupProps = { obj: ClickedObject | null };

interface BoilerData {
  boilerId: string;
  boilerMode: number;
  currentPSI: number;
  requestPSI: number;
  setpointPSI: number;
  firingRate: number;
  flameLevel: number;
  gasConsumed: number;
  steamProduced: number;
  diagnosticCode: string;
}

const MODES: Record<number, { label: string; color: string }> = {
  0: { label: 'OFF', color: 'gray' },
  1: { label: 'ACTIVE', color: 'green' },
  2: { label: 'STANDBY', color: 'yellow' },
  3: { label: 'ERROR', color: 'red' },
};

function mockBoilerData(name: string): BoilerData {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
  const h = Math.abs(hash);
  const mode = h % 3 === 0 ? 1 : 2;
  const isActive = mode === 1;
  return {
    boilerId: `Boiler-${name.slice(-4)}`,
    boilerMode: mode,
    currentPSI: isActive ? 80 + (h % 50) : 0,
    requestPSI: 85 + (h % 10),
    setpointPSI: isActive ? 120 + (h % 15) : 0,
    firingRate: isActive ? 40 + (h % 55) : 0,
    flameLevel: isActive ? 1 + (h % 3) : 0,
    gasConsumed: 1e6 + (h % 9) * 2.3e7,
    steamProduced: isActive ? 100 + (h % 200) : 0,
    diagnosticCode: isActive ? '0' : String(h % 64),
  };
}

function fmtNum(n: number, d = 1): string {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'k';
  return n.toFixed(d);
}

function Row({ icon, label, value, unit, accent }: {
  icon: React.ElementType; label: string; value: string; unit?: string; accent?: boolean;
}) {
  return (
    <HStack justify="space-between" spacing={3}>
      <HStack spacing={1.5} minW="0">
        <Icon as={icon} boxSize="12px" color={accent ? 'orange.300' : 'gray.500'} flexShrink={0} />
        <Text fontSize="xs" color="gray.400" whiteSpace="nowrap">{label}</Text>
      </HStack>
      <Text
        fontSize="xs"
        color={accent ? 'orange.200' : 'gray.100'}
        fontFamily="mono"
        fontWeight={accent ? '600' : '400'}
        whiteSpace="nowrap"
      >
        {value}
        {unit && <Text as="span" color="gray.500" fontSize="2xs" ml={0.5}>{unit}</Text>}
      </Text>
    </HStack>
  );
}

function StatusDot({ active }: { active: boolean }) {
  return (
    <Box
      w="7px" h="7px" borderRadius="full"
      bg={active ? 'green.400' : 'gray.500'}
      boxShadow={active ? '0 0 8px rgba(72,187,120,0.7)' : 'none'}
    />
  );
}

export default function ObjectPopup({ obj }: ObjectPopupProps) {
  const boiler = useMemo(() => (obj ? mockBoilerData(obj.name) : null), [obj]);
  if (!obj || !boiler) return null;

  const modeInfo = MODES[boiler.boilerMode] ?? MODES[0];
  const isActive = boiler.boilerMode === 1;

  return (
    <Box
      position="fixed"
      left={`clamp(150px, ${obj.screenX}px, calc(100vw - 150px))`}
      top={`clamp(240px, ${obj.screenY}px, calc(100vh - 20px))`}
      transform="translate(-50%, -100%) translateY(-14px)"
      zIndex={30}
      pointerEvents="none"
      minW="260px"
      maxW="300px"
      sx={{
        animation: 'popupIn 0.2s ease-out',
        '@keyframes popupIn': {
          from: { opacity: 0, transform: 'translate(-50%, -100%) translateY(-4px) scale(0.95)' },
          to: { opacity: 1, transform: 'translate(-50%, -100%) translateY(-14px) scale(1)' },
        },
      }}
    >
      <Box
        bg="linear-gradient(180deg, rgba(18, 22, 32, 0.95) 0%, rgba(12, 15, 24, 0.97) 100%)"
        backdropFilter="blur(24px)"
        borderRadius="xl"
        border="1px solid"
        borderColor="whiteAlpha.100"
        overflow="hidden"
        boxShadow="0 16px 48px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04) inset, 0 0 20px rgba(255,106,0,0.08)"
      >
        {/* Top accent bar */}
        <Box
          h="2px"
          bg={isActive
            ? 'linear-gradient(90deg, #48bb78, #38b2ac, #4299e1)'
            : 'linear-gradient(90deg, #ecc94b, #ed8936)'
          }
        />

        <Box px={4} py={3}>
          <VStack align="stretch" spacing={2.5}>
            {/* Header */}
            <HStack justify="space-between" align="start">
              <HStack spacing={2.5}>
                <StatusDot active={isActive} />
                <VStack align="start" spacing={0}>
                  <Text fontSize="sm" fontWeight="700" color="white" letterSpacing="0.02em">
                    {boiler.boilerId}
                  </Text>
                  <Text fontSize="2xs" color="gray.600" fontFamily="mono">{obj.name}</Text>
                </VStack>
              </HStack>
              <VStack align="end" spacing={1}>
                <Badge
                  colorScheme={obj.type === 'tank' ? 'cyan' : 'orange'}
                  fontSize="2xs" borderRadius="md" px={1.5}
                >
                  {obj.type}
                </Badge>
                <Badge
                  colorScheme={modeInfo.color}
                  fontSize="2xs" variant="subtle" borderRadius="md" px={1.5}
                >
                  {modeInfo.label}
                </Badge>
              </VStack>
            </HStack>

            <Divider borderColor="whiteAlpha.80" />

            {/* Pressure */}
            <Row icon={FiThermometer} label="Current" value={fmtNum(boiler.currentPSI, 0)} unit="psi" accent={isActive} />
            <Row icon={FiActivity} label="Request" value={fmtNum(boiler.requestPSI, 0)} unit="psi" />
            <Row icon={FiZap} label="Setpoint" value={fmtNum(boiler.setpointPSI, 0)} unit="psi" />

            <Divider borderColor="whiteAlpha.80" />

            {/* Performance */}
            <Row icon={FiZap} label="Firing" value={fmtNum(boiler.firingRate, 1)} unit="%" accent={isActive && boiler.firingRate > 50} />
            <Row icon={FiWind} label="Steam" value={fmtNum(boiler.steamProduced, 1)} unit="lb/hr" />
            <Row icon={FiDroplet} label="Gas" value={fmtNum(boiler.gasConsumed)} unit="cf" />

            {boiler.diagnosticCode !== '0' && (
              <>
                <Divider borderColor="whiteAlpha.80" />
                <HStack justify="space-between">
                  <HStack spacing={1.5}>
                    <Icon as={FiAlertTriangle} boxSize="12px" color="yellow.400" />
                    <Text fontSize="2xs" color="yellow.400" fontWeight="500">Diagnostic</Text>
                  </HStack>
                  <Badge colorScheme="yellow" fontSize="2xs" variant="outline">{boiler.diagnosticCode}</Badge>
                </HStack>
              </>
            )}
          </VStack>
        </Box>
      </Box>
      {/* Arrow */}
      <Box
        w={0} h={0} mx="auto"
        borderLeft="8px solid transparent"
        borderRight="8px solid transparent"
        borderTop="8px solid rgba(12, 15, 24, 0.97)"
      />
    </Box>
  );
}
