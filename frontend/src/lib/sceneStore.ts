import { create } from 'zustand';
import type { ClickedObject, CameraInfo } from '@/lib/three/types';
import type { RaycastDebugInfo } from '@/components/scene/TerminalModel';

interface SceneState {
  // Selection
  selectedObj: ClickedObject | null;
  hoveredMeshUuid: string | null;
  select: (obj: ClickedObject | null) => void;
  hover: (uuid: string | null) => void;

  // Camera
  cameraInfo: CameraInfo | null;
  setCameraInfo: (info: CameraInfo) => void;

  // Raycast debug
  raycastInfo: RaycastDebugInfo | null;
  setRaycastInfo: (info: RaycastDebugInfo | null) => void;

  // Effects toggle
  statusEffects: boolean;
  toggleStatusEffects: () => void;
}

export const useSceneStore = create<SceneState>((set) => ({
  selectedObj: null,
  hoveredMeshUuid: null,
  select: (obj) => set({ selectedObj: obj }),
  hover: (uuid) => set({ hoveredMeshUuid: uuid }),

  cameraInfo: null,
  setCameraInfo: (info) => set({ cameraInfo: info }),

  raycastInfo: null,
  setRaycastInfo: (info) => set({ raycastInfo: info }),

  statusEffects: false,
  toggleStatusEffects: () => set((s) => ({ statusEffects: !s.statusEffects })),
}));
