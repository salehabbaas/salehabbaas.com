import type { GoalStickerPriority } from "@/types/goals";

export function defaultXpForPriority(priority: GoalStickerPriority, estimateMinutes: number | null) {
  const base = priority === "high" ? 20 : priority === "medium" ? 14 : 10;
  if (!estimateMinutes || estimateMinutes <= 0) return base;
  const effortBonus = Math.min(20, Math.floor(estimateMinutes / 20));
  return base + effortBonus;
}

export function streakBonus(streakCount: number) {
  if (streakCount >= 21) return 8;
  if (streakCount >= 14) return 6;
  if (streakCount >= 7) return 4;
  if (streakCount >= 3) return 2;
  return 0;
}

export function clampPriority(value: string): GoalStickerPriority {
  if (value === "high" || value === "medium" || value === "low") return value;
  return "medium";
}
