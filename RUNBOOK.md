# RUNBOOK

## 1) Local Setup

1. Install dependencies:
   - `npm install`
   - `cd functions && npm install && cd ..`
2. Copy env file:
   - `cp .env.example .env.local`
3. Fill `.env.local` with Firebase Web SDK and Admin SDK values.
   - Set `NEXT_PUBLIC_FIRESTORE_DATABASE_ID=salehabbaas`
   - Set `FIRESTORE_DATABASE_ID=salehabbaas`
   - Set `NOTIFICATION_PRIMARY_ADMIN_UID` to the admin UID that should receive booking/system/audit reminders
   - Ensure `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` is a bare host (example: `your-project-id.firebaseapp.com`, no `https://`, no path like `/__/auth/handler`, no port, no trailing slash)
   - Configure web push key for reminder notifications:
     - Set `NEXT_PUBLIC_FIREBASE_VAPID_KEY` (Firebase Cloud Messaging web push certificate key)
     - Set `NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY` (public key used by native browser push subscription; can reuse Firebase VAPID public key)
     - Set `WEB_PUSH_VAPID_PUBLIC_KEY` (server-side VAPID public key; should match the browser public key)
     - Set `WEB_PUSH_VAPID_PRIVATE_KEY` (server-side VAPID private key used to send direct browser push)
     - Set `WEB_PUSH_SUBJECT` (example: `mailto:notifications@your-domain.com`)
   - (Optional) Enable Saleh-OS (AI assistant):
     - Set `GEMINI_API_KEY`
     - Optionally set `GEMINI_MODEL` (defaults to `gemini-2.5-flash`)
   - Enable Resume Studio AI + ATS:
     - Set `OPENAI_API_KEY`
     - Optionally set `OPENAI_MODEL` (default: `gpt-5.2`; alternatives: `gpt-5-mini`, `gpt-5-nano`)
   - Optional PDF renderer controls for Resume Studio export:
     - `RESUME_EXPORT_RENDERER=auto` (default; tries Chromium print route then falls back to pdf-lib)
     - `RESUME_EXPORT_BASE_URL=https://salehabbaas.com` (recommended in production for stable print URL resolution)
   - Ensure at least one email adapter is configured for export delivery:
     - `RESEND_API_KEY` or `SENDGRID_API_KEY` or `MAILGUN_API_KEY` (+ `MAILGUN_DOMAIN`)
     - or Gmail SMTP (App Password): `GMAIL_APP_PASSWORD` (with `senderEmail` set to your Gmail address in Admin Integrations)
     - or Zoho SMTP: `ZOHO_SMTP_HOST`, `ZOHO_SMTP_PORT`, `ZOHO_SMTP_SECURE`, `ZOHO_SMTP_USERNAME`, `ZOHO_SMTP_PASSWORD`
4. Start app:
   - `npm run dev`

## 2) Firebase Project Setup

1. Enable Firebase products:
   - Firestore in **Native Mode** (required)
   - Firestore
   - Authentication (Email/Password)
   - Storage
   - Functions (2nd gen)
   - Hosting
   - Analytics
2. Enable App Check:
   - Create reCAPTCHA v3 provider in Firebase Console.
   - Set `NEXT_PUBLIC_RECAPTCHA_V3_SITE_KEY`.
   - Enforce App Check for Firestore/Storage/Functions in Firebase Console.

## 3) Deploy Rules and Indexes

Run these from repository root (`salehabbaas.com`) so `firebase.json` is used.

1. Deploy Firestore + Storage security:
   - `firebase deploy --only firestore:rules,firestore:indexes,storage`
2. Deploy functions:
   - `firebase deploy --only functions`
3. Deploy hosting/Next app:
   - `firebase deploy --only hosting`
4. Confirm App Hosting is not in use:
   - `firebase apphosting:backends:list --project salehabbaas-com`
   - Expected: no backends returned

## 4) Admin Bootstrap

1. Create admin user + claim in one command:
   - `npm run create-admin -- <email> <password>`
   - or set `ADMIN_BOOTSTRAP_EMAIL` and `ADMIN_BOOTSTRAP_PASSWORD` in `.env.local`, then run `npm run create-admin`
2. Ask user to sign out/in again (token refresh) if claim was updated on an existing user.

Manual alternative:
- Create Firebase Auth user (email/password), then run:
  - `npm run set-admin -- <uid>`

Alternative bootstrap function:
- `https://<region>-<project>.cloudfunctions.net/bootstrapAdminClaim?secret=<ADMIN_BOOTSTRAP_SECRET>&uid=<UID>`

