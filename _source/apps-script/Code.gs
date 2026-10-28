/**
 * Latryn: "Apply to the Lattice" backend (Google Apps Script web app).
 *
 * Receives applications from apply.html, then:
 *   1. saves the resume to a private Drive folder,
 *   2. appends one row to the "Applications" tab of the bound Google Sheet,
 *   3. emails the applicant a confirmation and the team a notification.
 *
 * Setup steps: see README.md in this folder.
 */

var CONFIG = {
  SHEET_NAME: 'Applications',
  FOLDER_NAME: 'Lattice resumes',
  TEAM_EMAIL: 'contact@latryn.com',      // gets a notification per application; '' to turn off
  REPLY_TO: 'contact@latryn.com',        // where applicant replies go
  SENDER_NAME: 'Latryn',
  SITE_URL: 'https://latryn.com',
  MAX_BYTES: 10 * 1024 * 1024
};

/* Script Properties (Project Settings > Script Properties) override the values above, so the
   email addresses can change without editing code: TEAM_EMAIL, REPLY_TO, SENDER_NAME, SITE_URL.
   Set TEAM_EMAIL to "none" to stop team notifications. */
(function () {
  var props = PropertiesService.getScriptProperties();
  ['TEAM_EMAIL', 'REPLY_TO', 'SENDER_NAME', 'SITE_URL'].forEach(function (k) {
    var v = props.getProperty(k);
    if (v != null && v.trim() !== '') CONFIG[k] = v.trim() === 'none' ? '' : v.trim();
  });
})();

var OPTIONS = {
  qualification: ['Diploma', 'Bachelors', 'Masters', 'PhD'],
  stream: ['Science', 'Commerce', 'Arts', 'Engineering', 'Other'],
  availability: ['Part-time', 'Full-time', 'Weekends only'],
  work: ['Writing / Content', 'Design', 'Development', 'Data / Research', 'Teaching / Tutoring', 'Other'],
  specialization: [
    'Physical Sciences (Physics, Chemistry, Astronomy, Earth Sciences)',
    'Life Sciences (Biology, Zoology, Botany, Genetics, Ecology)',
    'Health & Medical Sciences (Medicine, Nursing, Pharmacology, Neuroscience)',
    'Computing & Data (Computer Science, Data Analytics, AI, Cloud Computing)',
    'Development & Networks (Software Engineering, Web Development, Cybersecurity, Network Administration)',
    'Core Engineering (Mechanical, Electrical, Civil, Chemical)',
    'Advanced Engineering (Aerospace, Biomedical, Environmental, Robotics)',
    'Visual Arts (Graphic Design, Fine Arts, Painting, Photography, Sculpture)',
    'Media & Digital Arts (Animation, UI/UX Design, Game Design, Video Production, Digital Illustration)',
    'Performing Arts (Music Production, Sound Design, Theater, Choreography)',
    'Design & Architecture (Industrial Design, Fashion Design, Urban Planning, Architecture)',
    'Humanities & Communication (Technical Writing, Ethics in Technology, Language Arts, History)',
    'Pure Mathematics (Algebra, Calculus, Geometry, Number Theory)',
    'Applied Mathematics (Statistics, Actuarial Science, Cryptography, Quantitative Finance)',
    'Other'
  ]
};

var HEADERS = ['Submitted at', 'First name', 'Last name', 'Email', 'Phone', 'Qualification', 'Specialization',
  'Stream', 'Type of freelance work', 'Availability', 'Portfolio / LinkedIn', 'Resume', 'Role (from site)', 'Status'];

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    var d = JSON.parse(e.postData.contents);
    if (d.website) return json({ ok: true });            // honeypot field filled: a bot, drop silently
    var clean = validate(d);
    var file = saveResume(clean, d.resume);
    lock.waitLock(20000);
    var sheet = getSheet();
    sheet.appendRow([
      new Date(), safe(clean.firstName), safe(clean.lastName), safe(clean.email), "'" + clean.phone, clean.qualification,
      clean.specialization, clean.stream, clean.work.join(', '), clean.availability, safe(clean.portfolio),
      '=HYPERLINK("' + file.getUrl() + '","' + file.getName().replace(/"/g, '') + '")', safe(clean.role), 'New'
    ]);
    lock.releaseLock();
    sendConfirmation(clean);
    notifyTeam(clean, file);
    return json({ ok: true });
  } catch (err) {
    console.error(err);
    var msg = err && err.userFacing ? err.message : 'Something went wrong on our side. Please try again in a minute.';
    return json({ ok: false, error: msg });
  } finally {
    try { lock.releaseLock(); } catch (x) {}
  }
}

