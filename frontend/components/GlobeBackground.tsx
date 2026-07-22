"use client";
import { useEffect, useRef } from "react";

/**
 * Rotating holographic wireframe globe rendered with Three.js, fixed behind the
 * whole UI. Kept deliberately light (low-poly wireframe + point cloud, capped
 * DPR, pauses when the tab is hidden) so it stays smooth on modest hardware.
 * Three.js is loaded from CDN at runtime to avoid adding a build dependency.
 */
export default function GlobeBackground() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let renderer: any;
    let frame = 0;
    let disposed = false;

    const loadThree = (): Promise<any> =>
      new Promise((resolve, reject) => {
        if ((window as any).THREE) return resolve((window as any).THREE);
        const s = document.createElement("script");
        s.src = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";
        s.onload = () => resolve((window as any).THREE);
        s.onerror = reject;
        document.head.appendChild(s);
      });

    loadThree()
      .then((THREE) => {
        if (disposed) return;
        const w = mount.clientWidth;
        const h = mount.clientHeight;

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
        camera.position.z = 15;

        renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        renderer.setSize(w, h);
        mount.appendChild(renderer.domElement);

        const globe = new THREE.Group();
        scene.add(globe);

        // 1 — glowing wireframe sphere (gold latitude/longitude grid)
        const sphere = new THREE.SphereGeometry(5, 36, 24);
        const wire = new THREE.LineSegments(
          new THREE.WireframeGeometry(sphere),
          new THREE.LineBasicMaterial({ color: 0xe8a33d, transparent: true, opacity: 0.16 }),
        );
        globe.add(wire);

        // 2 — cyan point cloud on the surface ("data nodes")
        const dotGeo = new THREE.BufferGeometry();
        const count = 700;
        const pos = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
          const phi = Math.acos(2 * Math.random() - 1);
          const theta = 2 * Math.PI * Math.random();
          const r = 5.02;
          pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
          pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
          pos[i * 3 + 2] = r * Math.cos(phi);
        }
        dotGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
        const dots = new THREE.Points(
          dotGeo,
          new THREE.PointsMaterial({ color: 0x37d5e5, size: 0.06, transparent: true, opacity: 0.7 }),
        );
        globe.add(dots);

        // 3 — faint outer atmosphere ring
        const ring = new THREE.Mesh(
          new THREE.RingGeometry(6.4, 6.5, 96),
          new THREE.MeshBasicMaterial({ color: 0x37d5e5, transparent: true, opacity: 0.12, side: THREE.DoubleSide }),
        );
        ring.rotation.x = Math.PI / 2.2;
        globe.add(ring);

        globe.rotation.z = 0.35; // axial tilt

        const onResize = () => {
          const nw = mount.clientWidth;
          const nh = mount.clientHeight;
          camera.aspect = nw / nh;
          camera.updateProjectionMatrix();
          renderer.setSize(nw, nh);
        };
        window.addEventListener("resize", onResize);

        const animate = () => {
          if (disposed) return;
          frame = requestAnimationFrame(animate);
          if (document.hidden) return; // save CPU when tab not visible
          globe.rotation.y += 0.0016;
          ring.rotation.z += 0.0009;
          renderer.render(scene, camera);
        };
        animate();

        (renderer as any)._cleanup = () => {
          window.removeEventListener("resize", onResize);
          sphere.dispose();
          dotGeo.dispose();
        };
      })
      .catch(() => {
        /* CDN blocked / offline — background simply stays empty, UI unaffected */
      });

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      if (renderer) {
        renderer._cleanup?.();
        renderer.dispose?.();
        renderer.domElement?.remove();
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 opacity-70"
      style={{ maskImage: "radial-gradient(ellipse 70% 70% at 60% 45%, black 40%, transparent 85%)" }}
    />
  );
}
