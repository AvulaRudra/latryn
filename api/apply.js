/*
 * Latryn: "Apply to the Lattice" backend (Vercel function, Microsoft 365 via Microsoft Graph).
 *
 * Two calls from apply.html:
 *   action "start"   validates the answers, opens a OneDrive upload session for the resume
 *                    and returns its upload URL plus a signed ticket naming the file
 *   (the browser uploads the resume straight to OneDrive, so the 10 MB file never passes
 *    through this function and its 4.5 MB request limit)
 *   action "finish"  checks the ticket and the uploaded file, adds a row to the Excel table,
 *                    emails the applicant a confirmation and the team a notification
 *
 * One call from the homepage contact form (index.html#contact-form):
 *   action "contact" adds a row to the Enquiries table in the same workbook and emails the team
 *
 * Settings come from Vercel environment variables (see .env.example and _source/EXCEL_SETUP.md).
 * Keep the option lists in step with QUALIFICATIONS etc. in _source/build_pages.py.
 */
const crypto = require("crypto");

const OPTIONS = {
  qualification: ["Diploma", "Bachelors", "Masters", "PhD"],
  stream: ["Science", "Commerce", "Arts", "Engineering", "Other"],
  availability: ["Part-time", "Full-time", "Weekends only"],
  work: ["Writing / Content", "Design", "Development", "Data / Research", "Teaching / Tutoring", "Other"],
  specialization: [
    "Physical Sciences (Physics, Chemistry, Astronomy, Earth Sciences)",
    "Life Sciences (Biology, Zoology, Botany, Genetics, Ecology)",
    "Health & Medical Sciences (Medicine, Nursing, Pharmacology, Neuroscience)",
    "Computing & Data (Computer Science, Data Analytics, AI, Cloud Computing)",
    "Development & Networks (Software Engineering, Web Development, Cybersecurity, Network Administration)",
    "Core Engineering (Mechanical, Electrical, Civil, Chemical)",
    "Advanced Engineering (Aerospace, Biomedical, Environmental, Robotics)",
    "Visual Arts (Graphic Design, Fine Arts, Painting, Photography, Sculpture)",
    "Media & Digital Arts (Animation, UI/UX Design, Game Design, Video Production, Digital Illustration)",
    "Performing Arts (Music Production, Sound Design, Theater, Choreography)",
    "Design & Architecture (Industrial Design, Fashion Design, Urban Planning, Architecture)",
    "Humanities & Communication (Technical Writing, Ethics in Technology, Language Arts, History)",
    "Pure Mathematics (Algebra, Calculus, Geometry, Number Theory)",
    "Applied Mathematics (Statistics, Actuarial Science, Cryptography, Quantitative Finance)",
    "Other"
  ]
};
const CONTACT = {
  type: ["Scope a program", "Book a call", "Talk to a researcher", "Talk to our team", "Talk to an expert", "Request the task library", "General question"],
  audience: ["AI Labs", "AI Platforms", "Enterprise AI", "Other"]
};
const MAX_BYTES = 10 * 1024 * 1024;
const TICKET_MS = 30 * 60 * 1000;
const GRAPH = "https://graph.microsoft.com/v1.0";

function env(k, fallback) { const v = (process.env[k] || "").trim(); return v || fallback || ""; }
function cfg() {
  return {
    tenant: env("AZURE_TENANT_ID"), client: env("AZURE_CLIENT_ID"), secret: env("AZURE_CLIENT_SECRET"),
    user: env("MS_USER"),                                    // mailbox and OneDrive owner, e.g. contact@latryn.com
    workbook: env("EXCEL_FILE_PATH", "Lattice/Lattice applications.xlsx"),
    table: env("EXCEL_TABLE", "Applications"),
    enquiries: env("ENQUIRY_TABLE", "Enquiries"),
    folder: env("RESUME_FOLDER", "Lattice/Resumes"),
    team: env("TEAM_EMAIL", env("MS_USER")),                 // "none" turns team notifications off
    replyTo: env("REPLY_TO", env("MS_USER")),
    site: env("SITE_URL", "https://latryn.com"),
    timeZone: env("TIME_ZONE", "Asia/Kolkata")
  };
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return send(res, 405, { ok: false, error: "Use POST." });
  const c = cfg();
  if (!c.tenant || !c.client || !c.secret || !c.user) {
    console.error("Missing AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET or MS_USER");
    return send(res, 503, { ok: false, error: "Applications are not open on this site yet." });
  }
  try {
    const d = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    if (d.website) return send(res, 200, { ok: true, uploadUrl: null, ticket: null });  // honeypot: a bot
    if (d.action === "contact") return send(res, 200, await contact(c, d));
    const a = validate(d);
    if (d.action === "start") return send(res, 200, await start(c, a, d.resume));
    if (d.action === "finish") return send(res, 200, await finish(c, a, d.ticket));
    fail("Unknown request.");
  } catch (err) {
    if (!err.userFacing) console.error(err);
    send(res, err.userFacing ? 400 : 500, { ok: false, error: err.userFacing ? err.message : "Something went wrong on our side. Please try again in a minute." });
  }
};

