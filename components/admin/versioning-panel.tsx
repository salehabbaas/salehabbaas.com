"use client";

import { FormEvent, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/utils";

type Snapshot = {
  id: string;
  createdAt: string;
  createdByEmail: string;
  note: string;
  counts: {
    projects: number;
    blogPosts: number;
    creatorItems: number;
    bookings: number;
    jobApplications: number;
    linkedinPosts: number;
  };
};

export function VersioningPanel({ initialSnapshots }: { initialSnapshots: Snapshot[] }) {
  const [snapshots, setSnapshots] = useState(initialSnapshots);
  const [note, setNote] = useState("");
  const [status, setStatus] = useState("");
  const [creating, setCreating] = useState(false);

  const totalSnapshots = snapshots.length;
  const latest = useMemo(() => snapshots[0] ?? null, [snapshots]);

  async function createSnapshot(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreating(true);
    setStatus("");

    try {
      const response = await fetch("/api/admin/versions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note })
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to create snapshot");
      }

      const created = payload.snapshot as {
        id: string;
        createdAt: string;
        createdBy: { email: string };
        note: string;
        counts: Snapshot["counts"];
      };

      setSnapshots((prev) => [
        {
          id: created.id,
          createdAt: created.createdAt,
          createdByEmail: created.createdBy.email,
          note: created.note,
          counts: created.counts
        },
        ...prev
      ]);
      setNote("");
      setStatus("Snapshot created.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to create snapshot");
    } finally {
      setCreating(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Versioning Snapshots</CardTitle>
        <CardDescription>Capture and review app state snapshots for audit and rollback context.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <form onSubmit={createSnapshot} className="flex flex-col gap-2 md:flex-row">
          <Input
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Optional release note (e.g. Admin dashboard merge phase 1)"
          />
          <Button type="submit" disabled={creating}>
            {creating ? "Creating..." : "Create Snapshot"}
          </Button>
        </form>

        {status ? <p className="text-primary">{status}</p> : null}

        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-border/70 bg-card/70 p-3">
            <p className="text-xs text-muted-foreground">Total snapshots</p>
            <p className="mt-1 text-xl font-semibold">{totalSnapshots}</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-card/70 p-3">
            <p className="text-xs text-muted-foreground">Latest snapshot</p>
            <p className="mt-1 text-sm font-medium">{latest?.createdAt ? formatDate(latest.createdAt) : "No snapshots"}</p>
          </div>
        </div>

        <div className="max-h-72 space-y-2 overflow-auto pr-1">
          {snapshots.map((snapshot) => (
            <div key={snapshot.id} className="rounded-xl border border-border/70 bg-card/70 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium">{formatDate(snapshot.createdAt)}</p>
                <p className="text-xs text-muted-foreground">{snapshot.createdByEmail || "system"}</p>
              </div>
              {snapshot.note ? <p className="mt-1 text-xs text-muted-foreground">{snapshot.note}</p> : null}
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground md:grid-cols-3">
                <span>Projects: {snapshot.counts.projects}</span>
                <span>Blog: {snapshot.counts.blogPosts}</span>
                <span>Creator: {snapshot.counts.creatorItems}</span>
                <span>Bookings: {snapshot.counts.bookings}</span>
                <span>Jobs: {snapshot.counts.jobApplications}</span>
                <span>LinkedIn: {snapshot.counts.linkedinPosts}</span>
              </div>
            </div>
          ))}
          {!snapshots.length ? <p className="text-muted-foreground">No snapshots yet.</p> : null}
        </div>
      </CardContent>
    </Card>
  );
}
