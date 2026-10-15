"use client";

import { useId, useState } from "react";
import { Info, TriangleAlert } from "lucide-react";
import { FORM_META, type FieldDef, type Question, type YesNo } from "@/lib/form-content";
import { fieldOptions, type Answer } from "@/lib/submission";
import { GripDiagram } from "@/components/SteeringWheel";
import { cn } from "@/lib/utils";

const inputClass =
  "w-full rounded-lg border border-line bg-paper-2 px-3.5 py-2.5 text-[0.95rem] text-ink outline-none transition-colors placeholder:text-muted focus:border-ink focus:bg-white focus:ring-2 focus:ring-neon/60 aria-[invalid=true]:border-brake";
const labelClass = "mb-1.5 block text-sm font-semibold text-ink";

export function ErrorText({ id, children }: { id?: string; children?: string }) {
  if (!children) return null;
  return (
    <p id={id} className="mt-1 text-xs font-medium text-brake">
      {children}
    </p>
  );
}

export function FieldInput({
  field,
  fields,
  error,
  onChange,
}: {
  field: FieldDef;
  fields: Record<string, string>;
  error?: string;
  onChange: (id: string, value: string) => void;
}) {
  const id = useId();
  const errId = `${id}-err`;
  const value = fields[field.id] ?? "";
  const common = { "aria-invalid": !!error, "aria-describedby": error ? errId : undefined };
  const label = (
    <>
      {field.label}
      {field.required && <span className="text-brake"> *</span>}
    </>
  );

  if (field.kind === "radio") {
    return (
      <fieldset {...common}>
        <legend className={labelClass}>{label}</legend>
        <div className="flex gap-2">
          {field.options.map((o) => (
            <label
              key={o}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                value === o ? "border-night bg-night text-neon" : "border-line bg-paper-2 hover:border-ink",
              )}
            >
              <input type="radio" name={field.id} value={o} checked={value === o} onChange={() => onChange(field.id, o)} className="sr-only" />
              {o}
            </label>
          ))}
        </div>
        <ErrorText id={errId}>{error}</ErrorText>
      </fieldset>
    );
  }

  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      {field.kind === "select" ? (
        <select id={id} value={value} onChange={(e) => onChange(field.id, e.target.value)} className={inputClass} {...common}>
          {fieldOptions(field, fields).map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
      ) : (
        <input
          id={id}
          type="text"
          value={value}
          maxLength={field.maxLength}
          placeholder={field.placeholder}
          onChange={(e) => onChange(field.id, e.target.value)}
          className={inputClass}
          {...common}
        />
      )}
      <ErrorText id={errId}>{error}</ErrorText>
    </div>
  );
}

/** One assessment question: Yes/No toggle, remarks, and the procedure on tap. */
export function QuestionRow({
  qkey,
  index,
  question,
  answer,
  error,
  active,
  onActivate,
  onAnswer,
  onRemark,
}: {
  /** `${sectionId}.${questionId}` — rows are found by it for the walkaround car and driver route. */
  qkey: string;
  active?: boolean;
  onActivate?: () => void;
  index: number;
  question: Question;
  answer?: Answer;
  error?: string;
  onAnswer: (v: YesNo) => void;
  onRemark: (v: string) => void;
}) {
  const [showGuide, setShowGuide] = useState(false);
  const groupId = useId();
  const expected = question.expected ?? "Yes";
  const flagged = !!answer?.answer && answer.answer !== expected;
  const remark = answer?.remark ?? "";

  return (
    <div
      id={`q-${qkey}`}
      data-qkey={qkey}
      onFocusCapture={onActivate}
      onPointerDown={onActivate}
      className={cn(
        "print-avoid-break relative scroll-mt-24 rounded-xl border bg-paper p-3.5 transition-[border-color,box-shadow] sm:p-4",
        flagged ? "border-brake/60 shadow-[inset_4px_0_0_var(--color-brake)]" : "border-line",
        active && !flagged && "border-ink/50 shadow-[0_0_0_3px_rgba(223,226,43,.55)]",
        active && flagged && "shadow-[inset_4px_0_0_var(--color-brake),0_0_0_3px_rgba(193,39,45,.3)]",
        error && "border-brake",
      )}
    >
      <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-start">
        <div className="flex gap-3">
          <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-night text-xs font-bold text-neon">{index + 1}</span>
          <div className="min-w-0">
            <p id={groupId} className="text-[0.95rem] font-semibold leading-snug">
              {question.text}
            </p>
            <button
              type="button"
              onClick={() => setShowGuide((s) => !s)}
              aria-expanded={showGuide}
              className="no-print mt-1 inline-flex items-center gap-1 text-xs font-medium text-ink-soft underline-offset-2 hover:text-ink hover:underline"
            >
              <Info className="h-3.5 w-3.5" />
              {showGuide ? "Hide procedure" : "How to check"}
            </button>
            {showGuide && (
              <div className="step-in mt-2 rounded-lg bg-paper-2 px-3 py-2 text-[0.82rem] text-ink-soft">
                {question.guideline}
                {question.illustration === "steering-grip" && <GripDiagram className="mt-2" />}
              </div>
            )}
          </div>
        </div>

        <div role="radiogroup" aria-labelledby={groupId} className="flex gap-2 pl-10 md:pl-0">
          {(["Yes", "No"] as const).map((v) => {
            const active = answer?.answer === v;
            const bad = v !== expected;
            return (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => {
                  if (bad && !active) navigator.vibrate?.(40);
                  onAnswer(v);
                }}
                className={cn(
                  "min-w-[4.5rem] rounded-full border px-4 py-2 text-sm font-semibold transition-all active:scale-95",
                  !active && "border-line bg-paper-2 text-ink-soft hover:border-ink hover:text-ink",
                  active && !bad && "border-ok bg-ok text-white shadow-[0_6px_16px_-8px_var(--color-ok)]",
                  active && bad && "border-brake bg-brake text-white shadow-[0_6px_16px_-6px_var(--color-brake)]",
                )}
              >
                {v}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-3 pl-10">
        {flagged && (
          <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-brake">
            <TriangleAlert className="h-3.5 w-3.5" /> Flagged — add a remark for follow-up
          </p>
        )}
        <div className="relative">
          <textarea
            value={remark}
            onChange={(e) => onRemark(e.target.value)}
            maxLength={FORM_META.remarkMaxLength}
            rows={1}
            placeholder="Remarks..."
            aria-label={`Remarks for question ${index + 1}`}
            className={cn(inputClass, "min-h-[2.75rem] resize-y py-2 pr-14 text-sm")}
          />
          <span className="pointer-events-none absolute bottom-2 right-3 text-[0.65rem] text-muted">
            {remark.length}/{FORM_META.remarkMaxLength}
          </span>
        </div>
        <ErrorText>{error}</ErrorText>
      </div>
    </div>
  );
}
