import "server-only";

import { z } from "zod";

const telegramResponseSchema = z.object({
  ok: z.boolean(),
  result: z
    .object({
      message_id: z.number().int().optional(),
      chat: z
        .object({
          id: z.union([z.number(), z.string()]).optional()
        })
        .optional()
    })
    .optional(),
  description: z.string().optional()
});

export function parseAllowedTelegramChatIds(raw: string | undefined, fallback?: string) {
  const combined = [raw ?? "", fallback ?? ""].filter(Boolean).join(",");
  const set = new Set<string>();

  combined
    .split(/[\s,]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .forEach((item) => set.add(item));

  return [...set];
}

export function resolveTelegramBotToken(runtimeToken?: string) {
  return runtimeToken || process.env.TELEGRAM_BOT_TOKEN || "";
}

export async function sendTelegramMessage(input: { botToken: string; chatId: string; text: string }) {
  const token = input.botToken.trim();
  if (!token) {
    throw new Error("Telegram bot token is missing");
  }

  const chatId = input.chatId.trim();
  if (!chatId) {
    throw new Error("Telegram chat ID is missing");
  }

  const text = input.text.trim();
  if (!text) {
    throw new Error("Telegram message is empty");
  }

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: true
    })
  });

  const payload = (await response.json().catch(() => null)) as unknown;
  const parsed = telegramResponseSchema.safeParse(payload);

  if (!response.ok || !parsed.success || !parsed.data.ok) {
    const message =
      parsed.success && parsed.data.description
        ? parsed.data.description
        : `Telegram send failed with status ${response.status}`;
    throw new Error(message);
  }

  return {
    messageId: parsed.data.result?.message_id,
    chatId: String(parsed.data.result?.chat?.id ?? chatId)
  };
}
