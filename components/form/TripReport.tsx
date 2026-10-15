"use client";

import WalkaroundCar, { type CarPin } from "@/components/three/WalkaroundCar";
import { TelltalePanel, type TelltaleItem } from "@/components/form/Telltales";

/**
 * Top of the review screen, styled as a trip computer: how many checks came
 * back clear, the walkaround car with every pin coloured by its answer, and
 * the full warning-lamp panel.
 */
export default function TripReport({
  clear,
  total,
  pins,
  groups,
}: {
  clear: number;
  total: number;
  pins: CarPin[];
  groups: { title: string; items: TelltaleItem[] }[];
}) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const frac = total ? clear / total : 0;
  const allClear = clear === total;

  return (
    <div className="no-print mb-6 grid gap-4 md:grid-cols-[11rem_1fr] lg:grid-cols-[11rem_1fr_15rem]">
      <div className="flex flex-col items-center justify-center rounded-2xl bg-night p-4 text-center">
        <svg viewBox="0 0 120 120" className="h-32 w-32" aria-hidden>
          <circle cx="60" cy="60" r={r} fill="none" stroke="var(--color-night-line)" strokeWidth="9" />
          <circle
            cx="60"
            cy="60"
            r={r}
            fill="none"
            stroke={allClear ? "var(--color-ok)" : "var(--color-neon)"}
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={`${c * frac} ${c}`}
            transform="rotate(-90 60 60)"
            style={{ filter: "drop-shadow(0 0 6px rgba(223,226,43,.6))" }}
          />
          <text x="60" y="58" textAnchor="middle" fill="#fff" fontSize="26" fontWeight="700" fontFamily="var(--font-display)">
            {clear}
            <tspan fontSize="13" fill="#8b919c">/{total}</tspan>
          </text>
          <text x="60" y="78" textAnchor="middle" fill="#8b919c" fontSize="8.5" letterSpacing="1.5">
            CHECKS CLEAR
          </text>
        </svg>
        <p className={allClear ? "mt-1 text-xs font-semibold text-ok" : "mt-1 text-xs font-semibold text-az"}>
          {allClear ? "Nothing to follow up" : `${total - clear} to follow up`}
        </p>
      </div>

      <WalkaroundCar pins={pins} showroom className="h-60 md:h-auto md:min-h-60" />

      <div className="md:col-span-2 lg:col-span-1">
        <TelltalePanel groups={groups} />
      </div>
    </div>
  );
}
