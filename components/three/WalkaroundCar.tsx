"use client";

import { useEffect, useRef } from "react";
import type * as T from "three";
import type { CarPart } from "@/lib/question-visuals";
import { cn, prefersReducedMotion } from "@/lib/utils";

export type PinState = "ok" | "flagged" | "unanswered";
export type CarPin = { key: string; number: number; label: string; part: CarPart; state: PinState };

type Props = {
  pins: CarPin[];
  activeKey?: string | null;
  onSelect?: (key: string) => void;
  /** Trip-report mode: slow showroom spin, no active part. */
  showroom?: boolean;
  className?: string;
};

/**
 * Where each part sits on the car (car space: +X front, +Z the side facing
 * the camera at rest) and the turntable angle that best shows it.
 */
const ANCHORS: Record<CarPart, { pos: [number, number, number]; yaw: number }> = {
  "tyre-front": { pos: [1.35, 0.36, 1.02], yaw: -0.35 },
  "tyre-rear": { pos: [-1.35, 0.36, 1.02], yaw: 0.35 },
  headlights: { pos: [2.3, 0.88, 0.62], yaw: -1.2 },
  indicator: { pos: [2.22, 0.86, 0.88], yaw: -0.95 },
  windshield: { pos: [0.55, 1.38, 0], yaw: -1.0 },
  seatbelt: { pos: [-0.15, 1.38, 0.8], yaw: 0.05 },
  dashboard: { pos: [0.72, 1.18, 0.35], yaw: -0.6 },
  mirror: { pos: [0.82, 1.17, 1.05], yaw: -0.45 },
  "brake-light": { pos: [-2.33, 0.92, 0.6], yaw: 1.2 },
  grille: { pos: [2.36, 0.66, 0], yaw: -1.45 },
  door: { pos: [-0.2, 0.96, 0.98], yaw: 0.15 },
  seat: { pos: [-0.35, 1.25, 0.4], yaw: 0.1 },
  boot: { pos: [-2.33, 0.8, 0], yaw: 1.4 },
  "plate-rear": { pos: [-2.36, 0.5, 0], yaw: 1.5 },
  cabin: { pos: [-0.95, 1.42, 0.35], yaw: 0.3 },
};

/** Resting pins are small status dots; the active one grows into a numbered marker. */
const PIN_STYLES: Record<PinState, string> = {
  unanswered: "bg-neon ring-night/80",
  ok: "bg-ok ring-white/70",
  flagged: "bg-brake ring-white shadow-[0_0_14px_rgba(193,39,45,.95)]",
};

/**
 * The 3D walkaround for the Vehicle Assessment: a procedurally built SUV in
 * the cover poster's style on a neon turntable. Every vehicle question is a
 * numbered pin on its part; the car turns to face the active question and
 * that part demonstrates itself (indicators blink, wipers sweep, horn rings…).
 * Drag to spin. three.js is loaded on mount; the question list works without it.
 */
