# SalehAbbaas.com

Personal website and portfolio for **Saleh Abbaas** — a software engineer focused on healthcare interoperability, clinical data platforms, and reliable systems that operate in regulated environments.

## Why This Site Exists

This site is built to clearly communicate my work, expertise, and impact. It highlights:

- Healthcare interoperability expertise (HL7, FHIR, clinical integrations)
- Product-ready engineering and systems thinking
- Proven results in clinical data accuracy, operational visibility, and platform reliability
- A professional home for my experience, services, and credentials

## About Saleh Abbaas

I’m a software engineer with 5+ years of experience, including 4+ years building healthcare interoperability and data exchange systems. My work spans HL7/FHIR integrations, LIS/HIS connectivity, clinical analytics, and secure platform delivery. I’ve supported systems used by 3,000+ users and delivered integrations that improved data accuracy by up to 98%.

Based in Ottawa, Ontario.

## Technology

This project is built with:

- **Next.js 15 (App Router)**
- **React 19** + **TypeScript**
- **Tailwind CSS** + **shadcn/ui**
- **Framer Motion** (transitions/reveals) + **GSAP ScrollTrigger** (scroll stories)
- **Firebase**
- **Gemini (Google Gen AI SDK)** powering *Saleh-OS 2.0* (`/api/saleh-os`)

## Saleh-OS 2.0 (AI Assistant)

The site includes a terminal-style assistant that can answer recruiter-style questions about my work in HL7/FHIR, clinical integrations, and shipped projects.

- UI: `components/site/saleh-os.tsx` (persistent chat with local history)
- API: `app/api/saleh-os/route.ts` (server-side Gemini call via `@google/genai`)
- System prompt: built from the same resume/CMS data the site renders (`lib/firestore/site-public.ts` with fallback to `lib/data/resume.ts`)

Required env vars:

- `GEMINI_API_KEY`
- `GEMINI_MODEL` (optional, defaults to `gemini-2.5-flash`)

## Keywords

Healthcare Interoperability, HL7, FHIR, Rhapsody, Mirth Connect, Epic EHR, HIPAA, PHIPA, DICOM, PACS, Power BI, Clinical Data Platforms, Integration Engineering, Data Pipelines, Analytics.

## SEO, Indexing, and Tracking

- Sitemap: `/sitemap.xml` (static + dynamic project/blog/creator URLs)
- Robots: `/robots.txt` (public pages allowed, admin/api blocked)
- AI crawler index file: `/llms.txt`
- Structured data: Person, WebSite, BreadcrumbList, and per-page WebPage/Article JSON-LD

Environment variables for Google and webmaster tools:

- `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` (Search Console token)
- `NEXT_PUBLIC_BING_SITE_VERIFICATION` (Bing Webmaster token)
- `NEXT_PUBLIC_GA_MEASUREMENT_ID` (GA4, preferred)
- `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` (optional GA fallback)
- `NEXT_PUBLIC_GTM_ID` (Google Tag Manager container)
- `NEXT_PUBLIC_GOOGLE_ADS_ID` (Google Ads global site tag id)
- `NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL` (optional conversion label used by `gtagSendEvent`)
