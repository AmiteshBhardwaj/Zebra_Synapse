import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";

interface DnaCanvas3DProps {
  progress: number;
}

export const DnaCanvas3D: React.FC<DnaCanvas3DProps> = ({ progress }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(progress);
  progressRef.current = progress;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // 1. Scene & Camera Setup
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x06070a, 0.022);

    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    );
    camera.position.set(0, 0, 20);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    container.appendChild(renderer.domElement);

    // Post-Processing Pipeline (EffectComposer + Bloom)
    const composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(container.clientWidth, container.clientHeight),
      0.65, // bloom strength
      0.45, // bloom radius
      0.22  // bloom threshold
    );
    composer.addPass(bloomPass);

    const outputPass = new OutputPass();
    composer.addPass(outputPass);

    // 2. Lighting System
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
    scene.add(ambientLight);

    const cyanLight = new THREE.PointLight(0x38bdf8, 3.2, 30);
    cyanLight.position.set(-5, 6, 12);
    scene.add(cyanLight);

    const violetLight = new THREE.PointLight(0x818cf8, 2.2, 30);
    violetLight.position.set(7, -6, 12);
    scene.add(violetLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
    keyLight.position.set(0, 10, 16);
    scene.add(keyLight);

    // 3. DNA Double Helix Model
    const dnaGroup = new THREE.Group();
    dnaGroup.position.set(4.8, 0, -1.5);
    dnaGroup.rotation.z = -0.30;
    dnaGroup.rotation.x = 0.08;
    scene.add(dnaGroup);

    const leftStrandGroup = new THREE.Group();
    const rightStrandGroup = new THREE.Group();
    dnaGroup.add(leftStrandGroup);
    dnaGroup.add(rightStrandGroup);

    const basePairCount = 38;
    const strandLength = 19;
    const helixRadius = 2.25;
    const totalTurns = 2.4 * Math.PI * 2;

    const cyanMaterial = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      roughness: 0.25,
      metalness: 0.7,
      emissive: 0x0284c7,
      emissiveIntensity: 0.2,
    });

    const violetMaterial = new THREE.MeshStandardMaterial({
      color: 0x818cf8,
      roughness: 0.25,
      metalness: 0.7,
      emissive: 0x4f46e5,
      emissiveIntensity: 0.2,
    });

    const rungCyanMaterial = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      roughness: 0.3,
      metalness: 0.5,
      emissive: 0x0284c7,
      emissiveIntensity: 0.18,
      transparent: true,
    });

    const rungVioletMaterial = new THREE.MeshStandardMaterial({
      color: 0x818cf8,
      roughness: 0.3,
      metalness: 0.5,
      emissive: 0x4f46e5,
      emissiveIntensity: 0.18,
      transparent: true,
    });

    const nodeSphereGeo = new THREE.SphereGeometry(0.20, 16, 16);
    const halfRungGeo = new THREE.CylinderGeometry(0.05, 0.05, helixRadius, 12);
    halfRungGeo.rotateZ(Math.PI / 2);

    const leftCurvePoints: THREE.Vector3[] = [];
    const rightCurvePoints: THREE.Vector3[] = [];

    const basePairsData: {
      leftHalf: THREE.Mesh;
      rightHalf: THREE.Mesh;
      baseY: number;
      angle: number;
      index: number;
    }[] = [];

    for (let i = 0; i < basePairCount; i++) {
      const t = i / (basePairCount - 1);
      const y = (t - 0.5) * strandLength;
      const angle = t * totalTurns;

      const lx = Math.cos(angle) * helixRadius;
      const lz = Math.sin(angle) * helixRadius;

      const rx = Math.cos(angle + Math.PI) * helixRadius;
      const rz = Math.sin(angle + Math.PI) * helixRadius;

      leftCurvePoints.push(new THREE.Vector3(lx, y, lz));
      rightCurvePoints.push(new THREE.Vector3(rx, y, rz));

      const leftNode = new THREE.Mesh(nodeSphereGeo, cyanMaterial);
      leftNode.position.set(lx, y, lz);
      leftStrandGroup.add(leftNode);

      const rightNode = new THREE.Mesh(nodeSphereGeo, violetMaterial);
      rightNode.position.set(rx, y, rz);
      rightStrandGroup.add(rightNode);

      const leftRung = new THREE.Mesh(halfRungGeo, rungCyanMaterial);
      leftRung.position.set(lx / 2, y, lz / 2);
      leftRung.rotation.y = -angle;
      leftStrandGroup.add(leftRung);

      const rightRung = new THREE.Mesh(halfRungGeo, rungVioletMaterial);
      rightRung.position.set(rx / 2, y, rz / 2);
      rightRung.rotation.y = -(angle + Math.PI);
      rightStrandGroup.add(rightRung);

      basePairsData.push({
        leftHalf: leftRung,
        rightHalf: rightRung,
        baseY: y,
        angle,
        index: i,
      });
    }

    const leftCurve = new THREE.CatmullRomCurve3(leftCurvePoints);
    const rightCurve = new THREE.CatmullRomCurve3(rightCurvePoints);

    const ribbonGeoLeft = new THREE.TubeGeometry(leftCurve, 120, 0.07, 8, false);
    const ribbonGeoRight = new THREE.TubeGeometry(rightCurve, 120, 0.07, 8, false);

    leftStrandGroup.add(new THREE.Mesh(ribbonGeoLeft, cyanMaterial));
    rightStrandGroup.add(new THREE.Mesh(ribbonGeoRight, violetMaterial));

    // 4. Sparse Ambient Dust Particles
    const particleCount = 30;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);

    for (let p = 0; p < particleCount; p++) {
      particlePositions[p * 3] = (Math.random() - 0.5) * 28;
      particlePositions[p * 3 + 1] = (Math.random() - 0.5) * 28;
      particlePositions[p * 3 + 2] = (Math.random() - 0.5) * 28;
    }

    particleGeo.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
    const particles = new THREE.Points(
      particleGeo,
      new THREE.PointsMaterial({
        color: 0x38bdf8,
        size: 0.12,
        transparent: true,
        opacity: 0.28,
        blending: THREE.AdditiveBlending,
      })
    );
    scene.add(particles);

    // 5. Resize Handler
    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
      composer.setSize(container.clientWidth, container.clientHeight);
      bloomPass.resolution.set(container.clientWidth, container.clientHeight);
    };
    window.addEventListener("resize", handleResize);

    // 6. Render Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const render = () => {
      const elapsedTime = clock.getElapsedTime();
      const p = prefersReducedMotion ? 0 : progressRef.current;

      const spinSpeed = prefersReducedMotion ? 0.04 : (1 - p * 0.8) * 0.22;
      dnaGroup.rotation.y = elapsedTime * spinSpeed;

      if (!prefersReducedMotion) {
        const centerShiftProgress = Math.min(1, Math.max(0, (p - 0.25) / 0.4));
        const initialX = Math.min(4.8, Math.max(1.8, camera.aspect * 2.95));
        const currentGroupX = THREE.MathUtils.lerp(initialX, 0, centerShiftProgress);
        dnaGroup.position.x = currentGroupX;
        dnaGroup.rotation.z = THREE.MathUtils.lerp(-0.30, 0, centerShiftProgress);

        const unzipProgress = Math.min(1, Math.max(0, (p - 0.5) / 0.45));
        const maxSplitDistance = 8.2;
        leftStrandGroup.position.x = -unzipProgress * maxSplitDistance;
        rightStrandGroup.position.x = unzipProgress * maxSplitDistance;

        leftStrandGroup.rotation.z = -unzipProgress * 0.28;
        rightStrandGroup.rotation.z = unzipProgress * 0.28;

        basePairsData.forEach(({ leftHalf, rightHalf, baseY }) => {
          const heightFactor = Math.max(0, 1 - Math.abs(baseY) / 10.5);
          const splitOffset = unzipProgress * 2.4 * heightFactor;

          leftHalf.position.x = -splitOffset * 0.5;
          rightHalf.position.x = splitOffset * 0.5;

          const rungMatL = leftHalf.material as THREE.MeshStandardMaterial;
          const rungMatR = rightHalf.material as THREE.MeshStandardMaterial;
          const targetOpacity = Math.max(0.06, 1 - unzipProgress * 1.4 * heightFactor);
          rungMatL.opacity = targetOpacity;
          rungMatR.opacity = targetOpacity;
        });

        const targetZ = 20 - p * 14.5;
        const targetY = -p * 0.3;
        camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetZ, 0.08);
        camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetY, 0.08);
      } else {
        const initialX = Math.min(4.8, Math.max(1.8, camera.aspect * 2.95));
        dnaGroup.position.set(initialX, 0, -1.5);
        dnaGroup.rotation.z = -0.30;
        camera.position.set(0, 0, 20);
      }

      particles.rotation.y = elapsedTime * 0.015;
      particles.rotation.x = Math.sin(elapsedTime * 0.015) * 0.03;

      composer.render();
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
      composer.dispose();
      renderer.dispose();
      scene.clear();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full h-full absolute inset-0 pointer-events-none z-0 [mask-image:linear-gradient(to_bottom,transparent_0%,black_8%,black_88%,transparent_100%)]"
    />
  );
};
