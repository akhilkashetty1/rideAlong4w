import { NextResponse } from "next/server";
import { FORM_META } from "@/lib/form-content";
import {
  buildReport,
  countFlagged,
  formatDateTime,
  parseFormState,
  toSheetRow,
  validateAll,
  type ReportSection,
} from "@/lib/submission";

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function emailHtml(report: ReportSection[], flagged: number) {
  const cell = "padding:8px 10px;border:1px solid #e5e7eb;vertical-align:top;";
  const sections = report
    .map((s) => {
      const rows = s.rows
        .map(
          (r) => `<tr>
            <td style="${cell}background:#f7f8fb;width:46%;">${escapeHtml(r.label)}</td>
            <td style="${cell}font-weight:bold;${r.flagged ? "color:#b3141a;" : ""}">${escapeHtml(r.value)}</td>
            ${s.kind === "assessment" ? `<td style="${cell}color:#454a54;">${escapeHtml(r.remark || "—")}</td>` : ""}
          </tr>`,
        )
        .join("");
      return `<h3 style="margin:24px 0 8px;color:#1b2a4a;">${escapeHtml(s.title)}</h3>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">${rows}</table>`;
    })
    .join("");

  return `<div style="font-family:sans-serif;line-height:1.5;color:#1b1c20;max-width:720px;">
    <h2 style="color:#1b2a4a;border-bottom:2px solid #da1f26;padding-bottom:10px;">New ${escapeHtml(FORM_META.title)} submission</h2>
    <p><strong>${flagged}</strong> item${flagged === 1 ? "" : "s"} flagged for follow-up (shown in red).</p>
    ${sections}
    <p style="font-size:12px;color:#999;margin-top:30px;text-align:center;">Automated notification from the ${escapeHtml(FORM_META.shortTitle)} form.</p>
  </div>`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const state = parseFormState(body);
    if (!state) return NextResponse.json({ error: "Invalid submission" }, { status: 400 });

    const errors = validateAll(state);
    if (Object.keys(errors).length) {
      return NextResponse.json({ error: "Some answers are missing", errors }, { status: 400 });
    }

    const apiKey = process.env.BREVO_API_KEY;
    const senderEmail = process.env.BREVO_SENDER_EMAIL;
    const senderName = process.env.BREVO_SENDER_NAME || FORM_META.shortTitle;
    const adminEmail = process.env.ADMIN_EMAIL_PRIMARY;
    const adminCc = process.env.ADMIN_EMAIL_CC;
    const googleSheetUrl = process.env.GOOGLE_SHEET_WEBAPP_URL;
    const hubUrl = process.env.HUB_INGEST_URL;
    const hubKey = process.env.HUB_INGEST_KEY;

    const emailConfigured = !!(apiKey && senderEmail && adminEmail);
    const hubConfigured = !!(hubUrl && hubKey);

    if (!emailConfigured && !googleSheetUrl && !hubConfigured) {
      console.error(
        "Submit API misconfigured — none of Brevo (BREVO_API_KEY / BREVO_SENDER_EMAIL / ADMIN_EMAIL_PRIMARY), GOOGLE_SHEET_WEBAPP_URL or the hub (HUB_INGEST_URL / HUB_INGEST_KEY) is set",
      );
      return NextResponse.json({ error: "Submissions are not configured yet" }, { status: 500 });
    }

    // Assessments saved offline are sent later; keep the time they were actually done.
    const now = new Date();
    const completed = new Date(typeof body?.completedAt === "string" ? body.completedAt : NaN);
    const age = now.getTime() - completed.getTime();
    const assessedAt = age >= -5 * 60_000 && age <= 30 * 86_400_000 ? completed : now;
    const report = buildReport(state, assessedAt);
    const flagged = countFlagged(report);
    const { name, hq } = state.fields;

    type Channel = "email" | "sheet" | "hub";
    const operations: { kind: Channel; promise: Promise<boolean> }[] = [];

    if (emailConfigured) {
      operations.push({
        kind: "email",
        promise: fetch("https://api.brevo.com/v3/smtp/email", {
          method: "POST",
          headers: { accept: "application/json", "api-key": apiKey!, "content-type": "application/json" },
          body: JSON.stringify({
            sender: { name: senderName, email: senderEmail },
            to: [{ email: adminEmail }],
            ...(adminCc ? { cc: [{ email: adminCc }] } : {}),
            subject: `${FORM_META.shortTitle}: ${name} (${hq})${flagged ? ` — ${flagged} flagged` : ""}`,
            htmlContent: emailHtml(report, flagged),
          }),
        }).then(async (res) => {
          if (!res.ok) console.error("Brevo response not ok:", res.status, await res.text().catch(() => ""));
          return res.ok;
        }),
      });
    }

    if (googleSheetUrl) {
      operations.push({
        kind: "sheet",
        // Apps Script answers 200 with an HTML error page when the script throws,
        // so success means the script's own { result: "success" } came back.
        promise: fetch(googleSheetUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            (({ headers, values }) => ({ headers: [...headers, "Received At"], values: [...values, formatDateTime(now)] }))(toSheetRow(report)),
          ),
        }).then(async (res) => {
          const body = await res.json().catch(() => null);
          if (body?.result !== "success") console.error("Google Sheets response not ok:", res.status, body);
          return body?.result === "success";
        }),
      });
    }

    if (hubConfigured) {
      operations.push({
        kind: "hub",
        // The submissions hub (database + admin). Same row as the Sheet, plus which answers were flagged.
        promise: fetch(hubUrl!, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-hub-key": hubKey! },
          body: JSON.stringify({
            ...toSheetRow(report),
            submittedAt: assessedAt.toISOString(),
            flagged: report.flatMap((s) => s.rows.filter((r) => r.flagged).map((r) => r.column)),
          }),
        }).then(async (res) => {
          if (!res.ok) console.error("Hub response not ok:", res.status, await res.text().catch(() => ""));
          return res.ok;
        }),
      });
    }

    const results = await Promise.allSettled(operations.map((o) => o.promise));
    const succeeded = (kind: Channel) => {
      const r = results[operations.findIndex((o) => o.kind === kind)];
      if (r?.status === "rejected") console.error(`Submit API: ${kind} failed`, r.reason);
      return r?.status === "fulfilled" && r.value;
    };
    const emailSuccess = emailConfigured && succeeded("email");
    const sheetSuccess = !!googleSheetUrl && succeeded("sheet");
    const hubSuccess = hubConfigured && succeeded("hub");

    if (!emailSuccess && !sheetSuccess && !hubSuccess) {
      console.error("Submit API: every configured delivery channel failed");
      return NextResponse.json({ error: "Failed to submit the form. Please try again shortly." }, { status: 502 });
    }

    return NextResponse.json({ success: true, details: { email: emailSuccess, sheet: sheetSuccess, hub: hubSuccess } });
  } catch (error) {
    console.error("Submit API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
