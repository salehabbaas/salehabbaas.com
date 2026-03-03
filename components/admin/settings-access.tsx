"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { adminModuleKeys, type AdminModuleKey, type ModuleAccessMap } from "@/types/admin-access";

type AccessUser = {
  uid: string;
  email: string;
  displayName: string;
  role: "owner" | "member";
  status: "invited" | "active" | "revoked";
  moduleAccess: ModuleAccessMap;
  projectRoles: Record<string, "viewer" | "editor">;
  inviteExpiresAt?: string;
  updatedAt?: string;
};

type AccessProject = {
  id: string;
  name: string;
  status: "active" | "archived";
  ownerId: string;
};

type Payload = {
  actor: {
    uid: string;
    email: string;
    role: "owner" | "member";
    moduleAccess: ModuleAccessMap;
  };
  users: AccessUser[];
  projects: AccessProject[];
  now: string;
  error?: string;
};

const moduleLabels: Record<AdminModuleKey, string> = {
  dashboard: "Dashboard",
  cms: "CMS",
  creator: "Creator",
  linkedin: "LinkedIn",
  projects: "Projects",
  resume: "Resume",
  jobs: "Jobs",
  bookings: "Bookings",
  settings: "Settings",
  agent: "Agent",
  salehOsChat: "Saleh OS AI Chat"
};

function emptyModuleAccess() {
  return adminModuleKeys.reduce(
    (acc, key) => {
      acc[key] = false;
      return acc;
    },
    {} as ModuleAccessMap
  );
}

function moduleSummary(access: ModuleAccessMap) {
  return adminModuleKeys.filter((key) => access[key]).map((key) => moduleLabels[key]);
}

