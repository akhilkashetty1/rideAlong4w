import type { AssessmentSection } from "@/lib/form-content";
import { GripDiagram, PostureDiagram } from "@/components/SteeringWheel";

/** The PDF's guidelines table — a real table from `sm` up, stacked cards on phones. */
export default function GuidelinesTable({ section }: { section: AssessmentSection }) {
  return (
    <>
      <table className="hidden w-full border-collapse text-left text-sm sm:table">
        <thead>
          <tr className="bg-brake text-white">
            <th className="w-12 border border-brake-deep px-3 py-2.5 text-center">No</th>
            <th className="w-[36%] border border-brake-deep px-3 py-2.5">{section.title}</th>
            <th className="border border-brake-deep px-3 py-2.5">Assessment Procedure</th>
          </tr>
        </thead>
        <tbody>
          {section.questions.map((q, i) => (
            <tr key={q.id} className="align-top odd:bg-paper even:bg-paper-2 hover:bg-[#fbfbe6]">
              <td className="border border-line px-3 py-3 text-center font-semibold text-brake">{i + 1}</td>
              <td className="border border-line px-3 py-3 font-medium">{q.text}</td>
              <td className="border border-line px-3 py-3 text-ink-soft">
                {q.guideline}
                {q.illustration === "steering-grip" && <GripDiagram className="mt-3" />}
                {q.illustration === "seating-posture" && <PostureDiagram className="mt-3" />}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <ol className="space-y-3 sm:hidden">
        {section.questions.map((q, i) => (
          <li key={q.id} className="overflow-hidden rounded-lg border border-line">
            <p className="flex gap-2 bg-paper-2 px-3 py-2.5 text-sm font-semibold">
              <span className="text-brake">{i + 1}.</span>
              {q.text}
            </p>
            <div className="border-l-4 border-brake px-3 py-2.5 text-[0.82rem] text-ink-soft">
              {q.guideline}
              {q.illustration === "steering-grip" && <GripDiagram className="mt-3 justify-center" />}
              {q.illustration === "seating-posture" && <PostureDiagram className="mt-3 justify-center" />}
            </div>
          </li>
        ))}
      </ol>
    </>
  );
}
