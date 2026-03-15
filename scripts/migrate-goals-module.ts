import { FieldValue, getFirestore } from "firebase-admin/firestore";

import { initAdminForScripts } from "./firebase-admin-init";

async function migrateGoalsModule() {
  const app = initAdminForScripts();
  const firestoreDatabaseId =
    process.env.FIRESTORE_DATABASE_ID || process.env.NEXT_PUBLIC_FIRESTORE_DATABASE_ID || "(default)";
  const db = firestoreDatabaseId ? getFirestore(app, firestoreDatabaseId) : getFirestore(app);

  const adminsSnap = await db.collection("adminUsers").where("status", "==", "active").get();
  if (adminsSnap.empty) {
    console.log("No active admin users found. Skipping goals migration.");
    return;
  }

  for (const adminDoc of adminsSnap.docs) {
    const uid = adminDoc.id;
    const userRef = db.collection("users").doc(uid);

    const batch = db.batch();

    batch.set(
      userRef.collection("goalsBoards").doc("default"),
      {
        workspaceId: "main",
        userId: uid,
        title: "Goals Board",
        columns: ["inbox", "this_week", "today", "done"],
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    batch.set(
      userRef.collection("reminderRules").doc("settings"),
      {
        workspaceId: "main",
        userId: uid,
        enableDailyBrief: true,
        enableWrapUp: true,
        enableWeeklyPlanning: true,
        dailyBriefTime: "08:00",
        wrapUpTime: "19:30",
        weeklyPlanningTime: "08:00",
        quietHoursStart: "22:00",
        quietHoursEnd: "07:00",
        timezone: "America/Montreal",
        forceDailyPlan: true,
        minTasksRequired: 3,
        maxTasksRecommended: 7,
        streakMode: "completion_or_review",
        updatedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    batch.set(
      userRef.collection("learningStats").doc("current"),
      {
        workspaceId: "main",
        userId: uid,
        currentStreak: 0,
        longestStreak: 0,
        totalMinutes: 0,
        sessionsCount: 0,
        updatedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    await batch.commit();

    const collections = [
      "stickers",
      "dayPlans",
      "weekPlans",
      "learningPlans",
      "learningSessions",
      "learningStats",
      "pointsLedger",
      "badges",
      "notificationEvents",
    ];

    for (const collectionName of collections) {
      const rows = await userRef.collection(collectionName).limit(500).get();
      if (rows.empty) continue;

      const patchBatch = db.batch();
      rows.docs.forEach((doc) => {
        patchBatch.set(
          doc.ref,
          {
            workspaceId: "main",
            userId: uid,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
      });
      await patchBatch.commit();
    }

    console.log(`Migrated goals module defaults for uid=${uid}`);
  }

  console.log("Goals module migration complete.");
}

migrateGoalsModule().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
