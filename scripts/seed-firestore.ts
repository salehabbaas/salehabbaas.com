import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { initAdminForScripts } from "./firebase-admin-init";

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

function databaseNotFoundGuidance() {
  return [
    "Seed failed because the configured Firestore database ID was not found.",
    "Set FIRESTORE_DATABASE_ID and NEXT_PUBLIC_FIRESTORE_DATABASE_ID to an existing Native Firestore database.",
    "",
    "Current repo configuration:",
    "- firebase.json firestore.database: salehabbaas",
    "- .env.local should include FIRESTORE_DATABASE_ID=salehabbaas",
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

async function seed() {
  const app = initAdminForScripts();
  const firestoreDatabaseId = process.env.FIRESTORE_DATABASE_ID || process.env.NEXT_PUBLIC_FIRESTORE_DATABASE_ID;
  const db = firestoreDatabaseId ? getFirestore(app, firestoreDatabaseId) : getFirestore(app);

  await db.collection("siteContent").doc("profile").set(
    {
      name: "Saleh Abbaas",
      headline: "Software Engineer",
      bio: "",
      location: "",
      email: "",
      resumeUrl: "",
      avatarUrl: "",
      updatedAt: FieldValue.serverTimestamp()
    },
    { merge: true }
  );

  await db.collection("siteContent").doc("seoDefaults").set(
    {
      titleTemplate: "Saleh Abbaas | Software Engineer",
      defaultDescription: "",
      defaultOgImage: "",
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
      socialLinks: [
        { label: "LinkedIn", url: "https://linkedin.com/in/salehabbaas" },
        { label: "YouTube", url: "https://youtube.com/@salehabbaas" },
        { label: "Instagram", url: "https://instagram.com/salehabbaas" },
        { label: "TikTok", url: "https://tiktok.com/@salehabbaas" },
        { label: "X", url: "https://x.com/salehabbaas" }
      ],
      updatedAt: FieldValue.serverTimestamp()
    },
    { merge: true }
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
