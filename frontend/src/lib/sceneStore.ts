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

  // Effects toggle
  statusEffects: boolean;
  toggleStatusEffects: () => void;

  // Tank label positions (computed by TerminalModel, shared with TankLabels)
  tankLabelPositions: Map<string, { tankId: string; product: string; position: [number, number, number] }>;
  setTankLabelPositions: (positions: Map<string, { tankId: string; product: string; position: [number, number, number] }>) => void;
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

  tankLabelPositions: new Map(),
  setTankLabelPositions: (positions) => set({ tankLabelPositions: positions }),
}));
