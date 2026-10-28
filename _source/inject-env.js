/* Vercel build step: writes APPLY_ENDPOINT into assets/site.js.
   Reads it from the Vercel project's Environment Variables first, then from
   build.env.APPLY_ENDPOINT in vercel.json. The value ends up in the public page
   (the browser posts to it), so it is config, not a secret.
   Run: node _source/inject-env.js  (vercel.json runs it on every deploy) */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const file = path.join(root, "assets", "site.js");
function fromJson() {
  try { return ((JSON.parse(fs.readFileSync(path.join(root, "vercel.json"), "utf8")).build || {}).env || {}).APPLY_ENDPOINT || ""; }
  catch (e) { return ""; }
}
const url = (process.env.APPLY_ENDPOINT || fromJson()).trim();

if (!url) {
  console.log("APPLY_ENDPOINT not set: the application form uses the email fallback");
  process.exit(0);
}
if (!/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(url)) {
  console.error("APPLY_ENDPOINT should look like https://script.google.com/macros/s/<id>/exec");
  process.exit(1);
}

const src = fs.readFileSync(file, "utf8");
const out = src.replace(/applyEndpoint: "[^"]*"/, "applyEndpoint: " + JSON.stringify(url));
if (out === src && !src.includes(JSON.stringify(url))) {
  console.error("Could not find applyEndpoint in assets/site.js");
  process.exit(1);
}
fs.writeFileSync(file, out);
console.log("applyEndpoint set from APPLY_ENDPOINT");
