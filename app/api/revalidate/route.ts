import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { adminAuth } from "@/lib/firebase/admin";

export async function POST(request: Request) {
  try {
    const secret = request.headers.get("x-revalidate-secret");
    const validSecret = process.env.REVALIDATE_SECRET && secret === process.env.REVALIDATE_SECRET;

    if (!validSecret) {
      const authorization = request.headers.get("authorization");
      if (!authorization?.startsWith("Bearer ")) {
        return NextResponse.json({ error: "Missing token" }, { status: 401 });
      }

      const token = authorization.split("Bearer ")[1];
      const decoded = await adminAuth.verifyIdToken(token);
      if (decoded.admin !== true) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const body = await request.json();
    const inputPaths = Array.isArray(body.paths) ? body.paths : [];
    const paths = inputPaths.length ? inputPaths : ["/", "/creator"];

    paths.forEach((path: string) => {
      revalidatePath(path);
    });

    return NextResponse.json({ revalidated: true, paths });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to revalidate";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
