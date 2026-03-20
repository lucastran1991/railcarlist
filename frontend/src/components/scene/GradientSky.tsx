'use client';

import { useMemo } from 'react';
import * as THREE from 'three';

export default function GradientSky() {
  const { geometry, material } = useMemo(() => {
    const geo = new THREE.PlaneGeometry(500, 300);
    const mat = new THREE.ShaderMaterial({
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
    return { geometry: geo, material: mat };
  }, []);

  return <mesh geometry={geometry} material={material} position={[0, 50, -120]} />;
}
