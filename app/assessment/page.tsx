import type { Metadata } from "next";
import AssessmentWizard from "@/components/form/AssessmentWizard";

export const metadata: Metadata = { title: "Assessment" };

export default function AssessmentPage() {
  return (
    <main className="px-3 py-6 sm:px-6 sm:py-10">
      <AssessmentWizard />
    </main>
  );
}
