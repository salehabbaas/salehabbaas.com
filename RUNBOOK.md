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
   - Ensure `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` is a bare host (example: `your-project-id.firebaseapp.com`, no `https://`, no path like `/__/auth/handler`, no port, no trailing slash)
   - (Optional) Enable Saleh-OS (AI assistant):
     - Set `GEMINI_API_KEY`
     - Optionally set `GEMINI_MODEL` (defaults to `gemini-2.5-flash`)
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
