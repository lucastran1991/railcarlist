'use client';

import { useRef, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';
import { ThreeEvent } from '@react-three/fiber';
import type { ClickedObject } from '@/lib/three/types';

// PBR materials
const tankMat = new THREE.MeshPhysicalMaterial({
  color: 0xdddddd, roughness: 0.25, metalness: 0.8,
  clearcoat: 0.3, clearcoatRoughness: 0.2, envMapIntensity: 1.0,
});
const buildingMat = new THREE.MeshPhysicalMaterial({
  color: 0xaabbcc, roughness: 0.5, metalness: 0.1, envMapIntensity: 0.5,
});
const outlineShellMat = new THREE.MeshBasicMaterial({
  color: 0xff6a00, side: THREE.BackSide, transparent: true, opacity: 0.95,
  depthTest: true, depthWrite: false,
});
const outlineEdgeMat = new THREE.LineBasicMaterial({
  color: 0xff6a00, transparent: true, opacity: 1.0,
});

function isClickableNode(name: string, verts: number): boolean {
  if (name.includes('GOOGLE_SAT') || name.includes('EXPORT_GOOGLE')) return false;
  if (name === 'Cube') return false;
  return verts > 4;
}

function getObjectType(verts: number): 'tank' | 'building' {
  return verts >= 70 ? 'tank' : 'building';
}

interface TerminalModelProps {
  selectedName: string | null;
  onObjectClick: (obj: ClickedObject | null, mesh: THREE.Object3D | null) => void;
}

export default function TerminalModel({ selectedName, onObjectClick }: TerminalModelProps) {
  const { scene } = useGLTF('/models/terminal.glb');
  const groupRef = useRef<THREE.Group>(null);

  // Process model once
  const processedScene = useMemo(() => {
    const clone = scene.clone(true);

    // Remove Cube
    const cube = clone.getObjectByName('Cube');
    if (cube) cube.removeFromParent();

    // Apply materials
    clone.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      const name = obj.name || obj.parent?.name || '';
      if (name.includes('GOOGLE_SAT') || name.includes('EXPORT_GOOGLE')) {
        obj.receiveShadow = true;
        return;
      }
      if (name === 'Cube') return;
      obj.castShadow = true;
      obj.receiveShadow = true;
      const verts = obj.geometry?.attributes?.position?.count || 0;
      obj.material = verts >= 70 ? tankMat.clone() : buildingMat.clone();
    });

    // Compute bounds and center/scale
    const box = new THREE.Box3().setFromObject(clone);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxSpan = Math.max(size.x, size.z);
    const scale = 80 / maxSpan;

    clone.scale.setScalar(scale);
    const scaledBox = new THREE.Box3().setFromObject(clone);
    const scaledCenter = scaledBox.getCenter(new THREE.Vector3());
    clone.position.x -= scaledCenter.x;
    clone.position.z -= scaledCenter.z;

    return clone;
  }, [scene]);

  const handleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    const mesh = e.object;
    if (!(mesh instanceof THREE.Mesh)) return;

    const name = mesh.name || mesh.parent?.name || '';
    const verts = mesh.geometry?.attributes?.position?.count || 0;
    if (!isClickableNode(name, verts)) return;

    const box = new THREE.Box3().setFromObject(mesh);
    const center = box.getCenter(new THREE.Vector3());

    onObjectClick({
      name,
      type: getObjectType(verts),
      verts,
      position: { x: parseFloat(center.x.toFixed(1)), y: parseFloat(center.y.toFixed(1)), z: parseFloat(center.z.toFixed(1)) },
      screenX: 0, // will be computed by parent
      screenY: 0,
    }, mesh);
  }, [onObjectClick]);

  const handlePointerMissed = useCallback(() => {
    onObjectClick(null, null);
  }, [onObjectClick]);

  return (
    <group ref={groupRef}>
      <primitive
        object={processedScene}
        onClick={handleClick}
        onPointerMissed={handlePointerMissed}
      />
      {/* Render outline for selected object */}
      {selectedName && <SelectionOutline scene={processedScene} targetName={selectedName} />}
    </group>
  );
}

function SelectionOutline({ scene, targetName }: { scene: THREE.Object3D; targetName: string }) {
  const outlineGroup = useMemo(() => {
    let targetMesh: THREE.Mesh | null = null;
    scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        const name = obj.name || obj.parent?.name || '';
        if (name === targetName) targetMesh = obj;
      }
    });
    if (!targetMesh) return null;

    const mesh = targetMesh as THREE.Mesh;
    const group = new THREE.Group();

    // BackSide shell expanded from geometry center
    const shellGeo = mesh.geometry.clone();
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

    // Edge wireframe
    const edgesGeo = new THREE.EdgesGeometry(mesh.geometry, 30);
    const edgeLines = new THREE.LineSegments(edgesGeo, outlineEdgeMat);
    group.add(edgeLines);

    // Copy world transform from target mesh
    mesh.updateWorldMatrix(true, false);
    group.applyMatrix4(mesh.matrixWorld);

    return group;
  }, [scene, targetName]);

  if (!outlineGroup) return null;
  return <primitive object={outlineGroup} />;
}

useGLTF.preload('/models/terminal.glb');
