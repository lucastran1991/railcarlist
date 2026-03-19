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

export type HomeSceneCameraApi = {
  cameraZoomIn: () => void;
  cameraZoomOut: () => void;
  cameraRotateLeft: () => void;
  cameraRotateRight: () => void;
  cameraReset: () => void;
};

export type HomeThreeHandle = HomeSceneCameraApi & {
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

type MedievalVillageAssets = {
  group: THREE.Group;
  windowMat: THREE.MeshStandardMaterial;
  sharedMats: THREE.MeshStandardMaterial[];
};

/** Cozy medieval cottages between camera and treeline */
function createMedievalVillage(): MedievalVillageAssets {
  const village = new THREE.Group();
  const stone = new THREE.MeshStandardMaterial({ color: 0x6b6560, roughness: 0.96, metalness: 0 });
  const plaster = new THREE.MeshStandardMaterial({ color: 0xc9b8a8, roughness: 0.92, metalness: 0 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x4a3f38, roughness: 0.88, metalness: 0 });
  const wood = new THREE.MeshStandardMaterial({ color: 0x3d2b1f, roughness: 1, metalness: 0 });
  const windowWarm = new THREE.MeshStandardMaterial({
    color: 0x1a1510,
    emissive: 0xffc873,
    emissiveIntensity: 0.5,
    roughness: 1,
  });

  const sharedMats = [stone, plaster, roofMat, wood, windowWarm];

  function house(scale: number): THREE.Group {
    const g = new THREE.Group();
    const w = 0.42 * scale;
    const d = 0.36 * scale;
    const wallH = 0.5 * scale;

    const base = new THREE.Mesh(new THREE.BoxGeometry(w + 0.08 * scale, 0.1 * scale, d + 0.08 * scale), stone);
    base.position.y = 0.05 * scale;
    g.add(base);

    const walls = new THREE.Mesh(new THREE.BoxGeometry(w, wallH, d), plaster);
    walls.position.y = 0.1 * scale + wallH / 2;
    g.add(walls);

    const roofPanel = new THREE.BoxGeometry(w * 1.22, 0.06 * scale, d * 1.35);
    const r1 = new THREE.Mesh(roofPanel, roofMat);
    r1.rotation.x = Math.PI * 0.26;
    r1.position.set(0, 0.1 * scale + wallH + 0.06 * scale, -d * 0.08);
    const r2 = new THREE.Mesh(roofPanel.clone(), roofMat);
    r2.rotation.x = -Math.PI * 0.26;
    r2.position.set(0, 0.1 * scale + wallH + 0.06 * scale, d * 0.08);
    g.add(r1, r2);

    const chimney = new THREE.Mesh(
      new THREE.BoxGeometry(0.1 * scale, 0.22 * scale, 0.1 * scale),
      stone
    );
    chimney.position.set(w * 0.28, 0.1 * scale + wallH + 0.18 * scale, -d * 0.15);
    g.add(chimney);

    const door = new THREE.Mesh(new THREE.PlaneGeometry(0.14 * scale, 0.22 * scale), wood);
    door.position.set(0, 0.1 * scale + 0.12 * scale, d / 2 + 0.01);
    g.add(door);

    const winGeo = new THREE.PlaneGeometry(0.1 * scale, 0.08 * scale);
    const winL = new THREE.Mesh(winGeo, windowWarm);
    winL.position.set(-w * 0.22, 0.1 * scale + wallH * 0.62, d / 2 + 0.01);
    const winR = new THREE.Mesh(winGeo, windowWarm);
    winR.position.set(w * 0.22, 0.1 * scale + wallH * 0.55, d / 2 + 0.01);
    g.add(winL, winR);

    const beam = new THREE.Mesh(new THREE.BoxGeometry(w * 1.02, 0.04 * scale, 0.05 * scale), wood);
    beam.position.set(0, 0.1 * scale + wallH * 0.88, d / 2 + 0.015);
    g.add(beam);

    return g;
  }

  const spots: { x: number; z: number; ry: number; s: number }[] = [
    { x: -4.1, z: -7.5, ry: 0.3, s: 1.05 },
    { x: 3.9, z: -7.9, ry: -0.4, s: 0.98 },
    { x: 0.4, z: -6.95, ry: 0.08, s: 0.88 },
    { x: -1.5, z: -8.5, ry: 0.55, s: 0.82 },
    { x: 5.2, z: -8.3, ry: -0.2, s: 0.75 },
  ];

  for (const p of spots) {
    const h = house(p.s);
    h.position.set(p.x, -4.0, p.z);
    h.rotation.y = p.ry;
    village.add(h);
  }

  return { group: village, windowMat: windowWarm, sharedMats };
}

function disposeMedievalVillage(assets: MedievalVillageAssets): void {
  assets.group.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.geometry?.dispose();
    }
  });
  assets.sharedMats.forEach((m) => m.dispose());
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
  const xBound = 14;
  const zMin = -22;
  const zMax = 4;
  const positions = new Float32Array(count * 3);
  const fallSpeed = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    positions[i3] = (Math.random() - 0.5) * (xBound * 2);
    positions[i3 + 1] = Math.random() * 22 - 6;
    positions[i3 + 2] = zMin + Math.random() * (zMax - zMin);
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

  const respawnAbove = (i3: number, biasX: 'center' | 'fromLeft' | 'fromRight') => {
    positions[i3 + 1] = yTop + Math.random() * 5;
    if (biasX === 'fromLeft') {
      positions[i3] = -xBound + Math.random() * 5;
    } else if (biasX === 'fromRight') {
      positions[i3] = xBound - Math.random() * 5;
    } else {
      positions[i3] = (Math.random() - 0.5) * 24;
    }
    positions[i3 + 2] = zMin + Math.random() * (zMax - zMin);
  };

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
      positions[i3 + 2] += Math.cos(t * 0.6 + i * 0.03) * 0.22 * dt;
      if (positions[i3 + 1] < yBottom) {
        respawnAbove(i3, 'center');
      } else if (positions[i3] > xBound) {
        respawnAbove(i3, windXPerSec >= 0 ? 'fromLeft' : 'fromRight');
      } else if (positions[i3] < -xBound) {
        respawnAbove(i3, windXPerSec <= 0 ? 'fromRight' : 'fromLeft');
      } else if (positions[i3 + 2] < zMin || positions[i3 + 2] > zMax) {
        respawnAbove(i3, 'center');
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

function applyFloorGridColors(grid: THREE.GridHelper, night: boolean): void {
  const mats = grid.material;
  const arr = Array.isArray(mats) ? mats : [mats];
  const c0 = arr[0] as THREE.LineBasicMaterial;
  const c1 = arr[1] as THREE.LineBasicMaterial;
  if (c0?.color) c0.color.setHex(night ? 0x3d5268 : 0x8fa8bc);
  if (c1?.color) c1.color.setHex(night ? 0x283442 : 0x6d8498);
}

function applyNightMode(
  scene: THREE.Scene,
  renderer: THREE.WebGLRenderer,
  hemi: THREE.HemisphereLight,
  sunMoon: THREE.DirectionalLight,
  snowMat: THREE.PointsMaterial,
  night: boolean,
  cottageWindowMat: THREE.MeshStandardMaterial | null,
  floorGrid: THREE.GridHelper | null
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
    if (cottageWindowMat) cottageWindowMat.emissiveIntensity = 0.52;
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
    if (cottageWindowMat) cottageWindowMat.emissiveIntensity = 0.06;
  }
  if (floorGrid) applyFloorGridColors(floorGrid, night);
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
  const CAMERA_TARGET = new THREE.Vector3(0, 0.5, -6);
  const CAM_R_MIN = 10;
  const CAM_R_MAX = 32;
  const CAM_PHI_MIN = 0.28;
  const CAM_PHI_MAX = 1.45;
  const CAM_ROT_STEP = (5 * Math.PI) / 180;
  const CAM_ZOOM_IN = 0.92;
  const CAM_ZOOM_OUT = 1.08;

  const camOffset = new THREE.Vector3().subVectors(
    new THREE.Vector3(0, 3.4, 17),
    CAMERA_TARGET
  );
  const camSph = new THREE.Spherical().setFromVector3(camOffset);
  let camRadius = camSph.radius;
  let camTheta = camSph.theta;
  let camPhi = camSph.phi;
  const initialCamRadius = camRadius;
  const initialCamTheta = camTheta;
  const initialCamPhi = camPhi;

  const applyCameraFromSpherical = () => {
    camRadius = THREE.MathUtils.clamp(camRadius, CAM_R_MIN, CAM_R_MAX);
    camPhi = THREE.MathUtils.clamp(camPhi, CAM_PHI_MIN, CAM_PHI_MAX);
    const sp = new THREE.Spherical(camRadius, camPhi, camTheta);
    const o = new THREE.Vector3().setFromSpherical(sp);
    camera.position.copy(CAMERA_TARGET).add(o);
    camera.lookAt(CAMERA_TARGET);
  };
  applyCameraFromSpherical();

  let snow = createSnowSystem(snowThicc);
  scene.add(snow.points);
  const medieval = createMedievalVillage();
  const villageGroup = medieval.group;
  scene.add(villageGroup);

  /** Floor layout grid (XZ), slightly below house bases (~y -4). */
  const floorGrid = new THREE.GridHelper(52, 26, 0x6d8498, 0x4a5f72);
  floorGrid.position.set(0, -4.07, -8.5);
  scene.add(floorGrid);

  applyNightMode(
    scene,
    renderer,
    hemi,
    sunMoon,
    snow.material,
    isNight,
    medieval.windowMat,
    floorGrid
  );

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
    applyNightMode(
      scene,
      renderer,
      hemi,
      sunMoon,
      snow.material,
      isNight,
      medieval.windowMat,
      floorGrid
    );
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
    applyCameraFromSpherical();
    renderer.render(scene, camera);
    animationId = requestAnimationFrame(loop);
  };

  loop();

  return {
    cameraZoomIn: () => {
      camRadius *= CAM_ZOOM_IN;
    },
    cameraZoomOut: () => {
      camRadius *= CAM_ZOOM_OUT;
    },
    cameraRotateLeft: () => {
      camTheta += CAM_ROT_STEP;
    },
    cameraRotateRight: () => {
      camTheta -= CAM_ROT_STEP;
    },
    cameraReset: () => {
      camRadius = initialCamRadius;
      camTheta = initialCamTheta;
      camPhi = initialCamPhi;
    },
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
      scene.remove(villageGroup);
      disposeMedievalVillage(medieval);
      scene.remove(floorGrid);
      floorGrid.geometry.dispose();
      const gm = floorGrid.material;
      (Array.isArray(gm) ? gm : [gm]).forEach((m) => m.dispose());
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
      applyNightMode(
        scene,
        renderer,
        hemi,
        sunMoon,
        snow.material,
        isNight,
        medieval.windowMat,
        floorGrid
      );
    },
    setWindMode: (mode: WindMode) => {
      windMode = mode;
      windInGust = false;
      windNextGustAt = performance.now() + (mode === 'off' ? 999999999 : randRange(800, 3500));
    },
  };
}
