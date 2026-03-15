import { FieldValue, getFirestore } from "firebase-admin/firestore";

import { initAdminForScripts } from "./firebase-admin-init";

function todayDateId(timezone = "America/Montreal") {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function weekIdFromDateId(dateId: string) {
  const matched = dateId.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!matched) return "";

  const year = Number(matched[1]);
  const month = Number(matched[2]);
  const day = Number(matched[3]);

  const current = new Date(Date.UTC(year, month - 1, day));
  const dayNum = current.getUTCDay() || 7;
  current.setUTCDate(current.getUTCDate() + 4 - dayNum);
  const isoYear = current.getUTCFullYear();
  const yearStart = new Date(Date.UTC(isoYear, 0, 1));
  const week = Math.ceil(((current.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);

  return `${isoYear}-W${String(week).padStart(2, "0")}`;
}

async function seedGoalsModule() {
  const app = initAdminForScripts();
  const firestoreDatabaseId =
    process.env.FIRESTORE_DATABASE_ID || process.env.NEXT_PUBLIC_FIRESTORE_DATABASE_ID || "(default)";
  const db = firestoreDatabaseId ? getFirestore(app, firestoreDatabaseId) : getFirestore(app);

  const uid = process.env.GOALS_SEED_UID || process.env.ADMIN_BOOTSTRAP_UID || "seed-admin";
  const today = todayDateId("America/Montreal");
  const weekId = weekIdFromDateId(today);

  const userRef = db.collection("users").doc(uid);
  const boardRef = userRef.collection("goalsBoards").doc("default");
  const settingsRef = userRef.collection("reminderRules").doc("settings");
  const dayPlanRef = userRef.collection("dayPlans").doc(today);
  const weekPlanRef = userRef.collection("weekPlans").doc(weekId);
  const learningPlanRef = userRef.collection("learningPlans").doc(weekId);
  const learningStatsRef = userRef.collection("learningStats").doc("current");

  const stickers = [
    {
      id: "seed-sticker-inbox-1",
      title: "Outline two key priorities for the day",
      notes: "Keep outcomes specific and measurable.",
      status: "inbox",
      tags: ["planning", "focus"],
      color: "amber",
      priority: "medium",
      estimateMinutes: 25,
      xpValue: 16,
      plannedDate: null,
      completedAt: null,
      source: { type: "manual" },
      learning: {
        learningArea: "Planning systems",
        learningOutcome: "Define a clear daily planning rubric.",
        difficulty: "beginner",
        studyType: "review",
        resourceLink: "https://salehabbaas.com/experience",
        timeBoxMinutes: 25,
      },
      order: 0,
    },
    {
      id: "seed-sticker-week-1",
      title: "Prepare architecture notes for API iteration",
      notes: "Capture tradeoffs and rollout steps.",
      status: "this_week",
      tags: ["engineering", "docs"],
      color: "sky",
      priority: "high",
      estimateMinutes: 90,
      xpValue: 24,
      plannedDate: today,
      completedAt: null,
      source: { type: "manual" },
      learning: {
        learningArea: "System design",
        learningOutcome: "Document API tradeoffs and deployment constraints.",
        difficulty: "intermediate",
        studyType: "build",
        resourceLink: "https://salehabbaas.com/projects",
        timeBoxMinutes: 90,
      },
      order: 0,
    },
    {
      id: "seed-sticker-today-1",
      title: "Ship one meaningful feature increment",
      notes: "Define done criteria before coding.",
      status: "today",
      tags: ["shipping", "feature"],
      color: "emerald",
      priority: "high",
      estimateMinutes: 120,
      xpValue: 28,
      plannedDate: today,
      completedAt: null,
      source: { type: "manual" },
      learning: {
        learningArea: "Product engineering",
        learningOutcome: "Ship and review one feature with measurable impact.",
        difficulty: "intermediate",
        studyType: "build",
        resourceLink: "https://salehabbaas.com/services",
        timeBoxMinutes: 120,
      },
      order: 0,
    },
    {
      id: "seed-sticker-done-1",
      title: "Review yesterday outcomes",
      notes: "Extract one insight and one improvement.",
      status: "done",
      tags: ["review"],
      color: "violet",
      priority: "low",
      estimateMinutes: 20,
      xpValue: 10,
      plannedDate: today,
      completedAt: FieldValue.serverTimestamp(),
      source: { type: "manual" },
      learning: {
        learningArea: "Reflection",
        learningOutcome: "Capture one insight and one improvement.",
        difficulty: "beginner",
        studyType: "review",
        timeBoxMinutes: 20,
      },
      order: 0,
    },
  ];

  const batch = db.batch();

  batch.set(
    boardRef,
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
    settingsRef,
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

  stickers.forEach((sticker) => {
    batch.set(
      userRef.collection("stickers").doc(sticker.id),
      {
        workspaceId: "main",
        userId: uid,
        ...sticker,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  });

  batch.set(
    dayPlanRef,
    {
      workspaceId: "main",
      userId: uid,
      dateId: today,
      stickerIds: ["seed-sticker-today-1", "seed-sticker-week-1"],
      forceRulesSnapshot: {
        minTasksRequired: 3,
        maxTasksRecommended: 7,
      },
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  batch.set(
    weekPlanRef,
    {
      workspaceId: "main",
      userId: uid,
      weekId,
      stickerIds: ["seed-sticker-week-1", "seed-sticker-today-1", "seed-sticker-inbox-1"],
      focusAreas: ["Product delivery", "Deep work"],
      notes: "Seed week plan",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  batch.set(
    learningPlanRef,
    {
      workspaceId: "main",
      userId: uid,
      weekId,
      stickerIds: ["seed-sticker-week-1", "seed-sticker-today-1"],
      focusAreas: ["System design", "Product engineering"],
      targetMinutes: 360,
      notes: "Seed learning plan",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  batch.set(
    userRef.collection("learningSessions").doc(`seed-learning-session-${today}`),
    {
      workspaceId: "main",
      userId: uid,
      dateId: today,
      stickerId: "seed-sticker-week-1",
      learningArea: "System design",
      minutesSpent: 45,
      notes: "Seed learning session",
      completed: true,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  batch.set(
    learningStatsRef,
    {
      workspaceId: "main",
      userId: uid,
      currentStreak: 1,
      longestStreak: 1,
      totalMinutes: 45,
      sessionsCount: 1,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  await batch.commit();

  console.log(`Goals module seed completed for uid=${uid} date=${today} week=${weekId}`);
}

seedGoalsModule().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
