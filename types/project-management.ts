export type ProjectManagementProjectStatus = "active" | "archived";

export type TaskPriority = "P1" | "P2" | "P3" | "P4";

export type ReminderConfig = {
  email24h: boolean;
  email1h: boolean;
  dailyOverdue: boolean;
};

export type TaskSubtask = {
  id: string;
  title: string;
  completed: boolean;
  assigneeId?: string;
  status?: "todo" | "in_progress" | "done";
  priority?: TaskPriority;
  createdAt?: string;
  completedAt?: string;
};

export type TaskComment = {
  id: string;
  authorId: string;
  authorName: string;
  body: string;
  mentionUids?: string[];
  createdAt?: string;
  updatedAt?: string;
};

export type TaskLinkRelationType =
  | "blocks"
  | "blockedBy"
  | "related"
  | "duplicate"
  | "duplicatedBy"
  | "blocked_by"
  | "related_to"
  | "duplicated_by";

export type TaskLink = {
  id: string;
  relationType: TaskLinkRelationType;
  targetTaskId: string;
  createdBy: string;
  createdAt?: string;
};

export type ProjectDoc = {
  id: string;
  projectKey?: string;
  slug?: string;
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
  taskKey?: string;
  taskSequence?: number;
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
  subtasks: TaskSubtask[];
  comments: TaskComment[];
  links?: TaskLink[];
  startDate?: string;
  completedAt?: string;
  category?: string;
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

export type TopGoal = {
  id: string;
  title: string;
  description?: string;
  tags: string[];
  projectId?: string;
  deadline?: string;
  completed?: boolean;
  completedAt?: string;
  createdAt: string;
};

export type UserProjectSettings = {
  emailRemindersEnabled: boolean;
  calendarIcsToken: string;
  timezone: string;
  topGoals: TopGoal[];
  module?: "project-management";
  updatedAt?: string;
};

export type ProjectSavedView = {
  id: string;
  name: string;
  filters: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
};

export const defaultReminderConfig: ReminderConfig = {
  email24h: true,
  email1h: true,
  dailyOverdue: true
};

export const defaultBoardColumns: BoardColumn[] = [
  { id: "todo", name: "To Do", order: 0 },
  { id: "in-progress", name: "In Progress", order: 1 },
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
  P1: "border-red-500/45 bg-red-500/15 text-red-700 dark:text-red-200",
  P2: "border-orange-500/45 bg-orange-500/15 text-orange-700 dark:text-orange-200",
  P3: "border-blue-500/45 bg-blue-500/15 text-blue-700 dark:text-blue-200",
  P4: "border-slate-500/45 bg-slate-500/20 text-slate-700 dark:text-slate-200"
};

export const priorityLabelMap: Record<TaskPriority, string> = {
  P1: "Critical",
  P2: "High",
  P3: "Medium",
  P4: "Low"
};

export const priorityCardToneMap: Record<TaskPriority, string> = {
  P1: "border-red-500/35 bg-red-500/5 hover:bg-red-500/10",
  P2: "border-orange-500/35 bg-orange-500/5 hover:bg-orange-500/10",
  P3: "border-blue-500/35 bg-blue-500/5 hover:bg-blue-500/10",
  P4: "border-slate-500/35 bg-slate-500/5 hover:bg-slate-500/10"
};
