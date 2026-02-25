"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Ban, CalendarClock, CalendarPlus2, CalendarX2, Filter, Settings2 } from "lucide-react";
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

import { AdminFieldLabel } from "@/components/admin/admin-field-label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { slotRangeIsoStarts, slotRangeLockIds } from "@/lib/booking/slot-locks";
import { db } from "@/lib/firebase/client";
import { formatDate } from "@/lib/utils";
import { BookingRecord, BookingSettings, BlockedSlot } from "@/types/booking";

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

function toDatetimeLocal(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function defaultBlockedForm(slotDurationMinutes: number) {
  const now = new Date();
  now.setSeconds(0, 0);
  now.setMinutes(0);
  now.setHours(now.getHours() + 1);
  const end = new Date(now.getTime() + slotDurationMinutes * 60 * 1000);
  return {
    startAt: toDatetimeLocal(now),
    endAt: toDatetimeLocal(end),
    reason: ""
  };
}

type BookingFilter = "all" | "upcoming" | BookingRecord["status"];

export function BookingsManager() {
  const [settings, setSettings] = useState<BookingSettings>(defaultSettings);
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([]);
  const [featureFlagState, setFeatureFlagState] = useState<"loading" | "enabled" | "disabled">("loading");
  const [status, setStatus] = useState("");

  const [availabilityOpen, setAvailabilityOpen] = useState(false);
  const [meetingTypeOpen, setMeetingTypeOpen] = useState(false);
  const [blockedOpen, setBlockedOpen] = useState(false);

  const [queryText, setQueryText] = useState("");
  const [bookingFilter, setBookingFilter] = useState<BookingFilter>("upcoming");

  const [blockedForm, setBlockedForm] = useState(defaultBlockedForm(defaultSettings.slotDurationMinutes));
  const [meetingTypeDraft, setMeetingTypeDraft] = useState({ id: "", label: "", durationMinutes: defaultSettings.slotDurationMinutes });

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
      .catch(() => setFeatureFlagState(defaultSettings.enabled ? "enabled" : "disabled"));

    return () => {
      unsubSettings();
      unsubBookings();
      unsubBlocked();
    };
  }, []);

  const bookingStats = useMemo(() => {
    const now = Date.now();
    const upcoming = bookings.filter((booking) => booking.status !== "cancelled" && new Date(booking.startAt).getTime() >= now).length;
    const cancelled = bookings.filter((booking) => booking.status === "cancelled").length;
    const rescheduled = bookings.filter((booking) => booking.status === "rescheduled").length;
    const today = bookings.filter((booking) => {
      const date = new Date(booking.startAt);
      const current = new Date();
      return (
        date.getFullYear() === current.getFullYear() &&
        date.getMonth() === current.getMonth() &&
        date.getDate() === current.getDate()
      );
    }).length;
    return { upcoming, cancelled, rescheduled, today, total: bookings.length };
  }, [bookings]);

  const filteredBookings = useMemo(() => {
    const now = Date.now();
    return bookings.filter((booking) => {
      if (bookingFilter === "upcoming") {
        if (booking.status === "cancelled" || new Date(booking.startAt).getTime() < now) return false;
      } else if (bookingFilter !== "all" && booking.status !== bookingFilter) {
        return false;
      }

      const search = queryText.trim().toLowerCase();
      if (!search) return true;
      return (
        booking.name.toLowerCase().includes(search) ||
        booking.email.toLowerCase().includes(search) ||
        booking.meetingTypeLabel.toLowerCase().includes(search) ||
        booking.reason.toLowerCase().includes(search)
      );
    });
  }, [bookings, bookingFilter, queryText]);

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
    setAvailabilityOpen(false);
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

  function openMeetingTypeDialog() {
    setMeetingTypeDraft({
      id: "",
      label: "",
      durationMinutes: settings.slotDurationMinutes || 30
    });
    setMeetingTypeOpen(true);
  }

  async function addMeetingType(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const id = meetingTypeDraft.id.trim().toLowerCase() || meetingTypeDraft.label.trim().toLowerCase().replace(/\s+/g, "-");
    const label = meetingTypeDraft.label.trim();

    if (!id || !label) return;

    setSettings((prev) => ({
      ...prev,
      meetingTypes: [
        ...prev.meetingTypes.filter((item) => item.id !== id),
        {
          id,
          label,
          durationMinutes: Number(meetingTypeDraft.durationMinutes || prev.slotDurationMinutes || 30)
        }
      ]
    }));

    setMeetingTypeOpen(false);
    setStatus(`Meeting type \"${label}\" added. Save availability to persist.`);
  }

  async function removeMeetingType(id: string) {
    if (!window.confirm("Remove this meeting type?")) return;
    setSettings((prev) => ({ ...prev, meetingTypes: prev.meetingTypes.filter((item) => item.id !== id) }));
    setStatus("Meeting type removed. Save availability to persist.");
  }

  function openBlockedDialog() {
    setBlockedForm(defaultBlockedForm(settings.slotDurationMinutes || 30));
    setBlockedOpen(true);
  }

  async function addBlockedSlot(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const startAt = new Date(blockedForm.startAt);
    const endAt = new Date(blockedForm.endAt);

    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime()) || endAt <= startAt) {
      setStatus("Blocked slot requires a valid start and end, with end after start.");
      return;
    }

    await addDoc(collection(db, "blockedSlots"), {
      startAt,
      endAt,
      reason: blockedForm.reason,
      createdAt: serverTimestamp()
    });

    setBlockedOpen(false);
    setStatus("Blocked slot created.");
  }

  async function removeBlockedSlot(id: string) {
    if (!window.confirm("Delete blocked slot?")) return;
    await deleteDoc(doc(db, "blockedSlots", id));
    setStatus("Blocked slot removed.");
  }

  async function updateBookingStatus(booking: BookingRecord, statusNext: BookingRecord["status"]) {
    const bookingRef = doc(db, "bookings", booking.id);
    const batch = writeBatch(db);

    batch.update(bookingRef, {
      status: statusNext,
      updatedAt: serverTimestamp()
    });

    const lockIds = slotRangeLockIds(booking.startAt, booking.endAt, settings.slotDurationMinutes);
    const lockIsoStarts = slotRangeIsoStarts(booking.startAt, booking.endAt, settings.slotDurationMinutes);

    if (statusNext === "cancelled" || statusNext === "rescheduled") {
      lockIds.forEach((lockId) => {
        batch.delete(doc(db, "bookingSlotLocks", lockId));
      });
    }

    if (statusNext === "confirmed") {
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
    setStatus(`Booking marked as ${statusNext}.`);
  }

  return (
    <div className="admin-workspace space-y-6">
      <Card className="overflow-hidden">
        <CardHeader className="relative">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,hsl(var(--primary)/0.2),transparent_48%),radial-gradient(circle_at_100%_100%,hsl(var(--accent)/0.2),transparent_42%)]" />
          <div className="relative flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Bookings Operations</CardTitle>
              <CardDescription>Manage availability, blocked time windows, and meeting status in one cleaner workflow.</CardDescription>
              {status ? <p className="mt-2 text-sm text-primary">{status}</p> : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => setAvailabilityOpen(true)}>
                <Settings2 className="h-4 w-4" />
                Availability
              </Button>
              <Button type="button" variant="outline" onClick={openMeetingTypeDialog}>
                <CalendarPlus2 className="h-4 w-4" />
                Meeting Type
              </Button>
              <Button type="button" variant="secondary" onClick={openBlockedDialog}>
                <Ban className="h-4 w-4" />
                Block Slot
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-primary/25 bg-primary/10">
          <CardContent className="pt-6">
            <p className="text-xs text-primary/80">Upcoming</p>
            <p className="mt-2 text-2xl font-semibold">{bookingStats.upcoming}</p>
          </CardContent>
        </Card>
        <Card className="border-accent/25 bg-accent/10">
          <CardContent className="pt-6">
            <p className="text-xs text-accent-foreground/80">Today</p>
            <p className="mt-2 text-2xl font-semibold">{bookingStats.today}</p>
          </CardContent>
        </Card>
        <Card className="border-warning/25 bg-warning/10">
          <CardContent className="pt-6">
            <p className="text-xs text-warning/90">Rescheduled</p>
            <p className="mt-2 text-2xl font-semibold">{bookingStats.rescheduled}</p>
          </CardContent>
        </Card>
        <Card className="border-destructive/25 bg-destructive/10">
          <CardContent className="pt-6">
            <p className="text-xs text-destructive/90">Cancelled</p>
            <p className="mt-2 text-2xl font-semibold">{bookingStats.cancelled}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-primary" />
              Meeting Types
            </CardTitle>
            <CardDescription>Reusable booking options. Add new types from the action button.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {settings.meetingTypes.map((type) => (
              <div key={type.id} className="flex items-center justify-between rounded-2xl border border-border/70 bg-card/70 px-3 py-2">
                <div>
                  <p className="text-sm font-medium">{type.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {type.id} · {type.durationMinutes} min
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => removeMeetingType(type.id)}>
                  Remove
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarX2 className="h-4 w-4 text-warning" />
              Blocked Slots
            </CardTitle>
            <CardDescription>Maintenance windows, holidays, and unavailable hours.</CardDescription>
          </CardHeader>
          <CardContent className="max-h-80 space-y-2 overflow-auto pr-1 text-sm">
            {blockedSlots.map((slot) => (
              <div key={slot.id} className="rounded-2xl border border-border/70 bg-card/70 p-3">
                <p className="font-medium">
                  {formatDate(slot.startAt)} - {formatDate(slot.endAt)}
                </p>
                <p className="text-xs text-muted-foreground">{slot.reason || "No reason provided."}</p>
                <Button size="sm" variant="outline" className="mt-2" onClick={() => removeBlockedSlot(slot.id)}>
                  Remove
                </Button>
              </div>
            ))}
            {!blockedSlots.length ? <p className="text-muted-foreground">No blocked slots.</p> : null}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Bookings Queue</CardTitle>
          <CardDescription>Filter and manage all booking records.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <Input placeholder="Search name, email, type, reason" value={queryText} onChange={(event) => setQueryText(event.target.value)} />
            <Select value={bookingFilter} onChange={(event) => setBookingFilter(event.target.value as BookingFilter)}>
              <option value="upcoming">Upcoming</option>
              <option value="all">All</option>
              <option value="confirmed">Confirmed</option>
              <option value="rescheduled">Rescheduled</option>
              <option value="cancelled">Cancelled</option>
            </Select>
            <Button type="button" variant="outline" onClick={() => setQueryText("")}>
              <Filter className="h-4 w-4" />
              Clear Search
            </Button>
            <div className="flex items-center justify-start md:justify-end">
              <Badge variant={featureFlagState === "enabled" ? "default" : "outline"}>
                Remote Flag: {featureFlagState === "loading" ? "loading" : featureFlagState}
              </Badge>
            </div>
          </div>

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
              {filteredBookings.length ? (
                filteredBookings.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell>
                      <p>{formatDate(booking.startAt)}</p>
                      <p className="text-xs text-muted-foreground">{booking.timezone || settings.timezone}</p>
                    </TableCell>
                    <TableCell>
                      <p>{booking.name}</p>
                      <p className="text-xs text-muted-foreground">{booking.email}</p>
                    </TableCell>
                    <TableCell>
                      <p>{booking.meetingTypeLabel}</p>
                      {booking.reason ? <p className="text-xs text-muted-foreground">{booking.reason}</p> : null}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{booking.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        {booking.status !== "confirmed" ? (
                          <Button size="sm" variant="secondary" onClick={() => void updateBookingStatus(booking, "confirmed")}>
                            Confirm
                          </Button>
                        ) : null}
                        {booking.status !== "rescheduled" ? (
                          <Button size="sm" variant="outline" onClick={() => void updateBookingStatus(booking, "rescheduled")}>
                            Reschedule
                          </Button>
                        ) : null}
                        {booking.status !== "cancelled" ? (
                          <Button size="sm" variant="ghost" onClick={() => void updateBookingStatus(booking, "cancelled")}>
                            Cancel
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                    No booking records match the current filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <div className="flex justify-end">
            <Button type="button" variant="outline" onClick={toggleRemoteFlag}>
              Toggle Remote Config Booking Flag
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={availabilityOpen} onOpenChange={setAvailabilityOpen}>
        <DialogContent className="max-h-[88dvh] overflow-y-auto sm:max-w-3xl">
          <form onSubmit={saveSettings} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Availability Settings</DialogTitle>
              <DialogDescription>All required schedule settings in one popup so the page stays clean.</DialogDescription>
            </DialogHeader>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <AdminFieldLabel htmlFor="booking-enabled" label="Bookings Enabled" required />
                <Select
                  id="booking-enabled"
                  value={String(settings.enabled)}
                  onChange={(event) => setSettings((prev) => ({ ...prev, enabled: event.target.value === "true" }))}
                >
                  <option value="true">true</option>
                  <option value="false">false</option>
                </Select>
              </div>
              <div className="space-y-2">
                <AdminFieldLabel htmlFor="booking-timezone" label="Timezone" required helper="IANA timezone, e.g. America/Toronto" />
                <Input id="booking-timezone" value={settings.timezone} onChange={(event) => setSettings((prev) => ({ ...prev, timezone: event.target.value }))} required />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-2">
                <AdminFieldLabel htmlFor="booking-slot-minutes" label="Slot Duration (min)" required />
                <Input
                  id="booking-slot-minutes"
                  type="number"
                  min={5}
                  value={settings.slotDurationMinutes}
                  onChange={(event) => setSettings((prev) => ({ ...prev, slotDurationMinutes: Number(event.target.value || 30) }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <AdminFieldLabel htmlFor="booking-max-days" label="Max Days Ahead" required />
                <Input
                  id="booking-max-days"
                  type="number"
                  min={1}
                  value={settings.maxDaysAhead}
                  onChange={(event) => setSettings((prev) => ({ ...prev, maxDaysAhead: Number(event.target.value || 30) }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <AdminFieldLabel htmlFor="booking-work-days" label="Work Days (0-6)" required helper="0=Sun, 1=Mon ... 6=Sat" />
                <Input
                  id="booking-work-days"
                  value={settings.workDays.join(",")}
                  onChange={(event) =>
                    setSettings((prev) => ({
                      ...prev,
                      workDays: event.target.value
                        .split(",")
                        .map((value) => Number(value.trim()))
                        .filter((value) => Number.isFinite(value) && value >= 0 && value <= 6)
                    }))
                  }
                  required
                />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <AdminFieldLabel htmlFor="booking-day-start" label="Day Start Hour" required />
                <Input
                  id="booking-day-start"
                  type="number"
                  min={0}
                  max={23}
                  value={settings.dayStartHour}
                  onChange={(event) => setSettings((prev) => ({ ...prev, dayStartHour: Number(event.target.value || 9) }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <AdminFieldLabel htmlFor="booking-day-end" label="Day End Hour" required />
                <Input
                  id="booking-day-end"
                  type="number"
                  min={1}
                  max={24}
                  value={settings.dayEndHour}
                  onChange={(event) => setSettings((prev) => ({ ...prev, dayEndHour: Number(event.target.value || 17) }))}
                  required
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAvailabilityOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Save Availability</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={meetingTypeOpen} onOpenChange={setMeetingTypeOpen}>
        <DialogContent className="max-h-[88dvh] overflow-y-auto sm:max-w-xl">
          <form onSubmit={addMeetingType} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Add Meeting Type</DialogTitle>
              <DialogDescription>Create a reusable meeting option. Defaults to your slot duration.</DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <AdminFieldLabel htmlFor="meeting-type-id" label="ID" required helper="e.g. intro, advisory, interview" />
              <Input id="meeting-type-id" value={meetingTypeDraft.id} onChange={(event) => setMeetingTypeDraft((prev) => ({ ...prev, id: event.target.value }))} required />
            </div>
            <div className="space-y-2">
              <AdminFieldLabel htmlFor="meeting-type-label" label="Label" required />
              <Input id="meeting-type-label" value={meetingTypeDraft.label} onChange={(event) => setMeetingTypeDraft((prev) => ({ ...prev, label: event.target.value }))} required />
            </div>
            <div className="space-y-2">
              <AdminFieldLabel htmlFor="meeting-type-duration" label="Duration Minutes" required />
              <Input
                id="meeting-type-duration"
                type="number"
                min={5}
                value={meetingTypeDraft.durationMinutes}
                onChange={(event) => setMeetingTypeDraft((prev) => ({ ...prev, durationMinutes: Number(event.target.value || settings.slotDurationMinutes || 30) }))}
                required
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setMeetingTypeOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Add Meeting Type</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={blockedOpen} onOpenChange={setBlockedOpen}>
        <DialogContent className="max-h-[88dvh] overflow-y-auto sm:max-w-xl">
          <form onSubmit={addBlockedSlot} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Block Date / Time</DialogTitle>
              <DialogDescription>Default values start from the next available hour.</DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <AdminFieldLabel htmlFor="blocked-start" label="Start" required />
              <Input
                id="blocked-start"
                type="datetime-local"
                value={blockedForm.startAt}
                onChange={(event) => setBlockedForm((prev) => ({ ...prev, startAt: event.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <AdminFieldLabel htmlFor="blocked-end" label="End" required />
              <Input
                id="blocked-end"
                type="datetime-local"
                value={blockedForm.endAt}
                onChange={(event) => setBlockedForm((prev) => ({ ...prev, endAt: event.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <AdminFieldLabel htmlFor="blocked-reason" label="Reason" helper="Optional internal note for audit logs." />
              <Input
                id="blocked-reason"
                value={blockedForm.reason}
                onChange={(event) => setBlockedForm((prev) => ({ ...prev, reason: event.target.value }))}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setBlockedOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Block Slot</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
