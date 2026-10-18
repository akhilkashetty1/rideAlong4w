"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { ArrowLeft, ArrowRight, CircleAlert, CloudUpload, Download, Hand, Loader2, Printer, RotateCcw, Send } from "lucide-react";
import thankYou from "@/public/images/thank-you.jpg";
import { ASSESSMENT_SECTIONS, FORM_META, PARTICIPANT_FIELDS, VEHICLE_FIELDS, type AssessmentSection, type YesNo } from "@/lib/form-content";
import { QUESTION_VISUALS } from "@/lib/question-visuals";
import {
  FORM_VERSION,
  STEPS,
  answerKey,
  detailKey,
  todayIST,
  applyFieldChange,
  buildReport,
  initialState,
  isVisible,
  validateStep,
  type Errors,
  type FormState,
} from "@/lib/submission";
import { enqueue, isNetworkError, postSubmission } from "@/lib/outbox";
import { downloadReportPdf } from "@/lib/pdf";
import FramedCard from "@/components/FramedCard";
import PosterBand from "@/components/PosterBand";
import { buttonStyles } from "@/components/Buttons";
import { Speedometer, StepPills } from "@/components/form/Dashboard";
import { FieldInput, QuestionRow } from "@/components/form/Fields";
import ReviewPanel from "@/components/form/ReviewPanel";
import TripReport from "@/components/form/TripReport";
import DriverRoute from "@/components/form/DriverRoute";
import { TelltaleStrip, type TelltaleItem } from "@/components/form/Telltales";
import SteeringWheel3D from "@/components/three/SteeringWheel3D";
import WalkaroundCar, { type CarPin, type PinState } from "@/components/three/WalkaroundCar";
import { cn } from "@/lib/utils";

// v2: answers no longer start pre-filled, so drafts saved by the old version are not restored.
const DRAFT_KEY = "ride-along-4w:draft:v2";
const PILL_LABELS = STEPS.filter((s) => s.kind !== "review").map((s) => s.label);

