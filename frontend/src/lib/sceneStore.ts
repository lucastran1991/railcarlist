import { create } from 'zustand';
import type { ClickedObject, CameraInfo } from '@/lib/three/types';
import type { RaycastDebugInfo } from '@/components/scene/TerminalModel';

interface SceneState {
  // Selection
  selectedObj: ClickedObject | null;
  hoveredMeshUuid: string | null;
  hoveredObjName: string | null;
  select: (obj: ClickedObject | null) => void;
  hover: (uuid: string | null) => void;
  setHoveredObjName: (name: string | null) => void;

  // Camera
  cameraInfo: CameraInfo | null;
  setCameraInfo: (info: CameraInfo) => void;

  // Raycast debug
  raycastInfo: RaycastDebugInfo | null;
  setRaycastInfo: (info: RaycastDebugInfo | null) => void;

  // Effects toggles
  statusEffects: boolean;
  toggleStatusEffects: () => void;
  replaceMeshes: boolean;
  toggleReplaceMeshes: () => void;
  enableReflection: boolean;
  toggleReflection: () => void;
  enableLighting: boolean;
  toggleLighting: () => void;

  // Tank label positions (computed by TerminalModel, shared with TankLabels)
  tankLabelPositions: Map<string, { tankId: string; product: string; position: [number, number, number] }>;
  setTankLabelPositions: (positions: Map<string, { tankId: string; product: string; position: [number, number, number] }>) => void;

  // Scene loading state
  modelLoaded: boolean;
  setModelLoaded: (loaded: boolean) => void;
  sceneReady: boolean;
  setSceneReady: (ready: boolean) => void;

  // Reset everything on terminal switch
  resetScene: () => void;
}

export const useSceneStore = create<SceneState>((set) => ({
  selectedObj: null,
  hoveredMeshUuid: null,
  hoveredObjName: null,
  select: (obj) => set({ selectedObj: obj }),
  hover: (uuid) => set({ hoveredMeshUuid: uuid }),
  setHoveredObjName: (name) => set({ hoveredObjName: name }),

  cameraInfo: null,
  setCameraInfo: (info) => set({ cameraInfo: info }),

  raycastInfo: null,
  setRaycastInfo: (info) => set({ raycastInfo: info }),

  statusEffects: false,
  toggleStatusEffects: () => set((s) => ({ statusEffects: !s.statusEffects })),
  replaceMeshes: false,
  toggleReplaceMeshes: () => set((s) => ({ replaceMeshes: !s.replaceMeshes })),
  enableReflection: true,
  toggleReflection: () => set((s) => ({ enableReflection: !s.enableReflection })),
  enableLighting: true,
  toggleLighting: () => set((s) => ({ enableLighting: !s.enableLighting })),

  tankLabelPositions: new Map(),
  setTankLabelPositions: (positions) => set({ tankLabelPositions: positions }),

  modelLoaded: false,
  setModelLoaded: (loaded) => set({ modelLoaded: loaded }),
  sceneReady: false,
  setSceneReady: (ready) => set({ sceneReady: ready }),

  resetScene: () => set({
    selectedObj: null,
    hoveredMeshUuid: null,
    hoveredObjName: null,
    tankLabelPositions: new Map(),
    modelLoaded: false,
    sceneReady: false,
    raycastInfo: null,
  }),
}));
