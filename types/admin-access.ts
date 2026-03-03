export const adminModuleKeys = [
  "dashboard",
  "cms",
  "creator",
  "linkedin",
  "projects",
  "resume",
  "jobs",
  "bookings",
  "settings",
  "agent",
  "salehOsChat"
] as const;

export type AdminModuleKey = (typeof adminModuleKeys)[number];

export type AdminUserRole = "owner" | "member";

export type AdminUserStatus = "invited" | "active" | "revoked";

export type ProjectAccessRole = "viewer" | "editor";

export type ModuleAccessMap = Record<AdminModuleKey, boolean>;

export type ProjectRoleMap = Record<string, ProjectAccessRole>;

export type AdminUserAccessDoc = {
  uid: string;
  email: string;
  displayName: string;
  role: AdminUserRole;
  status: AdminUserStatus;
  moduleAccess: ModuleAccessMap;
  projectRoles: ProjectRoleMap;
  invitedByUid: string;
  invitedByEmail: string;
  inviteSentAt?: string;
  inviteExpiresAt?: string;
  acceptedAt?: string;
  revokedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  lastLoginAt?: string;
};

export type ProjectMemberSummary = {
  uid: string;
  email: string;
  displayName: string;
  role: "owner" | ProjectAccessRole;
};
