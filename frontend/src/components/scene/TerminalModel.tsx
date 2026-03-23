'use client';

import { useMemo, useCallback, useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import { useGLTF, useCursor } from '@react-three/drei';
import { ThreeEvent, useFrame } from '@react-three/fiber';
import type { ClickedObject } from '@/lib/three/types';
import { osmToTankId, fetchTankLevels, type TankLevelData, type TankStatus, TANK_STATUS_CONFIG } from '@/lib/tankData';
import TankParticles from './TankParticles';

// PBR materials (StandardMaterial — no clearcoat overhead)
const tankMat = new THREE.MeshStandardMaterial({
  color: 0xdddddd, roughness: 0.3, metalness: 0.7, envMapIntensity: 1.0,
});
const buildingMat = new THREE.MeshStandardMaterial({
  color: 0xaabbcc, roughness: 0.6, metalness: 0.1, envMapIntensity: 0.5,
});

// --- Status animation config ---
// Maps tank status to emissive behavior
const STATUS_EMISSIVE: Record<TankStatus, { color: string; baseIntensity: number; pulseSpeed: number; pulseAmplitude: number }> = {
  in_service:   { color: '#5CE5A0', baseIntensity: 0.08, pulseSpeed: 0,    pulseAmplitude: 0 },
  receiving:    { color: '#56CDE7', baseIntensity: 0.15, pulseSpeed: 1.5,  pulseAmplitude: 0.12 },
  discharging:  { color: '#4D65FF', baseIntensity: 0.15, pulseSpeed: 1.5,  pulseAmplitude: 0.12 },
  idle:         { color: '#94A3B8', baseIntensity: 0.03, pulseSpeed: 0,    pulseAmplitude: 0 },
  heating:      { color: '#F6AD55', baseIntensity: 0.25, pulseSpeed: 2.0,  pulseAmplitude: 0.20 },
  warning:      { color: '#ECC94B', baseIntensity: 0.30, pulseSpeed: 3.0,  pulseAmplitude: 0.25 },
  critical:     { color: '#E53E3E', baseIntensity: 0.45, pulseSpeed: 5.0,  pulseAmplitude: 0.35 },
  maintenance:  { color: '#A78BFA', baseIntensity: 0.12, pulseSpeed: 0.8,  pulseAmplitude: 0.08 },
};

// Gear geometry (created once, shared via instancing)
const GEAR_SEGMENTS = 12;
const gearShape = new THREE.Shape();
const gearOuterR = 0.35;
const gearInnerR = 0.25;
const gearTeethCount = 8;
for (let i = 0; i < gearTeethCount * 2; i++) {
  const angle = (i / (gearTeethCount * 2)) * Math.PI * 2;
  const r = i % 2 === 0 ? gearOuterR : gearInnerR;
  const x = Math.cos(angle) * r;
  const y = Math.sin(angle) * r;
  if (i === 0) gearShape.moveTo(x, y);
  else gearShape.lineTo(x, y);
}
gearShape.closePath();
// Center hole
const holePath = new THREE.Path();
holePath.absarc(0, 0, 0.1, 0, Math.PI * 2, true);
gearShape.holes.push(holePath);
const gearGeometry = new THREE.ExtrudeGeometry(gearShape, { depth: 0.06, bevelEnabled: false });
const gearMaterial = new THREE.MeshStandardMaterial({
  color: '#A78BFA',
  emissive: '#A78BFA',
  emissiveIntensity: 0.4,
  metalness: 0.9,
  roughness: 0.2,
});

function isClickableNode(name: string, verts: number): boolean {
  if (name.includes('GOOGLE_SAT') || name.includes('EXPORT_GOOGLE')) return false;
  if (name === 'Cube') return false;
  return verts > 4;
}

function getObjectType(verts: number): 'tank' | 'building' {
  return verts >= 70 ? 'tank' : 'building';
}

interface ProcessedMesh {
  name: string;
  geometry: THREE.BufferGeometry;
  material: THREE.MeshStandardMaterial;
  position: [number, number, number];
  rotation: [number, number, number, string];
  scale: [number, number, number];
  verts: number;
  castShadow: boolean;
  receiveShadow: boolean;
  clickable: boolean;
  tankId: string | null;
  status: TankStatus | null;
}

// Track materials that need per-frame animation
interface AnimatedTank {
  material: THREE.MeshStandardMaterial;
  config: typeof STATUS_EMISSIVE[TankStatus];
}

export interface RaycastDebugInfo {
  nearestName: string;
  nearestTankId: string;
  nearestType: string;
  nearestDist: number;
  totalIntersections: number;
}

interface TerminalModelProps {
  selectedMesh: THREE.Object3D | null;
  hoveredMesh: THREE.Mesh | null;
  onObjectClick: (obj: ClickedObject | null, mesh: THREE.Object3D | null) => void;
  onMissed?: () => void;
  onHover?: (mesh: THREE.Mesh | null) => void;
  onRaycastDebug?: (info: RaycastDebugInfo | null) => void;
  statusEffects?: boolean;
}

export default function TerminalModel({ selectedMesh, hoveredMesh, onObjectClick, onMissed, onHover, onRaycastDebug, statusEffects = true }: TerminalModelProps) {
  const { scene } = useGLTF('/models/terminal.glb');

  // Fetch tank status data
  const [tankData, setTankData] = useState<Map<string, TankLevelData>>(new Map());
  useEffect(() => {
    fetchTankLevels().then(levels => {
      const map = new Map<string, TankLevelData>();
      for (const t of levels) map.set(t.tank, t);
      setTankData(map);
    });
  }, []);

  // Cursor: pointer when hovering clickable object
  useCursor(!!hoveredMesh, 'pointer', 'default');

  // Refs for per-frame animation (avoid re-renders)
  const animatedTanksRef = useRef<AnimatedTank[]>([]);
  const gearRefsArray = useRef<THREE.Mesh[]>([]);

  // Extract all meshes with their world transforms, apply status-based materials
  const { meshes, groundMeshes, maintenanceTanks, particleTanks } = useMemo(() => {
    const effectsOn = statusEffects;
    const clone = scene.clone(true);

    const cube = clone.getObjectByName('Cube');
    if (cube) cube.removeFromParent();

    const box = new THREE.Box3().setFromObject(clone);
    const size = box.getSize(new THREE.Vector3());
    const maxSpan = Math.max(size.x, size.z);
    const scale = 80 / maxSpan;

    clone.scale.setScalar(scale);
    clone.updateMatrixWorld(true);
    const scaledBox = new THREE.Box3().setFromObject(clone);
    const scaledCenter = scaledBox.getCenter(new THREE.Vector3());

    const offsetMatrix = new THREE.Matrix4().makeTranslation(-scaledCenter.x, 0, -scaledCenter.z);

    const meshes: ProcessedMesh[] = [];
    const groundMeshes: ProcessedMesh[] = [];
    const animated: AnimatedTank[] = [];
    const maintenanceTanks: { position: [number, number, number]; topY: number }[] = [];
    const particleTanks: { position: [number, number, number]; status: TankStatus; tankId: string }[] = [];

    clone.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      const name = obj.name || obj.parent?.name || '';
      if (name === 'Cube') return;

      const worldMatrix = new THREE.Matrix4().multiplyMatrices(offsetMatrix, obj.matrixWorld);
      const verts = obj.geometry?.attributes?.position?.count || 0;
      const isGround = name.includes('GOOGLE_SAT') || name.includes('EXPORT_GOOGLE');

      // Decompose matrix into position/rotation/scale for proper raycasting
      const pos = new THREE.Vector3();
      const quat = new THREE.Quaternion();
      const scl = new THREE.Vector3();
      worldMatrix.decompose(pos, quat, scl);
      const euler = new THREE.Euler().setFromQuaternion(quat);

      const isTank = verts >= 70;
      const tankId = osmToTankId(name);
      const tankInfo = tankId ? tankData.get(tankId) : null;
      const status: TankStatus | null = tankInfo?.status ?? null;

      // Create material — tanks get status-based emissive only when effects are ON
      let material: THREE.Material;
      if (isGround) {
        material = obj.material as THREE.Material;
      } else if (isTank && status && effectsOn) {
        const mat = tankMat.clone() as THREE.MeshStandardMaterial;
        const emCfg = STATUS_EMISSIVE[status];
        mat.emissive = new THREE.Color(emCfg.color);
        mat.emissiveIntensity = emCfg.baseIntensity;
        material = mat;
        if (emCfg.pulseSpeed > 0) {
          animated.push({ material: mat, config: emCfg });
        }
      } else {
        material = isTank ? tankMat.clone() : buildingMat.clone();
      }

      // Get bounding box for overlays (gears + particles) — only when effects ON
      if (effectsOn && isTank && status && tankId) {
        const meshBox = new THREE.Box3().setFromObject(obj);
        const center = meshBox.getCenter(new THREE.Vector3());
        const topY = meshBox.max.y;

        if (status === 'maintenance') {
          maintenanceTanks.push({
            position: [center.x - scaledCenter.x, 0, center.z - scaledCenter.z],
            topY: topY + 0.5,
          });
        }

        const particleStatuses: TankStatus[] = ['heating', 'critical', 'receiving', 'discharging', 'warning'];
        if (particleStatuses.includes(status)) {
          particleTanks.push({
            position: [center.x - scaledCenter.x, topY + 0.15, center.z - scaledCenter.z],
            status,
            tankId,
          });
        }
      }

      const entry: ProcessedMesh = {
        name,
        geometry: obj.geometry,
        material: material as THREE.MeshStandardMaterial,
        position: [pos.x, pos.y, pos.z],
        rotation: [euler.x, euler.y, euler.z, euler.order],
        scale: [scl.x, scl.y, scl.z],
        verts,
        castShadow: !isGround,
        receiveShadow: true,
        clickable: isClickableNode(name, verts),
        tankId,
        status,
      };

      if (isGround) groundMeshes.push(entry);
      else meshes.push(entry);
    });

    // Store animated refs for useFrame
    animatedTanksRef.current = animated;

    return { meshes, groundMeshes, maintenanceTanks, particleTanks } as const;
  }, [scene, tankData, statusEffects]);

  // --- Per-frame animation: pulse emissive + rotate gears (only when effects ON) ---
  useFrame((state) => {
    if (!statusEffects) return;
    const t = state.clock.elapsedTime;

    for (const { material, config } of animatedTanksRef.current) {
      material.emissiveIntensity = config.baseIntensity + Math.sin(t * config.pulseSpeed) * config.pulseAmplitude;
    }

    for (const gear of gearRefsArray.current) {
      if (gear) gear.rotation.z += 0.015;
    }
  });

  // Track nearest clickable on pointer move for debug panel
  const handlePointerMove = useCallback((e: ThreeEvent<PointerEvent>) => {
    if (!onRaycastDebug) return;
    const clickable = e.intersections.filter(i => {
      const n = i.object.name || i.object.parent?.name || '';
      const v = (i.object as THREE.Mesh).geometry?.attributes?.position?.count || 0;
      return isClickableNode(n, v);
    });
    if (clickable.length > 0) {
      const nearest = clickable[0];
      const n = nearest.object.name || nearest.object.parent?.name || '';
      const v = (nearest.object as THREE.Mesh).geometry?.attributes?.position?.count || 0;
      onRaycastDebug({
        nearestName: n,
        nearestTankId: osmToTankId(n) || 'N/A',
        nearestType: getObjectType(v),
        nearestDist: parseFloat(nearest.distance.toFixed(2)),
        totalIntersections: clickable.length,
      });
    } else {
      onRaycastDebug(null);
    }
  }, [onRaycastDebug]);

  const handleMeshClick = useCallback((e: ThreeEvent<MouseEvent>, entry: ProcessedMesh) => {
    // stopPropagation prevents this click from reaching meshes behind
    e.stopPropagation();
    if (!entry.clickable) { onMissed?.(); return; }

    // Trust R3F's event target — e.object is the mesh the user clicked on.
    const mesh = e.object as THREE.Mesh;
    const box = new THREE.Box3().setFromObject(mesh);
    const center = box.getCenter(new THREE.Vector3());

    onObjectClick({
      name: entry.name,
      type: getObjectType(entry.verts),
      verts: entry.verts,
      position: { x: parseFloat(center.x.toFixed(1)), y: parseFloat(center.y.toFixed(1)), z: parseFloat(center.z.toFixed(1)) },
      screenX: 0,
      screenY: 0,
    }, mesh);
  }, [onObjectClick, onMissed]);

  const handleGroundClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onHover?.(null);
    onMissed?.();
  }, [onMissed, onHover]);

  // Debounced hover
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoveredNameRef = useRef<string | null>(null);

  const handlePointerOver = useCallback((e: ThreeEvent<PointerEvent>, entry: ProcessedMesh) => {
    e.stopPropagation();
    if (!entry.clickable) return;
    const mesh = e.object as THREE.Mesh;
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    hoveredNameRef.current = entry.name;
    onHover?.(mesh);
  }, [onHover]);

  const handlePointerOut = useCallback(() => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = setTimeout(() => {
      hoveredNameRef.current = null;
      onHover?.(null);
      hoverTimerRef.current = null;
    }, 50);
  }, [onHover]);

  // Reset gear refs array on maintenance tank changes
  useEffect(() => {
    gearRefsArray.current = [];
  }, [maintenanceTanks]);

  return (
    <group onPointerMove={handlePointerMove}>
        {groundMeshes.map((entry, i) => (
          <mesh
            key={`ground-${i}`}
            geometry={entry.geometry}
            material={entry.material}
            position={entry.position}
            rotation={[entry.rotation[0], entry.rotation[1], entry.rotation[2], entry.rotation[3] as THREE.EulerOrder]}
            scale={entry.scale}
            receiveShadow
            onClick={handleGroundClick}
          />
        ))}

        {meshes.map((entry, i) => (
          <mesh
            key={`mesh-${i}`}
            name={entry.name}
            geometry={entry.geometry}
            material={entry.material}
            position={entry.position}
            rotation={[entry.rotation[0], entry.rotation[1], entry.rotation[2], entry.rotation[3] as THREE.EulerOrder]}
            scale={entry.scale}
            castShadow={entry.castShadow}
            receiveShadow={entry.receiveShadow}
            onClick={(e) => handleMeshClick(e, entry)}
          />
        ))}

        {/* Rotating gears on maintenance tanks */}
        {maintenanceTanks.map((tank, i) => (
          <mesh
            key={`gear-${i}`}
            ref={(el) => { if (el) gearRefsArray.current[i] = el; }}
            geometry={gearGeometry}
            material={gearMaterial}
            position={[tank.position[0], tank.topY, tank.position[2]]}
            rotation={[Math.PI / 2, 0, 0]}
          />
        ))}

        {/* Particle effects: fire (heating), sparks (critical), flow (receiving/discharging), haze (warning) */}
        <TankParticles tanks={particleTanks} />
    </group>
  );
}

useGLTF.preload('/models/terminal.glb');
