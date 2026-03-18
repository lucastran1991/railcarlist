import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const GLB_PATH = '/models/pine-tree.glb';

/** Only request GLB when set (avoids 404 + console noise if file is absent). */
function shouldLoadPinesGlb(): boolean {
  const v = process.env.NEXT_PUBLIC_PINES_GLB;
  return v === '1' || v === 'true';
}

const NIGHT_SKY = 0x0a1628;
const DAY_SKY = 0x5a9ec8;
const DAY_FOG = 0x8ec0e8;

/** Up to 10 treeline slots (x, z, scale, rotationY) */
const PROC_PLACEMENTS: { x: number; z: number; s: number; ry: number }[] = [
  { x: -7.0, z: -10.2, s: 1.15, ry: 0.4 },
  { x: -5.2, z: -11.5, s: 1.35, ry: -0.15 },
  { x: -2.8, z: -13.0, s: 1.05, ry: 0.25 },
  { x: -0.5, z: -12.0, s: 1.45, ry: -0.35 },
  { x: 1.8, z: -12.8, s: 1.2, ry: 0.1 },
  { x: 4.2, z: -11.6, s: 1.3, ry: -0.5 },
  { x: 6.5, z: -10.8, s: 1.1, ry: 0.55 },
  { x: 7.5, z: -12.5, s: 0.95, ry: -0.2 },
  { x: 0.2, z: -14.8, s: 1.0, ry: 0.75 },
  { x: -3.8, z: -14.2, s: 1.15, ry: -0.6 },
];

const GLB_PLACEMENTS: { x: number; z: number; s: number; ry: number }[] = PROC_PLACEMENTS.map(
  (p) => ({ x: p.x, z: p.z, s: p.s * 1.65, ry: p.ry })
);

export type SnowThiccLevel = 1 | 2 | 3;

/** Off = no gusts. Other modes: random left/right gusts every few seconds. */
export type WindMode = 'off' | 'calm' | 'breezy' | 'gale';

export type HomeSceneSettings = {
  treeCount: number;
  snowThicc: SnowThiccLevel;
  isNight: boolean;
  windMode?: WindMode;
};

export type HomeThreeHandle = {
  dispose: () => void;
  setTreeCount: (n: number) => void;
  setSnowThicc: (level: SnowThiccLevel) => void;
  setNightMode: (night: boolean) => void;
  setWindMode: (mode: WindMode) => void;
};

function randRange(a: number, b: number): number {
  return a + Math.random() * (b - a);
}

function disposeObject3D(root: THREE.Object3D): void {
  root.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.geometry?.dispose();
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      mats.forEach((m) => m?.dispose());
    }
  });
}

function disposeGroupSharedResources(root: THREE.Object3D): void {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  root.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      if (obj.geometry) geometries.add(obj.geometry);
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      mats.forEach((m) => {
        if (m) materials.add(m);
      });
    }
  });
  geometries.forEach((g) => g.dispose());
  materials.forEach((m) => m.dispose());
}

function createProceduralForest(count: number): THREE.Group {
  const forest = new THREE.Group();
  const n = Math.max(3, Math.min(10, Math.round(count)));
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x2d1810, roughness: 1 });
  const leafMat = new THREE.MeshStandardMaterial({
    color: 0x143d28,
    roughness: 0.95,
    metalness: 0,
  });

  for (let i = 0; i < n; i++) {
    const p = PROC_PLACEMENTS[i];
    const tree = new THREE.Group();
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12 * p.s, 0.18 * p.s, 0.75 * p.s, 8),
      trunkMat
    );
    trunk.position.y = 0.35 * p.s;
    tree.add(trunk);
    for (let layer = 0; layer < 3; layer++) {
      const r = (0.85 - layer * 0.22) * p.s;
      const h = (1.0 - layer * 0.15) * p.s;
      const cone = new THREE.Mesh(new THREE.ConeGeometry(r, h, 8), leafMat);
      cone.position.y = 0.85 * p.s + layer * 0.55 * p.s;
      tree.add(cone);
    }
    tree.position.set(p.x, -4.0, p.z);
    tree.rotation.y = p.ry;
    forest.add(tree);
  }
  return forest;
}

