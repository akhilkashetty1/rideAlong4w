/**
 * Form state, validation and the submission report.
 *
 * Pure functions with no React or Node imports — the wizard uses them in the
 * browser and app/api/submit re-runs them on the server, so what the line
 * manager reviews is exactly what gets emailed and logged to the Sheet.
 */
import {
  ASSESSMENT_SECTIONS,
  FORM_META,
  PARTICIPANT_FIELDS,
  VEHICLE_FIELDS,
  type FieldDef,
  type YesNo,
} from "@/lib/form-content";

export type Answer = { answer?: YesNo; remark: string };

export type FormState = {
  fields: Record<string, string>;
  /** Keyed `${sectionId}.${questionId}`. */
  answers: Record<string, Answer>;
  confirmed: boolean;
};

export type Errors = Record<string, string>;

export const answerKey = (sectionId: string, questionId: string) => `${sectionId}.${questionId}`;

/* ---------------------------------------------------------------- steps */

/** Same flow as the two-wheeler form: participant details sit at the top of the first assessment step. */
export type Step =
  | { kind: "assessment"; key: string; label: string; sectionId: string; withParticipant: boolean }
  | { kind: "vehicle"; key: "vehicle-details"; label: string }
  | { kind: "review"; key: "review"; label: string };

export const STEPS: Step[] = [
  ...ASSESSMENT_SECTIONS.map(
    (s, i): Step => ({ kind: "assessment", key: `section-${s.id}`, label: s.stepLabel, sectionId: s.id, withParticipant: i === 0 }),
  ),
  { kind: "vehicle", key: "vehicle-details", label: "Vehicle Details" },
  { kind: "review", key: "review", label: "Review" },
];

/* --------------------------------------------------------------- fields */

const ALL_FIELDS = [...PARTICIPANT_FIELDS, ...VEHICLE_FIELDS];

export function fieldOptions(field: FieldDef, fields: Record<string, string>): string[] {
  if (field.kind === "text") return [];
  if (Array.isArray(field.options)) return field.options;
  return field.options.map[fields[field.options.dependsOn]] ?? [];
}

export function isVisible(field: FieldDef, fields: Record<string, string>) {
  return !field.showIf || fields[field.showIf.field] === field.showIf.equals;
}

/** Sets a field and resets any select whose options depend on it and no longer include its value. */
export function applyFieldChange(fields: Record<string, string>, id: string, value: string) {
  const next = { ...fields, [id]: value };
  for (const f of ALL_FIELDS) {
    if (f.kind !== "select" || Array.isArray(f.options) || f.options.dependsOn !== id) continue;
    const opts = fieldOptions(f, next);
    if (!opts.includes(next[f.id])) next[f.id] = opts[0] ?? "";
  }
  return next;
}

export function initialState(): FormState {
  const fields: Record<string, string> = {};
  for (const f of ALL_FIELDS) {
    // Selects start on their first option; radios and text start empty so they're a deliberate choice.
    fields[f.id] = f.kind === "select" ? (fieldOptions(f, fields)[0] ?? "") : "";
  }
  const answers: Record<string, Answer> = {};
  for (const s of ASSESSMENT_SECTIONS) {
    for (const q of s.questions) {
      answers[answerKey(s.id, q.id)] = {
        answer: FORM_META.prefillExpectedAnswers ? (q.expected ?? "Yes") : undefined,
        remark: "",
      };
    }
  }
  return { fields, answers, confirmed: false };
}

/* ----------------------------------------------------------- validation */

function validateFields(defs: FieldDef[], fields: Record<string, string>, errors: Errors) {
  for (const f of defs) {
    if (!isVisible(f, fields)) continue;
    const v = (fields[f.id] ?? "").trim();
    if (f.required && !v) errors[f.id] = "This field is required";
    else if (v && f.kind !== "text" && !fieldOptions(f, fields).includes(v)) errors[f.id] = "Choose one of the options";
  }
}

export function validateStep(step: Step, state: FormState): Errors {
  const errors: Errors = {};
  if (step.kind === "assessment") {
    if (step.withParticipant) validateFields(PARTICIPANT_FIELDS, state.fields, errors);
    const section = ASSESSMENT_SECTIONS.find((s) => s.id === step.sectionId)!;
    for (const q of section.questions) {
      const key = answerKey(section.id, q.id);
      if (!state.answers[key]?.answer) errors[key] = "Choose Yes or No";
    }
  }
  if (step.kind === "vehicle") {
    validateFields(VEHICLE_FIELDS, state.fields, errors);
    if (!state.confirmed) errors.confirmed = "Please tick the confirmation";
  }
  return errors;
}

