import { FORM_META } from "@/lib/form-content";
import { countFlagged, type ReportSection } from "@/lib/submission";

/** Builds and downloads the review as an A4 PDF. jsPDF is loaded only when asked for. */
export async function downloadReportPdf(report: ReportSection[], fileName: string) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 14;
  let y = 0;

  const header = () => {
    doc.setFillColor(223, 226, 43);
    doc.rect(0, 0, W, 16, "F");
    doc.setTextColor(10, 12, 15);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(FORM_META.title.toUpperCase(), M, 10.5);
    y = 26;
  };
  const ensure = (h: number) => {
    if (y + h > H - 14) {
      doc.addPage();
      header();
    }
  };

  header();
  const flagged = countFlagged(report);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(flagged ? 155 : 21, flagged ? 28 : 128, flagged ? 33 : 61);
  doc.text(flagged ? `${flagged} item(s) flagged for follow-up` : "No items flagged", M, y);
  y += 8;

  for (const section of report) {
    ensure(16);
    doc.setFillColor(193, 39, 45);
    doc.rect(M, y - 5, W - 2 * M, 7.5, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(section.title, M + 2.5, y);
    y += 7;

    for (const row of section.rows) {
      const labelLines = doc.splitTextToSize(row.label, (W - 2 * M) * 0.62);
      const remarkLines = row.remark ? doc.splitTextToSize(`Remarks: ${row.remark}`, W - 2 * M - 4) : [];
      const extraLines = (row.extras ?? []).map((x) => `${x.label}: ${x.value}`);
      const h = Math.max(labelLines.length, 1) * 4.6 + (remarkLines.length + extraLines.length) * 4.3 + 3;
      ensure(h);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(21, 23, 27);
      doc.text(labelLines, M + 2, y);
      doc.setFont("helvetica", "bold");
      if (row.flagged) doc.setTextColor(193, 39, 45);
      doc.text(row.flagged ? `${row.value}  (flagged)` : row.value, W - M - 2, y, { align: "right" });
      y += labelLines.length * 4.6;
      if (extraLines.length) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(21, 23, 27);
        doc.text(extraLines, M + 4, y);
        y += extraLines.length * 4.3;
      }
      if (remarkLines.length) {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(8.5);
        doc.setTextColor(74, 79, 88);
        doc.text(remarkLines, M + 4, y);
        y += remarkLines.length * 4.3;
      }
      doc.setDrawColor(217, 220, 226);
      doc.line(M, y - 1.5, W - M, y - 1.5);
      y += 3;
    }
    y += 4;
  }

  doc.save(fileName);
}
