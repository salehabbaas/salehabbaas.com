import "dotenv/config";

import { adminDb } from "../lib/firebase/admin";

function asIso(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object" && value && "toDate" in value && typeof (value as { toDate?: unknown }).toDate === "function") {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  return "";
}

function parseArgs(argv: string[]) {
  const uidIndex = argv.indexOf("--uid");
  const uid = uidIndex >= 0 ? argv[uidIndex + 1] : "";
  return { uid };
}

async function main() {
  const { uid } = parseArgs(process.argv);
  if (!uid) {
    throw new Error("Missing --uid argument. Example: tsx scripts/import-linkedin-studio.ts --uid <firebase-uid>");
  }

  const sourceUserRef = adminDb.collection("users").doc(uid);
  const sourceUserSnap = await sourceUserRef.get();

  if (!sourceUserSnap.exists) {
    throw new Error(`User ${uid} not found in legacy /users collection.`);
  }

  const sourceUser = sourceUserSnap.data() ?? {};

  const experienceSnap = await sourceUserRef.collection("experience").get();
  const experience = experienceSnap.docs.map((doc) => ({
    roleTitle: String(doc.data().roleTitle ?? ""),
    company: String(doc.data().company ?? ""),
    industry: String(doc.data().industry ?? ""),
    startDate: String(doc.data().startDate ?? ""),
    endDate: String(doc.data().endDate ?? ""),
    bullets: Array.isArray(doc.data().bullets) ? doc.data().bullets : [],
    technologies: Array.isArray(doc.data().technologies) ? doc.data().technologies : [],
    lessonsLearned: Array.isArray(doc.data().lessonsLearned) ? doc.data().lessonsLearned : []
  }));

  const configRef = adminDb.collection("linkedinStudioProfiles").doc("default");
  await configRef.set(
    {
      profile: {
        displayName: sourceUser.profile?.displayName ?? "Saleh Abbaas",
        headline: sourceUser.profile?.headline ?? "",
        about: sourceUser.profile?.about ?? "",
        goals: Array.isArray(sourceUser.profile?.goals) ? sourceUser.profile.goals : [],
        location: sourceUser.profile?.location ?? "",
        voiceStyle: {
          tone: sourceUser.profile?.voiceStyle?.tone ?? "Practical, warm, concise",
          length: sourceUser.profile?.voiceStyle?.length ?? "Medium",
          dos: Array.isArray(sourceUser.profile?.voiceStyle?.dos) ? sourceUser.profile.voiceStyle.dos : [],
          donts: Array.isArray(sourceUser.profile?.voiceStyle?.donts) ? sourceUser.profile.voiceStyle.donts : []
        }
      },
      targeting: {
        companies: Array.isArray(sourceUser.targeting?.companies) ? sourceUser.targeting.companies : [],
        industries: Array.isArray(sourceUser.targeting?.industries) ? sourceUser.targeting.industries : [],
        technologies: Array.isArray(sourceUser.targeting?.technologies) ? sourceUser.targeting.technologies : [],
        pillars: Array.isArray(sourceUser.targeting?.pillars) ? sourceUser.targeting.pillars : []
      },
      settings: {
        cadenceDaysOfWeek: Array.isArray(sourceUser.settings?.cadenceDaysOfWeek)
          ? sourceUser.settings.cadenceDaysOfWeek
          : ["TU", "TH"],
        reminderTimeLocal: sourceUser.settings?.reminderTimeLocal ?? "09:00",
        timezone: sourceUser.settings?.timezone ?? "America/Toronto",
        webResearchEnabled: Boolean(sourceUser.settings?.webResearchEnabled ?? true),
        autoSelectCompany: Boolean(sourceUser.settings?.autoSelectCompany ?? true),
        autoSelectTopic: Boolean(sourceUser.settings?.autoSelectTopic ?? true),
        autoShareLinkedIn: Boolean(sourceUser.settings?.autoShareLinkedIn ?? false)
      },
      experience,
      createdAt: sourceUser.profile?.createdAt ? new Date(asIso(sourceUser.profile.createdAt)) : new Date(),
      updatedAt: new Date()
    },
    { merge: true }
  );

  const legacyPostsSnap = await sourceUserRef.collection("posts").get();
  let migratedPosts = 0;
  let migratedVersions = 0;

  for (const legacyPost of legacyPostsSnap.docs) {
    const legacyData = legacyPost.data();
    const targetPostRef = adminDb.collection("linkedinStudioPosts").doc(legacyPost.id);

    await targetPostRef.set(
      {
        status: legacyData.status ?? "draft",
        selectedCompany: legacyData.selectedCompany ?? "",
        selectedTopics: Array.isArray(legacyData.selectedTopics) ? legacyData.selectedTopics : [],
        selectedPillar: legacyData.selectedPillar ?? "",
        title: legacyData.title ?? legacyData.selectedCompany ?? "Untitled",
        createdAt: legacyData.createdAt ? new Date(asIso(legacyData.createdAt)) : new Date(),
        updatedAt: legacyData.updatedAt ? new Date(asIso(legacyData.updatedAt)) : new Date(),
        scheduledFor: legacyData.scheduledFor ? new Date(asIso(legacyData.scheduledFor)) : null,
        publishedAt: legacyData.publishedAt ? new Date(asIso(legacyData.publishedAt)) : null,
        finalText: legacyData.finalText ?? "",
        hashtags: Array.isArray(legacyData.hashtags) ? legacyData.hashtags : [],
        mentions: Array.isArray(legacyData.mentions) ? legacyData.mentions : [],
        internalNotes: {
          rationale: legacyData.internalNotes?.rationale ?? "",
          whyFit: legacyData.internalNotes?.whyFit ?? ""
        }
      },
      { merge: true }
    );

    migratedPosts += 1;

    const versionsSnap = await legacyPost.ref.collection("versions").get();
    for (const version of versionsSnap.docs) {
      await targetPostRef.collection("versions").doc(version.id).set(
        {
          versionNumber: Number(version.data().versionNumber ?? 1),
          text: version.data().text ?? "",
          feedbackApplied: version.data().feedbackApplied ?? "",
          createdAt: version.data().createdAt ? new Date(asIso(version.data().createdAt)) : new Date()
        },
        { merge: true }
      );
      migratedVersions += 1;
    }
  }

  console.log(`Migrated profile + ${migratedPosts} posts (${migratedVersions} versions) from users/${uid}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
