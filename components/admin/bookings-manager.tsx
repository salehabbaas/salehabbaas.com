"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  writeBatch
} from "firebase/firestore";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { slotRangeIsoStarts, slotRangeLockIds } from "@/lib/booking/slot-locks";
import { db } from "@/lib/firebase/client";
import { BookingRecord, BookingSettings, BlockedSlot } from "@/types/booking";
import { formatDate } from "@/lib/utils";

const defaultSettings: BookingSettings = {
  enabled: true,
  timezone: "America/Toronto",
  slotDurationMinutes: 30,
  maxDaysAhead: 30,
  workDays: [1, 2, 3, 4, 5],
  dayStartHour: 9,
  dayEndHour: 17,
  meetingTypes: [
    { id: "intro", label: "Intro Call", durationMinutes: 30 },
    { id: "project", label: "Project Discovery", durationMinutes: 45 },
    { id: "advisory", label: "Advisory Session", durationMinutes: 60 }
  ]
};

function timestampToIso(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object" && value && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate().toISOString();
  }
  return "";
}

function toInputDateTime(iso: string) {
  if (!iso) return "";
  const date = new Date(iso);
  const adjusted = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return adjusted.toISOString().slice(0, 16);
}

export function BookingsManager() {
  const [settings, setSettings] = useState<BookingSettings>(defaultSettings);
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([]);
  const [featureFlagState, setFeatureFlagState] = useState<"loading" | "enabled" | "disabled">("loading");
  const [status, setStatus] = useState("");

  const [blockedForm, setBlockedForm] = useState({ startAt: "", endAt: "", reason: "" });
  const [meetingTypeDraft, setMeetingTypeDraft] = useState({ id: "", label: "", durationMinutes: 30 });

  useEffect(() => {
    const unsubSettings = onSnapshot(doc(db, "bookingSettings", "default"), (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      setSettings((prev) => ({
        ...prev,
        ...data,
        meetingTypes: Array.isArray(data.meetingTypes) ? data.meetingTypes : prev.meetingTypes,
        workDays: Array.isArray(data.workDays) ? data.workDays : prev.workDays
      }));
    });

    const unsubBookings = onSnapshot(query(collection(db, "bookings"), orderBy("startAt", "asc")), (snap) => {
      setBookings(
        snap.docs.map((document) => {
          const data = document.data();
          return {
            id: document.id,
            name: data.name ?? "",
            email: data.email ?? "",
            reason: data.reason ?? "",
            timezone: data.timezone ?? "",
            meetingTypeId: data.meetingTypeId ?? "",
            meetingTypeLabel: data.meetingTypeLabel ?? "",
            startAt: timestampToIso(data.startAt),
            endAt: timestampToIso(data.endAt),
            status: data.status ?? "confirmed",
            googleMeetLink: data.googleMeetLink ?? "",
            calendarEventId: data.calendarEventId ?? "",
            createdAt: timestampToIso(data.createdAt),
            updatedAt: timestampToIso(data.updatedAt)
          } satisfies BookingRecord;
        })
      );
    });

    const unsubBlocked = onSnapshot(query(collection(db, "blockedSlots"), orderBy("startAt", "asc")), (snap) => {
      setBlockedSlots(
        snap.docs.map((document) => {
          const data = document.data();
          return {
            id: document.id,
            startAt: timestampToIso(data.startAt),
            endAt: timestampToIso(data.endAt),
            reason: data.reason ?? "",
            createdAt: timestampToIso(data.createdAt)
          } satisfies BlockedSlot;
        })
      );
    });

    fetch("/api/admin/feature-flags")
      .then((response) => response.json())
      .then((payload) => {
        setFeatureFlagState(payload.bookingEnabled ? "enabled" : "disabled");
      })
      .catch(() => setFeatureFlagState(settings.enabled ? "enabled" : "disabled"));

    return () => {
      unsubSettings();
      unsubBookings();
      unsubBlocked();
    };
  }, [settings.enabled]);

  const bookingStats = useMemo(() => {
    const upcoming = bookings.filter((booking) => booking.status !== "cancelled" && new Date(booking.startAt) >= new Date()).length;
    const cancelled = bookings.filter((booking) => booking.status === "cancelled").length;
    return { upcoming, cancelled, total: bookings.length };
  }, [bookings]);

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await setDoc(
      doc(db, "bookingSettings", "default"),
      {
        ...settings,
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );
    setStatus("Booking settings saved.");
  }

  async function toggleRemoteFlag() {
    const nextEnabled = featureFlagState !== "enabled";
    const response = await fetch("/api/admin/feature-flags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingEnabled: nextEnabled })
    });

    if (response.ok) {
      setFeatureFlagState(nextEnabled ? "enabled" : "disabled");
      setStatus(`Remote Config booking flag set to ${nextEnabled ? "enabled" : "disabled"}.`);
    } else {
      setStatus("Failed to update Remote Config flag.");
    }
  }

  async function addMeetingType() {
    if (!meetingTypeDraft.id || !meetingTypeDraft.label) return;
    setSettings((prev) => ({
      ...prev,
      meetingTypes: [
        ...prev.meetingTypes,
        {
          id: meetingTypeDraft.id,
          label: meetingTypeDraft.label,
          durationMinutes: meetingTypeDraft.durationMinutes
        }
      ]
    }));
    setMeetingTypeDraft({ id: "", label: "", durationMinutes: 30 });
  }

  async function removeMeetingType(id: string) {
    if (!window.confirm("Remove this meeting type?")) return;
    setSettings((prev) => ({ ...prev, meetingTypes: prev.meetingTypes.filter((item) => item.id !== id) }));
  }

  async function addBlockedSlot(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await addDoc(collection(db, "blockedSlots"), {
      startAt: new Date(blockedForm.startAt),
      endAt: new Date(blockedForm.endAt),
      reason: blockedForm.reason,
      createdAt: serverTimestamp()
    });
    setBlockedForm({ startAt: "", endAt: "", reason: "" });
    setStatus("Blocked slot created.");
  }

  async function removeBlockedSlot(id: string) {
    if (!window.confirm("Delete blocked slot?")) return;
    await deleteDoc(doc(db, "blockedSlots", id));
    setStatus("Blocked slot removed.");
  }

  async function updateBookingStatus(booking: BookingRecord, status: BookingRecord["status"]) {
    const bookingRef = doc(db, "bookings", booking.id);
    const batch = writeBatch(db);

    batch.update(bookingRef, {
      status,
      updatedAt: serverTimestamp()
    });

    const lockIds = slotRangeLockIds(booking.startAt, booking.endAt, settings.slotDurationMinutes);
    const lockIsoStarts = slotRangeIsoStarts(booking.startAt, booking.endAt, settings.slotDurationMinutes);

    if (status === "cancelled" || status === "rescheduled") {
      lockIds.forEach((lockId) => {
        batch.delete(doc(db, "bookingSlotLocks", lockId));
      });
    }

    if (status === "confirmed") {
      lockIds.forEach((lockId, index) => {
        batch.set(
          doc(db, "bookingSlotLocks", lockId),
          {
            bookingId: booking.id,
            slotStartAt: lockIsoStarts[index] ?? booking.startAt,
            startAt: new Date(booking.startAt),
            endAt: new Date(booking.endAt),
            status: "active",
            updatedAt: serverTimestamp()
          },
          { merge: true }
        );
      });
    }

    await batch.commit();
    setStatus(`Booking marked as ${status}.`);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Booking Management</CardTitle>
          <CardDescription>Manage availability, blocked times, and upcoming meetings.</CardDescription>
          {status ? <p className="text-sm text-primary">{status}</p> : null}
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-card/85">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Upcoming</p>
            <p className="mt-2 text-2xl font-semibold">{bookingStats.upcoming}</p>
          </CardContent>
        </Card>
        <Card className="bg-card/85">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Cancelled</p>
            <p className="mt-2 text-2xl font-semibold">{bookingStats.cancelled}</p>
          </CardContent>
        </Card>
        <Card className="bg-card/85">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Remote Config Flag</p>
            <p className="mt-2 text-2xl font-semibold">{featureFlagState === "loading" ? "..." : featureFlagState}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Availability Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={saveSettings} className="space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Enabled</Label>
                  <Select
                    value={String(settings.enabled)}
                    onChange={(event) => setSettings((prev) => ({ ...prev, enabled: event.target.value === "true" }))}
                  >
                    <option value="true">true</option>
                    <option value="false">false</option>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Timezone</Label>
                  <Input value={settings.timezone} onChange={(event) => setSettings((prev) => ({ ...prev, timezone: event.target.value }))} />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <Input type="number" value={settings.slotDurationMinutes} onChange={(event) => setSettings((prev) => ({ ...prev, slotDurationMinutes: Number(event.target.value || 30) }))} placeholder="Slot minutes" />
                <Input type="number" value={settings.maxDaysAhead} onChange={(event) => setSettings((prev) => ({ ...prev, maxDaysAhead: Number(event.target.value || 30) }))} placeholder="Days ahead" />
                <Input value={settings.workDays.join(",")} onChange={(event) => setSettings((prev) => ({ ...prev, workDays: event.target.value.split(",").map((value) => Number(value.trim())).filter((value) => Number.isFinite(value)) }))} placeholder="Work days (0-6)" />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <Input type="number" value={settings.dayStartHour} onChange={(event) => setSettings((prev) => ({ ...prev, dayStartHour: Number(event.target.value || 9) }))} placeholder="Start hour" />
                <Input type="number" value={settings.dayEndHour} onChange={(event) => setSettings((prev) => ({ ...prev, dayEndHour: Number(event.target.value || 17) }))} placeholder="End hour" />
              </div>

              <Button type="submit">Save Availability</Button>
              <Button type="button" variant="outline" onClick={toggleRemoteFlag} className="ml-2">
                Toggle Remote Config Booking Flag
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Meeting Types</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2 md:grid-cols-3">
              <Input placeholder="ID" value={meetingTypeDraft.id} onChange={(event) => setMeetingTypeDraft((prev) => ({ ...prev, id: event.target.value }))} />
              <Input placeholder="Label" value={meetingTypeDraft.label} onChange={(event) => setMeetingTypeDraft((prev) => ({ ...prev, label: event.target.value }))} />
              <Input type="number" placeholder="Duration" value={meetingTypeDraft.durationMinutes} onChange={(event) => setMeetingTypeDraft((prev) => ({ ...prev, durationMinutes: Number(event.target.value || 30) }))} />
            </div>
            <Button type="button" onClick={addMeetingType}>Add Meeting Type</Button>

            <div className="space-y-2 text-sm">
              {settings.meetingTypes.map((type) => (
                <div key={type.id} className="flex items-center justify-between rounded-xl border border-border/70 bg-card/70 px-3 py-2">
                  <span>{type.label} ({type.durationMinutes}m)</span>
                  <Button size="sm" variant="outline" onClick={() => removeMeetingType(type.id)}>
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Blocked Dates / Times</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <form onSubmit={addBlockedSlot} className="space-y-2">
              <Input type="datetime-local" value={blockedForm.startAt} onChange={(event) => setBlockedForm((prev) => ({ ...prev, startAt: event.target.value }))} required />
              <Input type="datetime-local" value={blockedForm.endAt} onChange={(event) => setBlockedForm((prev) => ({ ...prev, endAt: event.target.value }))} required />
              <Input placeholder="Reason" value={blockedForm.reason} onChange={(event) => setBlockedForm((prev) => ({ ...prev, reason: event.target.value }))} />
              <Button type="submit">Block Slot</Button>
            </form>

            <div className="max-h-56 space-y-2 overflow-auto text-sm">
              {blockedSlots.map((slot) => (
                <div key={slot.id} className="rounded-xl border border-border/70 bg-card/70 p-3">
                  <p>{formatDate(slot.startAt)} - {formatDate(slot.endAt)}</p>
                  <p className="text-muted-foreground">{slot.reason || "No reason"}</p>
                  <Button size="sm" variant="outline" className="mt-2" onClick={() => removeBlockedSlot(slot.id)}>
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming Meetings</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Start</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell>{formatDate(booking.startAt)}</TableCell>
                    <TableCell>
                      <p>{booking.name}</p>
                      <p className="text-xs text-muted-foreground">{booking.email}</p>
                    </TableCell>
                    <TableCell>{booking.meetingTypeLabel}</TableCell>
                    <TableCell>{booking.status}</TableCell>
                    <TableCell className="space-x-2">
                      <Button size="sm" variant="ghost" onClick={() => updateBookingStatus(booking, "cancelled")}>Cancel</Button>
                      <Button size="sm" variant="outline" onClick={() => updateBookingStatus(booking, "rescheduled")}>Reschedule</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
