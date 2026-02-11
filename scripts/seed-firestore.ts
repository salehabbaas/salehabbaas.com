import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { initAdminForScripts } from "./firebase-admin-init";
import {
  certificates as resumeCertificates,
  experiences as resumeExperiences,
  profileDefaults,
  projects as resumeProjects,
  seoDefaults as resumeSeoDefaults,
  services as resumeServices,
  socialLinks as resumeSocialLinks
} from "../lib/data/resume";

function isDatastoreModeError(error: unknown) {
  if (!error || typeof error !== "object") return false;

  const maybeError = error as { code?: unknown; message?: unknown; details?: unknown };
  const code = String(maybeError.code ?? "");
  const message = String(maybeError.message ?? "");
  const details = String(maybeError.details ?? "");
  const combined = `${message} ${details}`;

  return (
    (code === "9" || code.toUpperCase().includes("FAILED_PRECONDITION")) &&
    /datastore mode|firestore in datastore mode/i.test(combined)
  );
}

function isDatabaseNotFoundError(error: unknown) {
  if (!error || typeof error !== "object") return false;

  const maybeError = error as { code?: unknown; message?: unknown; details?: unknown };
  const code = String(maybeError.code ?? "");
  const message = String(maybeError.message ?? "");
  const details = String(maybeError.details ?? "");
  const combined = `${message} ${details}`;

  return code === "5" || /not[_\s-]?found/i.test(combined);
}

function getConfiguredFirestoreDatabaseId() {
  return process.env.FIRESTORE_DATABASE_ID || process.env.NEXT_PUBLIC_FIRESTORE_DATABASE_ID || "(default)";
}

function databaseNotFoundGuidance() {
  const firestoreDatabaseId = getConfiguredFirestoreDatabaseId();

  return [
    "Seed failed because the configured Firestore database ID was not found.",
    "Set FIRESTORE_DATABASE_ID and NEXT_PUBLIC_FIRESTORE_DATABASE_ID to an existing Native Firestore database.",
    "",
    "Current repo configuration:",
    `- firebase.json firestore.database: ${firestoreDatabaseId}`,
    `- .env.local should include FIRESTORE_DATABASE_ID=${firestoreDatabaseId}`,
    "",
    "Then re-run: npm run seed"
  ].join("\n");
}

