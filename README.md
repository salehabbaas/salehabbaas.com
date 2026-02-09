# salehabbaas.com

Personal website and clinical data engineering portfolio for **Saleh Abbaas**.

## About Saleh

- Software Engineer specializing in healthcare interoperability and clinical data systems.
- 5+ years of experience, including 4+ years in regulated healthcare environments.
- Delivered HL7/FHIR integrations and LIS/HIS automation improving data accuracy by up to 98%.
- Built analytics platforms and dashboards supporting 3,000+ users in public health and clinical settings.
- Based in Ottawa, Ontario. Languages: English (professional), Arabic (fluent), French (basic).

Keywords: Healthcare Interoperability, HL7, FHIR, Rhapsody, Mirth Connect, Epic EHR, HIPAA, PHIPA, DICOM, PACS, Power BI, Clinical Data Platforms, Integration Engineering, Data Pipelines, Analytics.

## Site Overview

This project is a Firebase-first platform with:

- Premium public site (Apple-inspired visual direction)
- Admin CMS secured by Firebase Auth + custom claims
- Experiences, projects, services, and certificates from Firestore
- Creator content hub with SEO-friendly pages
- Booking and contact workflows with Firebase Functions

## Tech Stack

- Next.js 15 (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- Framer Motion
- Firebase: Firestore, Auth, Functions v2, Storage, Hosting, Analytics, Remote Config

## Local Setup

Run all commands from repo root: `salehabbaas.com/`

1. Copy the env template:
   - `cp .env.example .env.local`
2. Point Firebase Admin credentials to a local secret file:
   - `FIREBASE_SERVICE_ACCOUNT_PATH=./secrets/firebase-adminsdk.json`
3. If you use a named Firestore database, set:
   - `NEXT_PUBLIC_FIRESTORE_DATABASE_ID=<your-database-id>`
   - `FIRESTORE_DATABASE_ID=<your-database-id>`
4. Install dependencies:
   - `npm install`
   - `npm --prefix functions install`
5. (Optional) Seed Firestore defaults:
   - `npm run seed`
6. Create admin account:
   - `npm run create-admin -- <email> <password>`
   - or set `ADMIN_BOOTSTRAP_EMAIL` + `ADMIN_BOOTSTRAP_PASSWORD` in `.env.local`
7. Run dev server:
   - `npm run dev`

## Assets

- Avatar image: `public/SalehAbbaas.jpeg`
- Resume: `public/resume/Resume_SalehAbbaas_SoftwareEngineer.pdf`

## Content Sources

- Firestore CMS is the source of truth.
- Local fallback content lives in `lib/data/resume.ts` for public-friendly defaults.
- Resume import (Enhancv PDF):
  - `npm run import-resume -- "/absolute/path/to/Resume_SalehAbbaas_SoftwareEngineer.pdf"`

## Firebase Hosting (No App Hosting)

- This repo uses Firebase Hosting only.
- App Hosting is intentionally not used.
- Verify App Hosting backends are empty:
  - `firebase apphosting:backends:list --project artelo-f7475`

## CI/CD

Workflow file:
- `.github/workflows/firebase-hosting-deploy.yml`

Trigger:
- Push to `main` / `master` (build validation only, no deploy)
- Manual `workflow_dispatch` with `deploy_from_github=true` (optional deploy)

## Production Deployment

- `firebase deploy --only firestore:rules,firestore:indexes,storage`
- `firebase deploy --only functions`
- `firebase deploy --only hosting`

## Docs

- Runbook: `RUNBOOK.md`
- QA checklist: `QA_CHECKLIST.md`
