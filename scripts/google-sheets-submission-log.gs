/**
 * 4W Ride Along form → Google Sheets submission log.
 *
 * This is a Google Apps Script "Web App" — it does NOT run in this repo or
 * on Vercel. It runs inside Google, bound to a Google Sheet. Paste this into
 * the Sheet's Apps Script editor (Extensions → Apps Script), deploy it as a
 * Web App (Execute as: Me · Who has access: Anyone), and put the resulting
 * URL into GOOGLE_SHEET_WEBAPP_URL (see .env.example).
 *
 * Expects { headers: string[], values: string[] } from app/api/submit/route.ts.
 * Columns are matched by header name, so you never hand-maintain the header
 * row: an empty sheet gets one written, and when questions are added to
 * lib/form-content.ts the new columns are appended on the next submission.
 */
function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    var data = JSON.parse(e.postData.contents);

    var existing = sheet.getLastColumn() > 0
      ? sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String)
      : [];
    var missing = data.headers.filter(function (h) { return existing.indexOf(h) === -1; });
    if (missing.length) {
      sheet.getRange(1, existing.length + 1, 1, missing.length).setValues([missing]).setFontWeight("bold");
      existing = existing.concat(missing);
      sheet.setFrozenRows(1);
    }

    var row = existing.map(function (h) {
      var i = data.headers.indexOf(h);
      return i === -1 ? "" : data.values[i];
    });
    sheet.appendRow(row);

    return json({ result: "success" });
  } catch (err) {
    return json({ result: "error", error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

/** Visiting the deployed URL directly (GET) confirms it's live. */
function doGet() {
  return json({ status: "4W Ride Along submission log is live" });
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
