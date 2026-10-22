# Four Wheeler Ride Along Form

Line-manager ride-along assessment for **four wheelers**: the 4W sibling of
[`ride-along-form`](https://github.com/rideAlongProject/ride-along-form) (2W).
Same flow as the 2W form (cover → guidelines → vehicle → driver → vehicle
details → review → thank you), with the client's 4W content, poster art and
colour theme.

Its architecture follows **roadshield**. It is one Next.js app with the backend as
an API route, so the separate Express server (`rideAlongBackend`) isn't needed.

## The 4W experience

The content and flow match 2W. The 4W version presents them as a real car would:

| Where | What |
|---|---|
| Landing | **Push-to-start** button. Pressing it sweeps the gauges and lights every warning lamp (a bulb check), then moves on. Behind it is a three.js neon road based on the cover art. |
| Vehicle Assessment | **3D walkaround**: a procedurally built SUV on a turntable. Each question is a pin on its part. The car turns to the active question and that part reacts: indicators blink, headlights flash, wipers sweep, the horn sends out a sound ring, brake lights pulse. Drag to spin; tap a pin to jump to its question. |
| Driver Assessment | **The drive**: questions sit along a road and a top-view car drives to the active one. Clear answers leave green cat's-eyes; flagged behaviour leaves a hazard triangle. |
| Header | Instrument cluster: a speedometer for progress, a 3D steering wheel that turns as you go and shakes on a flagged answer, and **dashboard warning lights** that come on for each flagged check. |
| Review | A plain summary of every answer, section by section (dates and remarks included), then Print, Download as PDF and Submit. Kept deliberately simple at the client's request. |
| Offline | No signal at Submit? The assessment is saved on the device (`lib/outbox.ts`) and sent automatically when the connection returns. The Sheet keeps the original assessment time and the time it was received. |
| Install | Web app manifest, so it can be added to the home screen. Flagged answers buzz on phones that support vibration. |

Icons and car parts for each question live in `lib/question-visuals.tsx`, so `lib/form-content.ts` stays pure copy.
All motion respects `prefers-reduced-motion`. The 3D views only add to the form, which works without them.

## Tech stack

| | |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI | React 19, TypeScript |
| Styling | Tailwind CSS v4 (`@theme` tokens in `app/globals.css`) |
| 3D | three.js, loaded on demand (landing road, header steering wheel) |
| PDF | jsPDF, loaded on demand |
| Email | Brevo (transactional API) |
| Log | Google Sheets via an Apps Script Web App |
| Hosting | Vercel |

## Local development

```bash
npm install
npm run dev      # http://localhost:3300
```

## Environment variables

Copy `.env.example` to `.env.local`. Set the same variables in Vercel for production.

| Variable | Required | Purpose |
|---|---|---|
| `BREVO_API_KEY` | for email | Brevo v3 API key |
| `BREVO_SENDER_EMAIL` | for email | Verified sender address in Brevo |
| `BREVO_SENDER_NAME` | no | Display name on outgoing email |
| `ADMIN_EMAIL_PRIMARY` | for email | Inbox that receives each submission |
| `ADMIN_EMAIL_CC` | no | Optional CC |
| `GOOGLE_SHEET_WEBAPP_URL` | for Sheet log | Apps Script Web App URL |
| `HUB_INGEST_URL` | for the hub | `https://<hub-domain>/api/ingest/4w` |
| `HUB_INGEST_KEY` | for the hub | The hub's `INGEST_KEY_4W` |

At least one channel (email, Sheet or hub) must be configured. A submission
succeeds if any configured channel accepts it. The hub is the database and admin
login shared with the 2W form and RoadShield; the Sheet stays as a backup.

**Sheet setup:** create a Google Sheet, open Extensions → Apps Script, paste
`scripts/google-sheets-submission-log.gs`, and deploy it as a Web App
(Execute as: Me, Who has access: Anyone). The script writes the header row
itself and adds new columns when questions are added.

## Project structure

```
app/
  page.tsx                  cover poster + Start (neon road backdrop)
  guidelines/[section]/     one guidelines page per assessment section
  assessment/               the form wizard
  api/submit/               validates, then emails (Brevo) + logs (Sheets)
components/
  form/                     wizard, question rows, review, driver route, telltales
  three/                    NeonRoad, SteeringWheel3D
lib/
  form-content.ts           ALL questions, guidelines and fields
  submission.ts             state, validation, report: shared by client and server
  pdf.ts                    Download-as-PDF
scripts/
  google-sheets-submission-log.gs
public/images/              cover, thank-you poster, Safe Rider logo
```

**Editing content:** everything lives in `lib/form-content.ts`. The guidelines
pages, form, review, PDF, email and Sheet columns are all generated from it.

## How a submission flows

1. The browser posts raw answers (`fields`, `answers`, `confirmed`) to `/api/submit`.
2. The server re-parses them, keeping known keys only and capping lengths, then
   re-validates with the same `lib/submission.ts` the form uses.
3. It builds the report once. The email (HTML-escaped, flagged answers in red)
   and the Sheet row both come from that report.

## Every answer is a deliberate choice

At the client's request, nothing on the form is pre-filled (`FORM_META.prefillExpectedAnswers: false`):

- Every Yes/No question starts with neither button chosen, and **Next** is refused until all of a step's
  questions are answered. Unanswered cards have a dashed border; on a refused Next they turn red, a banner
  counts them and the page scrolls to the first one. Each step shows "X of Y answered", and a first answer
  glides to the next unanswered question. Remarks stay optional.
- Vehicle Details asks only for the four wheeler itself: Fuel Type (starts on "Select…"), Vehicle Number,
  Manufacturer and Model, all required. There is no primary/secondary vehicle on this form.
- **Documents question:** answering **Yes** opens two required date pickers, *Driving licence valid till*
  and *Insurance valid till* (`followUp` on the question in `lib/form-content.ts`). A date in the past is
  refused with "If the document has expired, answer No". The dates appear on the review, PDF and email and
  as two extra Sheet/hub columns (`… — Driving licence valid till`, `… — Insurance valid till`); the Sheet
  script adds new columns by itself.
- **Older submissions still go through.** The form sends `formVersion: 2`; a submission saved offline by the
  previous version (no `formVersion`) is checked by the old rules, so it isn't rejected when it's finally
  sent. Dates are judged against the day the assessment was done, not the day it was sent.

## The Google Sheet's heading row

The Sheet script matches columns **by heading text**, so the headings must match what the form sends exactly.
`scripts/sheet-headers.tsv` is the complete row (72 columns, ending with `Received At`) as one tab-separated line, and
`npm run sheet-headers` regenerates it from the current form (add `-- --list` for a numbered list). To paste it in one go:

```bash
tr -d '\n' < scripts/sheet-headers.tsv | LC_ALL=en_US.UTF-8 pbcopy   # then click A1 in the Sheet and paste
```

Use that exact command: without the UTF-8 setting the long dash in "— Remarks" turns into garbage characters, and the
script then adds a second, correct set of columns. The script writes to the **first tab**; when the headings change, keep the
old tab as an archive (move it to the end) and paste the new row into a new first tab, since old rows don't line up
under new headings.
