import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export interface TerminalCameraApi {
  zoomIn: () => void;
  zoomOut: () => void;
  rotateLeft: () => void;
  rotateRight: () => void;
  tiltUp: () => void;
  tiltDown: () => void;
  reset: () => void;
}

export interface CameraInfo {
  angle: number;
  radius: number;
  height: number;
  x: number;
  y: number;
  z: number;
}

export interface ClickedObject {
  name: string;
  type: 'tank' | 'building' | 'ground';
  verts: number;
  position: { x: number; y: number; z: number };
  screenX: number;
  screenY: number;
}

export interface SceneConfig {
  scene: {
    camera: {
      default: { angle: number; radius: number; height: number };
      limits: { radius_min: number; radius_max: number; height_min: number; height_max: number; angle_max: number };
      zoom?: { min: number; max: number; speed: number };
      rotate?: { speed: number; tilt_speed: number };
    };
    target: { x: number; y: number; z: number };
    auto_orbit: boolean;
  };
}

export interface TerminalSceneHandle {
  dispose: () => void;
  camera: TerminalCameraApi;
  onCameraChange: (cb: (info: CameraInfo) => void) => void;
  onObjectClick: (cb: (obj: ClickedObject | null) => void) => void;
}

// Default config used if system.cfg.json fails to load
const DEFAULT_CONFIG: SceneConfig = {
  scene: {
    camera: {
      default: { angle: 0, radius: 15, height: 35 },
      limits: { radius_min: 10, radius_max: 80, height_min: 5, height_max: 60, angle_max: 360 },
    },
    target: { x: -20, y: 2, z: 15 },
    auto_orbit: false,
  },
};

