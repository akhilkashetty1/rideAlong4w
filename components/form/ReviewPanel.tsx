import { TriangleAlert, CircleCheck } from "lucide-react";
import type { ReportSection } from "@/lib/submission";
import { cn } from "@/lib/utils";

/** Read-only summary, follow-up items first. Also what gets printed. */
export default function ReviewPanel({ report }: { report: ReportSection[] }) {
  const flagged = report.flatMap((s) => s.rows.filter((r) => r.flagged).map((r) => ({ ...r, section: s.title })));

  return (
    <div className="space-y-6">
      <div
        className={cn(
          "print-avoid-break rounded-xl border p-4",
          flagged.length ? "border-az bg-[#fff6e6]" : "border-ok/40 bg-ok-wash",
        )}
      >
        <p className="flex items-center gap-2 font-semibold">
          {flagged.length ? <TriangleAlert className="h-5 w-5 text-az" /> : <CircleCheck className="h-5 w-5 text-ok" />}
          {flagged.length ? `${flagged.length} item${flagged.length === 1 ? "" : "s"} need follow-up` : "All checks clear — nothing flagged"}
        </p>
        {flagged.length > 0 && (
          <ul className="mt-2 space-y-1 pl-7 text-sm text-ink-soft">
            {flagged.map((r) => (
              <li key={r.column}>
                <span className="font-medium text-ink">{r.section}:</span> {r.label.replace(/^\d+\.\s*/, "")} —{" "}
                <span className="font-semibold text-brake">{r.value}</span>
                {r.remark && <span className="italic"> ({r.remark})</span>}
              </li>
            ))}
          </ul>
        )}
      </div>

      {report.map((section) => (
        <section key={section.title} className="print-avoid-break overflow-hidden rounded-xl border border-line">
          <h2 className="bg-night px-4 py-2.5 text-sm font-semibold uppercase tracking-wider text-neon">{section.title}</h2>
          <dl className="divide-y divide-line">
            {section.rows.map((r) => (
              <div key={r.column} className="grid gap-1 px-4 py-2.5 text-sm sm:grid-cols-[1fr_7rem] sm:gap-4">
                <dt className="text-ink-soft">
                  {r.label}
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
