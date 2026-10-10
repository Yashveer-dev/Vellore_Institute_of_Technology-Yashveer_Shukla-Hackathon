import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";

export interface GeoRiskPin {
  id: string;
  source: string;
  headline: string;
  entity: string;
  country: string;
  city: string;
  lat: number;
  lng: number;
  impactScore: number;
  sentiment: number;
  category: "Geopolitical" | "Credit Event" | "Macroeconomic" | "Merger/Acquisition" | "Product Launch";
}

interface RiskGlobeProps {
  impactScore?: number;
  sentiment?: number;
  pins?: GeoRiskPin[];
  portfolioHub?: { lat: number; lng: number };
}

function latLngToVec3(lat: number, lng: number, r: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta)
  );
}

function categoryColor(cat: GeoRiskPin["category"], impact: number): number {
  if (cat === "Credit Event")       return impact >= 8 ? 0xff2244 : 0xff6644;
  if (cat === "Geopolitical")       return 0xff3300;
  if (cat === "Macroeconomic")      return 0xffaa00;
  if (cat === "Merger/Acquisition") return 0x00e5ff;
  if (cat === "Product Launch")     return 0x00e676;
  return 0xffffff;
}

export const RiskGlobe: React.FC<RiskGlobeProps> = ({
  impactScore = 5,
  sentiment  = 0,
  pins       = [],
  portfolioHub = { lat: 19.076, lng: 72.877 },
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rotationYRef = useRef<number>(0);
  const rotationXRef = useRef<number>(0.2);
  const isDraggingRef = useRef<boolean>(false);
  const lastMousePos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const [tooltip, setTooltip] = useState<{
    visible: boolean; x: number; y: number; pin: GeoRiskPin | null;
  }>({ visible: false, x: 0, y: 0, pin: null });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const W = container.clientWidth  || 480;
    const H = container.clientHeight || 380;
    const GLOBE_R = 75;

    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, W / H, 0.1, 1000);
    camera.position.z = 220;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const globeGroup = new THREE.Group();
    globeGroup.rotation.z = 23.4 * (Math.PI / 180); // Earth axial tilt
    globeGroup.rotation.y = rotationYRef.current;
    globeGroup.rotation.x = rotationXRef.current;
    scene.add(globeGroup);

    // Deep ocean base
    const shellGeo = new THREE.SphereGeometry(GLOBE_R, 64, 64);
    const shellMat = new THREE.MeshBasicMaterial({ color: 0x030712, transparent: true, opacity: 0.98 });
    globeGroup.add(new THREE.Mesh(shellGeo, shellMat));

    // Latitude & Longitude grid lines
    const gridGeo = new THREE.SphereGeometry(GLOBE_R + 0.3, 36, 18);
    const gridMat = new THREE.MeshBasicMaterial({ color: 0x1e3a8a, wireframe: true, transparent: true, opacity: 0.25 });
    globeGroup.add(new THREE.Mesh(gridGeo, gridMat));

    // Load texture and sample pixels to generate picture-accurate landmass dots
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load("/world-dots.png", (texture) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = texture.image;
      if (!ctx || !img) return;

      canvas.width = 1024;
      canvas.height = 512;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

      const dots: [number, number][] = [];
      const step = 8; // Sampling density

      for (let y = 0; y < canvas.height; y += step) {
        for (let x = 0; x < canvas.width; x += step) {
          const idx = (y * canvas.width + x) * 4;
          const r = imgData[idx];
          // If pixel is dark (landmass dot in reference image)
          if (r < 100) {
            const lng = (x / canvas.width) * 360 - 180;
            const lat = 90 - (y / canvas.height) * 180;
            dots.push([lat, lng]);
          }
        }
      }

      const dotGeo = new THREE.BufferGeometry();
      const dotPos = new Float32Array(dots.length * 3);
      dots.forEach(([lat, lng], i) => {
        const v = latLngToVec3(lat, lng, GLOBE_R + 0.6);
        dotPos[i * 3]     = v.x;
        dotPos[i * 3 + 1] = v.y;
        dotPos[i * 3 + 2] = v.z;
      });
      dotGeo.setAttribute("position", new THREE.BufferAttribute(dotPos, 3));
      const dotMat = new THREE.PointsMaterial({ size: 2.2, color: 0x38bdf8, transparent: true, opacity: 0.95 });
      globeGroup.add(new THREE.Points(dotGeo, dotMat));
    });

    const pinMeshes: THREE.Mesh[] = [];
    const pulseRings: { mesh: THREE.Mesh; phase: number; speed: number; baseOpacity: number }[] = [];
    const arcLines:   THREE.Line[]  = [];
    const hubVec = latLngToVec3(portfolioHub.lat, portfolioHub.lng, GLOBE_R + 1.0);

    pins.forEach((pin, idx) => {
      const col = categoryColor(pin.category, pin.impactScore);
      const pos = latLngToVec3(pin.lat, pin.lng, GLOBE_R + 1.0);

      const spikeHeight = 4 + pin.impactScore * 0.6;
      const spikeGeo = new THREE.CylinderGeometry(0.3, 1.0, spikeHeight, 8);
      const spikeMat = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.95 });
      const spike = new THREE.Mesh(spikeGeo, spikeMat);

      spike.position.copy(pos);
      spike.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), pos.clone().normalize());
      spike.translateY(spikeHeight / 2);

      (spike as any)._pinData = pin;
      pinMeshes.push(spike);
      globeGroup.add(spike);

      const ringGeo = new THREE.RingGeometry(0.8, 2.5, 32);
      const ringMat = new THREE.MeshBasicMaterial({ color: col, side: THREE.DoubleSide, transparent: true, opacity: 0.8 });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.copy(pos.clone().multiplyScalar((GLOBE_R + 1.2) / GLOBE_R));
      ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), pos.clone().normalize());
      
      pulseRings.push({ mesh: ring, phase: idx * 0.6, speed: 0.035, baseOpacity: 0.8 });
      globeGroup.add(ring);

      if (pin.impactScore >= 7) {
        const arcPoints: THREE.Vector3[] = [];
        const segs = 50;
        for (let s = 0; s <= segs; s++) {
          const f = s / segs;
          const mid = pos.clone().lerp(hubVec, f).normalize().multiplyScalar(GLOBE_R + 5 + Math.sin(f * Math.PI) * 20);
          arcPoints.push(mid);
        }
        const arcGeo = new THREE.BufferGeometry().setFromPoints(arcPoints);
        const arcMat = new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: 0.75 });
        const arc = new THREE.Line(arcGeo, arcMat);
        arcLines.push(arc);
        globeGroup.add(arc);
      }
    });

    const hubGeo = new THREE.SphereGeometry(2.8, 16, 16);
    const hubMat = new THREE.MeshBasicMaterial({ color: 0xffd700, transparent: true, opacity: 0.95 });
    const hubMesh = new THREE.Mesh(hubGeo, hubMat);
    hubMesh.position.copy(hubVec);
    globeGroup.add(hubMesh);

    const onMouseDown = (e: MouseEvent) => {
      isDraggingRef.current = true;
      lastMousePos.current = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      isDraggingRef.current = false;
    };

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const nx = (e.clientX - rect.left) / rect.width;
      const ny = (e.clientY - rect.top) / rect.height;
      mouse.set(nx * 2 - 1, -(ny * 2 - 1));

      if (isDraggingRef.current) {
        const deltaX = e.clientX - lastMousePos.current.x;
        const deltaY = e.clientY - lastMousePos.current.y;

        globeGroup.rotation.y += deltaX * 0.008;
        globeGroup.rotation.x += deltaY * 0.008;

        rotationYRef.current = globeGroup.rotation.y;
        rotationXRef.current = globeGroup.rotation.x;

        lastMousePos.current = { x: e.clientX, y: e.clientY };
      }

      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(pinMeshes, false);
      if (hits.length > 0) {
        container.style.cursor = "pointer";
        setTooltip({ visible: true, x: e.clientX - rect.left, y: e.clientY - rect.top, pin: (hits[0].object as any)._pinData });
      } else {
        container.style.cursor = isDraggingRef.current ? "grabbing" : "grab";
        setTooltip(t => ({ ...t, visible: false }));
      }
    };

    container.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);
    container.addEventListener("mousemove", onMouseMove);

    let animId: number;
    let t = 0;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      t += 0.016;
      
      if (!isDraggingRef.current) {
        globeGroup.rotation.y += 0.0015;
        rotationYRef.current = globeGroup.rotation.y;
      }

      pulseRings.forEach(({ mesh, phase, speed, baseOpacity }) => {
        const sc = 1 + 2.2 * ((Math.sin((t + phase) * speed * 60) + 1) / 2);
        mesh.scale.setScalar(sc);
        (mesh.material as THREE.MeshBasicMaterial).opacity = baseOpacity * (1 - (sc - 1) / 2.2);
      });

      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(animId);
      container.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
      container.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
    };
  }, [pins, impactScore, sentiment, portfolioHub]);

  return (
    <div ref={containerRef} className="w-full h-full min-h-[380px] relative cursor-grab active:cursor-grabbing">
      {tooltip.visible && tooltip.pin && (
        <div className="absolute z-50 p-3 rounded-xl border border-white/20 bg-black/85 text-xs font-mono text-white shadow-2xl pointer-events-none"
             style={{ left: tooltip.x + 10, top: tooltip.y - 10 }}>
          <div className="text-sky-400 font-semibold mb-1">📍 {tooltip.pin.city}, {tooltip.pin.country}</div>
          <div className="text-slate-300 text-[11px] max-w-[200px] mb-2">{tooltip.pin.headline}</div>
          <div className="flex justify-between text-[10px] text-slate-400">
            <span>Impact: {tooltip.pin.impactScore}/10</span>
            <span className={tooltip.pin.sentiment < 0 ? "text-rose-400" : "text-emerald-400"}>
              Sentiment: {tooltip.pin.sentiment}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};