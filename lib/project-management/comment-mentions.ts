const COMMENT_MENTION_TOKEN_REGEX = /@\[(?<label>[^\]]+)\]\((?<uid>[A-Za-z0-9_-]{3,160})\)/g;

export type CommentMentionSegment =
  | { type: "text"; value: string }
  | { type: "mention"; label: string; uid: string; raw: string };

export function buildCommentMentionToken(label: string, uid: string) {
  const safeLabel = label.trim().replaceAll("[", "").replaceAll("]", "").replaceAll("(", "").replaceAll(")", "");
  return `@[${safeLabel || uid}](${uid.trim()})`;
}

export function extractCommentMentionUids(input: string) {
  const source = String(input || "");
  const ids = new Set<string>();
  for (const match of source.matchAll(COMMENT_MENTION_TOKEN_REGEX)) {
    const uid = (match.groups?.uid || "").trim();
    if (!uid) continue;
    ids.add(uid);
  }
  return Array.from(ids);
}

export function splitCommentMentions(input: string): CommentMentionSegment[] {
  const source = String(input || "");
  const segments: CommentMentionSegment[] = [];

  let cursor = 0;
  for (const match of source.matchAll(COMMENT_MENTION_TOKEN_REGEX)) {
    const full = match[0] ?? "";
    const index = typeof match.index === "number" ? match.index : -1;
    if (!full || index < 0) continue;

    if (index > cursor) {
      segments.push({
        type: "text",
        value: source.slice(cursor, index)
      });
    }

    segments.push({
      type: "mention",
      label: (match.groups?.label || match.groups?.uid || "").trim(),
      uid: (match.groups?.uid || "").trim(),
      raw: full
    });

    cursor = index + full.length;
  }

  if (cursor < source.length) {
    segments.push({
      type: "text",
      value: source.slice(cursor)
    });
  }

  if (!segments.length) {
    return [
      {
        type: "text",
        value: source
      }
    ];
  }

  return segments;
}

