# salehabbaas.com

Production-ready personal brand and admin platform for **Saleh Abbaas**.

## App Description

This project is a Firebase-first system with:

- A premium public website (Apple-like visual direction)
- Admin panel protected by Firebase Auth + admin custom claims
- Full CMS controls for website content
- Creator operating system:
  - Admin tools to create/schedule/track platform content
  - Public creator pages with SEO-friendly detail routes
- Job application tracker (admin-only) with XLSX export
- Public meeting booking + admin booking management
- Firebase Functions v2 for contact, booking workflows, image optimization, and cache revalidation

## Technologies Used

- Next.js 15 (App Router) + TypeScript
- Tailwind CSS + shadcn/ui primitives
- Framer Motion
- Firebase:
  - Firestore
  - Authentication
  - Functions v2
  - Storage
  - Hosting (web frameworks)
  - Analytics
  - Remote Config
  - App Check

## Project Structure

- `app/` public pages, admin pages, API routes, SEO routes (`sitemap.xml`, `robots.txt`, RSS)
- `components/` UI + admin + creator + booking components
- `lib/` Firebase clients, Firestore data access, auth guards, SEO helpers
- `functions/` Firebase Functions source code
- `scripts/` seed/admin bootstrap scripts
- `firestore.rules` / `storage.rules` / `firestore.indexes.json`

## Prerequisites

- Node.js 24+
- npm 10+
- Firebase CLI (`npm i -g firebase-tools` optional if you prefer global)
- Firebase project with **Firestore Native Mode** (not Datastore Mode)
- Current configured project in this repo: `artelo-f7475`
- Configured Firestore database ID in this repo: `salehabbaas`
- Service account JSON in repo root:
  - `artelo-f7475-firebase-adminsdk-krn92-1e4c710408.json`

## Local Setup (Step by Step)

Run all website commands from repository root: `salehabbaas.com/`

1. Copy env template:
   - `cp .env.example .env.local`
2. Keep this value in `.env.local` (already in template):
   - `FIREBASE_SERVICE_ACCOUNT_PATH=./artelo-f7475-firebase-adminsdk-krn92-1e4c710408.json`
   - `NEXT_PUBLIC_FIRESTORE_DATABASE_ID=salehabbaas`
   - `FIRESTORE_DATABASE_ID=salehabbaas`
3. Install dependencies:
   - `npm install`
   - `npm --prefix functions install`
   - then update lockfiles to latest patched versions:
     - `npm install --package-lock-only`
     - `npm --prefix functions install --package-lock-only`
4. Seed base Firestore data:
   - `npm run seed`
   - If you get `FAILED_PRECONDITION ... Firestore in Datastore Mode`, your project is incompatible with this app. Use a Firebase project with Firestore Native Mode, update `.firebaserc` + `.env.local`, then run seed again.
5. Create the admin account (defaults are preconfigured):
   - `npm run create-admin`
6. Start development server:
   - `npm run dev`
7. Open:
   - Public site: `http://localhost:3000`
   - Admin login: `http://localhost:3000/admin/login`

## Admin Bootstrap Defaults

The admin bootstrap script (`npm run create-admin`) uses:

- Email: `saleh@artelo.ai`
- Password: `sH@.2026`

After first login, rotate to a new password immediately.

## Available Scripts

- `npm run dev` start Next.js dev server
- `npm run build` production build
- `npm run start` run production server
- `npm run lint` lint
- `npm run typecheck` TypeScript type check
- `npm run seed` seed Firestore defaults
- `npm run import-resume -- "<absolute-path-to-resume.pdf>"` import profile/experience/projects/services/certificates from an Enhancv PDF resume
- `npm run create-admin` create/update admin user + set `admin=true` claim
- `npm run set-admin -- <uid>` set admin claim for any existing user

Functions subproject scripts (run inside `functions/`):
- `npm run serve` start Firebase Functions emulator
- `npm run build` compile functions TypeScript

## Firebase Service Account Handling

- Server and scripts now load Firebase Admin credentials in this order:
  1. `FIREBASE_SERVICE_ACCOUNT_PATH` (recommended)
  2. `GOOGLE_APPLICATION_CREDENTIALS`
  3. Inline env vars: `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`

- The service account JSON is ignored by git:
  - `*firebase-adminsdk*.json`

## Datastore Mode and Named Database Troubleshooting

If `npm run seed` fails with:
- `FAILED_PRECONDITION: The Cloud Firestore API is not available for Firestore in Datastore Mode ...`

Then the selected project database mode is Datastore Mode. This codebase is built for Firebase Firestore Native Mode (rules, queries, indexes, client SDK behavior). Move to a Native Mode project and point this repo to it.

If you created a named database (for example `salehabbaas`) instead of `(default)`:
- keep `firebase.json` Firestore config on that database id
- set both `.env.local` values:
  - `NEXT_PUBLIC_FIRESTORE_DATABASE_ID=salehabbaas`
  - `FIRESTORE_DATABASE_ID=salehabbaas`
- keep `storage.rules` cross-service Firestore path aligned to the same database ID

## CI/CD (GitHub Actions -> Firebase Hosting)

Workflow file:

- `.github/workflows/firebase-hosting-deploy.yml`

Trigger:

- Push to `main`
- Manual `workflow_dispatch`

What it does:

1. Installs root and `functions` dependencies
2. Selects one auth mode (Workload Identity, service account JSON, or `FIREBASE_TOKEN`)
3. Deploys to Firebase Hosting project `artelo-f7475`

Required GitHub repository secrets:

- One auth option is required:
  - Preferred: `FIREBASE_SERVICE_ACCOUNT_ARTELO_F7475` (raw JSON content)
  - Legacy fallback: `FIREBASE_SERVICE_ACCOUNT` (raw JSON content)
  - Workload Identity: `GCP_WORKLOAD_IDENTITY_PROVIDER` + `GCP_SERVICE_ACCOUNT_EMAIL`
  - Token fallback: `FIREBASE_TOKEN`
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`
- `NEXT_PUBLIC_FIREBASE_DATABASE_URL`
- `NEXT_PUBLIC_FIRESTORE_DATABASE_ID` (set to `salehabbaas`)
- `FIRESTORE_DATABASE_ID` (set to `salehabbaas`)
- `NEXT_PUBLIC_RECAPTCHA_V3_SITE_KEY`

If the workflow is triggered by Dependabot or a fork context, configure the same auth secret(s) in that context too. Repository secrets are not always injected for those runs.

Required IAM on the deploy identity (service account or token owner):

- `roles/serviceusage.serviceUsageConsumer` (required for Firebase CLI API checks)

Recommended for Firebase Hosting with Next.js frameworks (SSR function deploy):

- `roles/firebase.admin`
- `roles/cloudfunctions.developer`
- `roles/cloudbuild.builds.editor`
- `roles/artifactregistry.writer`
- `roles/run.admin`
- `roles/iam.serviceAccountUser`
If no auth secrets are available in a Dependabot-triggered run, the deploy workflow now skips deployment with a warning instead of failing the pipeline.

## Production Deployment (Manual)

- Run from repo root (`salehabbaas.com`), not from `functions/`.
- `firebase deploy --only firestore:rules,firestore:indexes,storage`
- `firebase deploy --only functions`
- `firebase deploy --only hosting`

## Docs

- Setup and operations runbook: [`RUNBOOK.md`](./RUNBOOK.md)
- QA checklist: [`QA_CHECKLIST.md`](./QA_CHECKLIST.md)
