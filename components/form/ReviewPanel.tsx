import type { ReportSection } from "@/lib/submission";
import { cn } from "@/lib/utils";

/** Read-only summary of every answer, section by section. Also what gets printed. */
export default function ReviewPanel({ report }: { report: ReportSection[] }) {
  return (
    <div className="space-y-6">
      {report.map((section) => (
        <section key={section.title} className="print-avoid-break overflow-hidden rounded-xl border border-line">
          <h2 className="bg-night px-4 py-2.5 text-sm font-semibold uppercase tracking-wider text-neon">{section.title}</h2>
          <dl className="divide-y divide-line">
            {section.rows.map((r) => (
              <div key={r.column} className="grid gap-1 px-4 py-2.5 text-sm sm:grid-cols-[1fr_7rem] sm:gap-4">
                <dt className="text-ink-soft">
                  {r.label}
                  {r.extras?.map((x) => (
                    <span key={x.column} className="mt-0.5 block text-xs font-semibold text-ink">
                      {x.label}: {x.value}
                    </span>
                  ))}
                  {section.kind === "assessment" && (
                    <span className="mt-0.5 block text-xs italic text-muted">Remarks: {r.remark || "No remarks"}</span>
                  )}
                </dt>
                <dd className={cn("font-semibold sm:text-right", r.flagged && "text-brake")}>{r.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}
