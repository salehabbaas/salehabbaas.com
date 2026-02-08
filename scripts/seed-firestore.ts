import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

function initAdmin() {
  if (getApps().length) return getApps()[0];

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Missing FIREBASE_PROJECT_ID/FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY env vars.");
  }

  return initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey
    })
  });
}

async function seed() {
  initAdmin();
  const db = getFirestore();

  await db.collection("resumeSections").doc("about").set(
    {
      name: "Saleh Abbaas",
      title: "Senior Full-Stack Engineer",
      summary:
        "I build production systems with Next.js and Firebase, combining architecture, product design, and SEO-driven growth.",
      updatedAt: FieldValue.serverTimestamp()
    },
    { merge: true }
  );

  await db.collection("jobTrackerSettings").doc("default").set(
    {
      statuses: ["saved", "applied", "screening", "assessment", "interview", "offer", "rejected", "withdrawn"],
      sources: ["LinkedIn", "Indeed", "Referral", "Company Site"],
      workModels: ["remote", "hybrid", "onsite"],
      updatedAt: FieldValue.serverTimestamp()
    },
    { merge: true }
  );

  await db.collection("creatorSettings").doc("default").set(
    {
      defaultVisibility: "private",
      newsletterEnabled: true,
      pillars: ["Engineering", "Career", "Growth", "Content Strategy"],
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
    hook: "Most creators are not short on ideas, they are short on systems.",
    body: "I build operating systems for content teams: ideation, varianting, scheduling, and attribution in one stack.",
    cta: "If you want a creator engine that scales, message me.",
    hashtags: ["creator", "firebase", "growth"],
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
  });

  await db.collection("hookLibrary").add({
    text: "If you cannot measure it, you cannot improve it.",
    createdAt: FieldValue.serverTimestamp()
  });

  await db.collection("ctaLibrary").add({
    text: "Follow for practical systems you can apply this week.",
    createdAt: FieldValue.serverTimestamp()
  });

  const contentItemRef = db.collection("contentItems").doc();
  await contentItemRef.set({
    title: "How to build a Creator OS with Firebase",
    pillar: "Engineering",
    type: "post",
    status: "published",
    notes: "Seed sample content item",
    tags: ["firebase", "creator", "seo"],
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
  });

  await contentItemRef.collection("variants").doc().set({
    contentItemId: contentItemRef.id,
    contentTitle: "How to build a Creator OS with Firebase",
    contentType: "post",
    pillar: "Engineering",
    tags: ["firebase", "creator", "seo"],
    platform: "linkedin",
    slug: "build-creator-os-firebase",
    visibility: "public",
    hook: "Creators fail because content systems are fragmented.",
    body: "Use a unified data model with content item + platform variants, and push analytics events per interaction.",
    cta: "Save this and build your system this week.",
    hashtags: ["firebase", "nextjs", "contentstrategy"],
    media: ["https://www.youtube.com/watch?v=dQw4w9WgXcQ"],
    publishedAt: FieldValue.serverTimestamp(),
    seoTitle: "Build a Creator OS with Firebase and Next.js",
    seoDesc: "A practical blueprint for structuring and publishing creator content using Firebase and Next.js.",
    ogImage: "",
    externalUrl: "https://linkedin.com/posts/salehabbaas",
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
  console.error(error);
  process.exit(1);
});