export function SettingsAccess() {
  const [payload, setPayload] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteModules, setInviteModules] = useState<ModuleAccessMap>(emptyModuleAccess);
  const [inviteProjectRoles, setInviteProjectRoles] = useState<Record<string, "viewer" | "editor" | "none">>({});
  const [inviting, setInviting] = useState(false);

  const [editingUser, setEditingUser] = useState<AccessUser | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editModules, setEditModules] = useState<ModuleAccessMap>(emptyModuleAccess);
  const [editProjectRoles, setEditProjectRoles] = useState<Record<string, "viewer" | "editor" | "none">>({});
  const [editStatus, setEditStatus] = useState<AccessUser["status"]>("active");
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setStatus("");
      try {
        const response = await fetch("/api/admin/settings/access", { cache: "no-store" });
        const data = (await response.json()) as Payload;
        if (!response.ok) throw new Error(data.error ?? "Unable to load access settings");
        if (!mounted) return;
        setPayload(data);
      } catch (error) {
        if (!mounted) return;
        setStatus(error instanceof Error ? error.message : "Unable to load access settings");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void load();
    return () => {
      mounted = false;
    };
  }, []);

  const projects = useMemo(() => payload?.projects ?? [], [payload?.projects]);
  const users = useMemo(() => payload?.users ?? [], [payload?.users]);
  const projectNameById = useMemo(
    () =>
      projects.reduce<Record<string, string>>((acc, project) => {
        acc[project.id] = project.name;
        return acc;
      }, {}),
    [projects]
  );

  const inviteModulesSummary = useMemo(() => moduleSummary(inviteModules), [inviteModules]);
  const inviteProjectSummary = useMemo(
    () =>
      projects
        .filter((project) => inviteProjectRoles[project.id] && inviteProjectRoles[project.id] !== "none")
        .map((project) => `${project.name} (${inviteProjectRoles[project.id]})`),
    [inviteProjectRoles, projects]
  );

  function resetInviteDialog() {
    setInviteEmail("");
    setInviteModules(emptyModuleAccess());
    setInviteProjectRoles({});
  }

  function openEdit(user: AccessUser) {
    setEditingUser(user);
    setEditOpen(true);
    setEditStatus(user.status);
    setEditModules(user.moduleAccess);

    const roles: Record<string, "viewer" | "editor" | "none"> = {};
    projects.forEach((project) => {
      roles[project.id] = user.projectRoles[project.id] ?? "none";
    });
    setEditProjectRoles(roles);
  }

  async function reload() {
    const response = await fetch("/api/admin/settings/access", { cache: "no-store" });
    const data = (await response.json()) as Payload;
    if (!response.ok) throw new Error(data.error ?? "Unable to refresh access settings");
    setPayload(data);
  }

  async function submitInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setInviting(true);
    setStatus("");

    try {
      const projectRoles = Object.entries(inviteProjectRoles)
        .filter(([, role]) => role !== "none")
        .map(([projectId, role]) => ({ projectId, role: role as "viewer" | "editor" }));

      const response = await fetch("/api/admin/settings/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail,
          moduleAccess: inviteModules,
          projectRoles
        })
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Unable to invite user");

      setInviteOpen(false);
      resetInviteDialog();
      await reload();
      setStatus("Invitation sent.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to invite user");
    } finally {
      setInviting(false);
    }
  }

  async function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingUser) return;

    setSavingEdit(true);
    setStatus("");

    try {
      const projectRoles = Object.entries(editProjectRoles)
        .filter(([, role]) => role !== "none")
        .map(([projectId, role]) => ({ projectId, role: role as "viewer" | "editor" }));

      const response = await fetch(`/api/admin/settings/access/users/${editingUser.uid}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: editStatus,
          moduleAccess: editModules,
          projectRoles
        })
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Unable to save user access");

      setEditOpen(false);
      setEditingUser(null);
      await reload();
      setStatus("User access updated.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to save user access");
    } finally {
      setSavingEdit(false);
    }
  }

  async function resendInvitation(uid: string) {
    setStatus("");
    try {
      const response = await fetch(`/api/admin/settings/access/users/${uid}/resend`, {
        method: "POST"
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Unable to resend invitation");
      await reload();
      setStatus("Invitation resent.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to resend invitation");
    }
  }

  async function toggleRevocation(user: AccessUser) {
    const next = user.status === "revoked" ? "active" : "revoked";
    setStatus("");
    try {
      const response = await fetch(`/api/admin/settings/access/users/${user.uid}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next })
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Unable to update user status");
      await reload();
      setStatus(next === "revoked" ? "User revoked." : "User reactivated.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to update user status");
    }
  }

  return (
    <div className="admin-workspace space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>User Access Control</CardTitle>
          <CardDescription>Invite admins, assign modules, grant project roles, resend invitations, and revoke access.</CardDescription>
          {status ? <p className="text-sm text-primary">{status}</p> : null}
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button
            onClick={() => {
              resetInviteDialog();
              setInviteOpen(true);
            }}
            disabled={loading}
          >
            Invite User
          </Button>
          <Badge variant="secondary">Users: {users.length}</Badge>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Admin Users</CardTitle>
          <CardDescription>Current users, status, module scope, and project grants.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? <p className="text-sm text-muted-foreground">Loading users...</p> : null}
          {!loading && !users.length ? <p className="text-sm text-muted-foreground">No admin users found.</p> : null}
          {users.map((user) => (
            <div key={user.uid} className="rounded-2xl border border-border/70 bg-card/70 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{user.displayName || user.email || user.uid}</p>
                  <p className="text-xs text-muted-foreground">{user.email || user.uid}</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    <Badge variant="secondary">{user.role}</Badge>
                    <Badge variant={user.status === "active" ? "default" : "outline"}>{user.status}</Badge>
                    {user.inviteExpiresAt ? <Badge variant="outline">expires {new Date(user.inviteExpiresAt).toLocaleString()}</Badge> : null}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => openEdit(user)}>
                    Edit
                  </Button>
                  {user.status === "invited" ? (
                    <Button type="button" variant="outline" size="sm" onClick={() => void resendInvitation(user.uid)}>
                      Resend
                    </Button>
                  ) : null}
                  {user.role !== "owner" ? (
                    <Button type="button" variant="outline" size="sm" onClick={() => void toggleRevocation(user)}>
                      {user.status === "revoked" ? "Reactivate" : "Revoke"}
                    </Button>
                  ) : null}
                </div>
              </div>

              <p className="mt-3 text-xs text-muted-foreground">
                Modules: {moduleSummary(user.moduleAccess).join(", ") || "none"}
              </p>
              <p className="text-xs text-muted-foreground">
                Projects:{" "}
                {Object.entries(user.projectRoles)
                  .map(([projectId, role]) => `${projectNameById[projectId] ?? projectId} (${role})`)
                  .join(", ") || "none"}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-h-[88dvh] overflow-y-auto sm:max-w-4xl">
          <form onSubmit={submitInvite} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Invite Admin User</DialogTitle>
              <DialogDescription>Send an invitation link with scoped module and project access.</DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} required />
            </div>

            <div className="space-y-2">
              <Label>Module Access</Label>
              <div className="grid gap-2 md:grid-cols-2">
                {adminModuleKeys.map((moduleKey) => (
                  <label key={moduleKey} className="inline-flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={inviteModules[moduleKey]}
                      onChange={(event) =>
                        setInviteModules((prev) => ({
                          ...prev,
                          [moduleKey]: event.target.checked
                        }))
                      }
                    />
                    {moduleLabels[moduleKey]}
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Project Access</Label>
              <div className="grid gap-2">
                {projects.map((project) => (
                  <div key={project.id} className="grid gap-2 rounded-xl border border-border/60 p-2 md:grid-cols-[1fr_180px] md:items-center">
                    <p className="text-sm">{project.name}</p>
                    <Select
                      value={inviteProjectRoles[project.id] ?? "none"}
                      onChange={(event) =>
                        setInviteProjectRoles((prev) => ({
                          ...prev,
                          [project.id]: event.target.value as "viewer" | "editor" | "none"
                        }))
                      }
                    >
                      <option value="none">No access</option>
                      <option value="viewer">Viewer</option>
                      <option value="editor">Editor</option>
                    </Select>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-border/60 p-3 text-sm text-muted-foreground">
              <p>Access summary:</p>
              <p>Modules: {inviteModulesSummary.join(", ") || "none"}</p>
              <p>Projects: {inviteProjectSummary.join(", ") || "none"}</p>
            </div>

            <DialogFooter>
              <Button type="submit" disabled={inviting}>
                {inviting ? "Sending..." : "Send Invitation"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[88dvh] overflow-y-auto sm:max-w-4xl">
          {editingUser ? (
            <form onSubmit={saveEdit} className="space-y-4">
              <DialogHeader>
                <DialogTitle>Edit User Access</DialogTitle>
                <DialogDescription>{editingUser.email || editingUser.uid}</DialogDescription>
              </DialogHeader>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={editStatus} onChange={(event) => setEditStatus(event.target.value as AccessUser["status"])}>
                  <option value="active">active</option>
                  <option value="invited">invited</option>
                  <option value="revoked">revoked</option>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Module Access</Label>
                <div className="grid gap-2 md:grid-cols-2">
                  {adminModuleKeys.map((moduleKey) => (
                    <label key={moduleKey} className="inline-flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={editModules[moduleKey]}
                        onChange={(event) =>
                          setEditModules((prev) => ({
                            ...prev,
                            [moduleKey]: event.target.checked
                          }))
                        }
                        disabled={editingUser.role === "owner"}
                      />
                      {moduleLabels[moduleKey]}
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Project Access</Label>
                <div className="grid gap-2">
                  {projects.map((project) => (
                    <div key={project.id} className="grid gap-2 rounded-xl border border-border/60 p-2 md:grid-cols-[1fr_180px] md:items-center">
                      <p className="text-sm">{project.name}</p>
                      <Select
                        value={editProjectRoles[project.id] ?? "none"}
                        onChange={(event) =>
                          setEditProjectRoles((prev) => ({
                            ...prev,
                            [project.id]: event.target.value as "viewer" | "editor" | "none"
                          }))
                        }
                        disabled={editingUser.role === "owner"}
                      >
                        <option value="none">No access</option>
                        <option value="viewer">Viewer</option>
                        <option value="editor">Editor</option>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>

              <DialogFooter>
                <Button type="submit" disabled={savingEdit}>
                  {savingEdit ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