export default function WalkaroundCar({ pins, activeKey, onSelect, showroom, className }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const pinEls = useRef(new Map<string, HTMLButtonElement>());
  const live = useRef({ pins, activeKey, showroom, redraw: () => {} });

  useEffect(() => {
    Object.assign(live.current, { pins, activeKey, showroom });
    live.current.redraw();
  }, [pins, activeKey, showroom]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    let cleanup = () => {};

    import("three").then((THREE) => {
      if (disposed) return;
      let renderer: T.WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      } catch {
        return;
      }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.domElement.className = "absolute inset-0 h-full w-full touch-pan-y";
      host.prepend(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 60);
      camera.position.set(0, 2.5, 8.6);
      camera.lookAt(0, 0.75, 0);

      scene.add(new THREE.HemisphereLight(0xe6ecff, 0x2a2a1a, 1.9));
      const fill = new THREE.DirectionalLight(0xbfd0ff, 1.4);
      fill.position.set(-2, 3, 8);
      scene.add(fill);
      const key = new THREE.DirectionalLight(0xffffff, 3);
      key.position.set(4, 6, 6);
      scene.add(key);
      const magenta = new THREE.PointLight(0xff2fb3, 18, 9);
      magenta.position.set(3.5, 1.2, 2.5);
      scene.add(magenta);
      const lime = new THREE.PointLight(0xdfe22b, 12, 9);
      lime.position.set(-3.5, 2, 2);
      scene.add(lime);

      const disposables: { dispose: () => void }[] = [];
      const std = (p: T.MeshStandardMaterialParameters) => {
        const m = new THREE.MeshStandardMaterial(p);
        disposables.push(m);
        return m;
      };
      const mesh = (g: T.BufferGeometry, m: T.Material, x = 0, y = 0, z = 0) => {
        disposables.push(g);
        const o = new THREE.Mesh(g, m);
        o.position.set(x, y, z);
        return o;
      };
      const box = (w: number, h: number, d: number, m: T.Material, x: number, y: number, z: number) =>
        mesh(new THREE.BoxGeometry(w, h, d), m, x, y, z);

      const paint = std({ color: 0x34509c, metalness: 0.45, roughness: 0.28 });
      const trim = std({ color: 0x0d0f14, metalness: 0.2, roughness: 0.6 });
      const glass = std({ color: 0x0b1020, metalness: 0.4, roughness: 0.08, transparent: true, opacity: 0.55 });
      const rubber = std({ color: 0x111214, roughness: 0.9 });
      const alloy = std({ color: 0x9aa1ad, metalness: 0.85, roughness: 0.25 });
      const neon = std({ color: 0xdfe22b, emissive: 0xdfe22b, emissiveIntensity: 1.2 });
      const head = std({ color: 0xff2fb3, emissive: 0xff2fb3, emissiveIntensity: 1.4 });
      const tail = std({ color: 0xc1272d, emissive: 0xff2030, emissiveIntensity: 0.9 });
      const amber = std({ color: 0xf8a51c, emissive: 0xf8a51c, emissiveIntensity: 0.25 });
      const plate = std({ color: 0xf4f4f0, roughness: 0.5 });
      const az = std({ color: 0xf8a51c, emissive: 0xf8a51c, emissiveIntensity: 0.5, metalness: 0.6 });
      const gaugeGlow = std({ color: 0xdfe22b, emissive: 0xdfe22b, emissiveIntensity: 0.6 });
      const mirrorGlow = std({ color: 0x34509c, emissive: 0xdfe22b, emissiveIntensity: 0, metalness: 0.55, roughness: 0.32 });

      const car = new THREE.Group();

      // Body — side profile with wheel arches, extruded across the width
      const profile = new THREE.Shape();
      profile.moveTo(-2.15, 0.3);
      profile.lineTo(-1.83, 0.3);
      profile.absarc(-1.35, 0.36, 0.48, Math.PI, 0, true);
      profile.lineTo(0.87, 0.3);
      profile.absarc(1.35, 0.36, 0.48, Math.PI, 0, true);
      profile.lineTo(2.18, 0.3);
      profile.lineTo(2.26, 0.62);
      profile.lineTo(2.16, 0.96);
      profile.lineTo(0.95, 1.08);
      profile.lineTo(-2.0, 1.1);
      profile.lineTo(-2.22, 0.95);
      profile.lineTo(-2.26, 0.55);
      profile.closePath();
      const bodyGeo = new THREE.ExtrudeGeometry(profile, { depth: 1.76, bevelEnabled: true, bevelSize: 0.07, bevelThickness: 0.07, bevelSegments: 3, curveSegments: 18 });
      bodyGeo.translate(0, 0, -0.88);
      car.add(mesh(bodyGeo, paint));

      // Glasshouse + roof
      const cabin = new THREE.Shape();
      cabin.moveTo(0.95, 1.08);
      cabin.lineTo(0.12, 1.66);
      cabin.lineTo(-1.62, 1.68);
      cabin.lineTo(-2.0, 1.1);
      cabin.closePath();
      const cabinGeo = new THREE.ExtrudeGeometry(cabin, { depth: 1.56, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.04, bevelSegments: 2 });
      cabinGeo.translate(0, 0, -0.78);
      const glassMesh = mesh(cabinGeo, glass);
      car.add(glassMesh);
      car.add(box(1.76, 0.06, 1.6, paint, -0.75, 1.7, 0));
      for (const z of [-0.77, 0.77]) car.add(box(0.05, 0.6, 0.05, trim, -0.35, 1.4, z)); // B-pillars
      for (const z of [-0.8, 0.8]) car.add(box(0.95, 0.04, 0.04, trim, -0.85, 1.85, z * 0.82)); // roof rails

      // Lime sill line — the cover's neon floor lines, on the car
      for (const z of [-0.96, 0.96]) car.add(box(2.6, 0.025, 0.02, neon, 0, 0.42, z));

      // Front: grille, AZ badge, C-shaped magenta headlights, amber indicators, plate
      car.add(box(0.06, 0.28, 0.9, trim, 2.33, 0.66, 0));
      for (let i = 0; i < 4; i++) car.add(box(0.07, 0.015, 0.84, neon, 2.35, 0.56 + i * 0.065, 0));
      const badge = mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.03, 24), az, 2.3, 0.86, 0);
      badge.rotation.z = Math.PI / 2;
      car.add(badge);
      const headParts: T.Mesh[] = [];
      for (const s of [-1, 1]) {
        headParts.push(box(0.05, 0.05, 0.36, head, 2.25, 0.93, s * 0.6));
        headParts.push(box(0.05, 0.24, 0.05, head, 2.29, 0.8, s * 0.76));
        headParts.push(box(0.05, 0.05, 0.2, head, 2.33, 0.68, s * 0.68));
      }
      headParts.forEach((p) => car.add(p));
      const indicators = [-1, 1].map((s) => box(0.08, 0.06, 0.12, amber, 2.22, 0.86, s * 0.86));
      indicators.forEach((p) => car.add(p));
      car.add(box(0.02, 0.12, 0.42, plate, 2.33, 0.44, 0));

      // Rear: light bar, plate, boot line
      car.add(box(0.04, 0.06, 1.6, tail, -2.32, 0.92, 0));
      car.add(box(0.02, 0.13, 0.44, plate, -2.35, 0.5, 0));
      car.add(box(0.02, 0.01, 1.2, trim, -2.34, 0.68, 0));

      // Mirrors (with side repeaters), door handles
      const mirrors: T.Mesh[] = [];
      for (const s of [-1, 1]) {
        const m = box(0.14, 0.1, 0.2, mirrorGlow, 0.8, 1.16, s * 1.0);
        mirrors.push(m);
        car.add(m);
        const rep = box(0.05, 0.02, 0.08, amber, 0.86, 1.13, s * 1.1);
        indicators.push(rep);
        car.add(rep);
        car.add(box(0.18, 0.03, 0.02, trim, -0.2, 0.96, s * 0.97));
        car.add(box(0.18, 0.03, 0.02, trim, -1.1, 0.96, s * 0.97));
      }

      // Interior: dash with glowing gauges, steering wheel, seats
      car.add(box(0.3, 0.12, 1.4, trim, 0.78, 1.1, 0));
      for (const z of [0.28, 0.45]) {
        const g = mesh(new THREE.CircleGeometry(0.055, 20), gaugeGlow, 0.62, 1.2, z);
        g.rotation.y = -Math.PI / 2;
        car.add(g);
      }
      const wheel = mesh(new THREE.TorusGeometry(0.16, 0.02, 8, 24), trim, 0.55, 1.18, 0.36);
      wheel.rotation.y = Math.PI / 2;
      wheel.rotation.x = 0.4;
      car.add(wheel);
      for (const z of [-0.38, 0.38]) {
        car.add(box(0.36, 0.1, 0.44, trim, -0.3, 1.0, z));
        car.add(box(0.1, 0.5, 0.44, trim, -0.5, 1.25, z));
      }
      car.add(box(0.4, 0.1, 1.3, trim, -1.25, 1.0, 0));
      car.add(box(0.1, 0.45, 1.3, trim, -1.45, 1.22, 0));
      // Seat belt sash — glows when its question is active
      const belt = box(0.03, 0.5, 0.04, neon, -0.42, 1.25, 0.6);
      belt.rotation.x = 0.6;
      belt.visible = false;
      car.add(belt);

      // Wipers
      const wipers = [-0.35, 0.3].map((z) => {
        const pivot = new THREE.Group();
        pivot.position.set(0.93, 1.1, z);
        const blade = box(0.02, 0.02, 0.55, trim, 0, 0, 0.27);
        pivot.add(blade);
        pivot.rotation.z = 0.55; // lie along the windshield rake
        car.add(pivot);
        return pivot;
      });

      // Wheels: tyre, alloy, and a red glow ring like the thank-you car
      const wheels: T.Group[] = [];
      for (const x of [-1.35, 1.35]) {
        for (const s of [-1, 1]) {
          const w = new THREE.Group();
          w.position.set(x, 0.36, s * 0.86);
          const tyre = mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.28, 36), rubber);
          tyre.rotation.x = Math.PI / 2;
          w.add(tyre);
          const rim = mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.3, 6), alloy);
          rim.rotation.x = Math.PI / 2;
          w.add(rim);
          const ring = mesh(new THREE.TorusGeometry(0.29, 0.014, 8, 48), tail);
          ring.position.z = s * 0.15;
          w.add(ring);
          w.userData.side = s;
          wheels.push(w);
          car.add(w);
        }
      }

      // Horn sound-wave ring (in front of the grille)
      const waveMat = new THREE.MeshBasicMaterial({ color: 0xdfe22b, transparent: true, opacity: 0, side: THREE.DoubleSide });
      disposables.push(waveMat);
      const wave = mesh(new THREE.RingGeometry(0.3, 0.34, 48), waveMat, 2.45, 0.7, 0);
      wave.rotation.y = Math.PI / 2;
      car.add(wave);

      // Turntable floor
      const floor = new THREE.Group();
      const discMat = new THREE.MeshStandardMaterial({ color: 0x0d1015, roughness: 0.35, metalness: 0.5 });
      disposables.push(discMat);
      const disc = mesh(new THREE.CircleGeometry(3.0, 64), discMat);
      disc.rotation.x = -Math.PI / 2;
      floor.add(disc);
      for (const [r, op] of [[3.0, 0.9], [2.7, 0.25], [2.4, 0.12]] as const) {
        const ringMat = new THREE.MeshBasicMaterial({ color: 0xdfe22b, transparent: true, opacity: op });
        disposables.push(ringMat);
        const ring = mesh(new THREE.RingGeometry(r - 0.025, r, 96), ringMat);
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = 0.005;
        floor.add(ring);
      }
      const hexPts = Array.from({ length: 7 }, (_, i) => {
        const a = (i / 6) * Math.PI * 2;
        return new THREE.Vector3(Math.cos(a) * 2.85, 0.01, Math.sin(a) * 2.85);
      });
      const hexGeo = new THREE.BufferGeometry().setFromPoints(hexPts);
      const hexMat = new THREE.LineBasicMaterial({ color: 0xff2fb3, transparent: true, opacity: 0.5 });
      disposables.push(hexGeo, hexMat);
      floor.add(new THREE.Line(hexGeo, hexMat));
      floor.add(car);
      scene.add(floor);

      // Scan ring that hovers on the active part, always facing the camera
      const scanMat = new THREE.MeshBasicMaterial({ color: 0xdfe22b, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthTest: false });
      disposables.push(scanMat);
      const scan = mesh(new THREE.RingGeometry(0.17, 0.2, 40), scanMat);
      scan.renderOrder = 10;
      scene.add(scan);

      // ---------- sizing, input, loop ----------
      let width = 1;
      let height = 1;
      const resize = () => {
        width = host.clientWidth;
        height = host.clientHeight;
        renderer.setSize(width, height, false);
        camera.aspect = width / Math.max(height, 1);
        // Distance that fits the car (~6.6 units across at three-quarter view, with margin) at this aspect
        const halfFov = Math.tan(((camera.fov / 2) * Math.PI) / 180);
        const dist = Math.min(12.5, Math.max(7.2, 6.6 / (2 * Math.min(camera.aspect, 1.6) * halfFov)));
        camera.position.set(0, dist * 0.3, dist);
        camera.lookAt(0, 0.7, 0);
        camera.updateProjectionMatrix();
        live.current.redraw();
      };
      const ro = new ResizeObserver(resize);
      ro.observe(host);

      let yaw = -0.5;
      let targetYaw = -0.5;
      let dragging = false;
      let lastX = 0;
      let lastActive: string | null | undefined;
      const canvas = renderer.domElement;
      const onDown = (e: PointerEvent) => {
        dragging = true;
        lastX = e.clientX;
        canvas.setPointerCapture(e.pointerId);
      };
      const onMove = (e: PointerEvent) => {
        if (!dragging) return;
        targetYaw += (e.clientX - lastX) * 0.012;
        lastX = e.clientX;
        live.current.redraw();
      };
      const onUp = () => (dragging = false);
      canvas.addEventListener("pointerdown", onDown);
      canvas.addEventListener("pointermove", onMove);
      canvas.addEventListener("pointerup", onUp);
      canvas.addEventListener("pointercancel", onUp);

      const v = new THREE.Vector3();
      const reduced = prefersReducedMotion();
      const clock = new THREE.Clock();
      let raf = 0;
      let visible = true;

      const draw = () => {
        const dt = Math.min(clock.getDelta(), 0.05);
        const t = clock.elapsedTime;
        const { pins: ps, activeKey: ak, showroom: sr } = live.current;
        const activePart = ps.find((p) => p.key === ak)?.part;

        if (ak !== lastActive) {
          lastActive = ak;
          if (activePart) {
            // Turn the shortest way round to the part
            const want = ANCHORS[activePart].yaw;
            targetYaw = want + Math.round((targetYaw - want) / (Math.PI * 2)) * Math.PI * 2;
          }
        }
        if (sr && !dragging && !reduced) targetYaw += dt * 0.25;
        yaw += (targetYaw - yaw) * (reduced ? 1 : Math.min(1, dt * 3));
        floor.rotation.y = yaw;

        // Part demos
        const on = (p: CarPart) => activePart === p;
        const blink = Math.sin(t * 9) > 0 ? 1 : 0;
        indicators.forEach((m) => ((m.material as T.MeshStandardMaterial).emissiveIntensity = on("indicator") ? 0.2 + blink * 2.4 : 0.25));
        head.emissiveIntensity = on("headlights") ? 1.4 + (Math.sin(t * 5) + 1) * 1.6 : 1.4;
        tail.emissiveIntensity = on("brake-light") ? 1 + (Math.sin(t * 6) + 1) * 1.5 : 0.9;
        gaugeGlow.emissiveIntensity = on("dashboard") ? 1.2 + Math.sin(t * 6) * 0.6 : 0.6;
        mirrorGlow.emissiveIntensity = on("mirror") ? 0.5 + Math.sin(t * 5) * 0.3 : 0;
        belt.visible = on("seatbelt");
        glass.opacity = on("windshield") || on("cabin") || on("seat") || on("dashboard") || on("seatbelt") ? 0.32 : 0.55;
        wipers.forEach((w) => (w.rotation.x = on("windshield") && !reduced ? Math.sin(t * 4) * 0.9 - 0.2 : 0));
        if (on("grille") && !reduced) {
          const p = (t * 0.9) % 1;
          wave.scale.setScalar(1 + p * 4);
          waveMat.opacity = 0.9 * (1 - p);
        } else waveMat.opacity = 0;
        for (const w of wheels) {
          const front = w.position.x > 0;
          const spin = (on("tyre-front") && front) || (on("tyre-rear") && !front);
          if (spin && !reduced) w.rotation.z -= dt * 3;
        }
        neon.emissiveIntensity = 1 + Math.sin(t * 2) * 0.25;

        // Scan ring on the active part
        if (activePart && !sr) {
          v.set(...ANCHORS[activePart].pos);
          car.localToWorld(v);
          scan.position.copy(v);
          scan.quaternion.copy(camera.quaternion);
          scan.scale.setScalar(1 + (reduced ? 0 : Math.sin(t * 4) * 0.15));
          scan.visible = true;
        } else scan.visible = false;

        renderer.render(scene, camera);

        // Project pins into the overlay; spread pins that share a part
        const groups = new Map<CarPart, string[]>();
        for (const p of ps) groups.set(p.part, [...(groups.get(p.part) ?? []), p.key]);
        for (const p of ps) {
          const el = pinEls.current.get(p.key);
          if (!el) continue;
          v.set(...ANCHORS[p.part].pos);
          car.localToWorld(v);
          // Facing: is the anchor on the camera's side of the car?
          const facing = Math.sin(yaw) * -ANCHORS[p.part].pos[0] + Math.cos(yaw) * ANCHORS[p.part].pos[2];
          v.project(camera);
          const group = groups.get(p.part)!;
          const spread = (group.indexOf(p.key) - (group.length - 1) / 2) * (p.key === ak ? 0 : 16);
          const x = (v.x * 0.5 + 0.5) * width + spread;
          const y = (-v.y * 0.5 + 0.5) * height;
          el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
          el.style.opacity = facing < -0.25 ? "0.28" : "1";
          el.style.zIndex = p.key === ak ? "3" : facing < -0.25 ? "1" : "2";
        }
      };

      const loop = () => {
        draw();
        raf = requestAnimationFrame(loop);
      };
      // Browsers already pause rAF in hidden tabs; only stop when scrolled out of view.
      const start = () => {
        cancelAnimationFrame(raf);
        if (visible && !reduced) {
          clock.getDelta();
          raf = requestAnimationFrame(loop);
        }
      };
      live.current.redraw = reduced ? () => requestAnimationFrame(draw) : () => {};
      resize();
      draw();
      start();

      const io = new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        start();
      });
      io.observe(host);

      cleanup = () => {
        cancelAnimationFrame(raf);
        live.current.redraw = () => {};
        io.disconnect();
        ro.disconnect();
        canvas.removeEventListener("pointerdown", onDown);
        canvas.removeEventListener("pointermove", onMove);
        canvas.removeEventListener("pointerup", onUp);
        canvas.removeEventListener("pointercancel", onUp);
        disposables.forEach((d) => d.dispose());
        renderer.dispose();
        canvas.remove();
      };
    });

    return () => {
      disposed = true;
      cleanup();
    };
  }, []);

  return (
    <div
      ref={hostRef}
      className={cn("relative overflow-hidden rounded-2xl bg-[radial-gradient(ellipse_at_50%_35%,#1b2030,#0a0c0f_70%)]", className)}
    >
      {pins.map((p) => (
        <button
          key={p.key}
          type="button"
          ref={(el) => {
            if (el) pinEls.current.set(p.key, el);
            else pinEls.current.delete(p.key);
          }}
          onClick={() => onSelect?.(p.key)}
          title={`${p.number}. ${p.label}`}
          aria-label={`Question ${p.number}: ${p.label}`}
          style={{ opacity: 0 }}
          className={cn(
            "group absolute left-0 top-0 grid place-items-center rounded-full font-bold ring-2 transition-[width,height,background-color,box-shadow,opacity] duration-300",
            PIN_STYLES[p.state],
            p.key === activeKey
              ? "h-9 w-9 text-sm text-night ring-4 ring-neon shadow-[0_0_26px_rgba(223,226,43,.95)]"
              : "h-3.5 w-3.5 text-[0px] before:absolute before:-inset-2.5 before:content-[''] hover:h-7 hover:w-7 hover:text-[0.7rem] hover:text-white",
            p.key === activeKey && p.state !== "unanswered" && "text-white",
          )}
        >
          {p.number}
        </button>
      ))}
    </div>
  );
}
