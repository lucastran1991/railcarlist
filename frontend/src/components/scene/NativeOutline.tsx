'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useThree, useFrame, invalidate } from '@react-three/fiber';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { useSceneStore } from '@/lib/sceneStore';

export default function NativeOutline() {
  const { gl, scene, camera, size } = useThree();
  const selectedObjName = useSceneStore(s => s.selectedObj?.name ?? null);
  const modelLoaded = useSceneStore(s => s.modelLoaded);
  const hoveredRef = useRef<string | null>(null);
  const [warmedUp, setWarmedUp] = useState(false);

  const { composer, outlinePassSelected, outlinePassHovered } = useMemo(() => {
    const resolution = new THREE.Vector2(size.width, size.height);
    const comp = new EffectComposer(gl);
    comp.addPass(new RenderPass(scene, camera));

    const outlineSelected = new OutlinePass(resolution, scene, camera);
    outlineSelected.visibleEdgeColor.set('#5CE5A0');
    outlineSelected.hiddenEdgeColor.set('#5CE5A0');
    outlineSelected.edgeStrength = 5;
    outlineSelected.edgeThickness = 2;
    outlineSelected.edgeGlow = 0.3;
    outlineSelected.pulsePeriod = 0;
    comp.addPass(outlineSelected);

    const outlineHovered = new OutlinePass(resolution, scene, camera);
    outlineHovered.visibleEdgeColor.set('#56CDE7');
    outlineHovered.hiddenEdgeColor.set('#56CDE7');
    outlineHovered.edgeStrength = 3;
    outlineHovered.edgeThickness = 1;
    outlineHovered.edgeGlow = 0.2;
    outlineHovered.pulsePeriod = 0;
    comp.addPass(outlineHovered);

    comp.addPass(new OutputPass());
    return { composer: comp, outlinePassSelected: outlineSelected, outlinePassHovered: outlineHovered };
  }, [gl, scene, camera]);

  // Reset warmedUp when modelLoaded goes false (terminal switch)
  useEffect(() => {
    if (!modelLoaded) setWarmedUp(false);
  }, [modelLoaded]);

  // When model loaded: warm up shaders then signal ready
  useEffect(() => {
    if (!modelLoaded || warmedUp) return;

    // Find any mesh to use as dummy for shader compilation
    let dummyMesh: THREE.Object3D | null = null;
    scene.traverse((obj) => {
      if (!dummyMesh && (obj as THREE.Mesh).isMesh) dummyMesh = obj;
    });

    if (dummyMesh) {
      // Set dummy selection and render a few frames to compile shaders
      outlinePassSelected.selectedObjects = [dummyMesh];
      outlinePassHovered.selectedObjects = [dummyMesh];
      for (let i = 0; i < 3; i++) composer.render();
      outlinePassSelected.selectedObjects = [];
      outlinePassHovered.selectedObjects = [];
      composer.render();
    }

    setWarmedUp(true);
    useSceneStore.getState().setSceneReady(true);
  }, [modelLoaded, warmedUp, scene, composer, outlinePassSelected, outlinePassHovered]);

  useEffect(() => { composer.setSize(size.width, size.height); }, [size, composer]);
  useEffect(() => () => { composer.dispose(); }, [composer]);

  // Update selected — invalidate to trigger render in demand mode
  useEffect(() => {
    if (selectedObjName) {
      const mesh = scene.getObjectByName(selectedObjName);
      outlinePassSelected.selectedObjects = mesh ? [mesh] : [];
    } else {
      outlinePassSelected.selectedObjects = [];
    }
    invalidate();
  }, [selectedObjName, scene, outlinePassSelected]);

  // Hover
  useEffect(() => {
    const unsub = useSceneStore.subscribe((state) => {
      const name = state.hoveredObjName;
      if (name !== hoveredRef.current) {
        hoveredRef.current = name;
        if (name && name !== selectedObjName) {
          const mesh = scene.getObjectByName(name);
          outlinePassHovered.selectedObjects = mesh ? [mesh] : [];
        } else {
          outlinePassHovered.selectedObjects = [];
        }
        invalidate();
      }
    });
    return unsub;
  }, [scene, selectedObjName, outlinePassHovered]);

  // Render via composer ONLY when there's an active outline (selection or hover)
  // When nothing is outlined, skip composer = no double render = ~2x GPU savings
  useFrame(() => {
    if (!warmedUp) return;
    const hasOutline = outlinePassSelected.selectedObjects.length > 0
      || outlinePassHovered.selectedObjects.length > 0;
    if (hasOutline) {
      composer.render();
    }
  }, 1);

  return null;
}
