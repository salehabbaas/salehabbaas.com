"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trackEvent } from "@/lib/firebase/client";

interface AvailabilityPayload {
  enabled: boolean;
  timezone: string;
  meetingTypes: Array<{ id: string; label: string; durationMinutes: number }>;
  days: Array<{ date: string; slots: string[] }>;
}

export function MeetingBooker() {
  const [availability, setAvailability] = useState<AvailabilityPayload | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("");
  const [meetingTypeId, setMeetingTypeId] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/bookings/availability")
      .then((response) => response.json())
      .then((payload: AvailabilityPayload) => {
        setAvailability(payload);
        setSelectedDate(payload.days[0]?.date ?? "");
        setMeetingTypeId(payload.meetingTypes[0]?.id ?? "");
      })
      .catch(() => setStatus("Unable to load availability right now."));
  }, []);

  const dateSlots = useMemo(
    () => availability?.days.find((day) => day.date === selectedDate)?.slots ?? [],
    [availability, selectedDate]
  );

  useEffect(() => {
    setSelectedSlot(dateSlots[0] ?? "");
  }, [dateSlots]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedSlot) return;

    setLoading(true);
    setStatus("");

    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          reason,
          timezone,
          meetingTypeId,
          startAt: selectedSlot
        })
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to book meeting");
      }

      setStatus(
        payload.integration === "degraded"
          ? "Meeting slot reserved. Calendar invite and email confirmation are pending."
          : "Meeting booked successfully. Confirmation email will arrive shortly."
      );
      trackEvent("book_meeting", { meetingTypeId });
      setName("");
      setEmail("");
      setReason("");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to book meeting.");
    } finally {
      setLoading(false);
    }
  }

  if (!availability) {
    return <p className="text-sm text-muted-foreground">Loading availability...</p>;
  }

  if (!availability.enabled) {
    return (
      <div className="rounded-3xl border border-border/70 bg-card/75 p-6">
        <p className="text-sm text-muted-foreground">Bookings are currently disabled. Please use the contact form instead.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-3xl border border-border/70 bg-card/75 p-6 shadow-elev2 backdrop-blur">
      <div className="grid gap-3 md:grid-cols-3">
        <div className="space-y-2">
          <Label>Date</Label>
          <Select value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)}>
            {availability.days.map((day) => (
              <option key={day.date} value={day.date}>
                {day.date}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Time</Label>
          <Select value={selectedSlot} onChange={(event) => setSelectedSlot(event.target.value)}>
            {dateSlots.length ? (
              dateSlots.map((slot) => (
                <option key={slot} value={slot}>
                  {new Date(slot).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </option>
              ))
            ) : (
              <option value="">No slots available</option>
            )}
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Meeting Type</Label>
          <Select value={meetingTypeId} onChange={(event) => setMeetingTypeId(event.target.value)}>
            {availability.meetingTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.label} ({type.durationMinutes}m)
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Name</Label>
          <Input value={name} onChange={(event) => setName(event.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label>Email</Label>
          <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Reason</Label>
        <Textarea value={reason} onChange={(event) => setReason(event.target.value)} required />
      </div>

      <div className="space-y-2">
        <Label>Timezone</Label>
        <Input value={timezone} onChange={(event) => setTimezone(event.target.value)} required />
      </div>

      <Button type="submit" disabled={loading || !selectedSlot}>
        {loading ? "Booking..." : "Book Meeting"}
      </Button>
      {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}
    </form>
  );
}
