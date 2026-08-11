import React, { useEffect, useRef } from "react";
import * as THREE from "three";

interface DnaCanvas3DProps {
  /** Scroll progress from 0.0 (top) to 1.0 (fully unzipped & zoomed) */
  progress: number;
}

export const DnaCanvas3D: React.FC<DnaCanvas3DProps> = ({ progress }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(progress);
  progressRef.current = progress;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // --- 1. Scene Setup ---
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000000, 0.025);

    const camera = new THREE.PerspectiveCamera(
      50,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    );
    camera.position.set(0, 0, 18);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;

    container.appendChild(renderer.domElement);

    // --- 2. Lighting ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const cyanPointLight = new THREE.PointLight(0x60d4ff, 4, 30);
    cyanPointLight.position.set(-6, 4, 10);
    scene.add(cyanPointLight);

    const amberPointLight = new THREE.PointLight(0xff7a33, 4, 30);
    amberPointLight.position.set(6, -4, 10);
    scene.add(amberPointLight);

    const frontWhiteLight = new THREE.DirectionalLight(0xffffff, 1.5);
    frontWhiteLight.position.set(0, 10, 15);
    scene.add(frontWhiteLight);

    // --- 3. DNA Model Construction ---
    const dnaGroup = new THREE.Group();
    scene.add(dnaGroup);

    const leftStrandGroup = new THREE.Group();
    const rightStrandGroup = new THREE.Group();
    dnaGroup.add(leftStrandGroup);
    dnaGroup.add(rightStrandGroup);

    const basePairCount = 36;
    const strandLength = 22; // total Y height range (-11 to +11)
    const helixRadius = 2.4;
    const totalTurns = 2.2 * Math.PI * 2;

    // Materials
    const cyanMaterial = new THREE.MeshStandardMaterial({
      color: 0x60d4ff,
      roughness: 0.2,
      metalness: 0.8,
      emissive: 0x0055aa,
      emissiveIntensity: 0.6,
    });

    const amberMaterial = new THREE.MeshStandardMaterial({
      color: 0xff7a33,
      roughness: 0.2,
      metalness: 0.8,
      emissive: 0xaa3300,
      emissiveIntensity: 0.6,
    });

    const rungCyanMaterial = new THREE.MeshStandardMaterial({
      color: 0x80e0ff,
      roughness: 0.3,
      metalness: 0.5,
      emissive: 0x0088cc,
      emissiveIntensity: 0.5,
    });

    const rungAmberMaterial = new THREE.MeshStandardMaterial({
      color: 0xffa466,
      roughness: 0.3,
      metalness: 0.5,
      emissive: 0xcc4400,
      emissiveIntensity: 0.5,
    });

    // Geometries
    const sphereGeo = new THREE.SphereGeometry(0.38, 16, 16);
    const halfRungGeo = new THREE.CylinderGeometry(0.1, 0.1, helixRadius, 12);
    halfRungGeo.rotateZ(Math.PI / 2); // orient horizontally along X-axis

    // Arrays to hold base pair halves for animation
    const basePairsData: {
      leftHalf: THREE.Mesh;
      rightHalf: THREE.Mesh;
      baseY: number;
      angle: number;
      index: number;
    }[] = [];

    // Store original position offsets for helical layout
    const leftNodes: THREE.Mesh[] = [];
    const rightNodes: THREE.Mesh[] = [];

    for (let i = 0; i < basePairCount; i++) {
      const t = i / (basePairCount - 1);
      const y = (t - 0.5) * strandLength;
      const angle = t * totalTurns;

      const lx = Math.cos(angle) * helixRadius;
      const lz = Math.sin(angle) * helixRadius;

      const rx = Math.cos(angle + Math.PI) * helixRadius;
      const rz = Math.sin(angle + Math.PI) * helixRadius;

      // Left Backbone Sphere Node
      const leftNode = new THREE.Mesh(sphereGeo, cyanMaterial);
      leftNode.position.set(lx, y, lz);
      leftStrandGroup.add(leftNode);
      leftNodes.push(leftNode);

      // Right Backbone Sphere Node
      const rightNode = new THREE.Mesh(sphereGeo, amberMaterial);
      rightNode.position.set(rx, y, rz);
      rightStrandGroup.add(rightNode);
      rightNodes.push(rightNode);

      // Base Pair Nucleotide Rung Halves
      // Left Half Rung (Cyan)
      const leftRung = new THREE.Mesh(halfRungGeo, rungCyanMaterial);
      leftRung.position.set(lx / 2, y, lz / 2);
      leftRung.rotation.y = -angle;
      leftStrandGroup.add(leftRung);

      // Right Half Rung (Amber)
      const rightRung = new THREE.Mesh(halfRungGeo, rungAmberMaterial);
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

    // --- 4. Ambient Glowing Dust Particles ---
    const particleCount = 150;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleScales = new Float32Array(particleCount);

    for (let p = 0; p < particleCount; p++) {
      particlePositions[p * 3] = (Math.random() - 0.5) * 35;
      particlePositions[p * 3 + 1] = (Math.random() - 0.5) * 35;
      particlePositions[p * 3 + 2] = (Math.random() - 0.5) * 35;
      particleScales[p] = Math.random() * 0.4 + 0.1;
    }

    particleGeo.setAttribute(
      "position",
      new THREE.BufferAttribute(particlePositions, 3)
    );

    const particleMat = new THREE.PointsMaterial({
      color: 0x60d4ff,
      size: 0.25,
      transparent: true,
      opacity: 0.7,
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

    // --- 6. Render & Animation Loop ---
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const render = () => {
      const elapsedTime = clock.getElapsedTime();
      const p = progressRef.current; // current scroll ratio (0.0 to 1.0)

      // Continuous DNA rotation at top, slowing down as scroll unzips it
      const spinSpeed = (1 - p * 0.85) * 0.35;
      dnaGroup.rotation.y = elapsedTime * spinSpeed;

      // Split / Unzip Physics
      // Center portion bows outward more dramatically
      const maxSplitDistance = 9.0;

      // Separate Left & Right Strand Groups along X-axis & bow outwards
      leftStrandGroup.position.x = -p * maxSplitDistance;
      rightStrandGroup.position.x = p * maxSplitDistance;

      // Rotate strands slightly outward when splitting for cinematic unzipping angle
      leftStrandGroup.rotation.z = -p * 0.35;
      rightStrandGroup.rotation.z = p * 0.35;

      // Base pairs separation fade & unbind offset
      basePairsData.forEach(({ leftHalf, rightHalf, baseY }) => {
        // Center height base pairs split first and widest
        const heightFactor = Math.max(0, 1 - Math.abs(baseY) / 12);
        const splitOffset = p * 2.8 * heightFactor;

        leftHalf.position.x = (leftNodes[0] ? leftHalf.position.x : 0) - splitOffset * 0.5;
        rightHalf.position.x = (rightNodes[0] ? rightHalf.position.x : 0) + splitOffset * 0.5;

        // Fade opacity of base pair rungs as they unbind
        const rungMatL = leftHalf.material as THREE.MeshStandardMaterial;
        const rungMatR = rightHalf.material as THREE.MeshStandardMaterial;
        rungMatL.opacity = Math.max(0.1, 1 - p * 1.2 * heightFactor);
        rungMatR.opacity = Math.max(0.1, 1 - p * 1.2 * heightFactor);
        rungMatL.transparent = true;
        rungMatR.transparent = true;
      });

      // Camera Z-Axis Zoom & Fly-Through
      // Move from default Z=18 down to Z=2.5 inside the opening pore
      const targetZ = 18 - p * 15.5;
      const targetY = -p * 0.5;
      camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetZ, 0.1);
      camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetY, 0.1);

      // Particle subtle drifting animation
      particles.rotation.y = elapsedTime * 0.04;
      particles.rotation.x = Math.sin(elapsedTime * 0.03) * 0.1;

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
      className="w-full h-full absolute inset-0 pointer-events-none z-0"
    />
  );
};
