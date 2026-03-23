'use client';

import { useMemo, useState, useEffect } from 'react';
import { Billboard, Text } from '@react-three/drei';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';
import { osmToTankId, PRODUCT_COLORS, fetchTankLevels, TANK_STATUS_CONFIG, type TankLevelData, type TankStatus } from '@/lib/tankData';
import { useSceneStore } from '@/lib/sceneStore';

function getProductForTank(tankId: string): string {
  if (tankId.startsWith('TK-1')) return 'Gasoline';
  if (tankId.startsWith('TK-2')) return 'Diesel';
  if (tankId.startsWith('TK-3')) return 'Crude Oil';
  if (tankId.startsWith('TK-4')) return 'Ethanol';
  const num = parseInt(tankId.replace('TK-', ''));
  if (num >= 536) return 'LPG';
  if (num >= 524) return 'Gasoline';
  if (num >= 501 && num <= 504) return 'Crude Oil';
  return 'Diesel';
}

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
  const { scene } = useGLTF('/models/terminal.glb');

  // Fetch tank data for status
  const [tankDataMap, setTankDataMap] = useState<Map<string, TankLevelData>>(new Map());
  useEffect(() => {
    fetchTankLevels().then(levels => {
      const map = new Map<string, TankLevelData>();
      for (const t of levels) map.set(t.tank, t);
      setTankDataMap(map);
    });
  }, []);

  const labels = useMemo(() => {
    const clone = scene.clone(true);
    const cube = clone.getObjectByName('Cube');
    if (cube) cube.removeFromParent();

    const box = new THREE.Box3().setFromObject(clone);
    const size = box.getSize(new THREE.Vector3());
    const scale = 80 / Math.max(size.x, size.z);
    clone.scale.setScalar(scale);
    clone.updateMatrixWorld(true);
    const scaledBox = new THREE.Box3().setFromObject(clone);
    const scaledCenter = scaledBox.getCenter(new THREE.Vector3());

    const result: { osmId: string; tankId: string; product: string; position: [number, number, number] }[] = [];

    clone.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      const name = obj.name || obj.parent?.name || '';
      const tankId = osmToTankId(name);
      if (!tankId) return;

      const verts = obj.geometry?.attributes?.position?.count || 0;
      if (verts < 70) return;

      const meshBox = new THREE.Box3().setFromObject(obj);
      const center = meshBox.getCenter(new THREE.Vector3());
      const top = meshBox.max.y;

      result.push({
        osmId: name,
        tankId,
        product: getProductForTank(tankId),
        position: [
          center.x - scaledCenter.x,
          top + 0.3,
          center.z - scaledCenter.z,
        ],
      });
    });

    return result;
  }, [scene]);

  // Hide all labels when no tank is selected
  if (!selectedOsmId) return null;

  return (
    <group>
      {labels.map((label) => {
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
