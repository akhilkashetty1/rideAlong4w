import { TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Progress as a speedometer: the needle sweeps from 0 to full as the form
 * advances, and a dashboard warning lamp lights with the count of flagged
 * answers (optional — the form uses the telltale strip instead).
 */
export function Speedometer({
  progress,
  flagged,
  readout = true,
  className,
}: {
  progress: number;
  flagged?: number;
  readout?: boolean;
  className?: string;
}) {
  const start = -120;
  const sweep = 240;
  const angle = start + sweep * Math.min(1, Math.max(0, progress));
  const polar = (deg: number, r: number) => {
    const t = (deg * Math.PI) / 180;
    return [60 + r * Math.sin(t), 60 - r * Math.cos(t)] as const;
  };
  const arc = (from: number, to: number, r: number) => {
    const [x1, y1] = polar(from, r);
    const [x2, y2] = polar(to, r);
    return `M${x1} ${y1} A${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${x2} ${y2}`;
  };
  const ticks = Array.from({ length: 13 }, (_, i) => start + (sweep / 12) * i);

  return (
    <div className={cn("flex flex-col items-center", className)} role="img" aria-label={`${Math.round(progress * 100)}% complete${flagged != null ? `, ${flagged} flagged` : ""}`}>
      <svg viewBox="4 6 112 90" className="min-h-0 w-full flex-1">
        <path d={arc(start, start + sweep, 48)} fill="none" stroke="var(--color-night-line)" strokeWidth="7" strokeLinecap="round" />
        {progress > 0 && (
          <path
            d={arc(start, angle, 48)}
            fill="none"
            stroke="var(--color-neon)"
            strokeWidth="7"
            strokeLinecap="round"
            style={{ filter: "drop-shadow(0 0 4px rgba(223,226,43,.8))", transition: "d 700ms cubic-bezier(.22,1,.36,1)" }}
          />
        )}
        {ticks.map((d, i) => {
          const [x1, y1] = polar(d, 38);
          const [x2, y2] = polar(d, i % 3 ? 35 : 32);
          return <line key={d} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#8b919c" strokeWidth={i % 3 ? 1 : 1.6} />;
        })}
        <g style={{ transform: `rotate(${angle}deg)`, transformOrigin: "60px 60px", transition: "transform 700ms cubic-bezier(.34,1.56,.64,1)" }}>
          <line x1="60" y1="66" x2="60" y2="20" stroke="var(--color-brake)" strokeWidth="3" strokeLinecap="round" />
        </g>
        <circle cx="60" cy="60" r="6" fill="var(--color-night-2)" stroke="var(--color-brake)" strokeWidth="2" />
        {readout && (
          <text x="60" y="90" textAnchor="middle" fill="#fff" fontSize="13" fontWeight="700" fontFamily="var(--font-sans)">
            {Math.round(progress * 100)}
            <tspan fontSize="7" fill="#8b919c" dx="1">%</tspan>
          </text>
        )}
      </svg>
      {flagged != null && (
      <span
          title={`${flagged} item${flagged === 1 ? "" : "s"} flagged`}
          className={cn(
            "mt-0.5 flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[0.62rem] font-bold uppercase tracking-wider transition-colors",
            flagged ? "lamp-blink bg-az text-night shadow-[0_0_14px_rgba(248,165,28,.8)]" : "bg-night-line text-[#6b717c]",
          )}
        >
          <TriangleAlert className="h-3 w-3" strokeWidth={2.5} />
          {flagged}
        </span>
      )}
    </div>
  );
}

export function StepPills({ labels, current }: { labels: string[]; current: number }) {
  return (
    <ol className="flex flex-wrap justify-center gap-2 sm:gap-4">
      {labels.map((label, i) => (
        <li
          key={label}
          aria-current={i === current ? "step" : undefined}
          className={cn(
            "flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all sm:px-5 sm:py-2 sm:text-sm",
            i === current && "bg-neon text-night shadow-[0_0_22px_-4px_rgba(223,226,43,.9)]",
            i < current && "bg-night-2 text-neon ring-1 ring-neon/40",
            i > current && "bg-night-2 text-[#8b919c] ring-1 ring-night-line",
          )}
        >
          <span
            className={cn(
              "grid h-5 w-5 place-items-center rounded-full text-[0.65rem]",
              i === current ? "bg-night text-neon" : "bg-night-line",
            )}
          >
            {i + 1}
          </span>
          {label}
        </li>
      ))}
    </ol>
  );
}
