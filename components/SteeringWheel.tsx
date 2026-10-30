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

/**
 * Driver question about the driving position: a side view of a seated driver, right and wrong.
 * Right: back against the seat, head level with the headrest, elbows and knees slightly bent.
 * Wrong: slouched, reaching for the wheel with straight arms and straight legs.
 */
export function PostureDiagram({ className }: { className?: string }) {
  type P = [number, number];
  const pts = (p: P[]) => p.map((q) => q.join(",")).join(" ");
  const figure = (
    label: string,
    sub: string,
    f: { head: P; torso: P[]; arm: P[]; leg: P[]; joints: P[] },
    good: boolean,
  ) => (
    <figure className="flex flex-col items-center gap-1">
      <svg viewBox="0 0 120 100" className="h-24 w-[7.5rem] text-ink" aria-hidden>
        {/* seat, headrest, steering wheel and column, pedal, floor */}
        <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" opacity="0.4">
          <polyline points="12,30 14,72 48,72" strokeWidth="6" />
          <path d="M11 20l.6 8" strokeWidth="7" />
          <path d="M88 26l8 30M96 56l9 14" strokeWidth="5" />
          <path d="M72 90h16" strokeWidth="4" />
          <path d="M4 93h112" strokeWidth="3" />
        </g>
        <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="6">
          <polyline points={pts(f.torso)} />
          <polyline points={pts(f.arm)} />
          <polyline points={pts(f.leg)} />
        </g>
        <circle cx={f.head[0]} cy={f.head[1]} r="8" fill="currentColor" />
        {f.joints.map((j, i) => (
          <circle key={i} cx={j[0]} cy={j[1]} r="4.5" fill={good ? "var(--color-neon)" : "var(--color-brake)"} stroke="#fff" strokeWidth="1.5" />
        ))}
      </svg>
      <figcaption className="max-w-[9rem] text-center text-[0.7rem] leading-tight text-ink-soft">
        <strong className={cn("block", good ? "text-ink" : "text-brake")}>{label}</strong>
        {sub}
      </figcaption>
    </figure>
  );
  return (
    <div className={cn("flex items-start gap-4", className)}>
      {figure(
        "Right position",
        "back supported, elbows and knees slightly bent",
        {
          head: [21, 24],
          torso: [[23, 66], [21, 38]],
          arm: [[21, 40], [46, 56], [90, 38]],
          leg: [[23, 66], [54, 64], [60, 88], [74, 88]],
          joints: [[46, 56], [54, 64]],
        },
        true,
      )}
      {figure(
        "Wrong position",
        "slouched, arms and legs fully stretched",
        {
          head: [46, 34],
          torso: [[22, 68], [28, 54], [38, 44]],
          arm: [[38, 46], [64, 42], [90, 38]],
          leg: [[22, 68], [52, 78], [82, 88]],
          joints: [[64, 42], [52, 78]],
        },
        false,
      )}
    </div>
  );
}
