export type ProjectManagementProjectStatus = "active" | "archived";

export type TaskPriority = "P1" | "P2" | "P3" | "P4";

export type ReminderConfig = {
  email24h: boolean;
  email1h: boolean;
  dailyOverdue: boolean;
};

export type ProjectDoc = {
  id: string;
  name: string;
  description: string;
  status: ProjectManagementProjectStatus;
  ownerId: string;
  createdAt?: string;
  updatedAt?: string;
};

export type BoardColumn = {
  id: string;
  name: string;
  order: number;
  wipLimit?: number;
};

export type BoardDoc = {
  id: string;
  projectId: string;
  name: string;
  columns: BoardColumn[];
  createdAt?: string;
  updatedAt?: string;
};

export type TaskDoc = {
  id: string;
  projectId: string;
  boardId: string;
  title: string;
  description: string;
  priority: TaskPriority;
  priorityRank: number;
  statusColumnId: string;
  dueDate?: string;
  labels: string[];
  assigneeId?: string;
  watchers: string[];
  orderInColumn: number;
  reminderConfig: ReminderConfig;
  createdAt?: string;
  updatedAt?: string;
  lastMovedAt?: string;
};

export type ActivityDoc = {
  id: string;
  projectId: string;
  taskId: string;
  actorId: string;
  action: string;
  from?: string;
  to?: string;
  createdAt?: string;
};

export type ProjectMetrics = {
  projectId: string;
  openTaskCount: number;
  overdueCount: number;
  p1Count: number;
  nextDeadline?: string;
};

export type DashboardKpis = {
  totalProjects: number;
  totalTasks: number;
  overdueTasks: number;
  dueThisWeek: number;
  p1Tasks: number;
  nextClosestDeadline?: string;
};

export type ImportantTaskRow = {
  task: TaskDoc;
  projectName: string;
  isOverdue: boolean;
};

export type UserProjectSettings = {
  emailRemindersEnabled: boolean;
  calendarIcsToken: string;
  timezone: string;
  module?: "project-management";
  updatedAt?: string;
};

export const defaultReminderConfig: ReminderConfig = {
  email24h: true,
  email1h: true,
  dailyOverdue: true
};

export const defaultBoardColumns: BoardColumn[] = [
  { id: "todo", name: "To Do", order: 0 },
  { id: "in-progress", name: "In Progress", order: 1, wipLimit: 5 },
  { id: "review", name: "Review", order: 2 },
  { id: "done", name: "Done", order: 3 }
];

export const priorityRankMap: Record<TaskPriority, number> = {
  P1: 1,
  P2: 2,
  P3: 3,
  P4: 4
};

export const priorityToneMap: Record<TaskPriority, string> = {
  P1: "border-red-500/40 bg-red-500/15 text-red-200",
  P2: "border-orange-500/40 bg-orange-500/15 text-orange-200",
  P3: "border-blue-500/40 bg-blue-500/15 text-blue-200",
  P4: "border-slate-500/40 bg-slate-500/20 text-slate-200"
};
