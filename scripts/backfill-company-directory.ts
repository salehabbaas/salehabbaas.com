import { FieldValue, getFirestore } from "firebase-admin/firestore";

import { initAdminForScripts } from "./firebase-admin-init";
import { normalizeCompanyNameKey } from "../lib/company-directory/utils";

type Args = {
  apply: boolean;
  ownerId: string;
};

type CompanySeed = {
  name: string;
  normalizedName: string;
  city: string;
  companyType: string;
  careersUrl: string;
  websiteUrl: string;
  notes: string;
};

function parseArgs(argv: string[]): Args {
  const apply = argv.includes("--apply");
  const ownerIdIndex = argv.indexOf("--owner-id");
  const ownerId = ownerIdIndex >= 0 ? String(argv[ownerIdIndex + 1] ?? "").trim() : "";
  return { apply, ownerId };
}

function getDb() {
  const app = initAdminForScripts();
  const firestoreDatabaseId = process.env.FIRESTORE_DATABASE_ID || process.env.NEXT_PUBLIC_FIRESTORE_DATABASE_ID;
  return firestoreDatabaseId ? getFirestore(app, firestoreDatabaseId) : getFirestore(app);
}

function mergeSeed(target: CompanySeed, incoming: Partial<CompanySeed>) {
  if (incoming.city && !target.city) target.city = incoming.city;
  if (incoming.companyType && !target.companyType) target.companyType = incoming.companyType;
  if (incoming.careersUrl && !target.careersUrl) target.careersUrl = incoming.careersUrl;
  if (incoming.websiteUrl && !target.websiteUrl) target.websiteUrl = incoming.websiteUrl;
  if (incoming.notes && !target.notes) target.notes = incoming.notes;
}

function makeSeed(name: string): CompanySeed | null {
  const cleanName = name.trim();
  const normalizedName = normalizeCompanyNameKey(cleanName);
  if (!cleanName || !normalizedName) return null;

  return {
    name: cleanName,
    normalizedName,
    city: "",
    companyType: "other",
    careersUrl: "",
    websiteUrl: "",
    notes: ""
  };
}

