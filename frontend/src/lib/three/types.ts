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
      default: { angle: number; radius: number; height: number; x?: number; y?: number; z?: number };
      limits: { radius_min: number; radius_max: number; height_min: number; height_max: number; angle_max: number };
      zoom?: { min: number; max: number; speed: number };
      rotate?: { speed: number; tilt_speed: number };
    };
    target: { x: number; y: number; z: number };
    auto_orbit: boolean;
  };
}

export const DEFAULT_CONFIG: SceneConfig = {
  scene: {
    camera: {
      default: { angle: 0, radius: 20, height: 35, x: 0, y: 35, z: 25 },
      limits: { radius_min: 5, radius_max: 60, height_min: 5, height_max: 60, angle_max: 360 },
      zoom: { min: 5, max: 60, speed: 0.4 },
    },
    target: { x: 0, y: 0, z: 5 },
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
