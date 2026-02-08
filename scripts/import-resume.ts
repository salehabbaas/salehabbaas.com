import { readFileSync } from "node:fs";
import { basename } from "node:path";

import { App } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

import { initAdminForScripts } from "./firebase-admin-init";

const DEFAULT_RESUME_PATH =
  "/Users/salehabbas/Library/Mobile Documents/com~apple~CloudDocs/Resumes/Resume_SalehAbbaas_SoftwareEngineer.pdf";
const DEFAULT_STORAGE_DESTINATION = "resume/Resume_SalehAbbaas_SoftwareEngineer.pdf";

type UnknownRecord = Record<string, unknown>;

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#([0-9]+);/g, (_, dec: string) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function stripHtml(value: string) {
  return decodeHtmlEntities(
    value
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/li>/gi, "\n")
      .replace(/<li>/gi, "")
      .replace(/<[^>]+>/g, "")
  )
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{2,}/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function parseSummaryLines(summaryHtml: string) {
  const matches = Array.from(summaryHtml.matchAll(/<li>(.*?)<\/li>/gis))
    .map((match) => stripHtml(match[1]))
    .filter(Boolean);

  if (matches.length) return matches;

  const fallback = stripHtml(summaryHtml);
  return fallback ? [fallback] : [];
}

function formatYearMonth(fromYear?: number | null, fromMonth?: number | null) {
  if (!fromYear) return "";
  if (!fromMonth) return String(fromYear);
  return `${fromYear}-${String(fromMonth).padStart(2, "0")}`;
}

function parseYearFromIssuer(issuer: string) {
  const match = issuer.match(/\((\d{4})\)\s*$/);
  return match ? match[1] : "";
}

function cleanIssuer(issuer: string) {
  return issuer.replace(/\s*\(\d{4}\)\s*$/, "").trim();
}

function extractTags(input: string) {
  const text = input.toLowerCase();
  const dictionary = [
    "hl7",
    "fhir",
    "astm",
    "lis",
    "his",
    "dicom",
    "pacs",
    "power bi",
    "python",
    "docker",
    "react",
    "postgresql",
    "kubernetes",
    "healthcare",
    "interoperability",
    "analytics",
    "public health"
  ];

  const tags: string[] = [];
  for (const candidate of dictionary) {
    if (text.includes(candidate)) {
      tags.push(candidate.replace(/\s+/g, "-"));
    }
  }

  return tags.slice(0, 6);
}

function decodeResumePayload(pdfPath: string) {
  const raw = readFileSync(pdfPath, "latin1");
  const match = raw.match(/\/ecv-data\s*<FEFF([0-9A-Fa-f]+)>/m);

  if (!match) {
    throw new Error(`Unable to find embedded resume JSON payload in: ${pdfPath}`);
  }

  const json = new TextDecoder("utf-16be").decode(Buffer.from(match[1], "hex"));
  return JSON.parse(json) as UnknownRecord;
}

function findSection(payload: UnknownRecord, sectionType: string) {
  const sections = Array.isArray(payload.sections) ? (payload.sections as UnknownRecord[]) : [];
  return sections.find((section) => section.__t === sectionType);
}

async function replaceCollection(
  db: FirebaseFirestore.Firestore,
  collectionName: string,
  docs: Array<{ id: string; data: UnknownRecord }>
) {
  const existing = await db.collection(collectionName).get();
  const batch = db.batch();

  existing.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });

  docs.forEach((entry) => {
    const ref = db.collection(collectionName).doc(entry.id);
    batch.set(ref, {
      ...entry.data,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });
  });

  await batch.commit();
}

async function upsertLinkedInSocialLink(db: FirebaseFirestore.Firestore, linkedInUrl: string) {
  if (!linkedInUrl) return;

  const snap = await db.collection("socialLinks").get();
  const linkedInDoc = snap.docs.find((doc) => String(doc.data().label ?? "").toLowerCase() === "linkedin");
  const ref = linkedInDoc ? linkedInDoc.ref : db.collection("socialLinks").doc("linkedin");

  await ref.set(
    {
      label: "LinkedIn",
      url: linkedInUrl,
      sortOrder: 1,
      updatedAt: FieldValue.serverTimestamp(),
      ...(linkedInDoc ? {} : { createdAt: FieldValue.serverTimestamp() })
    },
    { merge: true }
  );
}

