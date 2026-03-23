'use client';

import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import type { TankStatus } from '@/lib/tankData';

// --- Particle config per status ---
interface ParticleConfig {
  count: number;
  color: string;        // hex string — Color objects created lazily in component
  colorEnd: string;     // fade-to color hex string
  speed: number;        // upward velocity
  spread: number;       // horizontal spread radius
  size: number;
  sizeEnd: number;
  lifetime: number;     // seconds before reset
  opacity: number;
  rise: number;         // max height above origin
  turbulence: number;   // horizontal wobble
}

const PARTICLE_CONFIGS: Partial<Record<TankStatus, ParticleConfig>> = {
  heating: {
    count: 40,
    color: '#FF6B35',
    colorEnd: '#FFD700',
    speed: 1.2,
    spread: 0.3,
    size: 0.15,
    sizeEnd: 0.03,
    lifetime: 1.5,
    opacity: 0.85,
    rise: 2.0,
    turbulence: 0.4,
  },
  critical: {
    count: 30,
    color: '#FF2020',
    colorEnd: '#FF6060',
    speed: 0.8,
    spread: 0.5,
    size: 0.12,
    sizeEnd: 0.05,
    lifetime: 2.0,
    opacity: 0.7,
    rise: 2.5,
    turbulence: 0.6,
  },
  receiving: {
    count: 20,
    color: '#56CDE7',
    colorEnd: '#56CDE7',
    speed: -0.6,  // downward for receiving
    spread: 0.25,
    size: 0.08,
    sizeEnd: 0.04,
    lifetime: 1.8,
    opacity: 0.5,
    rise: 2.0,
    turbulence: 0.15,
  },
  discharging: {
    count: 20,
    color: '#4D65FF',
    colorEnd: '#8BA4FF',
    speed: 0.9,
    spread: 0.25,
    size: 0.08,
    sizeEnd: 0.04,
    lifetime: 1.8,
    opacity: 0.5,
    rise: 2.5,
    turbulence: 0.15,
  },
  warning: {
    count: 15,
    color: '#ECC94B',
    colorEnd: '#FEFCBF',
    speed: 0.5,
    spread: 0.4,
    size: 0.10,
    sizeEnd: 0.06,
    lifetime: 2.5,
    opacity: 0.6,
    rise: 1.8,
    turbulence: 0.3,
  },
};

// Custom additive sprite texture (soft circle) — lazy init to avoid SSR document access
let _particleTexture: THREE.CanvasTexture | null = null;
function getParticleTexture(): THREE.CanvasTexture {
  if (_particleTexture) return _particleTexture;
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.4, 'rgba(255,255,255,0.6)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 32, 32);
  _particleTexture = new THREE.CanvasTexture(canvas);
  _particleTexture.needsUpdate = true;
  return _particleTexture;
}

interface TankParticleGroupProps {
  position: [number, number, number];
  status: TankStatus;
}

/** Single particle system for one tank */
function TankParticleGroup({ position, status }: TankParticleGroupProps) {
  const config = PARTICLE_CONFIGS[status];
  if (!config) return null;

  const pointsRef = useRef<THREE.Points>(null);

  // Create Color objects lazily in component (SSR safe)
  const colorStart = useMemo(() => new THREE.Color(config.color), [config.color]);
  const colorEnd = useMemo(() => new THREE.Color(config.colorEnd), [config.colorEnd]);

  // Initialize particle state arrays
  const { geometry, ages, velocities } = useMemo(() => {
    const count = config.count;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const ages = new Float32Array(count);
    const velocities = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      // Random starting age so particles don't all spawn at once
      ages[i] = Math.random() * config.lifetime;
      // Random horizontal offset
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * config.spread;
      positions[i * 3] = Math.cos(angle) * r;
      positions[i * 3 + 1] = Math.random() * config.rise * 0.3; // start near base
      positions[i * 3 + 2] = Math.sin(angle) * r;

      // Velocity: mainly vertical + slight horizontal turbulence
      velocities[i * 3] = (Math.random() - 0.5) * config.turbulence;
      velocities[i * 3 + 1] = config.speed * (0.8 + Math.random() * 0.4);
      velocities[i * 3 + 2] = (Math.random() - 0.5) * config.turbulence;

      colors[i * 3] = colorStart.r;
      colors[i * 3 + 1] = colorStart.g;
      colors[i * 3 + 2] = colorStart.b;
      sizes[i] = config.size;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    return { geometry: geo, ages, velocities };
  }, [config, colorStart]);

  // Per-frame: advance particle ages, update positions/colors/sizes
  useFrame((_, delta) => {
    if (!pointsRef.current) return;
    const posAttr = geometry.attributes.position as THREE.BufferAttribute;
    const colAttr = geometry.attributes.color as THREE.BufferAttribute;
    const sizeAttr = geometry.attributes.size as THREE.BufferAttribute;
    const pos = posAttr.array as Float32Array;
    const col = colAttr.array as Float32Array;
    const sz = sizeAttr.array as Float32Array;

    for (let i = 0; i < config.count; i++) {
      ages[i] += delta;
      const life = ages[i] / config.lifetime;

      if (life >= 1) {
        // Reset particle
        ages[i] = 0;
        const angle = Math.random() * Math.PI * 2;
        const r = Math.random() * config.spread;
        pos[i * 3] = Math.cos(angle) * r;
        pos[i * 3 + 1] = 0;
        pos[i * 3 + 2] = Math.sin(angle) * r;
        velocities[i * 3] = (Math.random() - 0.5) * config.turbulence;
        velocities[i * 3 + 1] = config.speed * (0.8 + Math.random() * 0.4);
        velocities[i * 3 + 2] = (Math.random() - 0.5) * config.turbulence;
      } else {
        // Move particle
        pos[i * 3] += velocities[i * 3] * delta;
        pos[i * 3 + 1] += velocities[i * 3 + 1] * delta;
        pos[i * 3 + 2] += velocities[i * 3 + 2] * delta;

        // Add slight sine wobble for fire-like motion
        if (config.turbulence > 0.2) {
          pos[i * 3] += Math.sin(ages[i] * 5 + i) * config.turbulence * 0.02;
        }
      }

      // Lerp color from start to end
      col[i * 3] = colorStart.r + (colorEnd.r - colorStart.r) * life;
      col[i * 3 + 1] = colorStart.g + (colorEnd.g - colorStart.g) * life;
      col[i * 3 + 2] = colorStart.b + (colorEnd.b - colorStart.b) * life;

      // Shrink size over lifetime
      sz[i] = config.size + (config.sizeEnd - config.size) * life;
    }

    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
    sizeAttr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef} position={position} geometry={geometry}>
      <pointsMaterial
        vertexColors
        size={config.size}
        sizeAttenuation
        transparent
        opacity={config.opacity}
        map={getParticleTexture()}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

// --- Exported: renders all tank particle systems ---
export interface TankParticleEntry {
  position: [number, number, number];
  status: TankStatus;
  tankId: string;
}

export default function TankParticles({ tanks }: { tanks: TankParticleEntry[] }) {
  // Only render particles for statuses that have configs
  const activeTanks = tanks.filter(t => PARTICLE_CONFIGS[t.status]);

  return (
    <group>
      {activeTanks.map((tank) => (
        <TankParticleGroup
          key={tank.tankId}
          position={tank.position}
          status={tank.status}
        />
      ))}
    </group>
  );
}
