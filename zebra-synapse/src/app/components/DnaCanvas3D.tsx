import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";

interface DnaCanvas3DProps {
  progress?: number;
  progressRef?: React.RefObject<number>;
}

export const DnaCanvas3D: React.FC<DnaCanvas3DProps> = ({ progress = 0, progressRef: externalProgressRef }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const internalProgressRef = useRef(progress);
  internalProgressRef.current = progress;

  const getProgress = () => {
    if (externalProgressRef && typeof externalProgressRef.current === "number") {
      return externalProgressRef.current;
    }
    return internalProgressRef.current;
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // 1. Scene & Camera Setup
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x04060a, 0.018);

    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    );
    camera.position.set(0, 0, 20);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;

    container.appendChild(renderer.domElement);

    // Post-Processing Pipeline (EffectComposer + Bloom at 0.5x resolution for 120fps GPU performance)
    const composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(Math.floor(container.clientWidth * 0.5), Math.floor(container.clientHeight * 0.5)),
      0.75, // Bloom strength for bioluminescent spark
      0.45, // Bloom radius
      0.20  // Bloom threshold
    );
    composer.addPass(bloomPass);

    const outputPass = new OutputPass();
    composer.addPass(outputPass);

    // 2. Bioluminescent Lighting System
    const ambientLight = new THREE.AmbientLight(0x0f172a, 1.0);
    scene.add(ambientLight);

    // Cyan Key Light
    const cyanLight = new THREE.PointLight(0x38bdf8, 5.0, 35);
    cyanLight.position.set(-6, 8, 14);
    scene.add(cyanLight);

    // Deep Electric Blue Fill
    const blueLight = new THREE.PointLight(0x0284c7, 4.0, 30);
    blueLight.position.set(8, -8, 12);
    scene.add(blueLight);

    // Sharp Rim Light for Crystal Highlights
    const rimLight = new THREE.DirectionalLight(0xe0f2fe, 3.0);
    rimLight.position.set(0, 15, -5);
    scene.add(rimLight);

    // Camera Light for Direct Reflection
    const camLight = new THREE.PointLight(0x7dd3fc, 2.5, 25);
    camera.add(camLight);
    scene.add(camera);

    // 3. Ultra-Fast Standard Materials (High Specular & Emissive Glow, 0 Framebuffer Overhead)
    const glassMaterialLeft = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      roughness: 0.15,
      metalness: 0.7,
      emissive: 0x0284c7,
      emissiveIntensity: 0.45,
    });

    const glassMaterialRight = new THREE.MeshStandardMaterial({
      color: 0x7dd3fc,
      roughness: 0.15,
      metalness: 0.7,
      emissive: 0x0369a1,
      emissiveIntensity: 0.45,
    });

    const nodeGlassMat = new THREE.MeshStandardMaterial({
      color: 0xbae6fd,
      roughness: 0.1,
      metalness: 0.8,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.7,
    });

    const rungCoreMaterial = new THREE.MeshBasicMaterial({
      color: 0xf0f9ff,
    });

    const sparkLineMaterial = new THREE.LineBasicMaterial({
      color: 0x7dd3fc,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
    });

    // 4. Main DNA Double Helix Model
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
    const strandLength = 20;
    const helixRadius = 2.4;
    const totalTurns = 2.5 * Math.PI * 2;

    const nodeSphereGeo = new THREE.SphereGeometry(0.24, 16, 16);
    const outerRungGeo = new THREE.CylinderGeometry(0.06, 0.06, helixRadius, 10);
    outerRungGeo.rotateZ(Math.PI / 2);
    const innerRungCoreGeo = new THREE.CylinderGeometry(0.02, 0.02, helixRadius * 0.95, 6);
    innerRungCoreGeo.rotateZ(Math.PI / 2);

    const leftCurvePoints: THREE.Vector3[] = [];
    const rightCurvePoints: THREE.Vector3[] = [];

    const basePairsData: {
      leftHalf: THREE.Group;
      rightHalf: THREE.Group;
      baseY: number;
      angle: number;
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

      // Left Node Sphere
      const leftNode = new THREE.Mesh(nodeSphereGeo, nodeGlassMat);
      leftNode.position.set(lx, y, lz);
      leftStrandGroup.add(leftNode);

      // Right Node Sphere
      const rightNode = new THREE.Mesh(nodeSphereGeo, nodeGlassMat);
      rightNode.position.set(rx, y, rz);
      rightStrandGroup.add(rightNode);

      // Rungs with Shared Materials (0 Clones for Fast Draw Calls)
      const leftRungGroup = new THREE.Group();
      const leftRungMesh = new THREE.Mesh(outerRungGeo, glassMaterialLeft);
      const leftRungCore = new THREE.Mesh(innerRungCoreGeo, rungCoreMaterial);
      leftRungGroup.add(leftRungMesh, leftRungCore);
      leftRungGroup.position.set(lx / 2, y, lz / 2);
      leftRungGroup.rotation.y = -angle;
      leftStrandGroup.add(leftRungGroup);

      const rightRungGroup = new THREE.Group();
      const rightRungMesh = new THREE.Mesh(outerRungGeo, glassMaterialRight);
      const rightRungCore = new THREE.Mesh(innerRungCoreGeo, rungCoreMaterial);
      rightRungGroup.add(rightRungMesh, rightRungCore);
      rightRungGroup.position.set(rx / 2, y, rz / 2);
      rightRungGroup.rotation.y = -(angle + Math.PI);
      rightStrandGroup.add(rightRungGroup);

      basePairsData.push({
        leftHalf: leftRungGroup,
        rightHalf: rightRungGroup,
        baseY: y,
        angle,
      });
    }

    const leftCurve = new THREE.CatmullRomCurve3(leftCurvePoints);
    const rightCurve = new THREE.CatmullRomCurve3(rightCurvePoints);

    // Main Glass Tube Geometry for Helix Strands
    const ribbonGeoLeft = new THREE.TubeGeometry(leftCurve, 140, 0.09, 12, false);
    const ribbonGeoRight = new THREE.TubeGeometry(rightCurve, 140, 0.09, 12, false);

    leftStrandGroup.add(new THREE.Mesh(ribbonGeoLeft, glassMaterialLeft));
    rightStrandGroup.add(new THREE.Mesh(ribbonGeoRight, glassMaterialRight));

    // 5. Electric Synapse Arc Spark Lines (Wave Filaments around the DNA)
    const arcCount = 4;
    const arcLines: THREE.Line[] = [];
    const arcGeometries: THREE.BufferGeometry[] = [];

    for (let a = 0; a < arcCount; a++) {
      const pointCount = 100;
      const positions = new Float32Array(pointCount * 3);
      const arcGeo = new THREE.BufferGeometry();
      arcGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));

      const arcLine = new THREE.Line(arcGeo, sparkLineMaterial);
      dnaGroup.add(arcLine);
      arcLines.push(arcLine);
      arcGeometries.push(arcGeo);
    }

    // 6. Detailed Background DNA Helixes (Matching Top-Middle & Bottom-Right of Reference Image)
    const createBackgroundHelix = (posX: number, posY: number, posZ: number, scale: number, rotZ: number, turns = 2) => {
      const bgGroup = new THREE.Group();
      bgGroup.position.set(posX, posY, posZ);
      bgGroup.scale.setScalar(scale);
      bgGroup.rotation.z = rotZ;

      const bgPointsL: THREE.Vector3[] = [];
      const bgPointsR: THREE.Vector3[] = [];
      const bgCount = 24;
      const strandLen = 14;

      const bgStrandMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.28,
      });

      const bgRungMat = new THREE.MeshBasicMaterial({
        color: 0x7dd3fc,
        transparent: true,
        opacity: 0.22,
      });

      const nodeGeo = new THREE.SphereGeometry(0.15, 8, 8);
      const rungGeo = new THREE.CylinderGeometry(0.03, 0.03, 1.6, 6);
      rungGeo.rotateZ(Math.PI / 2);

      for (let i = 0; i < bgCount; i++) {
        const t = i / (bgCount - 1);
        const y = (t - 0.5) * strandLen;
        const angle = t * Math.PI * 2 * turns;
        const lx = Math.cos(angle) * 1.6;
        const lz = Math.sin(angle) * 1.6;
        const rx = Math.cos(angle + Math.PI) * 1.6;
        const rz = Math.sin(angle + Math.PI) * 1.6;

        bgPointsL.push(new THREE.Vector3(lx, y, lz));
        bgPointsR.push(new THREE.Vector3(rx, y, rz));

        // Background Node Spheres
        const nodeL = new THREE.Mesh(nodeGeo, bgStrandMat);
        nodeL.position.set(lx, y, lz);
        bgGroup.add(nodeL);

        const nodeR = new THREE.Mesh(nodeGeo, bgStrandMat);
        nodeR.position.set(rx, y, rz);
        bgGroup.add(nodeR);

        // Background Rung
        const rung = new THREE.Mesh(rungGeo, bgRungMat);
        rung.position.set(0, y, 0);
        rung.rotation.y = -angle;
        bgGroup.add(rung);
      }

      const curveL = new THREE.CatmullRomCurve3(bgPointsL);
      const curveR = new THREE.CatmullRomCurve3(bgPointsR);

      bgGroup.add(new THREE.Mesh(new THREE.TubeGeometry(curveL, 50, 0.04, 6, false), bgStrandMat));
      bgGroup.add(new THREE.Mesh(new THREE.TubeGeometry(curveR, 50, 0.04, 6, false), bgStrandMat));
      scene.add(bgGroup);
      return bgGroup;
    };

    // Top-Middle Background DNA (Matching top of reference image)
    const bgHelixTop = createBackgroundHelix(1.5, 9.5, -9, 0.55, -0.6, 2.2);

    // Bottom-Right Background DNA (Matching bottom of reference image)
    const bgHelixBottom = createBackgroundHelix(9.0, -8.0, -11, 0.6, 0.35, 2.0);

    // Left Background DNA
    const bgHelixLeft = createBackgroundHelix(-13.0, -3.0, -13, 0.5, 0.5, 1.8);

    // 7. Frequency Signal Wave Graph Lines (Matching mid-left & mid-right graph lines in reference image)
    const createSignalGraph = (posX: number, posY: number, posZ: number, rotZ: number) => {
      const graphGroup = new THREE.Group();
      graphGroup.position.set(posX, posY, posZ);
      graphGroup.rotation.z = rotZ;

      const pointCount = 60;
      const positions = new Float32Array(pointCount * 3);
      for (let i = 0; i < pointCount; i++) {
        const t = i / (pointCount - 1);
        const x = (t - 0.5) * 12;
        // ECG / Signal spike frequency function
        const spike = Math.exp(-Math.pow((t - 0.5) * 6, 2)) * Math.sin(t * 35) * 1.8;
        const baseWave = Math.sin(t * 8) * 0.3;
        positions[i * 3] = x;
        positions[i * 3 + 1] = spike + baseWave;
        positions[i * 3 + 2] = 0;
      }

      const graphGeo = new THREE.BufferGeometry();
      graphGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));

      const graphMat = new THREE.LineBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.35,
        blending: THREE.AdditiveBlending,
      });

      const line = new THREE.Line(graphGeo, graphMat);
      graphGroup.add(line);

      // Add signal node points at wave peaks
      const peakGeo = new THREE.SphereGeometry(0.08, 6, 6);
      const peakMat = new THREE.MeshBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.5 });
      for (let p = 5; p < pointCount; p += 8) {
        const peakMesh = new THREE.Mesh(peakGeo, peakMat);
        peakMesh.position.set(positions[p * 3], positions[p * 3 + 1], positions[p * 3 + 2]);
        graphGroup.add(peakMesh);
      }

      scene.add(graphGroup);
      return graphGroup;
    };

    const signalGraph1 = createSignalGraph(-7.5, 3.5, -6, 0.45);
    const signalGraph2 = createSignalGraph(6.5, -3.0, -8, -0.35);

    // 8. Out-of-Focus Glowing Bokeh Orbs (Matching spherical background light orbs)
    const orbGroup = new THREE.Group();
    scene.add(orbGroup);
    const orbCount = 14;
    const orbMeshes: THREE.Mesh[] = [];

    const orbGeo = new THREE.SphereGeometry(1, 14, 14);
    const orbMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.16,
      blending: THREE.AdditiveBlending,
    });

    for (let o = 0; o < orbCount; o++) {
      const orb = new THREE.Mesh(orbGeo, orbMat);
      const scale = 0.3 + Math.random() * 0.9;
      orb.scale.setScalar(scale);
      orb.position.set(
        (Math.random() - 0.5) * 36,
        (Math.random() - 0.5) * 28,
        -5 - Math.random() * 16
      );
      orbGroup.add(orb);
      orbMeshes.push(orb);
    }

    // 9. Ambient Glowing Bio-Dust Particles
    const particleCount = 120;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);

    for (let p = 0; p < particleCount; p++) {
      particlePositions[p * 3] = (Math.random() - 0.5) * 36;
      particlePositions[p * 3 + 1] = (Math.random() - 0.5) * 36;
      particlePositions[p * 3 + 2] = (Math.random() - 0.5) * 32;
    }

    particleGeo.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
    const particles = new THREE.Points(
      particleGeo,
      new THREE.PointsMaterial({
        color: 0x7dd3fc,
        size: 0.16,
        transparent: true,
        opacity: 0.45,
        blending: THREE.AdditiveBlending,
      })
    );
    scene.add(particles);

    // 8. Resize Handler
    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
      composer.setSize(container.clientWidth, container.clientHeight);
      bloomPass.resolution.set(container.clientWidth, container.clientHeight);
    };
    window.addEventListener("resize", handleResize);

    // 9. Render & Animation Loop
    let animationFrameId: number;
    const clock = new THREE.Clock();
    let smoothedProgress = getProgress();

    const render = () => {
      const delta = Math.min(clock.getDelta(), 0.1); // Cap delta to prevent huge jumps on tab switch
      const elapsedTime = clock.getElapsedTime();

      // Exponential damping for silky smooth progress tracking independent of refresh rate
      const targetProgress = prefersReducedMotion ? 0 : getProgress();
      const dampSpeed = 5.5;
      smoothedProgress += (targetProgress - smoothedProgress) * (1 - Math.exp(-dampSpeed * delta));

      const p = smoothedProgress;

      const spinSpeed = prefersReducedMotion ? 0.03 : (1 - p * 0.75) * 0.22;
      dnaGroup.rotation.y += delta * spinSpeed;
      bgHelixTop.rotation.y -= delta * 0.25;
      bgHelixBottom.rotation.y += delta * 0.20;
      bgHelixLeft.rotation.y -= delta * 0.15;
      orbGroup.rotation.y += delta * 0.02;

      // Update Electric Synapse Spark Lines (Smooth Plasma Flow)
      arcGeometries.forEach((arcGeo, idx) => {
        const posAttr = arcGeo.attributes.position as THREE.BufferAttribute;
        const positions = posAttr.array as Float32Array;
        const pointCount = positions.length / 3;
        const arcPhase = elapsedTime * 2.2 + idx * (Math.PI / 2);
        const radiusOffset = 2.6 + Math.sin(elapsedTime * 1.5 + idx) * 0.25;

        for (let i = 0; i < pointCount; i++) {
          const t = i / (pointCount - 1);
          const y = (t - 0.5) * strandLength;
          const angle = t * totalTurns * 1.1 + arcPhase + (idx * Math.PI) / 2;

          // Dual-harmonic smooth plasma wave instead of harsh jitter noise
          const wave1 = Math.sin(t * 12 + elapsedTime * 3 + idx) * 0.12;
          const wave2 = Math.cos(t * 6 - elapsedTime * 2 + idx) * 0.08;
          const plasmaOffset = wave1 + wave2;

          positions[i * 3] = Math.cos(angle) * (radiusOffset + plasmaOffset);
          positions[i * 3 + 1] = y;
          positions[i * 3 + 2] = Math.sin(angle) * (radiusOffset + plasmaOffset);
        }
        posAttr.needsUpdate = true;
      });

      if (!prefersReducedMotion) {
        const smoothstep = (min: number, max: number, value: number) => {
          const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
          return x * x * (3 - 2 * x);
        };

        // Scroll & Center Shift Integration with smooth dampening
        const centerShiftProgress = smoothstep(0.08, 0.48, p);
        const initialX = Math.min(4.8, Math.max(1.8, camera.aspect * 2.95));
        const targetGroupX = THREE.MathUtils.lerp(initialX, 0, centerShiftProgress);
        const targetRotZ = THREE.MathUtils.lerp(-0.30, 0, centerShiftProgress);

        dnaGroup.position.x += (targetGroupX - dnaGroup.position.x) * (1 - Math.exp(-9 * delta));
        dnaGroup.rotation.z += (targetRotZ - dnaGroup.rotation.z) * (1 - Math.exp(-9 * delta));

        // Unzipping Animation on Scroll (Smoothly synced between 0.30 and 0.90 progress)
        const unzipProgress = smoothstep(0.30, 0.90, p);
        const maxSplitDistance = 8.5;
        const targetSplitX = unzipProgress * maxSplitDistance;
        const targetSplitRotZ = unzipProgress * 0.26;

        leftStrandGroup.position.x += (-targetSplitX - leftStrandGroup.position.x) * (1 - Math.exp(-9 * delta));
        rightStrandGroup.position.x += (targetSplitX - rightStrandGroup.position.x) * (1 - Math.exp(-9 * delta));

        leftStrandGroup.rotation.z += (-targetSplitRotZ - leftStrandGroup.rotation.z) * (1 - Math.exp(-9 * delta));
        rightStrandGroup.rotation.z += (targetSplitRotZ - rightStrandGroup.rotation.z) * (1 - Math.exp(-9 * delta));

        basePairsData.forEach(({ leftHalf, rightHalf, baseY }) => {
          const heightFactor = Math.max(0, 1 - Math.abs(baseY) / 11);
          const splitOffset = unzipProgress * 2.5 * heightFactor;

          leftHalf.position.x = -splitOffset * 0.5;
          rightHalf.position.x = splitOffset * 0.5;

          const scaleFactor = Math.max(0.1, 1 - unzipProgress * 1.2 * heightFactor);
          leftHalf.scale.setScalar(scaleFactor);
          rightHalf.scale.setScalar(scaleFactor);
        });

        const targetCamZ = 20 - p * 14.5;
        const targetCamY = -p * 0.3;
        camera.position.z += (targetCamZ - camera.position.z) * (1 - Math.exp(-6 * delta));
        camera.position.y += (targetCamY - camera.position.y) * (1 - Math.exp(-6 * delta));
      } else {
        const initialX = Math.min(4.8, Math.max(1.8, camera.aspect * 2.95));
        dnaGroup.position.set(initialX, 0, -1.5);
        dnaGroup.rotation.z = -0.30;
        camera.position.set(0, 0, 20);
      }

      particles.rotation.y += delta * 0.04;
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


