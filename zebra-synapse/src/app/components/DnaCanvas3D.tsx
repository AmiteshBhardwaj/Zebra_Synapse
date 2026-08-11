import React, { useEffect, useRef } from "react";
import * as THREE from "three";

interface DnaCanvas3DProps {
  /** Scroll progress from 0.0 (top hero) to 1.0 (fully unzipped & zoomed) */
  progress: number;
}

export const DnaCanvas3D: React.FC<DnaCanvas3DProps> = ({ progress }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(progress);
  progressRef.current = progress;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Check prefers-reduced-motion preference
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // --- 1. Scene & Camera Setup ---
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x06070a, 0.022);

    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    );
    // Initial camera position aligned to right-side 3D stage at p = 0
    camera.position.set(0, 0, 20);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    container.appendChild(renderer.domElement);

    // --- 2. Scientific Lighting System ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
    scene.add(ambientLight);

    // Primary Cyan Point Light
    const cyanLight = new THREE.PointLight(0x38bdf8, 3.2, 30);
    cyanLight.position.set(-5, 6, 12);
    scene.add(cyanLight);

    // Secondary Violet Point Light
    const violetLight = new THREE.PointLight(0x818cf8, 2.2, 30);
    violetLight.position.set(7, -6, 12);
    scene.add(violetLight);

    // Subtle Key Directional Light
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
    keyLight.position.set(0, 10, 16);
    scene.add(keyLight);

    // --- 3. DNA Double Helix Model ---
    const dnaGroup = new THREE.Group();
    // Initial right-stage position shifted further right (x = 4.8) for intentional right-edge bleed
    dnaGroup.position.set(4.8, 0, -1.5);
    dnaGroup.rotation.z = -0.30; // ~17.2° visual tilt along Z axis
    dnaGroup.rotation.x = 0.08;  // restrained X axis tilt
    scene.add(dnaGroup);

    const leftStrandGroup = new THREE.Group();
    const rightStrandGroup = new THREE.Group();
    dnaGroup.add(leftStrandGroup);
    dnaGroup.add(rightStrandGroup);

    const basePairCount = 38;
    const strandLength = 19; // Height range (-9.5 to +9.5)
    const helixRadius = 2.25; // Scaled up ~12% for fuller right-hand visual anchor
    const totalTurns = 2.4 * Math.PI * 2;

    // Cyan / Teal Primary Strand Material (Refrained Emissive)
    const cyanMaterial = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      roughness: 0.25,
      metalness: 0.7,
      emissive: 0x0284c7,
      emissiveIntensity: 0.2,
    });

    // Violet / Indigo Secondary Strand Material (Refrained Emissive)
    const violetMaterial = new THREE.MeshStandardMaterial({
      color: 0x818cf8,
      roughness: 0.25,
      metalness: 0.7,
      emissive: 0x4f46e5,
      emissiveIntensity: 0.2,
    });

    // Base Pair Rung Materials
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

    // Refined Geometries (20-30% Reduced Node Sizes for Refined Sophisticated Look)
    const nodeSphereGeo = new THREE.SphereGeometry(0.20, 16, 16);
    const halfRungGeo = new THREE.CylinderGeometry(0.05, 0.05, helixRadius, 12);
    halfRungGeo.rotateZ(Math.PI / 2); // Orient horizontally along X-axis

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

      // Left Backbone Node Sphere (Cyan)
      const leftNode = new THREE.Mesh(nodeSphereGeo, cyanMaterial);
      leftNode.position.set(lx, y, lz);
      leftStrandGroup.add(leftNode);

      // Right Backbone Node Sphere (Violet)
      const rightNode = new THREE.Mesh(nodeSphereGeo, violetMaterial);
      rightNode.position.set(rx, y, rz);
      rightStrandGroup.add(rightNode);

      // Base Pair Rung Halves (Left Cyan, Right Violet)
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

    // Continuous Backbone Ribbon Tubes
    const leftCurve = new THREE.CatmullRomCurve3(leftCurvePoints);
    const rightCurve = new THREE.CatmullRomCurve3(rightCurvePoints);

    const ribbonGeoLeft = new THREE.TubeGeometry(leftCurve, 120, 0.07, 8, false);
    const ribbonGeoRight = new THREE.TubeGeometry(rightCurve, 120, 0.07, 8, false);

    const leftRibbonMesh = new THREE.Mesh(ribbonGeoLeft, cyanMaterial);
    const rightRibbonMesh = new THREE.Mesh(ribbonGeoRight, violetMaterial);

    leftStrandGroup.add(leftRibbonMesh);
    rightStrandGroup.add(rightRibbonMesh);

    // --- 4. Sparse Ambient Dust Field (30 particles max) ---
    const particleCount = 30;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);

    for (let p = 0; p < particleCount; p++) {
      particlePositions[p * 3] = (Math.random() - 0.5) * 28;
      particlePositions[p * 3 + 1] = (Math.random() - 0.5) * 28;
      particlePositions[p * 3 + 2] = (Math.random() - 0.5) * 28;
    }

    particleGeo.setAttribute(
      "position",
      new THREE.BufferAttribute(particlePositions, 3)
    );

    const particleMat = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 0.12,
      transparent: true,
      opacity: 0.28,
      blending: THREE.AdditiveBlending,
    });

    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // --- 5. Resize Handler ---
    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener("resize", handleResize);

    // --- 6. Render & 8-Phase Scroll Interpolation Loop ---
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const render = () => {
      const elapsedTime = clock.getElapsedTime();
      const p = prefersReducedMotion ? 0 : progressRef.current;

      // Slow, subtle ambient rotation
      const spinSpeed = prefersReducedMotion ? 0.04 : (1 - p * 0.8) * 0.22;
      dnaGroup.rotation.y = elapsedTime * spinSpeed;

      if (!prefersReducedMotion) {
        // 8-Phase Scroll Progression:
        // Phase 1 (0–0.20): Initial state — DNA in right stage space (x = 4.8)
        // Phase 2 (0.20–0.40): Camera approaches DNA (z lerps 20 -> 14)
        // Phase 3 (0.40–0.60): DNA moves toward viewport center (x lerps 4.8 -> 0)
        // Phase 4 & 5 (0.60–0.75): DNA strands unzipping (splitOffset expands)
        // Phase 6 & 7 (0.75–0.90): Base pairs unbind & fade, core opens
        // Phase 8 (0.90–1.00): Full portal reveal

        // Position & tilt transition: Shift from right stage (x=4.8) to center (x=0) as p goes from 0.25 to 0.65
        const centerShiftProgress = Math.min(1, Math.max(0, (p - 0.25) / 0.4));
        const initialX = Math.min(4.8, Math.max(1.8, camera.aspect * 2.95));
        const currentGroupX = THREE.MathUtils.lerp(initialX, 0, centerShiftProgress);
        dnaGroup.position.x = currentGroupX;
        dnaGroup.rotation.z = THREE.MathUtils.lerp(-0.30, 0, centerShiftProgress);

        // Unzip separation factor starting from p >= 0.50
        const unzipProgress = Math.min(1, Math.max(0, (p - 0.5) / 0.45));
        const maxSplitDistance = 8.2;
        leftStrandGroup.position.x = -unzipProgress * maxSplitDistance;
        rightStrandGroup.position.x = unzipProgress * maxSplitDistance;

        leftStrandGroup.rotation.z = -unzipProgress * 0.28;
        rightStrandGroup.rotation.z = unzipProgress * 0.28;

        // Base pair unbinding fade & offset
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

        // Camera Z-Axis Lerp
        const targetZ = 20 - p * 14.5;
        const targetY = -p * 0.3;
        camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetZ, 0.08);
        camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetY, 0.08);
      } else {
        // Static camera & right-stage position for reduced motion
        const initialX = Math.min(4.8, Math.max(1.8, camera.aspect * 2.95));
        dnaGroup.position.set(initialX, 0, -1.5);
        dnaGroup.rotation.z = -0.30;
        camera.position.set(0, 0, 20);
      }

      // Particle slow drift
      particles.rotation.y = elapsedTime * 0.015;
      particles.rotation.x = Math.sin(elapsedTime * 0.015) * 0.03;

      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    // Cleanup
    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
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