/* ---------- steps ---------- */

async function start(c, a, r) {
  r = r || {};
  const ext = ((String(r.name || "").match(/\.(pdf|docx?)$/i) || [])[0] || "").toLowerCase();
  if (!ext) fail("Please upload your resume as a PDF or Word document.");
  const size = Number(r.size);
  if (!(size > 0)) fail("Your resume file looks empty. Please choose it again.");
  if (size > MAX_BYTES) fail("Your resume is over 10 MB. Please upload a smaller file.");
  const name = [a.firstName, a.lastName].join("-").replace(/[^\w-]+/g, "").slice(0, 60) + "_" +
    stamp(c.timeZone).replace(/\D/g, "") + "_" + crypto.randomBytes(3).toString("hex") + ext;
  const session = await graph(c, "POST", `/users/${enc(c.user)}/drive/root:/${encPath(c.folder + "/" + name)}:/createUploadSession`,
    { item: { "@microsoft.graph.conflictBehavior": "fail" } });
  return { ok: true, uploadUrl: session.uploadUrl, ticket: sign(c, { name, size, email: a.email, exp: Date.now() + TICKET_MS }) };
}

async function finish(c, a, ticket) {
  const t = verify(c, ticket);
  if (!t || t.email !== a.email) fail("Your session expired. Please submit the form again.");
  let item;
  try { item = await graph(c, "GET", `/users/${enc(c.user)}/drive/root:/${encPath(c.folder + "/" + t.name)}`); }
  catch (e) { fail("We didn't receive your resume. Please submit the form again."); }
  if (item.size !== t.size) fail("Your resume didn't upload completely. Please submit the form again.");

  await graph(c, "POST", `/users/${enc(c.user)}/drive/root:/${encPath(c.workbook)}:/workbook/tables/${enc(c.table)}/rows/add`, {
    values: [[
      stamp(c.timeZone), safe(a.firstName), safe(a.lastName), safe(a.email), "'" + a.phone, a.qualification,
      a.specialization, a.stream, a.work.join(", "), a.availability, safe(a.portfolio),
      `=HYPERLINK("${String(item.webUrl).replace(/"/g, "%22")}","${t.name}")`, safe(a.role), "New"
    ]]
  });

  await mail(c, {
    to: a.email, subject: "We received your Lattice application", html: confirmationHtml(c, a), replyTo: c.replyTo
  });
  if (c.team && c.team !== "none") {
    const lines = summary(a).map(r => `<tr><td style="padding:4px 12px 4px 0;color:#66635e">${esc(r[0])}</td><td>${esc(r[1])}</td></tr>`).join("");
    await mail(c, {
      to: c.team, subject: `Lattice application | ${a.firstName} ${a.lastName}`, replyTo: a.email,
      html: `<table style="font:14px Arial,sans-serif">${lines}<tr><td style="padding:4px 12px 4px 0;color:#66635e">Resume</td><td><a href="${esc(item.webUrl)}">${esc(t.name)}</a></td></tr></table>`
    });
  }
  return { ok: true };
}