export default function AssessmentWizard() {
  const [state, setState] = useState<FormState>(initialState);
  const [stepIndex, setStepIndex] = useState(0);
  const [errors, setErrors] = useState<Errors>({});
  const [done, setDone] = useState<false | "sent" | "queued">(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [nudge, setNudge] = useState({ n: 0, alert: false });
  const [dirty, setDirty] = useState(false);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const restored = useRef(false);
  const [today] = useState(todayIST);
  const topRef = useRef<HTMLDivElement>(null);

  const step = STEPS[stepIndex];
  const report = useMemo(() => buildReport(state), [state]);
  const progress = done ? 1 : stepIndex / STEPS.length;

  // Per-question view model shared by the car pins, the driver road and the warning lamps.
  const checks = useMemo(
    () =>
      ASSESSMENT_SECTIONS.map((s) => ({
        section: s,
        items: s.questions.map((q, i) => {
          const key = answerKey(s.id, q.id);
          const answer = state.answers[key]?.answer;
          const pinState: PinState = !answer ? "unanswered" : answer === (q.expected ?? "Yes") ? "ok" : "flagged";
          return { key, number: i + 1, label: q.text, state: pinState, part: QUESTION_VISUALS[key]?.part };
        }),
      })),
    [state.answers],
  );
  const allItems = checks.flatMap((c) => c.items);
  const telltales: TelltaleItem[] = allItems.map((i) => ({ key: i.key, label: i.label, flagged: i.state === "flagged" }));
  const pinsFor = (sectionId: string): CarPin[] =>
    (checks.find((c) => c.section.id === sectionId)?.items ?? []).flatMap((i) => (i.part ? [{ ...i, part: i.part }] : []));
  const clearCount = allItems.filter((i) => i.state === "ok").length;

  // A line manager on a phone can lose the tab mid-drive — keep a draft for this browser session.
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(DRAFT_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time restore after hydration
      if (saved) setState({ ...initialState(), ...JSON.parse(saved), confirmed: false });
    } catch {}
    restored.current = true;
  }, []);
  useEffect(() => {
    if (!restored.current || done) return;
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(state));
    } catch {}
  }, [state, done]);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty && !done) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, done]);

  useEffect(() => {
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [stepIndex, done]);

  // The question crossing the middle of the screen is the active one — the car turns to it, the road car drives to it.
  useEffect(() => {
    const rows = document.querySelectorAll<HTMLElement>("[data-qkey]");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset when the step changes
    setActiveKey(rows[0]?.dataset.qkey ?? null);
    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries.find((e) => e.isIntersecting);
        if (hit) setActiveKey((hit.target as HTMLElement).dataset.qkey ?? null);
      },
      { rootMargin: "-42% 0px -52% 0px" },
    );
    rows.forEach((r) => io.observe(r));
    return () => io.disconnect();
  }, [stepIndex, done]);

  const update = (fn: (s: FormState) => FormState) => {
    setDirty(true);
    setState(fn);
  };
  const clearError = (key: string) => setErrors((e) => (key in e ? Object.fromEntries(Object.entries(e).filter(([k]) => k !== key)) : e));

  const setField = (id: string, value: string) => {
    update((s) => ({ ...s, fields: applyFieldChange(s.fields, id, value) }));
    clearError(id);
  };
  const setAnswer = (key: string, value: YesNo, expected: YesNo) => {
    const firstTime = !state.answers[key]?.answer;
    update((s) => ({ ...s, answers: { ...s.answers, [key]: { ...s.answers[key], remark: s.answers[key]?.remark ?? "", answer: value } } }));
    setNudge((n) => ({ n: n.n + 1, alert: value !== expected }));
    setActiveKey(key);
    clearError(key);

    // Guide the line manager through every question: after a first answer, glide to the next
    // unanswered one, unless this answer opened follow-up boxes that need filling here.
    const section = ASSESSMENT_SECTIONS.find((s) => key.startsWith(`${s.id}.`));
    const q = section?.questions.find((x) => answerKey(section.id, x.id) === key);
    if (!firstTime || !section || (q?.followUp && q.followUp.when === value)) return;
    const next = section.questions.map((x) => answerKey(section.id, x.id)).find((k) => k !== key && !state.answers[k]?.answer);
    if (next) setTimeout(() => document.getElementById(`q-${next}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 280);
  };
  const setDetail = (key: string, fieldId: string, value: string) => {
    update((s) => ({
      ...s,
      answers: { ...s.answers, [key]: { ...s.answers[key], details: { ...s.answers[key]?.details, [fieldId]: value } } },
    }));
    clearError(detailKey(key, fieldId));
  };
  const setRemark = (key: string, remark: string) =>
    update((s) => ({ ...s, answers: { ...s.answers, [key]: { ...s.answers[key], remark } } }));

  const selectPin = (key: string) => {
    setActiveKey(key);
    document.getElementById(`q-${key}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const goNext = () => {
    const errs = validateStep(step, state, { today });
    setErrors(errs);
    if (Object.keys(errs).length) {
      // Take them to the first thing still missing: a question with no answer, a date, or a field.
      requestAnimationFrame(() => {
        const first = document.querySelector<HTMLElement>('[data-error="true"], [aria-invalid="true"]');
        first?.scrollIntoView({ behavior: "smooth", block: "center" });
        const input = first?.matches("input, select, textarea") ? first : first?.querySelector<HTMLElement>('[aria-invalid="true"]');
        input?.focus({ preventScroll: true });
      });
      return;
    }
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  };
  const goBack = () => {
    setErrors({});
    setStepIndex((i) => Math.max(i - 1, 0));
  };

  async function submit() {
    setSubmitting(true);
    setSubmitError(null);
    const payload = {
      formVersion: FORM_VERSION,
      fields: state.fields,
      answers: state.answers,
      confirmed: state.confirmed,
      completedAt: new Date().toISOString(),
    };
    const finish = (how: "sent" | "queued") => {
      try {
        sessionStorage.removeItem(DRAFT_KEY);
      } catch {}
      setDirty(false);
      setDone(how);
    };
    try {
      const res = await postSubmission(payload);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Something went wrong. Please try again.");
      }
      finish("sent");
    } catch (err) {
      // No signal on the road: keep it on the device and send it later instead of losing it.
      if (isNetworkError(err) && enqueue(payload)) finish("queued");
      else setSubmitError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const restart = () => {
    setDirty(false);
    setState(initialState());
    setErrors({});
    setStepIndex(0);
    setDone(false);
  };

  if (done) {
    return (
      <div ref={topRef} className="flex min-h-[80dvh] scroll-mt-6 flex-col items-center justify-center gap-6">
        <Image
          src={thankYou}
          alt={`Thank you — ${FORM_META.thankYou.line}. ${FORM_META.thankYou.sign}.`}
          placeholder="blur"
          priority
          sizes="(min-width: 768px) 520px, 90vw"
          className="drive-in h-auto w-[90vw] max-w-[520px] rounded-2xl shadow-[0_0_80px_-10px_rgba(193,39,45,.7)]"
        />
        {done === "queued" && (
          <p role="status" className="flex max-w-[520px] items-start gap-3 rounded-xl bg-night px-4 py-3 text-sm text-white ring-1 ring-az/60">
            <CloudUpload className="mt-0.5 h-5 w-5 shrink-0 text-az" />
            <span>
              <strong className="text-az">No signal right now — saved on this device.</strong> It will be sent automatically as soon as
              you&rsquo;re back online, whenever this form is open.
            </span>
          </p>
        )}
        <button type="button" onClick={restart} className={buttonStyles.next}>
          <RotateCcw className="h-4 w-4" />
          Start a new assessment
        </button>
      </div>
    );
  }

  const fieldErrors = Object.keys(errors).length;
  const unanswered = Object.values(errors).filter((e) => e === "Choose Yes or No").length;

  const questionList = (section: AssessmentSection) =>
    section.questions.map((q, i) => {
      const key = answerKey(section.id, q.id);
      return (
        <QuestionRow
          key={key}
          qkey={key}
          index={i}
          question={q}
          answer={state.answers[key]}
          error={errors[key]}
          active={activeKey === key}
          onActivate={() => setActiveKey(key)}
          onAnswer={(v) => setAnswer(key, v, q.expected ?? "Yes")}
          onRemark={(v) => setRemark(key, v)}
          onDetail={(fieldId, v) => setDetail(key, fieldId, v)}
          detailErrors={Object.fromEntries((q.followUp?.fields ?? []).map((f) => [f.id, errors[detailKey(key, f.id)]]))}
          today={today}
        />
      );
    });

  return (
    <div ref={topRef} className="scroll-mt-4">
      <FramedCard>
        <PosterBand className="-mx-4 -mt-4 mb-4 sm:-mx-7 sm:-mt-7 sm:mb-6">{FORM_META.title}</PosterBand>

        {/* Instrument cluster */}
        <div className="no-print mb-6 rounded-2xl bg-night px-2 py-3 sm:px-4">
          <div className="grid grid-cols-[4.5rem_1fr_4.5rem] items-center gap-2 sm:grid-cols-[6.5rem_1fr_6.5rem]">
            <Speedometer progress={progress} className="h-16 sm:h-24" />
            <StepPills labels={PILL_LABELS} current={Math.min(stepIndex, PILL_LABELS.length)} />
            <SteeringWheel3D progress={progress} nudge={nudge.n} alert={nudge.alert} className="h-16 sm:h-24" />
          </div>
          <div className="mt-2 border-t border-night-line pt-2">
            <TelltaleStrip items={telltales} />
          </div>
        </div>

        {fieldErrors > 0 && (
          <p role="alert" className="mb-4 flex items-center gap-2 rounded-lg bg-brake-wash px-3 py-2 text-sm font-medium text-brake">
            <CircleAlert className="h-4 w-4 shrink-0" />
            {unanswered > 0
              ? `${unanswered} question${unanswered === 1 ? " still needs" : "s still need"} a Yes or No${fieldErrors > unanswered ? ", and some details are missing" : ""}. Highlighted below.`
              : `Please complete the highlighted field${fieldErrors === 1 ? "" : "s"} before continuing.`}
          </p>
        )}

        <div key={step.key} className="step-in">
          {step.kind === "assessment" &&
            (() => {
              const section = ASSESSMENT_SECTIONS.find((s) => s.id === step.sectionId)!;
              const pins = pinsFor(section.id);
              return (
                <>
                  {step.withParticipant && (
                    <div className="mb-6 grid gap-4 rounded-xl border border-line bg-paper-2/60 p-4 sm:grid-cols-2">
                      {PARTICIPANT_FIELDS.map((f) => (
                        <FieldInput key={f.id} field={f} fields={state.fields} error={errors[f.id]} onChange={setField} />
                      ))}
                    </div>
                  )}
                  {(() => {
                    const total = section.questions.length;
                    const answered = section.questions.filter((q) => state.answers[answerKey(section.id, q.id)]?.answer).length;
                    return (
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <h2 className="text-lg font-bold">{section.title}</h2>
                        <span
                          className={cn(
                            "no-print rounded-full px-3 py-1 text-xs font-semibold tabular-nums transition-colors",
                            answered === total ? "bg-ok text-white" : "bg-night text-neon",
                          )}
                          aria-live="polite"
                        >
                          {answered === total ? `All ${total} answered` : `${answered} of ${total} answered`}
                        </span>
                      </div>
                    );
                  })()}

                  {pins.length > 0 ? (
                    // Walkaround: the car beside the checks (sticky on desktop)
                    <div className="lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-6">
                      <div className="no-print mb-4 lg:sticky lg:top-4 lg:mb-0 lg:self-start">
                        <WalkaroundCar pins={pins} activeKey={activeKey} onSelect={selectPin} className="h-64 sm:h-80 lg:h-[26rem]" />
                        <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-ink-soft">
                          <Hand className="h-3.5 w-3.5" /> Drag to walk around · tap a pin to jump to its check
                        </p>
                      </div>
                      <div className="space-y-3">{questionList(section)}</div>
                    </div>
                  ) : (
                    // The drive: driver behaviour checks along the road
                    <DriverRoute
                      activeKey={activeKey}
                      markers={(checks.find((c) => c.section.id === section.id)?.items ?? []).map((i) => ({ key: i.key, state: i.state }))}
                    >
                      <div className="space-y-3">{questionList(section)}</div>
                    </DriverRoute>
                  )}
                </>
              );
            })()}

          {step.kind === "vehicle" && (
            <>
              <h2 className="mb-3 text-lg font-bold">Vehicle Details</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {VEHICLE_FIELDS.filter((f) => isVisible(f, state.fields)).map((f) => (
                  <div key={f.id} className={cn(f.kind === "radio" && "sm:col-span-2")}>
                    <FieldInput field={f} fields={state.fields} error={errors[f.id]} onChange={setField} />
                  </div>
                ))}
              </div>
              <label
                className={cn(
                  "mt-6 flex cursor-pointer items-start gap-3 rounded-xl border p-4 text-sm",
                  errors.confirmed ? "border-brake bg-brake-wash" : "border-line bg-paper-2",
                )}
              >
                <input
                  type="checkbox"
                  checked={state.confirmed}
                  aria-invalid={!!errors.confirmed}
                  onChange={(e) => {
                    const confirmed = e.target.checked;
                    update((s) => ({ ...s, confirmed }));
                    clearError("confirmed");
                  }}
                  className="mt-0.5 h-5 w-5 shrink-0 accent-[#0a0c0f]"
                />
                <span className="font-medium">{FORM_META.confirmation}</span>
              </label>
            </>
          )}

          {step.kind === "review" && (
            <>
              <h2 className="mb-4 text-lg font-bold">Review Your Submission</h2>
              <TripReport
                clear={clearCount}
                total={allItems.length}
                pins={pinsFor("vehicle")}
                groups={checks.map((c) => ({ title: c.section.title, items: telltales.filter((t) => t.key.startsWith(`${c.section.id}.`)) }))}
              />
              <ReviewPanel report={report} />
              {submitError && (
                <p role="alert" className="mt-4 flex items-center gap-2 rounded-lg bg-brake-wash px-3 py-2 text-sm font-medium text-brake">
                  <CircleAlert className="h-4 w-4 shrink-0" />
                  {submitError}
                </p>
              )}
            </>
          )}
        </div>

        <nav className="no-print mt-8 flex flex-wrap items-center justify-center gap-3">
          {stepIndex > 0 && (
            <button type="button" onClick={goBack} className={buttonStyles.back} disabled={submitting}>
              <ArrowLeft className="h-4 w-4" />
              Previous
            </button>
          )}
          {step.kind === "review" ? (
            <>
              <button type="button" onClick={() => window.print()} className={buttonStyles.ghost}>
                <Printer className="h-4 w-4" />
                Print
              </button>
              <button
                type="button"
                onClick={() => downloadReportPdf(report, `4w-ride-along-${(state.fields.name || "assessment").replace(/\W+/g, "-")}.pdf`)}
                className={buttonStyles.ghost}
              >
                <Download className="h-4 w-4" />
                Download as PDF
              </button>
              <button type="button" onClick={submit} disabled={submitting} className={buttonStyles.next}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {submitting ? "Submitting…" : "Submit"}
              </button>
            </>
          ) : (
            <button type="button" onClick={goNext} className={buttonStyles.next}>
              {step.kind === "vehicle" ? "Submit and Preview" : "Next"}
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </nav>
      </FramedCard>
    </div>
  );
}
