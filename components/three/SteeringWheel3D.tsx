"use client";

import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "@/lib/utils";

type Props = {
  /** 0..1 through the form — the wheel turns as the line manager progresses. */
  progress: number;
  /** Bump on every answer; the wheel gives a small nudge. */
  nudge: number;
  /** Latest answer was a flagged one — shake, and the rim glows brake red. */
  alert: boolean;
  className?: string;
};

/**
 * A small 3D steering wheel for the form header. three.js is loaded on mount;
 * with reduced motion it renders once and only re-renders on prop changes.
 */
export default function SteeringWheel3D({ progress, nudge, alert, className }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const live = useRef({ progress, nudge, alert, kick: 0, redraw: () => {} });

  useEffect(() => {
    const l = live.current;
    if (nudge !== l.nudge) l.kick = 1;
    Object.assign(l, { progress, nudge, alert });
    l.redraw();
  }, [progress, nudge, alert]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    let cleanup = () => {};

    import("three").then((THREE) => {
      if (disposed) return;
      let renderer: InstanceType<typeof THREE.WebGLRenderer>;
      try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      } catch {
        return;
      }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      host.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
      camera.position.set(0, 0.35, 5);
      camera.lookAt(0, 0, 0);

      scene.add(new THREE.AmbientLight(0xffffff, 0.55));
      const key = new THREE.DirectionalLight(0xffffff, 1.6);
      key.position.set(2, 3, 4);
      scene.add(key);
      const rimLight = new THREE.PointLight(0xff2fb3, 6, 8);
      rimLight.position.set(-2, -1, 2);
      scene.add(rimLight);

      const body = new THREE.MeshStandardMaterial({ color: 0x1a1d23, metalness: 0.35, roughness: 0.45 });
      const neon = new THREE.MeshStandardMaterial({ color: 0xdfe22b, emissive: 0xdfe22b, emissiveIntensity: 1.1 });
      const badge = new THREE.MeshStandardMaterial({ color: 0xf8a51c, emissive: 0xf8a51c, emissiveIntensity: 0.4, metalness: 0.6, roughness: 0.3 });

      const wheel = new THREE.Group();
      wheel.add(new THREE.Mesh(new THREE.TorusGeometry(1, 0.14, 24, 96), body));
      const glow = new THREE.Mesh(new THREE.TorusGeometry(1, 0.03, 8, 128), neon);
      glow.position.z = 0.13;
      wheel.add(glow);
      // Grip marks at 9 & 3 — the position the driver assessment asks for
      for (const x of [-1, 1]) {
        const grip = new THREE.Mesh(new THREE.TorusGeometry(1, 0.155, 16, 24, 0.55), badge);
        grip.rotation.z = x < 0 ? Math.PI - 0.275 : -0.275;
        wheel.add(grip);
      }
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.38, 0.22, 48), body);
      hub.rotation.x = Math.PI / 2;
      hub.position.y = -0.05;
      wheel.add(hub);
      const emblem = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.24, 32), badge);
      emblem.rotation.x = Math.PI / 2;
      emblem.position.y = -0.05;
      wheel.add(emblem);
      const spokeGeo = new THREE.BoxGeometry(0.62, 0.16, 0.1);
      for (const [x, y, rz] of [[-0.62, -0.03, 0], [0.62, -0.03, 0], [0, -0.6, Math.PI / 2]] as const) {
        const s = new THREE.Mesh(spokeGeo, body);
        s.position.set(x, y, 0);
        s.rotation.z = rz;
        wheel.add(s);
      }
      wheel.rotation.x = -0.28;
      scene.add(wheel);

      const resize = () => {
        const { clientWidth: w, clientHeight: h } = host;
        renderer.setSize(w, h, false);
        camera.aspect = w / Math.max(h, 1);
        camera.updateProjectionMatrix();
      };
      resize();
      const ro = new ResizeObserver(resize);
      ro.observe(host);

      const red = new THREE.Color(0xc1272d);
      const lime = new THREE.Color(0xdfe22b);
      const reduced = prefersReducedMotion();
      const clock = new THREE.Clock();
      let angle = 0;
      let raf = 0;

      const draw = (t: number, dt: number) => {
        const l = live.current;
        // One full turn of the wheel across the whole form, plus a gentle idle sway.
        const target = -l.progress * Math.PI * 2 + (reduced ? 0 : Math.sin(t * 0.9) * 0.07);
        angle += (target - angle) * (reduced ? 1 : Math.min(1, dt * 3.5));
        l.kick = Math.max(0, l.kick - dt * 2.2);
        const shake = l.alert ? Math.sin(t * 38) * 0.12 * l.kick : Math.sin(l.kick * Math.PI) * 0.18;
        wheel.rotation.z = angle + shake;
        const c = l.alert ? red : lime;
        neon.color.lerp(c, reduced ? 1 : 0.15);
        neon.emissive.lerp(c, reduced ? 1 : 0.15);
        neon.emissiveIntensity = 1 + l.kick * 1.5;
        renderer.render(scene, camera);
      };

      const loop = () => {
        const dt = Math.min(clock.getDelta(), 0.05);
        draw(clock.elapsedTime, dt);
        raf = requestAnimationFrame(loop);
      };
      if (reduced) {
        live.current.redraw = () => draw(0, 0);
        draw(0, 0);
      } else raf = requestAnimationFrame(loop);

      const onVisibility = () => {
        cancelAnimationFrame(raf);
        if (!document.hidden && !reduced) {
          clock.getDelta();
          raf = requestAnimationFrame(loop);
        }
      };
      document.addEventListener("visibilitychange", onVisibility);

      cleanup = () => {
        cancelAnimationFrame(raf);
        live.current.redraw = () => {};
        document.removeEventListener("visibilitychange", onVisibility);
        ro.disconnect();
        scene.traverse((o) => (o as InstanceType<typeof THREE.Mesh>).geometry?.dispose());
        [body, neon, badge].forEach((m) => m.dispose());
        renderer.dispose();
        renderer.domElement.remove();
      };
    });

    return () => {
      disposed = true;
      cleanup();
    };
  }, []);

  return <div ref={hostRef} aria-hidden className={`[&>canvas]:h-full [&>canvas]:w-full ${className ?? ""}`} />;
}