/* contact form: one row in the Enquiries table, then a team notification the team can reply to */
async function contact(c, d) {
  const str = (k, max) => String(d[k] == null ? "" : d[k]).trim().slice(0, max || 200);
  const q = {
    name: str("name", 120), email: str("email", 160).toLowerCase(), company: str("company", 160),
    type: str("type"), audience: str("audience"), timeline: str("timeline", 200), message: str("message", 5000)
  };
  if (!q.name) fail("Please enter your name.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(q.email)) fail("Please enter a valid email address.");
  if (!q.company) fail("Please enter your company.");
  if (!q.message) fail("Please tell us what you need.");
  if (!CONTACT.type.includes(q.type)) q.type = "General question";
  if (!CONTACT.audience.includes(q.audience)) q.audience = "Other";

  let saved = true;
  try {
    await graph(c, "POST", `/users/${enc(c.user)}/drive/root:/${encPath(c.workbook)}:/workbook/tables/${enc(c.enquiries)}/rows/add`, {
      values: [[stamp(c.timeZone), safe(q.name), safe(q.email), safe(q.company), q.type, q.audience, safe(q.timeline), safe(q.message), "New"]]
    });
  } catch (e) { saved = false; console.error(e); }  // still email the team, so the enquiry isn't lost
  if (!saved && (!c.team || c.team === "none")) throw new Error("Enquiry not saved and team email is off");
  if (c.team && c.team !== "none") {
    const rows = [["Name", q.name], ["Email", q.email], ["Company", q.company], ["I want to", q.type], ["We are", q.audience],
      ["Volume or timeline", q.timeline || "Not provided"], ["Message", q.message]];
    await mail(c, {
      to: c.team, subject: `${q.type} | ${q.company}${saved ? "" : " (not saved to Excel)"}`, replyTo: q.email,
      html: `<table style="font:14px Arial,sans-serif">${rows.map(r => `<tr><td style="padding:4px 12px 4px 0;color:#66635e;vertical-align:top">${esc(r[0])}</td><td style="white-space:pre-wrap">${esc(r[1])}</td></tr>`).join("")}</table>`
    });
  }
  return { ok: true };
}

/* ---------- validation ---------- */

function validate(d) {
  const str = (k, max) => String(d[k] == null ? "" : d[k]).trim().slice(0, max || 200);
  const a = {
    firstName: str("firstName", 80), lastName: str("lastName", 80), email: str("email", 160).toLowerCase(),
    phone: str("phone", 10), qualification: str("qualification"), stream: str("stream"),
    specialization: str("specialization"), availability: str("availability"),
    portfolio: str("portfolio", 300), role: str("role", 80),
    work: (Array.isArray(d.work) ? d.work : []).map(String).filter(w => OPTIONS.work.includes(w))
  };
  if (!a.firstName || !a.lastName) fail("Please enter your first and last name.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(a.email)) fail("Please enter a valid email address.");
  if (!/^[0-9]{10}$/.test(a.phone)) fail("Please enter a 10 digit phone number.");
  for (const k of ["qualification", "stream", "specialization", "availability"]) {
    if (!OPTIONS[k].includes(a[k])) fail(`Please choose a valid ${k}.`);
  }
  if (!a.work.length) fail("Please choose at least one type of work.");
  if (a.portfolio && !/^https?:\/\/\S+\.\S+/i.test(a.portfolio)) fail("Please enter a full portfolio link starting with https://");
  return a;
}

/* ---------- Microsoft Graph ---------- */

let cachedToken = null;  // reused while the function instance stays warm
async function token(c) {
  if (cachedToken && cachedToken.exp > Date.now() + 60000) return cachedToken.value;
  const r = await fetch(`https://login.microsoftonline.com/${enc(c.tenant)}/oauth2/v2.0/token`, {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: c.client, client_secret: c.secret, scope: "https://graph.microsoft.com/.default", grant_type: "client_credentials" })
  });
  const j = await r.json();
  if (!r.ok) throw new Error("Token request failed: " + (j.error_description || r.status));
  cachedToken = { value: j.access_token, exp: Date.now() + j.expires_in * 1000 };
  return cachedToken.value;
}

