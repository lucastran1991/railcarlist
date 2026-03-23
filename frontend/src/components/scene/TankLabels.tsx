'use client';

import { useState, useEffect } from 'react';
import { Billboard, Text } from '@react-three/drei';
import { PRODUCT_COLORS, fetchTankLevels, TANK_STATUS_CONFIG, type TankLevelData, type TankStatus } from '@/lib/tankData';
import { useSceneStore } from '@/lib/sceneStore';

// Status icon characters (simple Unicode symbols for WebGL text)
const STATUS_ICONS: Record<TankStatus, string> = {
  in_service:  '●',
  receiving:   '▼',
  discharging: '▲',
  idle:        '◆',
  heating:     '◉',
  warning:     '▲',
  critical:    '⬤',
  maintenance: '⚙',
};

/** WebGL-native tank labels with status indicator — visible only when a tank is selected */
export default function TankLabels() {
  const selectedOsmId = useSceneStore(s => s.selectedObj?.name ?? null);
  const tankLabelPositions = useSceneStore(s => s.tankLabelPositions);

  // Fetch tank data for status
  const [tankDataMap, setTankDataMap] = useState<Map<string, TankLevelData>>(new Map());
  useEffect(() => {
    fetchTankLevels().then(levels => {
      const map = new Map<string, TankLevelData>();
      for (const t of levels) map.set(t.tank, t);
      setTankDataMap(map);
    });
  }, []);

  // Hide all labels when no tank is selected
  if (!selectedOsmId) return null;

  return (
    <group>
      {Array.from(tankLabelPositions.values()).map((label) => {
        const tankInfo = tankDataMap.get(label.tankId);
        const status = tankInfo?.status as TankStatus | undefined;
        const statusCfg = status ? TANK_STATUS_CONFIG[status] : null;
        const statusColor = statusCfg?.color ?? '#888888';
        const statusIcon = status ? STATUS_ICONS[status] : '';
        const productColor = PRODUCT_COLORS[label.product] ?? '#888888';

        return (
          <Billboard key={label.tankId} position={label.position} follow lockX={false} lockY={false} lockZ={false}>
            {/* Background plate — slightly wider to fit status dot */}
            <mesh position={[0, 0, -0.01]}>
              <planeGeometry args={[label.tankId.length * 0.18 + 0.6, 0.40]} />
              <meshBasicMaterial color="#000000" opacity={0.75} transparent />
            </mesh>
            {/* Status dot (left side) */}
            {statusCfg && (
              <Text
                fontSize={0.14}
                color={statusColor}
                anchorX="right"
                anchorY="middle"
                position={[-(label.tankId.length * 0.09 + 0.08), 0, 0]}
              >
                {statusIcon}
              </Text>
            )}
            {/* Tank ID text */}
            <Text
              fontSize={0.2}
              color={productColor}
              anchorX="center"
              anchorY="middle"
              fontWeight={700}
            >
              {label.tankId}
            </Text>
          </Billboard>
        );
      })}
    </group>
  );
}
