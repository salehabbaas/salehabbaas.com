import { NextResponse } from "next/server";

import { adminDb } from "@/lib/firebase/admin";
import { resolveAbsoluteUrl } from "@/lib/utils";

function escapeIcsText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

function toIcsDate(value: Date) {
  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, "0");
  const day = String(value.getUTCDate()).padStart(2, "0");
  const hours = String(value.getUTCHours()).padStart(2, "0");
  const minutes = String(value.getUTCMinutes()).padStart(2, "0");
  const seconds = String(value.getUTCSeconds()).padStart(2, "0");
  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

function readDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === "object" && value && "toDate" in value && typeof value.toDate === "function") {
    const parsed = value.toDate();
    return parsed instanceof Date && !Number.isNaN(parsed.getTime()) ? parsed : null;
  }
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

function taskAdminLink(projectId: string, taskId: string) {
  return resolveAbsoluteUrl(`/admin/projects/${projectId}?taskId=${taskId}`);
}

export async function GET(_: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  if (!token || token.length < 12) {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }

  const settingsSnap = await adminDb.collectionGroup("settings").where("calendarIcsToken", "==", token).limit(1).get();
  if (settingsSnap.empty) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const settingsDoc = settingsSnap.docs[0];
  const userDoc = settingsDoc.ref.parent.parent;
  const userId = userDoc?.id;
  if (!userId) {
    return NextResponse.json({ error: "Invalid token" }, { status: 404 });
  }

  const [assignedSnap, watcherSnap] = await Promise.all([
    adminDb.collection("tasks").where("assigneeId", "==", userId).get(),
    adminDb.collection("tasks").where("watchers", "array-contains", userId).get()
  ]);

  const merged = new Map<string, { projectId: string; title: string; description: string; priority: string; dueDate: Date }>();

  [...assignedSnap.docs, ...watcherSnap.docs].forEach((doc) => {
    const data = doc.data();
    const dueDate = readDate(data.dueDate);
    if (!dueDate) return;

    merged.set(doc.id, {
      projectId: String(data.projectId ?? ""),
      title: String(data.title ?? "Untitled task"),
      description: String(data.description ?? ""),
      priority: String(data.priority ?? "P3"),
      dueDate
    });
  });

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//salehabbaas.com//Project Tasks//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Saleh Projects Tasks"
  ];

  const stamp = toIcsDate(new Date());

  Array.from(merged.entries())
    .sort((a, b) => a[1].dueDate.getTime() - b[1].dueDate.getTime())
    .forEach(([taskId, task]) => {
      const start = task.dueDate;
      const end = new Date(start.getTime() + 60 * 60 * 1000);
      lines.push("BEGIN:VEVENT");
      lines.push(`UID:${escapeIcsText(`${taskId}@salehabbaas.com`)}`);
      lines.push(`DTSTAMP:${stamp}`);
      lines.push(`DTSTART:${toIcsDate(start)}`);
      lines.push(`DTEND:${toIcsDate(end)}`);
      lines.push(`SUMMARY:${escapeIcsText(`[${task.priority}] ${task.title}`)}`);
      lines.push(`DESCRIPTION:${escapeIcsText(`${task.description}\n\n${taskAdminLink(task.projectId, taskId)}`)}`);
      lines.push(`URL:${escapeIcsText(taskAdminLink(task.projectId, taskId))}`);
      lines.push("END:VEVENT");
    });

  lines.push("END:VCALENDAR");

  return new NextResponse(`${lines.join("\r\n")}\r\n`, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Cache-Control": "private, max-age=300"
    }
  });
}