async function graph(c, method, path, body) {
  const r = await fetch(GRAPH + path, {
    method, headers: { Authorization: "Bearer " + await token(c), "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined
  });
  if (r.status === 202 || r.status === 204) return {};
  const text = await r.text();
  if (!r.ok) {
    /* 401/403 means Azure gave a token without the right permission: log what it does have */
    let roles = "";
    if (r.status === 401 || r.status === 403) {
      try { roles = " | app permissions in token: " + (JSON.parse(Buffer.from(cachedToken.value.split(".")[1], "base64url")).roles || ["none"]).join(", "); } catch (e) {}
      cachedToken = null;  // fetch a fresh token next time, in case consent was just granted
    }
    throw new Error(`Graph ${method} ${path} failed: ${r.status} ${text.slice(0, 300)}${roles}`);
  }
  return text ? JSON.parse(text) : {};
}

function mail(c, m) {
  return graph(c, "POST", `/users/${enc(c.user)}/sendMail`, {
    message: {
      subject: m.subject, body: { contentType: "HTML", content: m.html },
      toRecipients: [{ emailAddress: { address: m.to } }],
      replyTo: m.replyTo ? [{ emailAddress: { address: m.replyTo } }] : []
    },
    saveToSentItems: true
  });
}

/* ---------- ticket: ties the finish call to the file this function named ---------- */

function sign(c, payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return body + "." + crypto.createHmac("sha256", c.secret).update(body).digest("base64url");
}
function verify(c, ticket) {
  const [body, mac] = String(ticket || "").split(".");
  if (!body || !mac) return null;
  const want = crypto.createHmac("sha256", c.secret).update(body).digest();
  const got = Buffer.from(mac, "base64url");
  if (got.length !== want.length || !crypto.timingSafeEqual(got, want)) return null;
  const t = JSON.parse(Buffer.from(body, "base64url").toString());
  return t.exp > Date.now() ? t : null;
}

/* ---------- email ---------- */

function summary(a) {
  return [["Name", a.firstName + " " + a.lastName], ["Email", a.email], ["Phone", a.phone], ["Qualification", a.qualification],
    ["Stream", a.stream], ["Specialization", a.specialization], ["Type of work", a.work.join(", ")],
    ["Availability", a.availability], ["Portfolio", a.portfolio || "Not provided"]];
}

/* brand-matched: stone paper, ink text, verdigris button, one ember square */
function confirmationHtml(c, a) {
  const rows = summary(a).map(r =>
    `<tr><td style="padding:8px 0;color:#66635e;font:12px Menlo,monospace;letter-spacing:.06em;text-transform:uppercase;vertical-align:top;width:130px">${esc(r[0])}</td>` +
    `<td style="padding:8px 0;color:#110f0c;font:15px Arial,sans-serif">${esc(r[1])}</td></tr>`).join("");
  const step = (n, t) => `<p style="margin:0 0 8px;font:15px/1.5 Arial,sans-serif;color:#4a4743"><b style="font-family:Menlo,monospace;color:#110f0c">${n}</b>&nbsp; ${t}</p>`;
  return `<div style="background:#f5f2ec;padding:32px 16px"><div style="max-width:560px;margin:0 auto;background:#fbfaf7;border:1px solid #d7d4cd;border-radius:16px;padding:36px 32px">` +
    `<p style="margin:0 0 28px;font:700 26px Arial,sans-serif;letter-spacing:-.04em;color:#110f0c">latryn<span style="display:inline-block;width:6px;height:6px;background:#be4100;margin-left:2px"></span></p>` +
    `<p style="margin:0 0 8px;font:12px Menlo,monospace;letter-spacing:.1em;color:#66635e">APPLICATION RECEIVED</p>` +
    `<h1 style="margin:0 0 14px;font:700 28px/1.15 Arial,sans-serif;letter-spacing:-.02em;color:#110f0c">Thanks for applying, ${esc(a.firstName)}</h1>` +
    `<p style="margin:0 0 24px;font:16px/1.6 Arial,sans-serif;color:#4a4743">We received your application to the Lattice, the Latryn network of engineers, researchers and specialists.</p>` +
    `<table role="presentation" style="width:100%;border-collapse:collapse;border-top:1px solid #d7d4cd;border-bottom:1px solid #d7d4cd;margin:0 0 24px">${rows}</table>` +
    `<p style="margin:0 0 12px;font:700 17px Arial,sans-serif;color:#110f0c">What happens next</p>` +
    step("01", "Our team reviews your profile.") + step("02", "If it is a match, we email you a two-part timed assessment.") + step("03", "Pass it and you join the Lattice.") +
    `<p style="margin:28px 0 0"><a href="${esc(c.site)}/sample-tasks.html" style="display:inline-block;background:#056e5b;color:#fbfaf7;text-decoration:none;font:600 15px Arial,sans-serif;padding:13px 20px;border-radius:6px">See the kind of work we do</a></p>` +
    `<p style="margin:28px 0 0;font:14px/1.6 Arial,sans-serif;color:#66635e">Questions? Reply to this email.<br>The Latryn team</p></div></div>`;
}

/* ---------- helpers ---------- */

function stamp(tz) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" })
    .formatToParts(new Date()).map(x => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second}`;
}
/* Excel runs a cell that starts with = + - @ as a formula; a leading ' keeps it as text */
function safe(v) { return /^[=+\-@]/.test(v) ? "'" + v : v; }
function enc(s) { return encodeURIComponent(s); }
function encPath(p) { return p.split("/").filter(Boolean).map(encodeURIComponent).join("/"); }
function esc(s) { return String(s).replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch])); }
function fail(msg) { const e = new Error(msg); e.userFacing = true; throw e; }
function send(res, status, body) { res.status(status).setHeader("Cache-Control", "no-store"); res.json(body); }
