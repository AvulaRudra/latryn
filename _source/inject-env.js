/* Vercel build step: turns on the application form's Microsoft 365 backend (api/apply.js).
   When the Azure app is configured in Vercel's Environment Variables, it points
   applyEndpoint in assets/site.js at /api/apply. Otherwise the form keeps its email fallback.
   Run: node _source/inject-env.js  (vercel.json runs it on every deploy) */
const fs = require("fs");
const path = require("path");

const file = path.join(__dirname, "..", "assets", "site.js");
const need = ["AZURE_TENANT_ID", "AZURE_CLIENT_ID", "AZURE_CLIENT_SECRET", "MS_USER"];
const missing = need.filter(k => !(process.env[k] || "").trim());

if (missing.length === need.length) {
  console.log("Microsoft 365 not configured: the application form uses the email fallback");
  process.exit(0);
}
if (missing.length) {
  console.error("Missing environment variables: " + missing.join(", ") + " (see .env.example)");
  process.exit(1);
}

const src = fs.readFileSync(file, "utf8");
const out = src.replace(/applyEndpoint: "[^"]*"/, 'applyEndpoint: "/api/apply"');
if (!/applyEndpoint: "\/api\/apply"/.test(out)) {
  console.error("Could not find applyEndpoint in assets/site.js");
  process.exit(1);
}
fs.writeFileSync(file, out);
console.log("applyEndpoint set to /api/apply");
