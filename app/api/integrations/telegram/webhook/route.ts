import { NextResponse } from "next/server";
import { z } from "zod";

import { runAdminAgent } from "@/lib/agent/admin-agent";
import { parseAllowedTelegramChatIds, resolveTelegramBotToken, sendTelegramMessage } from "@/lib/agent/telegram";
import { getRuntimeAdminSettings } from "@/lib/firestore/admin-settings";

export const runtime = "nodejs";

const updateSchema = z
  .object({
    message: z
      .object({
        text: z.string().optional(),
        chat: z.object({
          id: z.union([z.string(), z.number()])
        })
      })
      .optional(),
    edited_message: z
      .object({
        text: z.string().optional(),
        chat: z.object({
          id: z.union([z.string(), z.number()])
        })
      })
      .optional()
  })
  .passthrough();

function asChatId(value: string | number) {
  return typeof value === "number" ? String(value) : value.trim();
}

export async function POST(request: Request) {
  const runtime = await getRuntimeAdminSettings();
  const expectedSecret = runtime.secrets.telegramWebhookSecret || process.env.TELEGRAM_WEBHOOK_SECRET || "";

  if (expectedSecret) {
    const token = request.headers.get("x-telegram-bot-api-secret-token") || "";
    if (token !== expectedSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const botToken = resolveTelegramBotToken(runtime.secrets.telegramBotToken);
  if (!botToken) {
    return NextResponse.json({ error: "Telegram bot token is not configured" }, { status: 503 });
  }

  try {
    const body = updateSchema.parse(await request.json());
    const message = body.message ?? body.edited_message;

    if (!message?.text) {
      return NextResponse.json({ ok: true, ignored: true });
    }

    const chatId = asChatId(message.chat.id);
    const allowlist = parseAllowedTelegramChatIds(runtime.integrations.telegramAllowedChatIds, runtime.integrations.telegramDefaultChatId);
    if (allowlist.length > 0 && !allowlist.includes(chatId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const ownerUid = runtime.integrations.agentOwnerUid || process.env.AGENT_OWNER_UID || "";
    if (!ownerUid) {
      await sendTelegramMessage({
        botToken,
        chatId,
        text: "Agent owner is not configured. Set agentOwnerUid in integrations or AGENT_OWNER_UID in env."
      });
      return NextResponse.json({ ok: true, configured: false });
    }

    const rawText = message.text.trim();
    if (!rawText) {
      return NextResponse.json({ ok: true, ignored: true });
    }

    const wantsExecute = rawText.startsWith("/do ") || rawText.startsWith("/run ");
    const prompt = wantsExecute ? rawText.replace(/^\/(do|run)\s+/i, "") : rawText;

    const result = await runAdminAgent({
      actorUid: ownerUid,
      actorToken: null,
      messages: [{ role: "user", content: prompt }],
      execute: wantsExecute,
      source: "telegram",
      maxActions: 3,
      allowWriteActions: runtime.integrations.telegramActionsEnabled === true
    });

    const actionPreview =
      result.actions.length > 0 && !wantsExecute
        ? `\n\nProposed actions:\n${result.actions
            .map((action, index) => `${index + 1}. ${action.tool}${action.reason ? ` - ${action.reason}` : ""}`)
            .join("\n")}\n\nReply with /do <request> to attempt execution.`
        : "";

    const reply = `${result.reply}${actionPreview}`.trim().slice(0, 3800);

    await sendTelegramMessage({
      botToken,
      chatId,
      text: reply
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to process Telegram update";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
