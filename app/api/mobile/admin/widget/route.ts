import { NextResponse } from "next/server";

import { verifyAdminRequest } from "@/lib/auth/admin-api";
import { getBookings } from "@/lib/firestore/booking";
import { getJobTrackerJobs } from "@/lib/firestore/resume-studio";
import { adminDb } from "@/lib/firebase/admin";
import { goalsWorkspaceDefault } from "@/types/goals";

export const runtime = "nodejs";

const API_VERSION = "2026-03-29";

function asIso(value: unknown) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object" && value && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate().toISOString();
  }
  return "";
}

export async function GET() {
  const session = await verifyAdminRequest({
    allowCookie: false,
    allowBearer: true
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized", apiVersion: API_VERSION }, { status: 401 });
  }

  const moduleAccess = session.adminAccess.moduleAccess;
  const canDashboard = moduleAccess.dashboard === true;
  const canJobs = moduleAccess.jobs === true;
  const canBookings = moduleAccess.bookings === true;

  try {
    const jobsPromise = canJobs ? getJobTrackerJobs(session.uid) : Promise.resolve([]);
    const bookingsPromise = canBookings ? getBookings({ futureOnly: true, limit: 160 }) : Promise.resolve([]);
    const notificationsPromise = canDashboard
      ? adminDb.collection("notifications").orderBy("createdAt", "desc").limit(60).get()
      : Promise.resolve(null);
    const goalsPromise = canDashboard
      ? adminDb.collection("goalStickers").where("workspaceId", "==", goalsWorkspaceDefault).limit(100).get()
      : Promise.resolve(null);
    const goalStatsPromise = canDashboard
      ? adminDb.collection("goalLearningStats").where("workspaceId", "==", goalsWorkspaceDefault).limit(1).get()
      : Promise.resolve(null);

    const [jobs, bookings, notificationsSnap, goalsSnap, goalStatsSnap] = await Promise.all([
      jobsPromise,
      bookingsPromise,
      notificationsPromise,
      goalsPromise,
      goalStatsPromise
    ]);

    const unreadCount =
      notificationsSnap?.docs.filter((doc) => String(doc.data().state ?? "unread") === "unread").length ?? 0;
    const latestNotificationTitle =
      notificationsSnap?.docs
        .map((doc) => String(doc.data().title ?? "").trim())
        .find((title) => title.length > 0) ?? "";

    const jobCounts = {
      total: jobs.length,
      active: jobs.filter((job) =>
        ["applied", "screening", "interview", "offer"].includes(String(job.status ?? "").toLowerCase())
      ).length,
      interviews: jobs.filter((job) => String(job.status ?? "").toLowerCase() === "interview").length,
      offers: jobs.filter((job) => String(job.status ?? "").toLowerCase() === "offer").length
    };

    const upcomingBookings = bookings.filter((booking) => String(booking.status ?? "confirmed") !== "cancelled");
    const nextBooking = upcomingBookings
      .map((booking) => asIso(booking.startAt))
      .filter((value) => value.length > 0)
      .sort()[0] ?? "";

    const goals =
      goalsSnap?.docs.map((doc) => {
        const data = doc.data();
        return {
          title: String(data.title ?? ""),
          status: String(data.status ?? "inbox")
        };
      }) ?? [];
    const activeGoals = goals.filter((goal) => goal.status === "today" || goal.status === "this_week").length;
    const completedGoals = goals.filter((goal) => goal.status === "done").length;
    const highlightGoal = goals.find((goal) => goal.status === "today" || goal.status === "this_week")?.title ?? "";

    const statsDoc = goalStatsSnap?.empty ? null : goalStatsSnap?.docs[0].data();

    return NextResponse.json({
      apiVersion: API_VERSION,
      updatedAt: new Date().toISOString(),
      user: {
        uid: session.uid,
        email: session.email ?? ""
      },
      modules: {
        dashboard: canDashboard,
        jobs: canJobs,
        bookings: canBookings
      },
      notifications: {
        unreadCount,
        latestTitle: latestNotificationTitle
      },
      jobs: jobCounts,
      bookings: {
        upcoming: upcomingBookings.length,
        nextStartAt: nextBooking
      },
      goals: {
        active: activeGoals,
        completed: completedGoals,
        currentStreak: Number(statsDoc?.currentStreak ?? 0),
        totalMinutes: Number(statsDoc?.totalMinutes ?? 0),
        highlight: highlightGoal
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load widget summary";
    return NextResponse.json({ error: message, apiVersion: API_VERSION }, { status: 500 });
  }
}
