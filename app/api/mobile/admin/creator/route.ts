import { NextResponse } from "next/server";

import { verifyAdminRequest } from "@/lib/auth/admin-api";
import { adminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";

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
  const user = await verifyAdminRequest({ requiredModule: "creator" });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [itemsSnap, variantsSnap] = await Promise.all([
    adminDb.collection("contentItems").orderBy("updatedAt", "desc").limit(80).get(),
    adminDb.collectionGroup("variants").orderBy("updatedAt", "desc").limit(120).get()
  ]);

  return NextResponse.json({
    apiVersion: "2026-03-01",
    contentItems: itemsSnap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        title: String(data.title ?? ""),
        pillar: String(data.pillar ?? ""),
        type: String(data.type ?? ""),
        status: String(data.status ?? ""),
        updatedAt: asIso(data.updatedAt)
      };
    }),
    variants: variantsSnap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        contentTitle: String(data.contentTitle ?? ""),
        platform: String(data.platform ?? ""),
        visibility: String(data.visibility ?? ""),
        slug: String(data.slug ?? ""),
        updatedAt: asIso(data.updatedAt),
        publishedAt: asIso(data.publishedAt),
        scheduledAt: asIso(data.scheduledAt)
      };
    })
  });
}
