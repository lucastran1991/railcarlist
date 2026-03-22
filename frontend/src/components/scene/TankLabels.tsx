'use client';

import { useMemo } from 'react';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';
import { osmToTankId, PRODUCT_COLORS } from '@/lib/tankData';

/** Floating 3D labels above mapped tanks showing tank ID */
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
          top + 0.15,
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
          <Html
            key={label.tankId}
            position={label.position}
            center
            distanceFactor={12}
            zIndexRange={[20, 0]}
            style={{ pointerEvents: 'none' }}
          >
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              transform: 'translateY(-100%)',
            }}>
              <div style={{
                background: 'rgba(0,0,0,0.75)',
                backdropFilter: 'blur(8px)',
                borderRadius: '6px',
                border: `1px solid ${color}40`,
                padding: '3px 8px',
                whiteSpace: 'nowrap',
              }}>
                <span style={{
                  color,
                  fontSize: '14px',
                  fontWeight: 700,
                  fontFamily: 'Inter, system-ui, sans-serif',
                  letterSpacing: '0.5px',
                }}>
                  {label.tankId}
                </span>
              </div>
              {/* Down arrow */}
              <div style={{
                width: 0,
                height: 0,
                borderLeft: '5px solid transparent',
                borderRight: '5px solid transparent',
                borderTop: `5px solid rgba(0,0,0,0.75)`,
              }} />
            </div>
          </Html>
        );
      })}
    </group>
  );
}

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
