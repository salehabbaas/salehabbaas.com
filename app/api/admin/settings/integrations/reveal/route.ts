import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";
import { z } from "zod";

import { writeAdminAuditLog } from "@/lib/admin/audit";
import { getAdminRequestContext } from "@/lib/admin/request-context";
import { verifyAdminRequest } from "@/lib/auth/admin-api";
import { getAdminSecretSettings } from "@/lib/firestore/admin-settings";

const bodySchema = z.object({
  password: z.string().min(1)
});

function passwordsMatch(candidate: string, expected: string) {
  const candidateBuffer = Buffer.from(candidate);
  const expectedBuffer = Buffer.from(expected);
  if (candidateBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(candidateBuffer, expectedBuffer);
}

export async function POST(request: Request) {
  const user = await verifyAdminRequest({ requiredModule: "settings" });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const requestContext = getAdminRequestContext(request);

  try {
    const body = bodySchema.parse(await request.json());
    const revealPassword = process.env.ADMIN_INTEGRATIONS_VIEW_PASSWORD || process.env.ADMIN_BOOTSTRAP_PASSWORD || "";

    if (!revealPassword) {
      return NextResponse.json(
        {
          error:
            "Secret reveal password is not configured. Set ADMIN_INTEGRATIONS_VIEW_PASSWORD (or ADMIN_BOOTSTRAP_PASSWORD) to enable this action."
        },
        { status: 503 }
      );
    }

    if (!passwordsMatch(body.password, revealPassword)) {
      return NextResponse.json({ error: "Invalid password" }, { status: 403 });
    }

    const secrets = await getAdminSecretSettings();

    await writeAdminAuditLog(
      {
        module: "settings",
        action: "reveal_integrations_secrets",
        targetType: "adminSettings",
        targetId: "integrations+secrets",
        summary: "Revealed stored integration secret values",
        metadata: {
          keys: Object.keys(secrets)
        }
      },
      user,
      requestContext
    );

    return NextResponse.json({ secrets });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to reveal secrets";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
