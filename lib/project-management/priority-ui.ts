import { AlertOctagon, ArrowDownCircle, ArrowUpCircle, Equal, type LucideIcon } from "lucide-react";

import type { TaskPriority } from "@/types/project-management";

export const priorityIconMap: Record<TaskPriority, LucideIcon> = {
  P1: AlertOctagon,
  P2: ArrowUpCircle,
  P3: Equal,
  P4: ArrowDownCircle
};
