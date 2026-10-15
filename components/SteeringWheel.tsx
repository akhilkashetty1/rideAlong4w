import { cn } from "@/lib/utils";

/** Flat 3-spoke steering wheel — watermark, frame decoration and small icons. Inherits `currentColor`. */
export default function SteeringWheel({ className, title }: { className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={cn("block", className)} role={title ? "img" : undefined} aria-hidden={title ? undefined : true}>
      {title && <title>{title}</title>}
      <g fill="none" stroke="currentColor" strokeLinecap="round">
        <circle cx="50" cy="50" r="40" strokeWidth="9" />
        <path d="M13 52h26M61 52h26M50 63v24" strokeWidth="8" />
      </g>
      <circle cx="50" cy="52" r="11" fill="currentColor" />
    </svg>
  );
}

/**
 * Driver question 11 asks the line manager to "refer to the image" — this is it.
 * Two wheels with hands at quarter-to-three (9 & 3) and ten-to-three (10 & 2).
 */
export function GripDiagram({ className }: { className?: string }) {
  const hand = (clock: number, r = 40) => {
    const t = (clock * 30 * Math.PI) / 180;
    return { cx: 50 + r * Math.sin(t), cy: 50 - r * Math.cos(t) };
  };
  const wheel = (hands: [number, number], label: string, sub: string) => (
    <figure className="flex flex-col items-center gap-1">
      <svg viewBox="0 0 100 100" className="h-20 w-20 text-ink" aria-hidden>
        <g fill="none" stroke="currentColor" strokeLinecap="round">
          <circle cx="50" cy="50" r="40" strokeWidth="7" />
          <path d="M13 52h26M61 52h26M50 63v24" strokeWidth="6" />
        </g>
        <circle cx="50" cy="52" r="9" fill="currentColor" />
        {hands.map((h) => (
          <g key={h}>
            <circle {...hand(h)} r="11" fill="var(--color-neon)" opacity="0.35" />
            <circle {...hand(h)} r="7" fill="var(--color-brake)" stroke="#fff" strokeWidth="2" />
          </g>
        ))}
      </svg>
      <figcaption className="text-center text-[0.7rem] leading-tight text-ink-soft">
        <strong className="block text-ink">{label}</strong>
        {sub}
      </figcaption>
    </figure>
  );
  return (
    <div className={cn("flex items-start gap-4", className)}>
      {wheel([9, 3], "3:45 position", "hands at 9 & 3")}
      {wheel([10, 2], "2:50 position", "hands at 10 & 2")}
    </div>
  );
}
