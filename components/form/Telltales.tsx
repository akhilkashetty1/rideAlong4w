import { QUESTION_VISUALS } from "@/lib/question-visuals";
import { cn } from "@/lib/utils";

export type TelltaleItem = { key: string; label: string; flagged: boolean };

/** One dashboard warning lamp: dim when fine, amber and glowing when flagged. */
export function Telltale({ item, size = "md", bulbCheck }: { item: TelltaleItem; size?: "sm" | "md"; bulbCheck?: boolean }) {
  const Icon = QUESTION_VISUALS[item.key]?.icon;
  if (!Icon) return null;
  const lit = item.flagged || bulbCheck;
  return (
    <span
      title={`${item.label}${item.flagged ? " — flagged" : ""}`}
      className={cn(
        "grid place-items-center rounded-md transition-all duration-300",
        size === "sm" ? "h-7 w-7" : "h-10 w-10",
        lit ? "text-az drop-shadow-[0_0_6px_rgba(248,165,28,.9)]" : "text-[#3a3f4a]",
      )}
    >
      <Icon className={size === "sm" ? "h-4 w-4" : "h-6 w-6"} strokeWidth={2.2} />
      <span className="sr-only">
        {item.label}: {item.flagged ? "flagged" : "ok"}
      </span>
    </span>
  );
}

/** Live strip under the instrument cluster — like a real car, it shows only the lamps that are on. */
export function TelltaleStrip({ items }: { items: TelltaleItem[] }) {
  const lit = items.filter((i) => i.flagged);
  return (
    <div className="flex min-h-7 flex-wrap items-center justify-center gap-1" aria-live="polite">
      {lit.length ? (
        lit.map((i) => <Telltale key={i.key} item={i} size="sm" />)
      ) : (
        <span className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-ok">● All systems OK</span>
      )}
    </div>
  );
}

/** Full panel for the trip report: every check as a lamp, grouped by section. */
export function TelltalePanel({ groups }: { groups: { title: string; items: TelltaleItem[] }[] }) {
  return (
    <div className="space-y-3 rounded-2xl bg-night p-4">
      {groups.map((g) => (
        <div key={g.title}>
          <p className="mb-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-[#8b919c]">{g.title}</p>
          <div className="flex flex-wrap gap-1">
            {g.items.map((i) => (
              <Telltale key={i.key} item={i} size="sm" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
