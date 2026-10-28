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
4. Check the `CONFIG` block at the top (team email, reply-to address).
5. In the function menu choose **setup** and click **Run**. Approve the permissions (Sheets, Drive, send email). This creates the Applications tab and the resumes folder.
6. Click **Deploy > New deployment**, choose type **Web app**:
   - Execute as: **Me**
   - Who has access: **Anyone**
7. Click **Deploy** and copy the **Web app URL** (it ends in `/exec`).
8. Paste that URL into `applyEndpoint` in `_source/assets/site.js` (and `assets/site.js` at the top level), then rebuild and publish:

   ```bash
   cd _source && python3 build.py && python3 check_site.py dist
   ```

9. Open the URL in a browser. It should show `{"ok":true,...}`. Then send a test application from `apply.html`.

Until `applyEndpoint` is set, the form falls back to opening the visitor's email app with their answers, and asks them to attach the resume by hand.

## Changing the script later

After editing `Code.gs`, go to **Deploy > Manage deployments**, edit the existing deployment and pick **New version**. This keeps the same URL. If you choose "New deployment" instead you get a new URL, and you have to update `applyEndpoint`.

## Changing the form fields

The options are listed in three places, and they must match exactly:

- `QUALIFICATIONS`, `STREAMS`, `SPECIALIZATIONS`, `WORK_TYPES`, `AVAILABILITY` in `_source/build_pages.py` (the page)
- `OPTIONS` in `Code.gs` (server-side validation)
- the `HEADERS` and `appendRow` columns in `Code.gs` if you add or remove a field

## Privacy

Resumes and answers are personal data. The resumes folder is private to the deploying account. Share the sheet only with the people who review applications. `privacy.html` describes this storage, so update it if you move the data elsewhere.