async function main() {
  const args = parseArgs(process.argv);
  const db = getDb();

  const [jobsSnap, linkedinSnap, experiencesSnap] = await Promise.all([
    db.collection("jobTrackerJobs").get(),
    db.collection("linkedinStudioProfiles").doc("default").get(),
    db.collection("experiences").get()
  ]);

  const ownerFromJobs = jobsSnap.docs.find((doc) => typeof doc.data().ownerId === "string" && doc.data().ownerId.trim())?.data().ownerId as string | undefined;
  const ownerId = args.ownerId || ownerFromJobs || "";
  if (!ownerId) {
    throw new Error("Unable to determine ownerId. Pass --owner-id <uid>.");
  }

  const seeds = new Map<string, CompanySeed>();

  jobsSnap.docs.forEach((doc) => {
    const data = doc.data();
    if (String(data.ownerId ?? "") !== ownerId) return;
    const seed = makeSeed(String(data.company ?? ""));
    if (!seed) return;

    const current = seeds.get(seed.normalizedName);
    if (!current) {
      seeds.set(seed.normalizedName, seed);
      return;
    }

    mergeSeed(current, {
      city: "",
      careersUrl: typeof data.jobUrl === "string" ? data.jobUrl : ""
    });
  });

  const linkedin = linkedinSnap.data() ?? {};
  const targetingCompanies = Array.isArray((linkedin as { targeting?: { companies?: unknown[] } }).targeting?.companies)
    ? ((linkedin as { targeting?: { companies?: unknown[] } }).targeting?.companies as Array<Record<string, unknown>>)
    : [];
  const profileExperiences = Array.isArray((linkedin as { experience?: unknown[] }).experience)
    ? ((linkedin as { experience?: unknown[] }).experience as Array<Record<string, unknown>>)
    : [];

  targetingCompanies.forEach((company) => {
    const seed = makeSeed(String(company.name ?? ""));
    if (!seed) return;

    const current = seeds.get(seed.normalizedName);
    if (!current) {
      seeds.set(seed.normalizedName, {
        ...seed,
        websiteUrl: String(company.website ?? "").trim(),
        notes: String(company.notes ?? "").trim() || ""
      });
      return;
    }

    mergeSeed(current, {
      websiteUrl: String(company.website ?? "").trim(),
      notes: String(company.notes ?? "").trim()
    });
  });

  profileExperiences.forEach((entry) => {
    const seed = makeSeed(String(entry.company ?? ""));
    if (!seed) return;
    if (!seeds.has(seed.normalizedName)) {
      seeds.set(seed.normalizedName, seed);
    }
  });

  experiencesSnap.docs.forEach((doc) => {
    const data = doc.data();
    const seed = makeSeed(String(data.company ?? ""));
    if (!seed) return;
    if (!seeds.has(seed.normalizedName)) {
      seeds.set(seed.normalizedName, seed);
    }
  });

  const existingCompaniesSnap = await db.collection("trackedCompanies").where("ownerId", "==", ownerId).get();
  const companyIdByNormalized = new Map<string, string>();

  existingCompaniesSnap.docs.forEach((doc) => {
    const data = doc.data();
    const normalized = String(data.normalizedName ?? "") || normalizeCompanyNameKey(String(data.name ?? ""));
    if (!normalized) return;
    companyIdByNormalized.set(normalized, doc.id);
  });

  let createdCompanies = 0;
  let updatedCompanies = 0;

  for (const seed of seeds.values()) {
    const existingId = companyIdByNormalized.get(seed.normalizedName);
    if (existingId) {
      if (args.apply) {
        await db.collection("trackedCompanies").doc(existingId).set(
          {
            ownerId,
            name: seed.name,
            normalizedName: seed.normalizedName,
            city: seed.city,
            companyType: seed.companyType || "other",
            careersUrl: seed.careersUrl,
            websiteUrl: seed.websiteUrl,
            notes: seed.notes,
            updatedAt: new Date()
          },
          { merge: true }
        );
      }
      updatedCompanies += 1;
      continue;
    }

    const ref = args.apply
      ? await db.collection("trackedCompanies").add({
          ownerId,
          name: seed.name,
          normalizedName: seed.normalizedName,
          city: seed.city,
          companyType: seed.companyType || "other",
          careersUrl: seed.careersUrl,
          websiteUrl: seed.websiteUrl,
          notes: seed.notes,
          lastCheckedAt: null,
          lastCheckNote: "",
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp()
        })
      : { id: `dry-${seed.normalizedName}` };

    companyIdByNormalized.set(seed.normalizedName, ref.id);
    createdCompanies += 1;
  }

  let updatedJobs = 0;
  for (const jobDoc of jobsSnap.docs) {
    const data = jobDoc.data();
    if (String(data.ownerId ?? "") !== ownerId) continue;

    const normalized = normalizeCompanyNameKey(String(data.company ?? ""));
    if (!normalized) continue;
    const linkedCompanyId = companyIdByNormalized.get(normalized);
    if (!linkedCompanyId) continue;

    const canonicalName = seeds.get(normalized)?.name || String(data.company ?? "");

    if (args.apply) {
      await jobDoc.ref.set(
        {
          companyId: linkedCompanyId,
          company: canonicalName,
          updatedAt: new Date()
        },
        { merge: true }
      );
    }
    updatedJobs += 1;
  }

  let updatedLinkedinCompanies = 0;
  let updatedLinkedinExperience = 0;

  if (!linkedinSnap.exists) {
    // no-op
  } else {
    const patchedCompanies = targetingCompanies.map((company) => {
      const normalized = normalizeCompanyNameKey(String(company.name ?? ""));
      if (!normalized) return company;
      const linkedCompanyId = companyIdByNormalized.get(normalized);
      if (!linkedCompanyId) return company;
      updatedLinkedinCompanies += 1;
      return {
        ...company,
        companyId: linkedCompanyId,
        name: seeds.get(normalized)?.name || String(company.name ?? "")
      };
    });

    const patchedExperience = profileExperiences.map((entry) => {
      const normalized = normalizeCompanyNameKey(String(entry.company ?? ""));
      if (!normalized) return entry;
      const linkedCompanyId = companyIdByNormalized.get(normalized);
      if (!linkedCompanyId) return entry;
      updatedLinkedinExperience += 1;
      return {
        ...entry,
        companyId: linkedCompanyId,
        company: seeds.get(normalized)?.name || String(entry.company ?? "")
      };
    });

    if (args.apply) {
      await linkedinSnap.ref.set(
        {
          targeting: {
            ...(linkedin as { targeting?: Record<string, unknown> }).targeting,
            companies: patchedCompanies
          },
          experience: patchedExperience,
          updatedAt: new Date()
        },
        { merge: true }
      );
    }
  }

  let updatedExperiences = 0;
  for (const experienceDoc of experiencesSnap.docs) {
    const data = experienceDoc.data();
    const normalized = normalizeCompanyNameKey(String(data.company ?? ""));
    if (!normalized) continue;
    const linkedCompanyId = companyIdByNormalized.get(normalized);
    if (!linkedCompanyId) continue;

    if (args.apply) {
      await experienceDoc.ref.set(
        {
          companyId: linkedCompanyId,
          company: seeds.get(normalized)?.name || String(data.company ?? ""),
          updatedAt: new Date()
        },
        { merge: true }
      );
    }
    updatedExperiences += 1;
  }

  console.log(`Company directory backfill ${args.apply ? "APPLY" : "DRY-RUN"}`);
  console.log(`- ownerId: ${ownerId}`);
  console.log(`- normalized companies discovered: ${seeds.size}`);
  console.log(`- companies created: ${createdCompanies}`);
  console.log(`- companies updated (existing): ${updatedCompanies}`);
  console.log(`- jobTrackerJobs linked: ${updatedJobs}`);
  console.log(`- linkedin targeting companies linked: ${updatedLinkedinCompanies}`);
  console.log(`- linkedin experience rows linked: ${updatedLinkedinExperience}`);
  console.log(`- experiences linked: ${updatedExperiences}`);
  console.log(`- mode note: use --apply to write changes (default is dry-run)`);
}

main().catch((error) => {
  console.error("Backfill failed", error);
  process.exit(1);
});