async function uploadResumeAndGetUrl(app: App, sourcePath: string) {
  const storage = getStorage(app);
  const configuredBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET;

  if (!configuredBucket) {
    throw new Error("Missing NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET/FIREBASE_STORAGE_BUCKET env var.");
  }

  const bucket = storage.bucket(configuredBucket);
  const destination = DEFAULT_STORAGE_DESTINATION;
  await bucket.upload(sourcePath, {
    destination,
    metadata: {
      contentType: "application/pdf",
      cacheControl: "public,max-age=3600"
    }
  });

  const encodedDestination = encodeURIComponent(destination).replace(/%2F/g, "%2F");
  return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodedDestination}?alt=media`;
}

async function main() {
  const resumePath = process.argv[2] || DEFAULT_RESUME_PATH;
  const payload = decodeResumePayload(resumePath);
  const header = (payload.header ?? {}) as UnknownRecord;

  const summarySection = findSection(payload, "SummarySection");
  const experienceSection = findSection(payload, "ExperienceSection");
  const certificateSection = findSection(payload, "CertificateSection");
  const projectsSection = findSection(payload, "ActivitySection");
  const educationSection = findSection(payload, "EducationSection");

  const summaryItem = Array.isArray(summarySection?.items) ? (summarySection?.items?.[0] as UnknownRecord) : null;
  const summaryLines = parseSummaryLines(String(summaryItem?.text ?? ""));

  const educationItems = Array.isArray(educationSection?.items) ? (educationSection?.items as UnknownRecord[]) : [];
  const primaryEducation = educationItems[0];
  const educationLine = primaryEducation
    ? `${stripHtml(String(primaryEducation.degree ?? ""))} - ${stripHtml(String(primaryEducation.institution ?? ""))}`
    : "";

  const bio = [summaryLines.join(" "), educationLine].filter(Boolean).join(" ");

  const app = initAdminForScripts();
  const firestoreDatabaseId = process.env.FIRESTORE_DATABASE_ID || process.env.NEXT_PUBLIC_FIRESTORE_DATABASE_ID;
  const db = firestoreDatabaseId ? getFirestore(app, firestoreDatabaseId) : getFirestore(app);

  const resumeUrl = await uploadResumeAndGetUrl(app, resumePath);

  await db.collection("siteContent").doc("profile").set(
    {
      name: String(header.name ?? "Saleh Abbaas"),
      headline: String(header.title ?? "Software Engineer"),
      bio,
      location: stripHtml(String(header.location ?? "")),
      email: String(header.email ?? ""),
      phone: String(header.phone ?? ""),
      resumeUrl,
      avatarUrl: String(header.photo ?? ""),
      updatedAt: FieldValue.serverTimestamp()
    },
    { merge: true }
  );

  await upsertLinkedInSocialLink(db, String(header.link ?? ""));

  const experienceItems = Array.isArray(experienceSection?.items) ? (experienceSection?.items as UnknownRecord[]) : [];
  const experiences = experienceItems.map((item, index) => {
    const dateRange = (item.dateRange ?? {}) as UnknownRecord;
    const bullets = (Array.isArray(item.bullets) ? item.bullets : [])
      .map((bullet) => stripHtml(String(bullet)))
      .filter(Boolean);

    const summary = bullets.find((bullet) => !bullet.toLowerCase().startsWith("skills:")) || bullets[0] || "";

    return {
      id: `exp-${index + 1}-${slugify(String(item.workplace ?? item.position ?? "experience"))}`,
      data: {
        company: stripHtml(String(item.workplace ?? "")),
        role: stripHtml(String(item.position ?? "")),
        startDate: formatYearMonth(Number(dateRange.fromYear ?? 0), Number(dateRange.fromMonth ?? 0)),
        endDate: formatYearMonth(Number(dateRange.toYear ?? 0), Number(dateRange.toMonth ?? 0)),
        summary,
        achievements: bullets,
        sortOrder: index + 1
      }
    };
  });

  const projectItems = Array.isArray(projectsSection?.items) ? (projectsSection?.items as UnknownRecord[]) : [];
  const projects = projectItems.map((item, index) => {
    const bullets = (Array.isArray(item.bullets) ? item.bullets : [])
      .map((bullet) => stripHtml(String(bullet)))
      .filter(Boolean);

    const title = stripHtml(String(item.title ?? `Project ${index + 1}`));
    const description = bullets[0] || stripHtml(String(item.description ?? ""));
    const longDescription = bullets.slice(1).join("\n");
    const combined = [title, description, longDescription].join(" ");

    return {
      id: slugify(title) || `project-${index + 1}`,
      data: {
        slug: slugify(title) || `project-${index + 1}`,
        title,
        description,
        longDescription,
        tags: extractTags(combined),
        coverImage: "",
        projectUrl: stripHtml(String(item.link ?? "")),
        status: "published",
        sortOrder: index + 1
      }
    };
  });

  const certificateItems = Array.isArray(certificateSection?.items) ? (certificateSection?.items as UnknownRecord[]) : [];
  const certificates = certificateItems.map((item, index) => {
    const title = stripHtml(String(item.title ?? ""));
    const issuerRaw = stripHtml(String(item.issuer ?? ""));

    return {
      id: slugify(title) || `certificate-${index + 1}`,
      data: {
        title,
        issuer: cleanIssuer(issuerRaw),
        year: parseYearFromIssuer(issuerRaw),
        credentialUrl: "",
        imageUrl: "",
        sortOrder: index + 1
      }
    };
  });

  const services = [
    {
      id: "healthcare-interoperability-integrations",
      data: {
        title: "Healthcare Interoperability Integrations",
        detail: "HL7, FHIR, and ASTM integrations for secure clinical and laboratory data exchange.",
        sortOrder: 1
      }
    },
    {
      id: "laboratory-workflow-automation",
      data: {
        title: "Laboratory Workflow Automation",
        detail: "Design and monitoring of laboratory result ingestion, routing, and integration workflows.",
        sortOrder: 2
      }
    },
    {
      id: "medical-imaging-pacs-systems",
      data: {
        title: "Medical Imaging & PACS Systems",
        detail: "Architecture and integration of PACS platforms for centralized imaging storage and cross-facility access.",
        sortOrder: 3
      }
    },
    {
      id: "public-health-data-platforms-analytics",
      data: {
        title: "Public Health Data Platforms & Analytics",
        detail: "Power BI reporting and data engineering for hospital and public health decision-making.",
        sortOrder: 4
      }
    }
  ];

  await replaceCollection(db, "experiences", experiences);
  await replaceCollection(db, "projects", projects);
  await replaceCollection(db, "services", services);
  await replaceCollection(db, "certificates", certificates);

  console.log(`Imported resume: ${basename(resumePath)}`);
  console.log(`Profile updated for: ${String(header.name ?? "Saleh Abbaas")}`);
  console.log(`Experiences: ${experiences.length}, Projects: ${projects.length}, Services: ${services.length}, Certificates: ${certificates.length}`);
  console.log(`Resume URL: ${resumeUrl}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