function createSnowSystem(
  thicc: SnowThiccLevel
): {
  points: THREE.Points;
  geometry: THREE.BufferGeometry;
  material: THREE.PointsMaterial;
  count: number;
  update: (windXPerSec: number) => void;
} {
  const presets = {
    1: { count: 1600, size: 0.028, opacity: 0.78 },
    2: { count: 3400, size: 0.045, opacity: 0.92 },
    3: { count: 5200, size: 0.068, opacity: 0.98 },
  } as const;
  const { count, size, opacity } = presets[thicc];
  const positions = new Float32Array(count * 3);
  const fallSpeed = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    positions[i3] = (Math.random() - 0.5) * 26;
    positions[i3 + 1] = Math.random() * 22 - 6;
    positions[i3 + 2] = -22 + Math.random() * 28;
    fallSpeed[i] = 3.2 + Math.random() * (thicc * 2.5);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color: 0xe8f2ff,
    size,
    sizeAttenuation: true,
    transparent: true,
    opacity,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(geometry, material);

  let lastT = performance.now();
  const yTop = 16;
  const yBottom = -10;

  /** windXPerSec: horizontal drift from gusts (world units/s, signed). */
  const update = (windXPerSec: number) => {
    const now = performance.now();
    const dt = Math.min(0.05, (now - lastT) / 1000);
    lastT = now;
    const t = now * 0.001;
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      positions[i3 + 1] -= fallSpeed[i] * dt;
      positions[i3] += (Math.sin(t * 0.8 + i * 0.07) * 0.35 + windXPerSec) * dt;
      positions[i3 + 2] += Math.cos(t * 0.6 + i * 0.03) * 0.25 * dt;
      if (positions[i3 + 1] < yBottom) {
        positions[i3 + 1] = yTop + Math.random() * 4;
        positions[i3] = (Math.random() - 0.5) * 26;
        positions[i3 + 2] = -22 + Math.random() * 28;
      }
    }
    geometry.attributes.position.needsUpdate = true;
  };

  return { points, geometry, material, count, update };
}

function placeGlbTrees(template: THREE.Object3D, treeCount: number): THREE.Group {
  const group = new THREE.Group();
  const n = Math.max(3, Math.min(10, Math.round(treeCount)));
  for (let i = 0; i < n; i++) {
    const p = GLB_PLACEMENTS[i];
    const clone = template.clone(true);
    clone.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.castShadow = false;
        o.receiveShadow = false;
      }
    });
    clone.position.set(p.x, -4.2, p.z);
    clone.scale.setScalar(p.s);
    clone.rotation.y = p.ry;
    group.add(clone);
  }
  return group;
}

function applyNightMode(
  scene: THREE.Scene,
  renderer: THREE.WebGLRenderer,
  hemi: THREE.HemisphereLight,
  sunMoon: THREE.DirectionalLight,
  snowMat: THREE.PointsMaterial,
  night: boolean
): void {
  if (night) {
    renderer.setClearColor(NIGHT_SKY, 1);
    scene.fog = new THREE.Fog(NIGHT_SKY, 12, 48);
    hemi.color.setHex(0x1a3050);
    hemi.groundColor.setHex(0x050810);
    hemi.intensity = 0.35;
    sunMoon.color.setHex(0xb8d4f0);
    sunMoon.intensity = 0.45;
    sunMoon.position.set(-8, 14, 6);
    snowMat.color.setHex(0xe8f2ff);
  } else {
    renderer.setClearColor(DAY_SKY, 1);
    scene.fog = new THREE.Fog(DAY_FOG, 22, 72);
    hemi.color.setHex(0xc8e8ff);
    hemi.groundColor.setHex(0x6a9050);
    hemi.intensity = 0.72;
    sunMoon.color.setHex(0xfff8e8);
    sunMoon.intensity = 0.95;
    sunMoon.position.set(10, 18, 8);
    snowMat.color.setHex(0xffffff);
  }
}