export function validateAll(state: FormState): Errors {
  return Object.assign({}, ...STEPS.map((s) => validateStep(s, state)));
}

/**
 * Turns an untrusted request body into a FormState — only known keys survive,
 * every string is trimmed and length-capped. Returns null when the shape is wrong.
 */
export function parseFormState(body: unknown): FormState | null {
  if (!body || typeof body !== "object") return null;
  const raw = body as { fields?: unknown; answers?: unknown; confirmed?: unknown };
  const rawFields = (raw.fields && typeof raw.fields === "object" ? raw.fields : {}) as Record<string, unknown>;
  const rawAnswers = (raw.answers && typeof raw.answers === "object" ? raw.answers : {}) as Record<string, unknown>;

  const fields: Record<string, string> = {};
  for (const f of ALL_FIELDS) {
    const v = rawFields[f.id];
    const max = f.kind === "text" ? (f.maxLength ?? 200) : 60;
    fields[f.id] = typeof v === "string" ? v.trim().slice(0, max) : "";
  }

  const answers: Record<string, Answer> = {};
  for (const s of ASSESSMENT_SECTIONS) {
    for (const q of s.questions) {
      const key = answerKey(s.id, q.id);
      const a = rawAnswers[key] as { answer?: unknown; remark?: unknown } | undefined;
      answers[key] = {
        answer: a?.answer === "Yes" || a?.answer === "No" ? a.answer : undefined,
        remark: typeof a?.remark === "string" ? a.remark.trim().slice(0, FORM_META.remarkMaxLength) : "",
      };
    }
  }

  return { fields, answers, confirmed: raw.confirmed === true };
}

/* --------------------------------------------------------------- report */

export type ReportRow = {
  /** Sheet column header. */
  column: string;
  label: string;
  value: string;
  remark?: string;
  flagged?: boolean;
};
export type ReportSection = { title: string; kind: "fields" | "assessment"; rows: ReportRow[] };

export const formatDateTime = (d: Date) =>
  d.toLocaleString("en-GB", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" });

function fieldRows(defs: FieldDef[], fields: Record<string, string>): ReportRow[] {
  return defs
    .filter((f) => isVisible(f, fields))
    .map((f) => ({ column: f.label, label: f.label, value: fields[f.id] || "Not provided" }));
}

export function buildReport(state: FormState, submittedAt = new Date()): ReportSection[] {
  return [
    {
      title: "Details",
      kind: "fields",
      rows: [
        { column: "Assessment Date", label: "Date", value: formatDateTime(submittedAt) },
        ...fieldRows(PARTICIPANT_FIELDS, state.fields),
      ],
    },
    ...ASSESSMENT_SECTIONS.map(
      (s): ReportSection => ({
        title: s.title,
        kind: "assessment",
        rows: s.questions.map((q, i) => {
          const a = state.answers[answerKey(s.id, q.id)];
          return {
            column: `${s.shortTitle} ${i + 1}. ${q.text}`,
            label: `${i + 1}. ${q.text}`,
            value: a?.answer ?? "Not answered",
            remark: a?.remark || "",
            flagged: a?.answer !== (q.expected ?? "Yes"),
          };
        }),
      }),
    ),
    {
      title: "Vehicle Details",
      kind: "fields",
      rows: [
        ...fieldRows(VEHICLE_FIELDS, state.fields),
        { column: "Line Manager Confirmed", label: "Line manager confirmation", value: state.confirmed ? "Yes" : "No" },
      ],
    },
  ];
}

export const countFlagged = (report: ReportSection[]) =>
  report.reduce((n, s) => n + s.rows.filter((r) => r.flagged).length, 0);

/** Flattens the report into Sheet columns. Assessment questions get an answer column and a remarks column. */
export function toSheetRow(report: ReportSection[]) {
  const headers: string[] = [];
  const values: string[] = [];
  for (const s of report) {
    for (const r of s.rows) {
      headers.push(r.column);
      values.push(r.value);
      if (s.kind === "assessment") {
        headers.push(`${r.column} — Remarks`);
        values.push(r.remark ?? "");
      }
    }
  }
  headers.push("Flagged Items");
  values.push(String(countFlagged(report)));
  return { headers, values };
}
