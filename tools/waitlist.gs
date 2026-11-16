/**
 * Sandooq waitlist: receives the form on /waitlist/ and keeps one row per email
 * in the Google Sheet this script is attached to.
 *
 * Setup (once):
 *   1. New Google Sheet, e.g. "Sandooq waitlist" (in the account that should own the list).
 *   2. Extensions → Apps Script, replace the code with this file, save.
 *   3. Deploy → New deployment → type "Web app":
 *        Execute as: Me    Who has access: Anyone
 *      Authorise it, copy the URL ending in /exec.
 *   4. Put that URL in ENDPOINT in waitlist/waitlist.js.
 *   After changing this code: Deploy → Manage deployments → edit → Version: New version
 *   (keeps the same URL).
 *
 * The site sends JSON as text/plain (no CORS preflight). Same email again =
 * that row is updated, so retries never make duplicates. Only what the form
 * asks for is stored: no IP address, browser or device details.
 */

var SHEET_NAME = 'Waitlist';
var HEADERS = ['Joined', 'Updated', 'Email', 'Name', 'Phone', 'Country', 'Language',
  'Documents', 'Early tester', 'Came from', 'Invited to test', 'Notes'];

var PHONES = ['android', 'iphone'];
var COUNTRIES = ['india', 'uae', 'saudi', 'qatar', 'kuwait', 'oman', 'bahrain', 'other'];
var LANGUAGES = ['en', 'ml', 'kn', 'ta', 'hi', 'ar'];
var DOCS = ['passports', 'aadhaar_pan', 'gulf_id', 'certificates', 'property_vehicle',
  'medical', 'insurance_bank', 'passwords'];
var MAX_ROWS = 20000; // stop a flood from filling the sheet

function doPost(e) {
  var data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch (err) {
    return reply({ ok: false, error: 'bad_request' });
  }
  if (!data || typeof data !== 'object') return reply({ ok: false, error: 'bad_request' });

  // Honeypot: bots fill the hidden field. Say yes, store nothing.
  if (data.website) return reply({ ok: true });

  var email = String(data.email || '').trim().toLowerCase();
  if (email.length > 254 || /^[=+\-@]/.test(email) ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return reply({ ok: false, error: 'email' });
  }

  var phone = pick(data.phone, PHONES);
  var row = {
    email: email,
    name: clean(data.name, 80),
    phone: phone,
    country: pick(data.country, COUNTRIES),
    language: pick(data.language, LANGUAGES),
    docs: (Array.isArray(data.docs) ? data.docs : [])
      .filter(function (d) { return DOCS.indexOf(d) >= 0; })
      .filter(function (d, i, a) { return a.indexOf(d) === i; })
      .join(', '),
    tester: data.tester === true && phone !== 'iphone' ? 'yes' : '',
    ref: clean(String(data.ref || '').toLowerCase().replace(/[^a-z0-9_-]/g, ''), 32)
  };

  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return reply({ ok: false, error: 'busy' });
  try {
    var sheet = sheetFor();
    var now = new Date();
    var found = findRow(sheet, email);
    if (found) {
      // Keep Joined, Came from (first source wins), Invited to test and Notes.
      sheet.getRange(found, 2).setValue(now);
      sheet.getRange(found, 4, 1, 6).setValues([[
        row.name, row.phone, row.country, row.language, row.docs, row.tester
      ]]);
      return reply({ ok: true, again: true });
    }
    if (sheet.getLastRow() > MAX_ROWS) return reply({ ok: false, error: 'full' });
    sheet.appendRow([now, now, row.email, row.name, row.phone, row.country, row.language,
      row.docs, row.tester, row.ref, '', '']);
    return reply({ ok: true });
  } finally {
    lock.releaseLock();
  }
}

function doGet() {
  return reply({ ok: true, service: 'sandooq-waitlist' });
}

function sheetFor() {
  var book = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = book.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = book.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
    // Text format so Sheets never reads an answer as a formula or a number.
    sheet.getRange('C:L').setNumberFormat('@');
  }
  return sheet;
}

function findRow(sheet, email) {
  var last = sheet.getLastRow();
  if (last < 2) return 0;
  var hit = sheet.getRange(2, 3, last - 1, 1)
    .createTextFinder(email).matchEntireCell(true).matchCase(false).findNext();
  return hit ? hit.getRow() : 0;
}

function pick(value, allowed) {
  return allowed.indexOf(value) >= 0 ? value : '';
}

// Free text: trimmed, shortened, no control characters, and never starting with
// a character a spreadsheet would treat as a formula.
function clean(value, max) {
  var s = String(value || '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function reply(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