export async function loadSceneConfig(): Promise<SceneConfig> {
  try {
    const res = await fetch('/system.cfg.json');
    if (!res.ok) throw new Error(res.statusText);
    return await res.json();
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function initTerminalScene(
  container: HTMLElement,
  config: SceneConfig = DEFAULT_CONFIG,
  settings?: { pixelRatio?: number }
): TerminalSceneHandle | null {
  // --- Renderer ---
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
      logarithmicDepthBuffer: true,
    });
  } catch {
    return null;
  }
  const gl = renderer.getContext();
  if (!gl) { renderer.dispose(); return null; }

  renderer.setPixelRatio(Math.min(settings?.pixelRatio ?? window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.style.display = 'block';
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  container.appendChild(renderer.domElement);

  // --- Scene ---
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x99bbdd, 0.006);

  // --- Sky gradient ---
  const skyGeo = new THREE.PlaneGeometry(500, 300);
  const skyMat = new THREE.ShaderMaterial({
    uniforms: {
      topColor: { value: new THREE.Color(0x4488cc) },
      bottomColor: { value: new THREE.Color(0xbbddff) },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 bottomColor;
      varying vec2 vUv;
      void main() {
        float t = pow(vUv.y, 0.7);
        gl_FragColor = vec4(mix(bottomColor, topColor, t), 1.0);
      }
    `,
    side: THREE.FrontSide,
    depthWrite: false,
  });
  const sky = new THREE.Mesh(skyGeo, skyMat);
  sky.position.set(0, 50, -120);
  scene.add(sky);

  // (sun removed)

  // --- Lighting (daylight with shadows) ---
  const dirLight = new THREE.DirectionalLight(0xffffff, 2.5);
  dirLight.position.set(-20, 40, 15);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.set(2048, 2048);
  dirLight.shadow.camera.left = -60;
  dirLight.shadow.camera.right = 60;
  dirLight.shadow.camera.top = 60;
  dirLight.shadow.camera.bottom = -60;
  dirLight.shadow.camera.near = 1;
  dirLight.shadow.camera.far = 120;
  dirLight.shadow.bias = -0.001;
  dirLight.shadow.normalBias = 0.02;
  scene.add(dirLight);

  const hemi = new THREE.HemisphereLight(0x88bbff, 0x556633, 1.0);
  scene.add(hemi);

  const fillLight = new THREE.DirectionalLight(0xaaccff, 0.6);
  fillLight.position.set(15, 15, 20);
  scene.add(fillLight);

  // --- Environment map for reflections (procedural) ---
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  envScene.background = new THREE.Color(0x88bbdd);
  const envLight = new THREE.HemisphereLight(0x99ccff, 0x556633, 1.0);
  envScene.add(envLight);
  const envTexture = pmremGenerator.fromScene(envScene, 0.04).texture;
  scene.environment = envTexture;
  pmremGenerator.dispose();

  // --- Camera (driven by system.cfg.json) ---
  const sc = config.scene;
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200);
  const CAMERA_TARGET = new THREE.Vector3(sc.target.x, sc.target.y, sc.target.z);
  const INITIAL_RADIUS = sc.camera.default.radius;
  const INITIAL_Y = sc.camera.default.height;
  const INITIAL_ANGLE = sc.camera.default.angle * (Math.PI / 180);
  let camRadius = INITIAL_RADIUS;
  let camY = INITIAL_Y;
  let camAngle = INITIAL_ANGLE;
  let camDirection = 1;
  const CAM_SPEED = 0.5 * (Math.PI / 180);
  const CAM_ANGLE_MAX = sc.camera.limits.angle_max * (Math.PI / 180);
  const CAM_ZOOM_STEP = 0.9;
  const CAM_ROT_STEP = 5 * (Math.PI / 180);
  const CAM_TILT_STEP = 2;
  const CAM_RADIUS_MIN = sc.camera.zoom?.min ?? sc.camera.limits.radius_min;
  const CAM_RADIUS_MAX = sc.camera.zoom?.max ?? sc.camera.limits.radius_max;
  const CAM_Y_MIN = sc.camera.limits.height_min;
  const CAM_Y_MAX = sc.camera.limits.height_max;

  const updateCamera = () => {
    const x = CAMERA_TARGET.x + Math.sin(camAngle) * camRadius;
    const z = CAMERA_TARGET.z + Math.cos(camAngle) * camRadius;
    camera.position.set(x, camY, z);
    camera.lookAt(CAMERA_TARGET);
  };
  updateCamera();

  // (ground plane provided by GLB satellite texture)

  // --- Load GLB terminal model (only geometry in the scene) ---
  let disposed = false;
  // --- Materials for GLB objects (PBR) ---
  const tankMat = new THREE.MeshPhysicalMaterial({
    color: 0xdddddd,
    roughness: 0.25,
    metalness: 0.8,
    clearcoat: 0.3,
    clearcoatRoughness: 0.2,
    envMapIntensity: 1.0,
  });
  const buildingMat = new THREE.MeshPhysicalMaterial({
    color: 0xaabbcc,
    roughness: 0.5,
    metalness: 0.1,
    envMapIntensity: 0.5,
  });

  const loader = new GLTFLoader();
  loader.load('/models/terminal.glb', (gltf) => {
    if (disposed) return;
    const model = gltf.scene;

    // Remove the Cube node (origin marker at 9M units away)
    const cubeNode = model.getObjectByName('Cube');
    if (cubeNode) cubeNode.removeFromParent();

    // Apply materials and enable shadows
    model.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      const name = obj.name || obj.parent?.name || '';

      // Ground plane — receive shadows, keep satellite texture
      if (name.includes('GOOGLE_SAT') || name.includes('EXPORT_GOOGLE')) {
        obj.receiveShadow = true;
        return;
      }
      if (name === 'Cube') return;

      // Enable shadows on all buildings/tanks
      obj.castShadow = true;
      obj.receiveShadow = true;

      // Tanks have ~80-95 verts (cylindrical), buildings have ~20-40 (boxes)
      const vertCount = obj.geometry?.attributes?.position?.count || 0;
      if (vertCount >= 70) {
        obj.material = tankMat;
      } else {
        obj.material = buildingMat;
      }
    });

    // Center and scale to fit scene (excluding removed Cube)
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxSpan = Math.max(size.x, size.z);
    const targetSpan = 80;
    const scale = targetSpan / maxSpan;

    model.position.set(0, 0, 0);
    model.scale.setScalar(scale);

    // Recompute after scale, center on X/Z only — keep Y as-is (terrain elevation)
    const scaledBox = new THREE.Box3().setFromObject(model);
    const scaledCenter = scaledBox.getCenter(new THREE.Vector3());

    model.position.x -= scaledCenter.x;
    model.position.z -= scaledCenter.z;

    scene.add(model);
  }, undefined, (err) => {
    console.warn('Failed to load terminal GLB:', err);
  });

  // --- Camera change callback ---
  let cameraChangeCallback: ((info: CameraInfo) => void) | null = null;
  let lastReportedAngle = -999;
  const reportCamera = () => {
    if (!cameraChangeCallback) return;
    const angleDeg = parseFloat((camAngle * 180 / Math.PI).toFixed(1));
    if (angleDeg === lastReportedAngle && camRadius === camRadius && camY === camY) return;
    lastReportedAngle = angleDeg;
    cameraChangeCallback({
      angle: angleDeg,
      radius: parseFloat(camRadius.toFixed(1)),
      height: parseFloat(camY.toFixed(1)),
      x: parseFloat(camera.position.x.toFixed(1)),
      y: parseFloat(camera.position.y.toFixed(1)),
      z: parseFloat(camera.position.z.toFixed(1)),
    });
  };

  // --- Object click callback ---
  let objectClickCallback: ((obj: ClickedObject | null) => void) | null = null;

  // --- Raycasting for click & hover detection ---
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  // Selected (clicked) state
  let selectedMesh: THREE.Mesh | null = null;
  let selectedOriginalMat: THREE.Material | THREE.Material[] | null = null;
  let selectedShell: THREE.Group | null = null;

  // Camera animation state for zoom-to-object
  let savedCamAngle = camAngle;
  let savedCamRadius = camRadius;
  let savedCamY = camY;
  let savedTarget = CAMERA_TARGET.clone();
  let camAnimating = false;
  let camAnimTarget = { angle: 0, radius: 0, y: 0, tx: CAMERA_TARGET.x, ty: CAMERA_TARGET.y, tz: CAMERA_TARGET.z };
  let camAnimStart = { angle: 0, radius: 0, y: 0, tx: CAMERA_TARGET.x, ty: CAMERA_TARGET.y, tz: CAMERA_TARGET.z };
  let camAnimProgress = 0;
  const CAM_ANIM_DURATION = 0.6; // seconds

  // Thick orange outline materials
  const outlineShellMat = new THREE.MeshBasicMaterial({
    color: 0xff6a00,
    side: THREE.BackSide,
    transparent: true,
    opacity: 0.95,
    depthTest: true,
    depthWrite: false,
  });
  const outlineEdgeMat = new THREE.LineBasicMaterial({
    color: 0xff6a00,
    transparent: true,
    opacity: 1.0,
  });

  /** Test if a mesh is a clickable building/tank */
  const isClickable = (obj: THREE.Object3D): obj is THREE.Mesh => {
    if (!(obj instanceof THREE.Mesh)) return false;
    const name = obj.name || obj.parent?.name || '';
    if (name.includes('GOOGLE_SAT') || name.includes('EXPORT_GOOGLE')) return false;
    if (name === 'Cube') return false;
    const verts = obj.geometry?.attributes?.position?.count || 0;
    return verts > 4;
  };

  /** Smooth ease in-out */
  const easeInOut = (t: number) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

  /** Start animating camera to a target state */
  const animateCameraTo = (angle: number, radius: number, y: number, tx: number, ty: number, tz: number) => {
    camAnimStart = { angle: camAngle, radius: camRadius, y: camY, tx: CAMERA_TARGET.x, ty: CAMERA_TARGET.y, tz: CAMERA_TARGET.z };
    camAnimTarget = { angle, radius, y, tx, ty, tz };
    camAnimProgress = 0;
    camAnimating = true;
  };

  const deselectCurrent = (restoreCamera = true) => {
    if (selectedMesh && selectedOriginalMat) {
      selectedMesh.material = selectedOriginalMat;
    }
    if (selectedShell) {
      selectedShell.removeFromParent();
      selectedShell.traverse((child) => {
        if (child instanceof THREE.Mesh || child instanceof THREE.LineSegments) {
          child.geometry.dispose();
        }
      });
      selectedShell = null;
    }
    selectedMesh = null;
    selectedOriginalMat = null;

    // Restore camera to saved position
    if (restoreCamera) {
      animateCameraTo(savedCamAngle, savedCamRadius, savedCamY, savedTarget.x, savedTarget.y, savedTarget.z);
    }
  };

  /** Raycast helper: returns first clickable mesh under mouse coords */
  const raycastClickable = (clientX: number, clientY: number): THREE.Mesh | null => {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(scene.children, true);
    for (const inter of intersects) {
      if (isClickable(inter.object)) return inter.object;
    }
    return null;
  };

  const handleClick = (e: MouseEvent) => {
    const hit = raycastClickable(e.clientX, e.clientY);

    const wasSelected = !!selectedMesh;
    deselectCurrent(!hit); // only restore camera if clicking empty space

    if (hit) {
      const name = hit.name || hit.parent?.name || 'unknown';
      const verts = hit.geometry?.attributes?.position?.count || 0;
      const type = verts >= 70 ? 'tank' as const : 'building' as const;

      // Save current camera if not already saved from a previous selection
      if (!wasSelected) {
        savedCamAngle = camAngle;
        savedCamRadius = camRadius;
        savedCamY = camY;
        savedTarget = CAMERA_TARGET.clone();
      }

      // Store original material
      selectedMesh = hit;
      selectedOriginalMat = hit.material;

      // Create highlight group: BackSide shell (sides/top) + edge wireframe (all edges including bottom)
      const group = new THREE.Group();
      group.raycast = () => {};

      // 1) BackSide shell — expanded outward from geometry center
      const shellGeo = hit.geometry.clone();
      const posAttr = shellGeo.attributes.position;
      if (posAttr) {
        shellGeo.computeBoundingBox();
        const geoCenter = new THREE.Vector3();
        shellGeo.boundingBox!.getCenter(geoCenter);
        const expand = 1.5;
        const arr = posAttr.array as Float32Array;
        for (let i = 0; i < arr.length; i += 3) {
          const dx = arr[i] - geoCenter.x;
          const dy = arr[i + 1] - geoCenter.y;
          const dz = arr[i + 2] - geoCenter.z;
          const len = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
          arr[i] += (dx / len) * expand;
          arr[i + 1] += (dy / len) * expand;
          arr[i + 2] += (dz / len) * expand;
        }
        posAttr.needsUpdate = true;
      }
      const shellMesh = new THREE.Mesh(shellGeo, outlineShellMat);
      shellMesh.renderOrder = -1;
      group.add(shellMesh);

      // 2) Edge wireframe — highlights all edges including bottom
      const edgesGeo = new THREE.EdgesGeometry(hit.geometry, 30);
      const edgeLines = new THREE.LineSegments(edgesGeo, outlineEdgeMat);
      group.add(edgeLines);

      hit.add(group);
      selectedShell = group;

      // Get world center of object
      const box = new THREE.Box3().setFromObject(hit);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const objRadius = Math.max(size.x, size.z) * 2.5;
      const zoomRadius = Math.max(CAM_RADIUS_MIN, Math.min(objRadius, 25));

      // Animate camera to zoom into the object
      animateCameraTo(camAngle, zoomRadius, Math.max(center.y + 8, 12), center.x, center.y, center.z);

      // Popup screen position will be computed per-frame during animation
      objectClickCallback?.({
        name,
        type,
        verts,
        position: { x: parseFloat(center.x.toFixed(1)), y: parseFloat(center.y.toFixed(1)), z: parseFloat(center.z.toFixed(1)) },
        screenX: -1000, // will be updated in loop
        screenY: -1000,
      });
    } else {
      objectClickCallback?.(null);
    }
  };

  // --- Mouse interaction ---
  let isDragging = false;
  let dragMoved = false;
  let autoOrbit = sc.auto_orbit;
  let autoOrbitTimeout: ReturnType<typeof setTimeout> | null = null;
  const MOUSE_ROT_SPEED = sc.camera.rotate?.speed ?? 0.005;
  const MOUSE_TILT_SPEED = sc.camera.rotate?.tilt_speed ?? 0.3;
  const WHEEL_ZOOM_SPEED = sc.camera.zoom?.speed ?? 0.001;

  const resumeAutoOrbit = () => {
    if (autoOrbitTimeout) clearTimeout(autoOrbitTimeout);
    autoOrbitTimeout = setTimeout(() => { autoOrbit = true; }, 3000);
  };

  const onMouseDown = (e: MouseEvent) => {
    if (e.button === 0) { isDragging = true; dragMoved = false; autoOrbit = false; }
  };
  const onMouseUp = (e: MouseEvent) => {
    if (!dragMoved && e.button === 0) {
      handleClick(e);
    }
    isDragging = false;
    dragMoved = false;
    resumeAutoOrbit();
  };
  const onMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      if (Math.abs(e.movementX) > 2 || Math.abs(e.movementY) > 2) dragMoved = true;
      camAngle -= e.movementX * MOUSE_ROT_SPEED;
      camY = Math.min(CAM_Y_MAX, Math.max(CAM_Y_MIN, camY - e.movementY * MOUSE_TILT_SPEED));
    }
  };
  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    const factor = 1 + e.deltaY * WHEEL_ZOOM_SPEED;
    camRadius = Math.min(CAM_RADIUS_MAX, Math.max(CAM_RADIUS_MIN, camRadius * factor));
    autoOrbit = false;
    resumeAutoOrbit();
  };

  renderer.domElement.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);
  window.addEventListener('mousemove', onMouseMove);
  renderer.domElement.addEventListener('wheel', onWheel, { passive: false });
  renderer.domElement.style.cursor = 'grab';

  // --- Resize ---
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

  // --- Visibility ---
  let animationId = 0;
  let visible = document.visibilityState === 'visible';
  let lastTime = performance.now();

  const onVisibility = () => {
    visible = document.visibilityState === 'visible';
    if (!visible) {
      cancelAnimationFrame(animationId);
      animationId = 0;
    } else if (animationId === 0) {
      lastTime = performance.now();
      loop();
    }
  };
  document.addEventListener('visibilitychange', onVisibility);

  // --- Animation loop ---
  const loop = () => {
    if (!visible || disposed) { animationId = 0; return; }
    const now = performance.now();
    const dt = Math.min(0.05, (now - lastTime) / 1000);
    lastTime = now;

    // Camera animation (zoom to object / restore)
    if (camAnimating) {
      camAnimProgress += dt / CAM_ANIM_DURATION;
      if (camAnimProgress >= 1) {
        camAnimProgress = 1;
        camAnimating = false;
      }
      const t = easeInOut(camAnimProgress);
      const lerp = (a: number, b: number) => a + (b - a) * t;
      camAngle = lerp(camAnimStart.angle, camAnimTarget.angle);
      camRadius = lerp(camAnimStart.radius, camAnimTarget.radius);
      camY = lerp(camAnimStart.y, camAnimTarget.y);
      CAMERA_TARGET.x = lerp(camAnimStart.tx, camAnimTarget.tx);
      CAMERA_TARGET.y = lerp(camAnimStart.ty, camAnimTarget.ty);
      CAMERA_TARGET.z = lerp(camAnimStart.tz, camAnimTarget.tz);
    } else if (autoOrbit) {
      camAngle += CAM_SPEED * dt * camDirection;
      if (camAngle > CAM_ANGLE_MAX) { camAngle = CAM_ANGLE_MAX; camDirection = -1; }
      if (camAngle < -CAM_ANGLE_MAX) { camAngle = -CAM_ANGLE_MAX; camDirection = 1; }
    }
    updateCamera();
    reportCamera();

    // Reproject popup position when camera moves (selected object)
    if (selectedMesh && objectClickCallback) {
      const box = new THREE.Box3().setFromObject(selectedMesh);
      const top = new THREE.Vector3(
        (box.min.x + box.max.x) / 2,
        box.max.y,
        (box.min.z + box.max.z) / 2,
      );
      const projected = top.clone().project(camera);
      const rect = renderer.domElement.getBoundingClientRect();
      const sx = ((projected.x + 1) / 2) * rect.width + rect.left;
      const sy = ((-projected.y + 1) / 2) * rect.height + rect.top;
      const name = selectedMesh.name || selectedMesh.parent?.name || 'unknown';
      const verts = selectedMesh.geometry?.attributes?.position?.count || 0;
      const center = box.getCenter(new THREE.Vector3());
      objectClickCallback({
        name,
        type: verts >= 70 ? 'tank' : 'building',
        verts,
        position: { x: parseFloat(center.x.toFixed(1)), y: parseFloat(center.y.toFixed(1)), z: parseFloat(center.z.toFixed(1)) },
        screenX: Math.round(sx),
        screenY: Math.round(sy),
      });
    }

    renderer.render(scene, camera);
    animationId = requestAnimationFrame(loop);
  };
  loop();

  // --- Camera API ---
  const cameraApi: TerminalCameraApi = {
    zoomIn: () => { camRadius = Math.max(CAM_RADIUS_MIN, camRadius * CAM_ZOOM_STEP); },
    zoomOut: () => { camRadius = Math.min(CAM_RADIUS_MAX, camRadius / CAM_ZOOM_STEP); },
    rotateLeft: () => { camAngle += CAM_ROT_STEP; },
    rotateRight: () => { camAngle -= CAM_ROT_STEP; },
    tiltUp: () => { camY = Math.min(CAM_Y_MAX, camY + CAM_TILT_STEP); },
    tiltDown: () => { camY = Math.max(CAM_Y_MIN, camY - CAM_TILT_STEP); },
    reset: () => { camRadius = INITIAL_RADIUS; camY = INITIAL_Y; camAngle = INITIAL_ANGLE; camDirection = 1; },
  };

  // --- Dispose ---
  return {
    dispose: () => {
      disposed = true;
      document.removeEventListener('visibilitychange', onVisibility);
      renderer.domElement.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('mousemove', onMouseMove);
      renderer.domElement.removeEventListener('wheel', onWheel);
      deselectCurrent();
      outlineShellMat.dispose();
      if (autoOrbitTimeout) clearTimeout(autoOrbitTimeout);
      ro.disconnect();
      cancelAnimationFrame(animationId);
      animationId = 0;
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry?.dispose();
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          mats.forEach((m) => m?.dispose());
        }
      });
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    },
    camera: cameraApi,
    onCameraChange: (cb: (info: CameraInfo) => void) => { cameraChangeCallback = cb; reportCamera(); },
    onObjectClick: (cb: (obj: ClickedObject | null) => void) => { objectClickCallback = cb; },
  };
}
