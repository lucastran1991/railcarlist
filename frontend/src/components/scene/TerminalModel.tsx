'use client';

import { useMemo, useCallback, useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import { useGLTF, useCursor } from '@react-three/drei';
import { ThreeEvent, useFrame } from '@react-three/fiber';
import type { ClickedObject } from '@/lib/three/types';
import { osmToTankId, fetchTankLevels, type TankLevelData, type TankStatus, TANK_STATUS_CONFIG } from '@/lib/tankData';
import TankParticles from './TankParticles';
import { useSceneStore } from '@/lib/sceneStore';
import { useTerminalStore } from '@/lib/terminalStore';

const TANK_PATHS = {
  big: '/models/tank-big.glb',
  medium: '/models/tank-medium.glb',
  small: '/models/tank-small.glb',
};
// Native sizes of each detail model v2 (from bounding box analysis)
const TANK_NATIVE_SIZE = {
  big: { w: 33.0, h: 19.3 },
  medium: { w: 24.7, h: 21.3 },
  small: { w: 10.3, h: 15.1 },
};
type TankSize = 'big' | 'medium' | 'small';

// PBR materials — lazy singletons for SSR safety
let _tankMat: THREE.MeshStandardMaterial | null = null;
const getTankMat = () => _tankMat ??= new THREE.MeshStandardMaterial({
  color: 0xdddddd, roughness: 0.8, metalness: 0.1, envMapIntensity: 0,
});
let _buildingMat: THREE.MeshStandardMaterial | null = null;
const getBuildingMat = () => _buildingMat ??= new THREE.MeshStandardMaterial({
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

// Gear geometry & material — lazy singletons for SSR safety
let _gearGeometry: THREE.ExtrudeGeometry | null = null;
let _gearMaterial: THREE.MeshStandardMaterial | null = null;

function getGearGeometry() {
  if (_gearGeometry) return _gearGeometry;
  const shape = new THREE.Shape();
  const outerR = 0.35, innerR = 0.25, teeth = 8;
  for (let i = 0; i < teeth * 2; i++) {
    const angle = (i / (teeth * 2)) * Math.PI * 2;
    const r = i % 2 === 0 ? outerR : innerR;
    const x = Math.cos(angle) * r, y = Math.sin(angle) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  const hole = new THREE.Path();
  hole.absarc(0, 0, 0.1, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  _gearGeometry = new THREE.ExtrudeGeometry(shape, { depth: 0.06, bevelEnabled: false });
  return _gearGeometry;
}

function getGearMaterial() {
  return _gearMaterial ??= new THREE.MeshStandardMaterial({
    color: '#A78BFA',
    emissive: '#A78BFA',
    emissiveIntensity: 0.4,
    metalness: 0.9,
    roughness: 0.2,
  });
}

export function getProductForTank(tankId: string): string {
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
  onObjectClick: (obj: ClickedObject | null) => void;
  onMissed?: () => void;
  onRaycastDebug?: (info: RaycastDebugInfo | null) => void;
}

// Info needed to place a detail tank model at the original cylinder's position
interface ReplacementTank {
  name: string;
  position: [number, number, number];
  scale: [number, number, number];
  rotation: [number, number, number, string];
  material: THREE.MeshStandardMaterial;
  tankId: string | null;
  status: TankStatus | null;
  clickable: boolean;
  verts: number;
  size: TankSize;
}

export default function TerminalModel({ onObjectClick, onMissed, onRaycastDebug }: TerminalModelProps) {
  const statusEffects = useSceneStore(s => s.statusEffects);
  const replaceMeshes = useSceneStore(s => s.replaceMeshes);
  const enableReflection = useSceneStore(s => s.enableReflection);
  const selectedObjName = useSceneStore(s => s.selectedObj?.name ?? null);
  const setTankLabelPositions = useSceneStore(s => s.setTankLabelPositions);
  const [hoveredName, setHoveredName] = useState<string | null>(null);
  useCursor(!!hoveredName, 'pointer', 'default');

  // Load GLB dynamically based on active terminal
  const modelPath = useTerminalStore(s => s.activeTerminal.modelPath);
  const { scene } = useGLTF(modelPath);

  // Load 3 detail tank models (big, medium, small) — keep original materials/textures
  const bigGltf = useGLTF(TANK_PATHS.big);
  const medGltf = useGLTF(TANK_PATHS.medium);
  const smallGltf = useGLTF(TANK_PATHS.small);

  const tankScenes = useMemo(() => {
    function prepScene(gltf: { scene: THREE.Group }): THREE.Group {
      const clone = gltf.scene.clone(true);
      clone.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          // Compute normals if missing (v2 models have position only)
          if (!obj.geometry.attributes.normal) {
            obj.geometry.computeVertexNormals();
          }
          // Corrugated iron + cement look — flat shading preserves geodesic edges
          const mat = new THREE.MeshStandardMaterial({
            color: 0xd8d5d0,       // warm gray (weathered painted cement)
            roughness: 0.55,       // semi-matte — corrugated iron has some sheen
            metalness: 0.2,        // slight metallic for corrugated panels
            envMapIntensity: 0.4,  // subtle environment reflection
            flatShading: true,     // crisp polygon edges like real geodesic panels
          });
          obj.material = mat;
        }
      });
      return clone;
    }
    return {
      big: prepScene(bigGltf),
      medium: prepScene(medGltf),
      small: prepScene(smallGltf),
    };
  }, [bigGltf, medGltf, smallGltf]);

  // Signal that GLB model is loaded
  useEffect(() => {
    useSceneStore.getState().setModelLoaded(true);
  }, [scene]);

  // Fetch tank status data
  const [tankData, setTankData] = useState<Map<string, TankLevelData>>(new Map());
  useEffect(() => {
    fetchTankLevels().then(levels => {
      const map = new Map<string, TankLevelData>();
      for (const t of levels) map.set(t.tank, t);
      setTankData(map);
    });
  }, []);

  // Refs for per-frame animation (avoid re-renders)
  const animatedTanksRef = useRef<AnimatedTank[]>([]);
  const gearRefsArray = useRef<THREE.Mesh[]>([]);

  // Extract all meshes with their world transforms, apply status-based materials
  const { meshes, groundMeshes, replacementTanks, maintenanceTanks, particleTanks, labelPositions } = useMemo(() => {
    const effectsOn = statusEffects;
    const doReplace = replaceMeshes;
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
    const replacementTanks: ReplacementTank[] = [];
    const animated: AnimatedTank[] = [];
    const maintenanceTanks: { position: [number, number, number]; topY: number }[] = [];
    const particleTanks: { position: [number, number, number]; status: TankStatus; tankId: string }[] = [];
    const labelPositions = new Map<string, { tankId: string; product: string; position: [number, number, number] }>();

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
        const mat = getTankMat().clone() as THREE.MeshStandardMaterial;
        const emCfg = STATUS_EMISSIVE[status];
        mat.emissive = new THREE.Color(emCfg.color);
        mat.emissiveIntensity = emCfg.baseIntensity;
        if (enableReflection) { mat.metalness = 0.7; mat.roughness = 0.3; mat.envMapIntensity = 1.0; }
        material = mat;
        if (emCfg.pulseSpeed > 0) {
          animated.push({ material: mat, config: emCfg });
        }
      } else {
        const mat = (isTank ? getTankMat().clone() : getBuildingMat().clone()) as THREE.MeshStandardMaterial;
        if (enableReflection && isTank) { mat.metalness = 0.7; mat.roughness = 0.3; mat.envMapIntensity = 1.0; }
        material = mat;
      }

      // Collect label positions for all tanks (always, not just when effects ON)
      if (isTank && tankId && !labelPositions.has(tankId)) {
        const meshBox = new THREE.Box3().setFromObject(obj);
        const center = meshBox.getCenter(new THREE.Vector3());
        const top = meshBox.max.y;
        labelPositions.set(tankId, {
          tankId,
          product: getProductForTank(tankId),
          position: [center.x - scaledCenter.x, top + 0.3, center.z - scaledCenter.z],
        });
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

      if (isGround) {
        groundMeshes.push(entry);
      } else if (doReplace && isTank && tankId) {
        // Route mapped tanks to replacement list — detail model rendered instead
        // Strategy: compute world-space bounding box of original cylinder,
        // then scale detail model to fill the same box.
        // worldMatrix already includes clone.scale (80/maxSpan) + offsetMatrix centering
        const tempMesh = new THREE.Mesh(obj.geometry);
        tempMesh.applyMatrix4(worldMatrix);
        const worldBox = new THREE.Box3().setFromObject(tempMesh);
        const worldSize = worldBox.getSize(new THREE.Vector3());
        const worldCenter = worldBox.getCenter(new THREE.Vector3());
        // Classify tank size based on original cylinder width
        const origGeoBox2 = new THREE.Box3().setFromBufferAttribute(
          obj.geometry.attributes.position as THREE.BufferAttribute
        );
        const origWidth = Math.max(origGeoBox2.getSize(new THREE.Vector3()).x, origGeoBox2.getSize(new THREE.Vector3()).z);
        const tankSize: TankSize = origWidth >= 40 ? 'big' : origWidth >= 20 ? 'medium' : 'small';
        const ns = TANK_NATIVE_SIZE[tankSize];
        const detailW = ns.w, detailH = ns.h, detailD = ns.w;
        const finalScaleX = worldSize.x / detailW;
        const finalScaleY = worldSize.y / detailH;
        const finalScaleZ = worldSize.z / detailD;
        const avgRadS = (finalScaleX + finalScaleZ) / 2;

        replacementTanks.push({
          name: entry.name,
          // Use world-space center as position (not decomposed pos which may be off)
          position: [worldCenter.x, worldBox.min.y, worldCenter.z],
          scale: [avgRadS, finalScaleY, avgRadS],
          rotation: entry.rotation,
          material: entry.material,
          tankId,
          status,
          clickable: entry.clickable,
          verts: entry.verts,
          size: tankSize,
        });
      } else {
        meshes.push(entry);
      }
    });

    // Store animated refs for useFrame
    animatedTanksRef.current = animated;

    return { meshes, groundMeshes, replacementTanks, maintenanceTanks, particleTanks, labelPositions } as const;
  }, [scene, tankData, statusEffects, replaceMeshes, enableReflection]);

  // Stable clones for replacement tanks — created once per useMemo cycle, not per render
  const replacementTankClones = useMemo(() => {
    return replacementTanks.map((tank) => {
      const baseScene = tankScenes[tank.size];
      if (!baseScene) return null;
      const clone = baseScene.clone(true);
      // Name all child meshes with tank name so raycasting resolves correctly
      clone.name = tank.name;
      clone.traverse((child) => {
        child.name = tank.name;
        if (child instanceof THREE.Mesh) {
          child.userData.tankName = tank.name;
        }
      });
      return { ...tank, clone };
    }).filter(Boolean) as (ReplacementTank & { clone: THREE.Group })[];
  }, [replacementTanks, tankScenes]);

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
    e.stopPropagation();
    if (!entry.clickable) { onMissed?.(); return; }

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
    });
  }, [onObjectClick, onMissed]);

  const handleGroundClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onMissed?.();
  }, [onMissed]);

  // Reset gear refs array on maintenance tank changes
  useEffect(() => {
    gearRefsArray.current = [];
  }, [maintenanceTanks]);

  // Publish label positions to scene store so TankLabels can read them without re-cloning GLTF
  useEffect(() => {
    setTankLabelPositions(labelPositions);
  }, [labelPositions, setTankLabelPositions]);

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

        {meshes.map((entry, i) => {
          const isSelected = entry.name === selectedObjName;
          const isHovered = entry.clickable && entry.name === hoveredName && !isSelected;
          return (
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
              onPointerOver={(e) => {
                if (entry.clickable) {
                  e.stopPropagation();
                  setHoveredName(entry.name);
                  useSceneStore.getState().setHoveredObjName(entry.name);
                }
              }}
              onPointerOut={() => {
                setHoveredName(null);
                useSceneStore.getState().setHoveredObjName(null);
              }}
            />

          );
        })}

        {/* Detail tank models replacing original cylinders (big/medium/small) */}
        {replacementTankClones.map((tank, i) => (
          <group
            key={`tank-${tank.name}-${i}`}
            position={tank.position}
            scale={tank.scale}
          >
            <primitive
              object={tank.clone}
              onClick={(e: ThreeEvent<MouseEvent>) => {
                e.stopPropagation();
                if (!tank.clickable) { onMissed?.(); return; }
                const obj = e.object as THREE.Mesh;
                const box = new THREE.Box3().setFromObject(obj);
                const center = box.getCenter(new THREE.Vector3());
                onObjectClick({
                  name: tank.name,
                  type: 'tank',
                  verts: tank.verts,
                  position: { x: parseFloat(center.x.toFixed(1)), y: parseFloat(center.y.toFixed(1)), z: parseFloat(center.z.toFixed(1)) },
                  screenX: 0, screenY: 0,
                });
              }}
              onPointerOver={(e: ThreeEvent<PointerEvent>) => {
                if (tank.clickable) {
                  e.stopPropagation();
                  setHoveredName(tank.name);
                  useSceneStore.getState().setHoveredObjName(tank.name);
                }
              }}
              onPointerOut={() => {
                setHoveredName(null);
                useSceneStore.getState().setHoveredObjName(null);
              }}
            />
          </group>
        ))}

        {/* Rotating gears on maintenance tanks */}
        {maintenanceTanks.map((tank, i) => (
          <mesh
            key={`gear-${i}`}
            ref={(el) => { if (el) gearRefsArray.current[i] = el; }}
            geometry={getGearGeometry()}
            material={getGearMaterial()}
            position={[tank.position[0], tank.topY, tank.position[2]]}
            rotation={[Math.PI / 2, 0, 0]}
          />
        ))}

        {/* Particle effects: fire (heating), sparks (critical), flow (receiving/discharging), haze (warning) */}
        <TankParticles tanks={particleTanks} />
    </group>
  );
}

// Preload all terminal GLBs + tank models for fast switching
useGLTF.preload('/models/savannah.glb');
useGLTF.preload('/models/los-angeles.glb');
useGLTF.preload('/models/tarragona.glb');
useGLTF.preload(TANK_PATHS.big);
useGLTF.preload(TANK_PATHS.medium);
useGLTF.preload(TANK_PATHS.small);
