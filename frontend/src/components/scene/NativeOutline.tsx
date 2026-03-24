'use client';

import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useThree, useFrame } from '@react-three/fiber';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { useSceneStore } from '@/lib/sceneStore';

/**
 * Three.js native OutlinePass integrated with R3F.
 * Uses screen-space edge detection — outlines ALL edges including bottom.
 * Renders at priority 1 (after R3F's scene render), overwriting the canvas
 * with its own render + outline overlay.
 */
export default function NativeOutline() {
  const { gl, scene, camera, size } = useThree();
  const selectedObjName = useSceneStore(s => s.selectedObj?.name ?? null);
  const hoveredRef = useRef<string | null>(null);

  // Create composer + passes once
  const { composer, outlinePassSelected, outlinePassHovered } = useMemo(() => {
    const resolution = new THREE.Vector2(size.width, size.height);
    const composer = new EffectComposer(gl);

    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    // Selected outline — green, stronger
    const outlineSelected = new OutlinePass(resolution, scene, camera);
    outlineSelected.visibleEdgeColor.set('#5CE5A0');
    outlineSelected.hiddenEdgeColor.set('#5CE5A0');
    outlineSelected.edgeStrength = 5;
    outlineSelected.edgeThickness = 2;
    outlineSelected.edgeGlow = 0.3;
    outlineSelected.pulsePeriod = 0;
    composer.addPass(outlineSelected);

    // Hovered outline — cyan, subtle
    const outlineHovered = new OutlinePass(resolution, scene, camera);
    outlineHovered.visibleEdgeColor.set('#56CDE7');
    outlineHovered.hiddenEdgeColor.set('#56CDE7');
    outlineHovered.edgeStrength = 3;
    outlineHovered.edgeThickness = 1;
    outlineHovered.edgeGlow = 0.2;
    outlineHovered.pulsePeriod = 0;
    composer.addPass(outlineHovered);

    // OutputPass for correct tone mapping
    composer.addPass(new OutputPass());

    return { composer, outlinePassSelected: outlineSelected, outlinePassHovered: outlineHovered };
  }, [gl, scene, camera]);

  // Resize composer when canvas size changes
  useEffect(() => {
    composer.setSize(size.width, size.height);
  }, [size, composer]);

  // Cleanup
  useEffect(() => {
    return () => { composer.dispose(); };
  }, [composer]);

  // Update selected objects by finding mesh in scene by name
  useEffect(() => {
    if (selectedObjName) {
      const mesh = scene.getObjectByName(selectedObjName);
      outlinePassSelected.selectedObjects = mesh ? [mesh] : [];
    } else {
      outlinePassSelected.selectedObjects = [];
    }
  }, [selectedObjName, scene, outlinePassSelected]);

  // Listen for hover changes from TerminalModel via store
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
      }
    });
    return unsub;
  }, [scene, selectedObjName, outlinePassHovered]);

  // Render with composer (priority 1 — after R3F's default render, overwrites canvas)
  useFrame(() => {
    composer.render();
  }, 1);

  return null;
}
