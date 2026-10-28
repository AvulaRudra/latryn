/* Vercel build step: writes the APPLY_ENDPOINT environment variable into assets/site.js.
   Set it in Vercel > Project > Settings > Environment Variables. The value ends up in the
   public page (the browser posts to it), so this keeps config out of git, not secret.
   Run: node _source/inject-env.js  (vercel.json runs it on every deploy) */
const fs = require("fs");
const path = require("path");

const file = path.join(__dirname, "..", "assets", "site.js");
const url = (process.env.APPLY_ENDPOINT || "").trim();

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