## 5) Seed Data

Run seed script:
- `npm run seed`

If seed fails with `FAILED_PRECONDITION ... Firestore in Datastore Mode`, switch to a Firebase project that uses Firestore Native Mode, then update:
- `.firebaserc` project id
- `.env.local` Firebase web/admin values
- service account JSON path (`FIREBASE_SERVICE_ACCOUNT_PATH`)

If you use a named Firestore database (current repo uses `salehabbaas`):
- keep `firebase.json > firestore.database` set to that ID
- keep `.env.local` `NEXT_PUBLIC_FIRESTORE_DATABASE_ID` and `FIRESTORE_DATABASE_ID` aligned to the same value
- keep `storage.rules` Firestore cross-service path aligned to the same database ID

Seeds include:
- Placeholder-only profile/content scaffolding (no fabricated resume history)
- Job tracker dropdown settings
- Creator settings
- Creator templates, hook/CTA libraries
- Sample content item + draft/private variant scaffold
- Sample Resume Studio records:
  - one `jobTrackerJobs` sample job
  - one `resumeDocuments` sample resume linked to that job
  - one `jobResumeLinks` record

## 6) Domain + SEO Rollout

1. Connect custom domain in Firebase Hosting.
2. Ensure HTTPS certificate provisioning is complete.
3. Validate production site URL in `.env` values.
4. Submit sitemap in Google Search Console:
   - `https://salehabbaas.com/sitemap.xml`
5. Validate creator RSS feed:
   - `https://salehabbaas.com/creator/rss.xml`
6. Validate robots:
   - `https://salehabbaas.com/robots.txt`

## 7) Cache Revalidation

- Admin UI button triggers `/api/revalidate` with Firebase admin auth token.
- Cloud Function `revalidateCreatorCache` can trigger revalidation with `REVALIDATE_SECRET`.

## 8) Security Notes

- Admin access requires Firebase Auth custom claim `admin=true`.
- Firestore rules restrict admin collections and writable paths.
- Public creator reads allow `public` and `unlisted` with `publishedAt != null`.

### Unlisted strategy implemented

Firestore rules currently allow read access to both `public` and `unlisted` variants. This keeps `/creator/<slug>` available for unlisted content but excludes unlisted items from:
- Public listing queries (`/creator` feed filters query only `visibility == public`)
- Sitemap generation (`/sitemap.xml` includes only public)
- Featured/public widgets

### Booking lock strategy

`/api/bookings` writes `bookingSlotLocks/{slot}` docs for each slot segment in a booking transaction.
Admin cancellation/reschedule actions remove these locks.
This prevents concurrent or overlapping bookings for the same time segments.

## 9) Analytics Events

Implemented events:
- `page_view`
- `view_creator_item`
- `click_external_post`
- `download_resume`
- `contact_submit`
- `book_meeting`
- `social_click`
- `subscribe_newsletter`

Verify in Firebase Analytics DebugView during manual QA.

## 10) Resume Studio QA

1. Open `/admin/resume-studio` and create a new resume.
2. Edit directly on-canvas in `/admin/resume-studio/<docId>` and reorder with drag & drop.
3. Run ATS check in `/admin/resume-studio/<docId>/ats`:
   - with linked job
   - with pasted job description
4. Open HTML print preview in `/admin/resume-studio/<docId>/print`.
5. Test export in `/admin/resume-studio/<docId>/export`:
   - Download PDF
   - Download TXT
   - Send PDF to email
6. Open `/admin/resume-studio/templates`:
   - browse built-in templates
   - create/edit a custom template in `/admin/resume-studio/templates/<templateId>`
   - run PDF import in `/admin/resume-studio/templates/import`
7. Open `/admin/job-tracker`:
   - create/import job
   - link existing resume
   - create tailored resume for selected job

## 11) Reminder System QA

1. Open `/admin/settings/reminders` and configure:
   - channels + `Primary admin UID`
   - module windows for tasks/bookings/linkedin/jobs/goals/audit
2. Open admin header and verify:
   - notification bell unread badge
   - top reminder banner appears for unread banner-enabled items
3. Open `/admin/system-inbox`:
   - verify Notification Center feed
   - mark read / dismiss / mark all read actions
4. Browser push:
   - click `Enable Push` in Notification Center
   - confirm browser permission prompt
   - confirm `users/<uid>/notificationDevices/*` documents are created
5. Scheduler + trigger verification:
   - task reminders still send email and now create in-app notifications
   - unified reminder sweep creates reminders for bookings, LinkedIn, jobs, goals
   - high-risk audit events create system notifications for primary admin
