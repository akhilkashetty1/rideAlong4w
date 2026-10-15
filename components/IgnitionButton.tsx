"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Power } from "lucide-react";
import { Speedometer } from "@/components/form/Dashboard";
import { Telltale } from "@/components/form/Telltales";
import { QUESTION_VISUALS } from "@/lib/question-visuals";
import { cn, prefersReducedMotion } from "@/lib/utils";

const BULB_CHECK = Object.keys(QUESTION_VISUALS)
  .filter((k) => k.startsWith("vehicle."))
  .slice(0, 9)
  .map((key) => ({ key, label: key, flagged: false }));

/**
 * START ASSESSMENT as a push-to-start button. Pressing it does what a real
 * car does on ignition — gauge needles sweep and every warning lamp lights
 * for a bulb check — then pulls away to the guidelines.
 */
export default function IgnitionButton({ href }: { href: string }) {
  const router = useRouter();
  const [phase, setPhase] = useState<"off" | "sweep" | "settle">("off");

  useEffect(() => {
    router.prefetch(href);
  }, [router, href]);

  const start = () => {
    if (phase !== "off") return;
    if (prefersReducedMotion()) return router.push(href);
    navigator.vibrate?.([30, 50, 60]);
    setPhase("sweep");
    setTimeout(() => setPhase("settle"), 750);
    setTimeout(() => router.push(href), 1500);
  };

  const needle = phase === "sweep" ? 1 : 0;

  return (
    <>
      <button
        type="button"
        onClick={start}
        aria-label="Start assessment"
        className={cn(
          "group relative grid h-32 w-32 place-items-center rounded-full bg-[radial-gradient(circle_at_50%_35%,#2a2f3a,#0d0f14_70%)] text-neon ring-[6px] ring-[#1a1d24] transition-all duration-300",
          "shadow-[0_0_0_2px_rgba(223,226,43,.55),0_0_40px_-4px_rgba(223,226,43,.6),inset_0_-6px_14px_rgba(0,0,0,.6)] hover:scale-[1.04] hover:shadow-[0_0_0_2px_rgba(223,226,43,.9),0_0_60px_0_rgba(223,226,43,.7),inset_0_-6px_14px_rgba(0,0,0,.6)] active:scale-95",
          phase !== "off" && "scale-95 text-white shadow-[0_0_0_2px_#fff,0_0_80px_10px_rgba(223,226,43,.9)]",
        )}
      >
        <span className="flex flex-col items-center gap-0.5">
          <Power className="h-7 w-7" strokeWidth={2.6} />
          <span className="font-display text-[0.95rem] leading-none tracking-wider">START</span>
          <span className="text-[0.55rem] font-semibold tracking-[0.22em] text-white/60">ASSESSMENT</span>
        </span>
        <span className="pointer-events-none absolute inset-[-14px] rounded-full border border-neon/30 group-hover:animate-ping" />
      </button>

      {phase !== "off" && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-night/85 backdrop-blur-sm" aria-live="polite">
          <div className="step-in flex flex-col items-center gap-4">
            <div className="flex items-end gap-6">
              <Speedometer progress={needle} readout={false} className="h-28 w-32" />
              <Speedometer progress={needle} readout={false} className="h-28 w-32" />
            </div>
            <div className="flex gap-1">
              {BULB_CHECK.map((i) => (
                <Telltale key={i.key} item={i} size="sm" bulbCheck={phase === "sweep"} />
              ))}
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-neon">
              {phase === "sweep" ? "Ignition on · systems check" : "All systems OK"}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
