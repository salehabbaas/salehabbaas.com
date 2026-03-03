import { NextResponse } from "next/server";
import { z } from "zod";

import { getAdminRequestContext } from "@/lib/admin/request-context";
import { verifyAdminSessionFromCookie } from "@/lib/auth/admin-api";
import { adminAgentActionSchema, adminAgentMessageSchema, runAdminAgent } from "@/lib/agent/admin-agent";

export const runtime = "nodejs";

const requestSchema = z.object({
  messages: z.array(adminAgentMessageSchema).min(1).max(30),
  execute: z.boolean().optional(),
  actions: z.array(adminAgentActionSchema).max(6).optional(),
  maxActions: z.number().int().min(1).max(6).optional(),
  page: z.string().trim().max(200).optional()
});

export async function POST(request: Request) {
  const user = await verifyAdminSessionFromCookie({ requiredModule: "salehOsChat" });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const requestContext = getAdminRequestContext(request);

  try {
    const body = requestSchema.parse(await request.json());

    const result = await runAdminAgent({
      actorUid: user.uid,
      actorToken: user,
      requestContext: {
        ...requestContext,
        path: body.page || requestContext.path
      },
      messages: body.messages,
      execute: body.execute === true,
      source: "panel",
      maxActions: body.maxActions,
      providedActions: body.actions,
      allowWriteActions: true
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to run admin agent";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
