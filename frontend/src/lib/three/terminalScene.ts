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
  angle: number;   // degrees
  radius: number;
  height: number;
  x: number;
  y: number;
  z: number;
}

export interface TerminalSceneHandle {
  dispose: () => void;
  camera: TerminalCameraApi;
  onCameraChange: (cb: (info: CameraInfo) => void) => void;
}

export function initTerminalScene(
  container: HTMLElement,
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

  // --- Camera ---
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200);
  const CAMERA_TARGET = new THREE.Vector3(0, 2, 0);
  const INITIAL_RADIUS = 65;
  const INITIAL_Y = 30;
  const INITIAL_ANGLE = 0;
  let camRadius = INITIAL_RADIUS;
  let camY = INITIAL_Y;
  let camAngle = INITIAL_ANGLE;
  let camDirection = 1;
  const CAM_SPEED = 0.5 * (Math.PI / 180);
  const CAM_ANGLE_MAX = 15 * (Math.PI / 180);
  const CAM_ZOOM_STEP = 0.9;
  const CAM_ROT_STEP = 5 * (Math.PI / 180);
  const CAM_TILT_STEP = 2;
  const CAM_RADIUS_MIN = 15;
  const CAM_RADIUS_MAX = 120;
  const CAM_Y_MIN = 2;
  const CAM_Y_MAX = 60;

  const updateCamera = () => {
    const x = Math.sin(camAngle) * camRadius;
    const z = Math.cos(camAngle) * camRadius;
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

  // --- Mouse interaction ---
  let isDragging = false;
  let autoOrbit = true;
  let autoOrbitTimeout: ReturnType<typeof setTimeout> | null = null;
  const MOUSE_ROT_SPEED = 0.005;
  const MOUSE_TILT_SPEED = 0.3;
  const WHEEL_ZOOM_SPEED = 0.001;

  const resumeAutoOrbit = () => {
    if (autoOrbitTimeout) clearTimeout(autoOrbitTimeout);
    autoOrbitTimeout = setTimeout(() => { autoOrbit = true; }, 3000);
  };

  const onMouseDown = (e: MouseEvent) => {
    if (e.button === 0) { isDragging = true; autoOrbit = false; }
  };
  const onMouseUp = () => {
    isDragging = false;
    resumeAutoOrbit();
  };
  const onMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    camAngle -= e.movementX * MOUSE_ROT_SPEED;
    camY = Math.min(CAM_Y_MAX, Math.max(CAM_Y_MIN, camY - e.movementY * MOUSE_TILT_SPEED));
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

    // Camera oscillation (paused during mouse interaction)
    if (autoOrbit) {
      camAngle += CAM_SPEED * dt * camDirection;
      if (camAngle > CAM_ANGLE_MAX) { camAngle = CAM_ANGLE_MAX; camDirection = -1; }
      if (camAngle < -CAM_ANGLE_MAX) { camAngle = -CAM_ANGLE_MAX; camDirection = 1; }
    }
    updateCamera();
    reportCamera();

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
  };
}
