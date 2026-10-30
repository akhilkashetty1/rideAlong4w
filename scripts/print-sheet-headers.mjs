// Prints the Google Sheet header row this form sends, as ONE tab-separated line, so it can be pasted
// into cell A1 in one go (the tabs spread it across the columns):
//
//   npm run sheet-headers                      print it
//   npm run sheet-headers | pbcopy             copy it (macOS), then click A1 in the Sheet and paste
//   npm run sheet-headers -- --list            one heading per line, numbered (to read or compare)
//
// It reads lib/form-content.ts and lib/submission.ts directly, so it always matches the current form.
// Needs Node 22.6+ (it runs the TypeScript files as they are).
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "headers-"));
for (const f of ["form-content", "submission"]) {
  const src = fs.readFileSync(path.join(root, "lib", `${f}.ts`), "utf8").replaceAll('"@/lib/', '"./').replace(/from "\.\/(form-content|submission)"/g, 'from "./$1.ts"');
  fs.writeFileSync(path.join(tmp, `${f}.ts`), src);
}
const { ASSESSMENT_SECTIONS } = await import(path.join(tmp, "form-content.ts"));
const { initialState, answerKey, buildReport, toSheetRow } = await import(path.join(tmp, "submission.ts"));

// A form with every optional part switched on, so every column appears.
const state = initialState();
for (const id of Object.keys(state.fields)) state.fields[id] = "x";
state.fields.useSecondary = "Yes"; // the secondary-vehicle columns only appear for a "Yes"
for (const s of ASSESSMENT_SECTIONS) {
  for (const q of s.questions) {
    state.answers[answerKey(s.id, q.id)] = {
      answer: q.followUp?.when ?? "Yes",
      remark: "",
      ...(q.followUp ? { details: Object.fromEntries(q.followUp.fields.map((f) => [f.id, "2030-01-01"])) } : {}),
    };
  }
}
state.confirmed = true;
const { headers } = toSheetRow(buildReport(state));
const all = [...headers, "Received At"]; // the route adds this last column to every Sheet row
fs.rmSync(tmp, { recursive: true });

if (process.argv.includes("--list")) all.forEach((h, i) => console.log(`${String(i + 1).padStart(3)}. ${h}`));
else process.stdout.write(all.join("\t") + "\n");