export function initHomeThree(
  container: HTMLElement,
  settings: Partial<HomeSceneSettings> = {}
): HomeThreeHandle | null {
  let treeCount = Math.max(3, Math.min(10, settings.treeCount ?? 6));
  let snowThicc: SnowThiccLevel = settings.snowThicc ?? 2;
  let isNight = settings.isNight ?? true;
  let windMode: WindMode = settings.windMode ?? 'breezy';

  let windInGust = false;
  let windNextGustAt = performance.now() + randRange(1500, 4000);
  let windGustStart = 0;
  let windGustEnd = 0;
  let windGustVx = 0;

  const gustGapMs = (): number => {
    if (windMode === 'calm') return randRange(4500, 11000);
    if (windMode === 'breezy') return randRange(2200, 5500);
    if (windMode === 'gale') return randRange(800, 3200);
    return 999999999;
  };

  const gustPeakSpeed = (): number => {
    if (windMode === 'calm') return randRange(3.5, 9);
    if (windMode === 'breezy') return randRange(8, 19);
    if (windMode === 'gale') return randRange(15, 32);
    return 0;
  };

  /** Long gusts (~10s) so wind feels sustained */
  const gustDurationMs = (): number => randRange(9000, 11000);

  const computeWindXPerSec = (now: number): number => {
    if (windMode === 'off') return 0;
    if (!windInGust) {
      if (now >= windNextGustAt) {
        windInGust = true;
        windGustStart = now;
        windGustEnd = now + gustDurationMs();
        windGustVx = (Math.random() < 0.5 ? -1 : 1) * gustPeakSpeed();
      }
      return 0;
    }
    if (now >= windGustEnd) {
      windInGust = false;
      windNextGustAt = now + gustGapMs();
      return 0;
    }
    const u = (now - windGustStart) / Math.max(1, windGustEnd - windGustStart);
    const envelope = Math.sin(Math.PI * Math.min(1, Math.max(0, u)));
    return windGustVx * (0.2 + 0.8 * envelope);
  };

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
  } catch {
    return null;
  }

  const gl = renderer.getContext() as WebGLRenderingContext | null;
  if (!gl) {
    renderer.dispose();
    return null;
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.domElement.style.display = 'block';
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const hemi = new THREE.HemisphereLight(0x1a3050, 0x050810, 0.35);
  scene.add(hemi);
  const sunMoon = new THREE.DirectionalLight(0xb8d4f0, 0.45);
  sunMoon.position.set(-8, 14, 6);
  scene.add(sunMoon);

  const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 120);
  camera.position.set(0, 3.4, 17);
  camera.lookAt(0, 0.5, -6);

  let snow = createSnowSystem(snowThicc);
  scene.add(snow.points);
  applyNightMode(scene, renderer, hemi, sunMoon, snow.material, isNight);

  let treeGroup: THREE.Group = createProceduralForest(treeCount);
  let treeGroupUsesGlb = false;
  scene.add(treeGroup);

  let glbTemplate: THREE.Object3D | null = null;
  let disposed = false;

  const rebuildTrees = () => {
    if (disposed) return;
    scene.remove(treeGroup);
    if (treeGroupUsesGlb) {
      // Clones share BufferGeometry with glbTemplate; do not dispose or template breaks
    } else {
      disposeObject3D(treeGroup);
    }
    if (glbTemplate) {
      treeGroup = placeGlbTrees(glbTemplate, treeCount);
      treeGroupUsesGlb = true;
    } else {
      treeGroup = createProceduralForest(treeCount);
      treeGroupUsesGlb = false;
    }
    scene.add(treeGroup);
  };

  const rebuildSnow = () => {
    if (disposed) return;
    scene.remove(snow.points);
    snow.geometry.dispose();
    snow.material.dispose();
    snow = createSnowSystem(snowThicc);
    scene.add(snow.points);
    applyNightMode(scene, renderer, hemi, sunMoon, snow.material, isNight);
  };

  const swapToGlb = (gltfScene: THREE.Object3D) => {
    if (disposed) {
      disposeGroupSharedResources(gltfScene);
      return;
    }
    glbTemplate = gltfScene;
    rebuildTrees();
  };

  if (shouldLoadPinesGlb()) {
    const loader = new GLTFLoader();
    loader.load(
      GLB_PATH,
      (gltf) => {
        swapToGlb(gltf.scene);
      },
      undefined,
      () => {
        /* missing or invalid file: keep procedural */
      }
    );
  }

  let animationId = 0;
  let visible = document.visibilityState === 'visible';

  const resize = () => {
    const w = Math.max(1, container.clientWidth);
    const h = Math.max(1, container.clientHeight);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  };

  resize();
  const ro = new ResizeObserver(() => resize());
  ro.observe(container);

  const onVisibility = () => {
    visible = document.visibilityState === 'visible';
    if (!visible) {
      cancelAnimationFrame(animationId);
      animationId = 0;
    } else if (animationId === 0) {
      loop();
    }
  };
  document.addEventListener('visibilitychange', onVisibility);

  const loop = () => {
    if (!visible) {
      animationId = 0;
      return;
    }
    const now = performance.now();
    snow.update(computeWindXPerSec(now));
    const t = now;
    camera.position.x = Math.sin(t * 0.00008) * 0.25;
    camera.lookAt(0, 0.5, -6);
    renderer.render(scene, camera);
    animationId = requestAnimationFrame(loop);
  };

  loop();

  return {
    dispose: () => {
      disposed = true;
      document.removeEventListener('visibilitychange', onVisibility);
      ro.disconnect();
      cancelAnimationFrame(animationId);
      animationId = 0;
      snow.geometry.dispose();
      snow.material.dispose();
      scene.remove(treeGroup);
      if (!treeGroupUsesGlb) {
        disposeObject3D(treeGroup);
      }
      if (glbTemplate) {
        disposeGroupSharedResources(glbTemplate);
        glbTemplate = null;
      }
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    },
    setTreeCount: (n: number) => {
      treeCount = Math.max(3, Math.min(10, Math.round(n)));
      rebuildTrees();
    },
    setSnowThicc: (level: SnowThiccLevel) => {
      snowThicc = level;
      rebuildSnow();
    },
    setNightMode: (night: boolean) => {
      isNight = night;
      applyNightMode(scene, renderer, hemi, sunMoon, snow.material, isNight);
    },
    setWindMode: (mode: WindMode) => {
      windMode = mode;
      windInGust = false;
      windNextGustAt = performance.now() + (mode === 'off' ? 999999999 : randRange(800, 3500));
    },
  };
}