/* opening the web app URL in a browser shows this; handy to confirm the deployment works */
function doGet() { return json({ ok: true, service: 'Latryn Lattice applications' }); }

function validate(d) {
  function str(k, max) { return String(d[k] == null ? '' : d[k]).trim().slice(0, max || 200); }
  var c = {
    firstName: str('firstName', 80), lastName: str('lastName', 80), email: str('email', 160).toLowerCase(),
    phone: str('phone', 10), qualification: str('qualification'), stream: str('stream'),
    specialization: str('specialization'), availability: str('availability'),
    portfolio: str('portfolio', 300), role: str('role', 80),
    work: (Array.isArray(d.work) ? d.work : []).map(String)
  };
  if (!c.firstName || !c.lastName) fail('Please enter your first and last name.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(c.email)) fail('Please enter a valid email address.');
  if (!/^[0-9]{10}$/.test(c.phone)) fail('Please enter a 10 digit phone number.');
  ['qualification', 'stream', 'specialization', 'availability'].forEach(function (k) {
    if (OPTIONS[k].indexOf(c[k]) < 0) fail('Please choose a valid ' + k + '.');
  });
  c.work = c.work.filter(function (w) { return OPTIONS.work.indexOf(w) > -1; });
  if (!c.work.length) fail('Please choose at least one type of work.');
  if (c.portfolio && !/^https?:\/\/\S+\.\S+/i.test(c.portfolio)) fail('Please enter a full portfolio link starting with https://');
  if (!d.resume || !d.resume.data || !/\.(pdf|docx?)$/i.test(d.resume.name || '')) fail('Please upload your resume as a PDF or Word document.');
  return c;
}

function saveResume(c, r) {
  var bytes = Utilities.base64Decode(r.data);
  if (bytes.length > CONFIG.MAX_BYTES) fail('Your resume is over 10 MB. Please upload a smaller file.');
  var ext = (r.name.match(/\.(pdf|docx?)$/i) || ['.pdf'])[0].toLowerCase();
  var types = { '.pdf': 'application/pdf', '.doc': 'application/msword', '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' };
  var stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd-HHmmss');
  var name = [c.firstName, c.lastName].join('-').replace(/[^\w-]+/g, '') + '_' + stamp + ext;
  return getFolder().createFile(Utilities.newBlob(bytes, types[ext], name));
}

function sendConfirmation(c) {
  var subject = 'We received your Lattice application';
  var text = 'Hi ' + c.firstName + ',\n\nThanks for applying to the Lattice, the Latryn network of engineers, researchers and specialists.\n\n' +
    'Here is what you sent us:\n' + summary(c).map(function (r) { return '  ' + r[0] + ': ' + r[1]; }).join('\n') +
    '\n\nWhat happens next\n1. Our team reviews your profile.\n2. If it is a match, we email you a two-part timed assessment.\n3. Pass it and you join the Lattice.\n\n' +
    'Questions? Just reply to this email.\n\nThe Latryn team\n' + CONFIG.SITE_URL;
  MailApp.sendEmail({ to: c.email, subject: subject, body: text, htmlBody: emailHtml(c), name: CONFIG.SENDER_NAME, replyTo: CONFIG.REPLY_TO });
}

function notifyTeam(c, file) {
  if (!CONFIG.TEAM_EMAIL) return;
  var lines = summary(c).map(function (r) { return r[0] + ': ' + r[1]; });
  lines.push('Resume: ' + file.getUrl(), 'Sheet: ' + SpreadsheetApp.getActiveSpreadsheet().getUrl());
  MailApp.sendEmail({ to: CONFIG.TEAM_EMAIL, subject: 'Lattice application | ' + c.firstName + ' ' + c.lastName,
    body: lines.join('\n'), name: 'Latryn website', replyTo: c.email });
}

function summary(c) {
  return [['Name', c.firstName + ' ' + c.lastName], ['Email', c.email], ['Phone', c.phone], ['Qualification', c.qualification],
    ['Stream', c.stream], ['Specialization', c.specialization], ['Type of work', c.work.join(', ')],
    ['Availability', c.availability], ['Portfolio', c.portfolio || 'Not provided']];
}

/* brand-matched email: stone paper, ink text, verdigris accents, one ember square */
function emailHtml(c) {
  var rows = summary(c).map(function (r) {
    return '<tr><td style="padding:8px 0;color:#66635e;font:12px Menlo,monospace;letter-spacing:.06em;text-transform:uppercase;vertical-align:top;width:130px">' + esc(r[0]) +
      '</td><td style="padding:8px 0;color:#110f0c;font:15px Arial,sans-serif">' + esc(r[1]) + '</td></tr>';
  }).join('');
  function step(n, t) { return '<p style="margin:0 0 8px;font:15px/1.5 Arial,sans-serif;color:#4a4743"><b style="font-family:Menlo,monospace;color:#110f0c">' + n + '</b>&nbsp; ' + t + '</p>'; }
  return '<div style="background:#f5f2ec;padding:32px 16px"><div style="max-width:560px;margin:0 auto;background:#fbfaf7;border:1px solid #d7d4cd;border-radius:16px;padding:36px 32px">' +
    '<p style="margin:0 0 28px;font:700 26px Arial,sans-serif;letter-spacing:-.04em;color:#110f0c">latryn<span style="display:inline-block;width:6px;height:6px;background:#be4100;margin-left:2px"></span></p>' +
    '<p style="margin:0 0 8px;font:12px Menlo,monospace;letter-spacing:.1em;color:#66635e">APPLICATION RECEIVED</p>' +
    '<h1 style="margin:0 0 14px;font:700 28px/1.15 Arial,sans-serif;letter-spacing:-.02em;color:#110f0c">Thanks for applying, ' + esc(c.firstName) + '</h1>' +
    '<p style="margin:0 0 24px;font:16px/1.6 Arial,sans-serif;color:#4a4743">We received your application to the Lattice, the Latryn network of engineers, researchers and specialists.</p>' +
    '<table role="presentation" style="width:100%;border-collapse:collapse;border-top:1px solid #d7d4cd;border-bottom:1px solid #d7d4cd;margin:0 0 24px">' + rows + '</table>' +
    '<p style="margin:0 0 12px;font:700 17px Arial,sans-serif;color:#110f0c">What happens next</p>' +
    step('01', 'Our team reviews your profile.') + step('02', 'If it is a match, we email you a two-part timed assessment.') + step('03', 'Pass it and you join the Lattice.') +
    '<p style="margin:28px 0 0"><a href="' + CONFIG.SITE_URL + '/sample-tasks.html" style="display:inline-block;background:#056e5b;color:#fbfaf7;text-decoration:none;font:600 15px Arial,sans-serif;padding:13px 20px;border-radius:6px">See the kind of work we do</a></p>' +
    '<p style="margin:28px 0 0;font:14px/1.6 Arial,sans-serif;color:#66635e">Questions? Reply to this email.<br>The Latryn team</p>' +
    '</div></div>';
}

function getSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(CONFIG.SHEET_NAME) || ss.insertSheet(CONFIG.SHEET_NAME);
  if (sh.getLastRow() === 0) {
    sh.appendRow(HEADERS);
    sh.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold').setBackground('#110f0c').setFontColor('#f5f2ec');
    sh.setFrozenRows(1);
  }
  return sh;
}

function getFolder() {
  var props = PropertiesService.getScriptProperties(), id = props.getProperty('FOLDER_ID');
  if (id) { try { return DriveApp.getFolderById(id); } catch (x) {} }
  var folder = DriveApp.createFolder(CONFIG.FOLDER_NAME);
  props.setProperty('FOLDER_ID', folder.getId());
  return folder;
}

/* run once from the editor: creates the sheet tab and Drive folder and asks for permissions */
function setup() {
  getSheet(); getFolder();
  console.log('Ready. Sheet: ' + SpreadsheetApp.getActiveSpreadsheet().getUrl() + '  Folder: ' + getFolder().getUrl());
}

/* stops a value like =IMPORTXML(...) from running as a formula in the sheet */
function safe(v) { return /^[=+\-@]/.test(v) ? "'" + v : v; }
function esc(s) { return String(s).replace(/[&<>"']/g, function (ch) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]; }); }
function fail(msg) { var e = new Error(msg); e.userFacing = true; throw e; }
function json(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
