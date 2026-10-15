"use client";

import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "@/lib/utils";

/**
 * Landing backdrop — the cover poster's neon road in 3D: a lime grid floor
 * rolling toward the viewer, brake-red and headlight-magenta light streaks
 * on both sides, and the glowing hexagon gate in the distance.
 *
 * three.js is imported on mount so it never lands in the server bundle; with
 * reduced motion a single still frame is drawn. If WebGL is unavailable the
 * CSS grid on <body> is the fallback.
 */
export default function NeonRoad() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    let cleanup = () => {};

    import("three").then((THREE) => {
      if (disposed) return;
      let renderer: InstanceType<typeof THREE.WebGLRenderer>;
      try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
      } catch {
        return;
      }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
      host.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      scene.fog = new THREE.Fog(0x0a0c0f, 12, 70);
      const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 120);
      camera.position.set(0, 1.4, 6);
      camera.lookAt(0, 0.9, -30);

      // Floor grid
      const grid = new THREE.GridHelper(160, 64, 0xdfe22b, 0xdfe22b);
      const gridMat = grid.material as InstanceType<typeof THREE.LineBasicMaterial>;
      gridMat.transparent = true;
      gridMat.opacity = 0.22;
      scene.add(grid);
      const cell = 160 / 64;

      // Lane line down the middle, like the cover's red floor line
      const lane = new THREE.Mesh(
        new THREE.PlaneGeometry(0.08, 160),
        new THREE.MeshBasicMaterial({ color: 0xc1272d, transparent: true, opacity: 0.9 }),
      );
      lane.rotation.x = -Math.PI / 2;
      lane.position.set(0, 0.01, -60);
      scene.add(lane);

      // Hexagon gate
      const hex = new THREE.Group();
      for (const [r, opacity] of [[9, 0.9], [10.2, 0.35], [11.6, 0.15]] as const) {
        const pts = Array.from({ length: 7 }, (_, i) => {
          const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
          return new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r * 0.8, 0);
        });
        hex.add(
          new THREE.Line(
            new THREE.BufferGeometry().setFromPoints(pts),
            new THREE.LineBasicMaterial({ color: 0xdfe22b, transparent: true, opacity }),
          ),
        );
      }
      hex.position.set(0, 5, -48);
      scene.add(hex);

      // Light streaks
      const colors = [0xc1272d, 0xff2fb3, 0xdfe22b, 0xc1272d];
      const streakGeo = new THREE.BoxGeometry(0.05, 0.05, 1);
      const streaks = Array.from({ length: 46 }, (_, i) => {
        const m = new THREE.Mesh(
          streakGeo,
          new THREE.MeshBasicMaterial({ color: colors[i % colors.length], transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending }),
        );
        const side = i % 2 ? 1 : -1;
        m.position.set(side * (3.5 + Math.random() * 9), 0.15 + Math.random() * 3.2, -Math.random() * 80);
        m.scale.z = 2 + Math.random() * 6;
        m.userData.speed = 18 + Math.random() * 30;
        scene.add(m);
        return m;
      });

      const resize = () => {
        const { clientWidth: w, clientHeight: h } = host;
        renderer.setSize(w, h, false);
        camera.aspect = w / Math.max(h, 1);
        camera.updateProjectionMatrix();
      };
      resize();
      const ro = new ResizeObserver(resize);
      ro.observe(host);

      const reduced = prefersReducedMotion();
      const clock = new THREE.Clock();
      let raf = 0;
      const frame = () => {
        const dt = Math.min(clock.getDelta(), 0.05);
        const t = clock.elapsedTime;
        grid.position.z = (t * 9) % cell;
        for (const s of streaks) {
          s.position.z += s.userData.speed * dt;
          if (s.position.z > 8) s.position.z = -80;
        }
        hex.scale.setScalar(1 + Math.sin(t * 1.4) * 0.015);
        ((hex.children[0] as InstanceType<typeof THREE.Line>).material as InstanceType<typeof THREE.LineBasicMaterial>).opacity = 0.7 + Math.sin(t * 2.2) * 0.25;
        renderer.render(scene, camera);
        raf = requestAnimationFrame(frame);
      };
      if (reduced) renderer.render(scene, camera);
      else raf = requestAnimationFrame(frame);

      const onVisibility = () => {
        cancelAnimationFrame(raf);
        if (!document.hidden && !reduced) {
          clock.getDelta();
          raf = requestAnimationFrame(frame);
        }
      };
      document.addEventListener("visibilitychange", onVisibility);

      cleanup = () => {
        cancelAnimationFrame(raf);
        document.removeEventListener("visibilitychange", onVisibility);
        ro.disconnect();
        scene.traverse((o) => {
          const mesh = o as InstanceType<typeof THREE.Mesh>;
          mesh.geometry?.dispose();
          const mat = mesh.material as { dispose?: () => void } | undefined;
          mat?.dispose?.();
        });
        renderer.dispose();
        renderer.domElement.remove();
      };
    });

    return () => {
      disposed = true;
      cleanup();
    };
  }, []);

  return <div ref={hostRef} aria-hidden className="pointer-events-none fixed inset-0 -z-10 [&>canvas]:h-full [&>canvas]:w-full" />;
}
