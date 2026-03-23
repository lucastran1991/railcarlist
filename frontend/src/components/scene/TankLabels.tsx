'use client';

import { useMemo } from 'react';
import { Billboard, Text } from '@react-three/drei';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';
import { osmToTankId, PRODUCT_COLORS } from '@/lib/tankData';

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

/** WebGL-native tank labels using Drei Billboard + Text (no DOM overhead) */
export default function TankLabels({ selectedOsmId }: { selectedOsmId: string | null }) {
  const { scene } = useGLTF('/models/terminal.glb');

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

  return (
    <group>
      {labels.map((label) => {
        if (label.osmId === selectedOsmId) return null;
        const color = PRODUCT_COLORS[label.product] ?? '#888888';
        return (
          <Billboard key={label.tankId} position={label.position} follow lockX={false} lockY={false} lockZ={false}>
            {/* Background plate */}
            <mesh position={[0, 0, -0.01]}>
              <planeGeometry args={[label.tankId.length * 0.18 + 0.3, 0.35]} />
              <meshBasicMaterial color="#000000" opacity={0.7} transparent />
            </mesh>
            {/* Tank ID text */}
            <Text
              fontSize={0.2}
              color={color}
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
