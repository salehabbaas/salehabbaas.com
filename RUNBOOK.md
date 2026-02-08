# RUNBOOK

## 1) Local Setup

1. Install dependencies:
   - `npm install`
   - `cd functions && npm install && cd ..`
2. Copy env file:
   - `cp .env.example .env.local`
3. Fill `.env.local` with Firebase Web SDK and Admin SDK values.
4. Start app:
   - `npm run dev`

## 2) Firebase Project Setup

1. Enable Firebase products:
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

1. Deploy Firestore + Storage security:
   - `firebase deploy --only firestore:rules,firestore:indexes,storage`
2. Deploy functions:
   - `firebase deploy --only functions`
3. Deploy hosting/Next app:
   - `firebase deploy --only hosting`

## 4) Admin Bootstrap

1. Create Firebase Auth user (email/password).
2. Get user UID.
3. Set claim:
   - `npm run set-admin -- <uid>`
4. Ask user to sign out/in again (token refresh).

Alternative bootstrap function:
- `https://<region>-<project>.cloudfunctions.net/bootstrapAdminClaim?secret=<ADMIN_BOOTSTRAP_SECRET>&uid=<UID>`

## 5) Seed Data

Run seed script:
- `npm run seed`

Seeds include:
- Resume starter data
- Job tracker dropdown settings
- Creator settings
- Creator templates, hook/CTA libraries
- Sample content item + public variant

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

## 9) Analytics Events

Implemented events:
- `view_creator_item`
- `click_external_post`
- `subscribe_newsletter`
- `click_social`

Verify in Firebase Analytics DebugView during manual QA.