function datastoreModeGuidance() {
  return [
    "Seed failed because this Firebase project uses Firestore in Datastore Mode.",
    "This app requires Firestore Native Mode for Firebase SDK queries/rules.",
    "",
    "How to fix:",
    "1) Create/use a Firebase project with Firestore Native Mode enabled.",
    "2) Update .firebaserc and .env.local to point to that project.",
    "3) Keep FIREBASE_SERVICE_ACCOUNT_PATH pointing to the matching service account JSON.",
    "4) Re-run: npm run seed",
    "",
    "Current project in this repo is set in .firebaserc (default)."
  ].join("\n");
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

async function replaceCollection(
  db: FirebaseFirestore.Firestore,
  collectionName: string,
  docs: Array<{ id: string; data: Record<string, unknown> }>
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

async function seed() {
  const app = initAdminForScripts();
  const firestoreDatabaseId = getConfiguredFirestoreDatabaseId();
  const db = firestoreDatabaseId ? getFirestore(app, firestoreDatabaseId) : getFirestore(app);

  await db.collection("siteContent").doc("profile").set(
    {
      name: profileDefaults.name,
      headline: profileDefaults.headline,
      bio: profileDefaults.bio,
      location: profileDefaults.location ?? "",
      email: profileDefaults.email ?? "",
      resumeUrl: profileDefaults.resumeUrl ?? "",
      avatarUrl: profileDefaults.avatarUrl ?? "",
      updatedAt: FieldValue.serverTimestamp()
    },
    { merge: true }
  );

  await db.collection("siteContent").doc("seoDefaults").set(
    {
      titleTemplate: resumeSeoDefaults.titleTemplate,
      defaultDescription: resumeSeoDefaults.defaultDescription,
      defaultOgImage: resumeSeoDefaults.defaultOgImage ?? "",
      updatedAt: FieldValue.serverTimestamp()
    },
    { merge: true }
  );

  await db.collection("siteContent").doc("integrations").set(
    {
      emailProvider: "resend",
      senderEmail: "",
      senderName: "Saleh Abbaas",
      sendgridApiKeyPlaceholder: "",
      resendApiKeyPlaceholder: "",
      mailgunApiKeyPlaceholder: "",
      mailgunDomainPlaceholder: "",
      zohoEnabled: false,
      zohoClientIdPlaceholder: "",
      zohoClientSecretPlaceholder: "",
      zohoRedirectUriPlaceholder: "",
      updatedAt: FieldValue.serverTimestamp()
    },
    { merge: true }
  );

  await db.collection("jobTrackerSettings").doc("default").set(
    {
      responses: [
        "No response",
        "Rejected",
        "Screening call",
        "Interview requested",
        "On hold",
        "Offer",
        "Withdrawn"
      ],
      interviewStages: [
        "None",
        "Recruiter screen",
        "Hiring manager",
        "Technical test",
        "Technical interview",
        "Panel interview",
        "Final interview"
      ],
      updatedAt: FieldValue.serverTimestamp()
    },
    { merge: true }
  );

  await db.collection("bookingSettings").doc("default").set(
    {
      enabled: true,
      timezone: "America/Toronto",
      slotDurationMinutes: 30,
      maxDaysAhead: 30,
      workDays: [1, 2, 3, 4, 5],
      dayStartHour: 9,
      dayEndHour: 17,
      meetingTypes: [
        { id: "intro", label: "Intro Call", durationMinutes: 30 },
        { id: "project", label: "Project Discovery", durationMinutes: 45 },
        { id: "advisory", label: "Advisory Session", durationMinutes: 60 }
      ],
      updatedAt: FieldValue.serverTimestamp()
    },
    { merge: true }
  );

  await db.collection("creatorSettings").doc("default").set(
    {
      defaultVisibility: "private",
      newsletterEnabled: true,
      pillars: ["AI", "HealthTech", "Software", "Cloud", "Cybersecurity", "Career", "Other"],
      platforms: ["linkedin", "youtube", "instagram", "tiktok", "x"],
      pinnedVariantSlugs: [],
      socialLinks: resumeSocialLinks.map((item, index) => ({
        label: item.label,
        url: item.url,
        sortOrder: index + 1
      })),
      updatedAt: FieldValue.serverTimestamp()
    },
    { merge: true }
  );

  await replaceCollection(
    db,
    "experiences",
    resumeExperiences.map((item, index) => ({
      id: slugify(`${item.company}-${item.role}`) || `experience-${index + 1}`,
      data: {
        company: item.company,
        role: item.role,
        startDate: item.startDate ?? "",
        endDate: item.endDate ?? "",
        summary: item.summary,
        achievements: item.achievements,
        sortOrder: index
      }
    }))
  );

  await replaceCollection(
    db,
    "projects",
    resumeProjects.map((item, index) => ({
      id: item.slug || slugify(item.title) || `project-${index + 1}`,
      data: {
        slug: item.slug || slugify(item.title),
        title: item.title,
        description: item.description,
        longDescription: item.description,
        tags: item.tags,
        projectUrl: item.url || "",
        status: "published",
        sortOrder: index
      }
    }))
  );

  await replaceCollection(
    db,
    "services",
    resumeServices.map((item, index) => ({
      id: slugify(item.title) || `service-${index + 1}`,
      data: {
        title: item.title,
        detail: item.detail,
        sortOrder: index
      }
    }))
  );

  await replaceCollection(
    db,
    "certificates",
    resumeCertificates.map((item, index) => ({
      id: slugify(`${item.issuer}-${item.title}`) || `certificate-${index + 1}`,
      data: {
        title: item.title,
        issuer: item.issuer,
        year: item.year || "",
        sortOrder: index
      }
    }))
  );

  await replaceCollection(
    db,
    "socialLinks",
    resumeSocialLinks.map((item, index) => ({
      id: slugify(item.label) || `social-${index + 1}`,
      data: {
        label: item.label,
        url: item.url,
        sortOrder: index + 1
      }
    }))
  );

  const templateRef = db.collection("creatorTemplates").doc();
  await templateRef.set({
    name: "Problem-Insight-CTA",
    platform: "linkedin",
    hook: "",
    body: "",
    cta: "",
    hashtags: [],
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
  });

  await db.collection("hookLibrary").add({
    text: "",
    createdAt: FieldValue.serverTimestamp()
  });

  await db.collection("ctaLibrary").add({
    text: "",
    createdAt: FieldValue.serverTimestamp()
  });

  const contentItemRef = db.collection("contentItems").doc();
  await contentItemRef.set({
    title: "",
    pillar: "Software",
    type: "post",
    status: "draft",
    notes: "",
    tags: [],
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
  });

  await contentItemRef.collection("variants").doc().set({
    contentItemId: contentItemRef.id,
    contentTitle: "",
    contentType: "post",
    pillar: "Software",
    tags: [],
    platform: "linkedin",
    slug: `draft-${Date.now()}`,
    visibility: "private",
    hook: "",
    body: "",
    cta: "",
    hashtags: [],
    media: [],
    publishedAt: null,
    seoTitle: "",
    seoDesc: "",
    ogImage: "",
    externalUrl: "",
    metrics: {
      views: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      saves: 0,
      watchTime: 0,
      followersGained: 0,
      recordedAt: new Date().toISOString()
    },
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
  });

  console.log("Firestore seed completed.");
}

seed().catch((error) => {
  if (isDatastoreModeError(error)) {
    console.error(datastoreModeGuidance());
    process.exit(1);
  }

  if (isDatabaseNotFoundError(error)) {
    console.error(databaseNotFoundGuidance());
    process.exit(1);
  }

  console.error(error);
  process.exit(1);
});
