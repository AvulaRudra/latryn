# Lattice applications backend (Excel, OneDrive and Outlook)

`apply.html` sends applications to a Vercel function, `api/apply.js`. The function uses Microsoft Graph to:

- save the resume to a OneDrive folder (`Lattice/Resumes` by default)
- add a row to a table in an Excel file in that OneDrive, with a link to the resume
- email the applicant a confirmation from your Outlook mailbox, and email the team a notification

The resume goes straight from the browser to OneDrive, so the 10 MB limit works even though Vercel functions accept at most 4.5 MB per request.

You need a **Microsoft 365 business** account (work Outlook and OneDrive) and admin rights to approve an app. Allow about 20 minutes.

## 1. Create the Excel file

1. Sign in to OneDrive as the user that will own the data and send the emails (for example `contact@latryn.com`).
2. Create a folder `Lattice`, and inside it a folder `Resumes`.
3. In `Lattice`, create a new Excel workbook named `Lattice applications.xlsx`.
4. Type these 14 headers in row 1, from A1 to N1:

   ```
   Submitted at	First name	Last name	Email	Phone	Qualification	Specialization	Stream	Type of freelance work	Availability	Portfolio / LinkedIn	Resume	Role (from site)	Status
   ```

   (Copy that line and paste it into A1. The tabs put each header in its own column.)
5. Select A1:N1, choose **Insert > Table**, and tick **My table has headers**.
6. With the table selected, open the **Table Design** tab and set **Table Name** to `Applications`.

New applications are added as rows at the bottom of that table. You can sort, filter and add columns after column N freely. Don't rename, reorder or remove columns A to N.

## 2. Register the app in Azure

1. Go to [entra.microsoft.com](https://entra.microsoft.com) > **App registrations** > **New registration**. Name it `Latryn website`, choose "Accounts in this organizational directory only" and click **Register**.
2. On the overview page, copy the **Application (client) ID** and the **Directory (tenant) ID**.
3. Open **Certificates & secrets** > **New client secret**. Pick an expiry (24 months is the longest) and copy the **Value** straight away, because it's only shown once.
4. Open **API permissions** > **Add a permission** > **Microsoft Graph** > **Application permissions**, and add:
   - `Files.ReadWrite.All` (the Excel file and resumes)
   - `Mail.Send` (the emails)
5. Click **Grant admin consent for <your organisation>**.

`Mail.Send` as an application permission can send as any mailbox in your organisation. To limit it to `contact@latryn.com` only, an Exchange admin can add an application access policy or RBAC for Applications scope ([Microsoft's guide](https://learn.microsoft.com/en-us/exchange/permissions-exo/application-rbac)).

## 3. Add the settings to Vercel

Copy everything from `.env.example` in the repo root, then go to Vercel > Project > **Settings** > **Environment Variables**. Click the **Key** box and paste: Vercel splits the lines into variables. Fill in:

| Variable | Value |
|---|---|
| `AZURE_TENANT_ID` | Directory (tenant) ID from step 2 |
| `AZURE_CLIENT_ID` | Application (client) ID from step 2 |
| `AZURE_CLIENT_SECRET` | The secret **Value** from step 2. Mark it **Sensitive** |
| `MS_USER` | The OneDrive owner and sender, e.g. `contact@latryn.com` |
| `EXCEL_FILE_PATH` | Path of the workbook inside that OneDrive. Default `Lattice/Lattice applications.xlsx` |
| `EXCEL_TABLE` | Table name. Default `Applications` |
| `RESUME_FOLDER` | Default `Lattice/Resumes` |
| `TEAM_EMAIL` | Gets a notification per application. `none` turns it off. Default: `MS_USER` |
| `REPLY_TO` | Where applicant replies go. Default: `MS_USER` |
| `SITE_URL`, `TIME_ZONE` | Default `https://latryn.com`, `Asia/Kolkata` |

Tick **Production** (and **Preview** if previews should save real applications), save, and **redeploy**. Variables only apply to new deployments.

On each deploy, `vercel.json` runs `_source/inject-env.js`. When the four required variables are set, it points the form at `/api/apply`. When none are set, the form keeps its email fallback. When only some are set, the deploy fails and names the missing ones.

## 4. Test it

Submit `apply.html` with your own email. You should see a new row in the table, the resume in `Lattice/Resumes`, a confirmation email and a team notification. If something fails, check Vercel > Project > **Logs** for the `/api/apply` function. Microsoft's error message is logged there.

## Later

- **Client secret expiry:** the secret expires on the date you chose. Before then, create a new one in Azure, update `AZURE_CLIENT_SECRET` in Vercel and redeploy.
- **Changing the fields:** the options live in `_source/build_pages.py` (the page) and `OPTIONS` in `api/apply.js` (server checks), and they must match exactly. If you add or remove a field, also update the row in `finish()` in `api/apply.js` and the table columns.
- **Privacy:** applications are personal data. Share the workbook and the Resumes folder only with the people who review applications. `privacy.html` describes this storage, so update it if you move the data.
