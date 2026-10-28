# Lattice applications backend (Google Sheets + email)

`apply.html` posts each application to a Google Apps Script web app (`Code.gs`). The script:

- saves the resume to a private Drive folder named **Lattice resumes**
- adds a row to the **Applications** tab of a Google Sheet, with a link to the resume
- emails the applicant a confirmation, and emails `TEAM_EMAIL` a notification

Emails are sent from the Google account that deploys the script. Deploy it from the account you want applicants to see (ideally the `contact@latryn.com` Google Workspace account). Daily sending limits: about 100 emails a day on a personal Gmail account, 1,500 on Workspace. Each application sends 2 emails.

## Set it up (about 10 minutes)

1. Create a new Google Sheet, for example "Latryn Lattice applications".
2. In the sheet, open **Extensions > Apps Script**.
3. Delete the starter code, paste in everything from `Code.gs`, and save.
4. Set the email addresses. Either edit the `CONFIG` block at the top of the code, or (no code edits) open **Project Settings** (gear icon) > **Script Properties** and add any of:

   | Property | What it does | Default |
   |---|---|---|
   | `TEAM_EMAIL` | Gets a notification for every application. `none` turns it off | `contact@latryn.com` |
   | `REPLY_TO` | Where applicant replies to the confirmation go | `contact@latryn.com` |
   | `SENDER_NAME` | The "from" name on the confirmation | `Latryn` |
   | `SITE_URL` | Used for the link in the confirmation | `https://latryn.com` |

   These are Google's equivalent of Vercel environment variables. Vercel can't set them, because the emails are sent by Google, not by the website. The actual "from" address is always the Google account that deploys the script. Changes apply to the next application, with no redeploy.
5. In the function menu choose **setup** and click **Run**. Approve the permissions (Sheets, Drive, send email). This creates the Applications tab and the resumes folder.
6. Click **Deploy > New deployment**, choose type **Web app**:
   - Execute as: **Me**
   - Who has access: **Anyone**
7. Click **Deploy** and copy the **Web app URL** (it ends in `/exec`).
8. Give the site that URL. Pick one:
   - **Vercel environment variable (recommended on Vercel):** in Vercel open Project > Settings > Environment Variables, add `APPLY_ENDPOINT` with the URL for Production (and Preview if you want previews to save applications too), then redeploy. `vercel.json` runs `_source/inject-env.js` on every deploy, which writes the value into `assets/site.js`. Nothing changes in git.
   - **In `vercel.json`:** put the URL in `build.env.APPLY_ENDPOINT` and push. The deploy script reads it from there if the Vercel dashboard has no `APPLY_ENDPOINT` (the dashboard value wins). Vercel calls `build.env` a legacy setting, which is why the script reads the file itself.
   - **In the code:** paste the URL into `applyEndpoint` in `_source/assets/site.js` and `assets/site.js`, then rebuild and publish:

     ```bash
     cd _source && python3 build.py && python3 check_site.py dist
     ```

   The URL is visible to visitors either way (their browser posts to it). The env var keeps it out of the repo and lets you change it without a commit.

9. Open the URL in a browser. It should show `{"ok":true,...}`. Then send a test application from `apply.html`.

Until `applyEndpoint` is set, the form falls back to opening the visitor's email app with their answers, and asks them to attach the resume by hand.

## Changing the script later

After editing `Code.gs`, go to **Deploy > Manage deployments**, edit the existing deployment and pick **New version**. This keeps the same URL. If you choose "New deployment" instead you get a new URL, and you have to update `APPLY_ENDPOINT` in Vercel (then redeploy) or `applyEndpoint` in the code.

## Changing the form fields

The options are listed in three places, and they must match exactly:

- `QUALIFICATIONS`, `STREAMS`, `SPECIALIZATIONS`, `WORK_TYPES`, `AVAILABILITY` in `_source/build_pages.py` (the page)
- `OPTIONS` in `Code.gs` (server-side validation)
- the `HEADERS` and `appendRow` columns in `Code.gs` if you add or remove a field

## Privacy

Resumes and answers are personal data. The resumes folder is private to the deploying account. Share the sheet only with the people who review applications. `privacy.html` describes this storage, so update it if you move the data elsewhere.
