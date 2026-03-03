"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Clock3 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatDateOnly, formatDateTime } from "@/lib/project-management/utils";
import { cn } from "@/lib/utils";

type DateTimePickerMode = "datetime" | "date";

type DateTimePickerProps = {
  value: string;
  onChange: (value: string) => void;
  onApply?: (value: string) => void;
  placeholder?: string;
  mode?: DateTimePickerMode;
  disabled?: boolean;
  className?: string;
};

function toLocalDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toLocalTimeInputValue(date: Date) {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function parseValue(value: string, mode: DateTimePickerMode) {
  if (!value) return { date: "", time: "09:00" };
  if (mode === "date") return { date: value, time: "09:00" };

  const [datePart, timePart] = value.split("T");
  return {
    date: datePart ?? "",
    time: (timePart ?? "09:00").slice(0, 5)
  };
}

function formatDisplay(value: string, mode: DateTimePickerMode) {
  if (!value) return "";
  if (mode === "date") {
    const parsed = new Date(`${value}T00:00`);
    if (Number.isNaN(parsed.getTime())) return "";
    return formatDateOnly(parsed);
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return formatDateTime(parsed);
}

export function DateTimePicker({
  value,
  onChange,
  onApply,
  placeholder,
  mode = "datetime",
  disabled = false,
  className
}: DateTimePickerProps) {
  const [open, setOpen] = useState(false);
  const [draftDate, setDraftDate] = useState("");
  const [draftTime, setDraftTime] = useState("09:00");

  const displayValue = useMemo(() => formatDisplay(value, mode), [value, mode]);
  const datePlaceholder = placeholder ?? (mode === "date" ? "Select date" : "Select date and time");

  useEffect(() => {
    if (!open) return;
    const next = parseValue(value, mode);
    const fallbackNow = new Date();
    setDraftDate(next.date || toLocalDateInputValue(fallbackNow));
    setDraftTime(next.time || toLocalTimeInputValue(fallbackNow));
  }, [open, value, mode]);

  function setNow() {
    const now = new Date();
    setDraftDate(toLocalDateInputValue(now));
    setDraftTime(toLocalTimeInputValue(now));
  }

  function setTomorrowMorning() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setDraftDate(toLocalDateInputValue(tomorrow));
    setDraftTime("09:00");
  }

  function applyValue(nextValue: string) {
    onChange(nextValue);
    onApply?.(nextValue);
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-2xl border border-input/80 bg-card/75 px-3 text-sm shadow-[inset_0_0_0_1px_rgba(255,255,255,0.02)] backdrop-blur transition hover:bg-card/90 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
      >
        <span className={cn("truncate text-left", displayValue ? "text-foreground" : "text-muted-foreground")}>{displayValue || datePlaceholder}</span>
        <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogTitle>{mode === "date" ? "Pick a date" : "Pick date and time"}</DialogTitle>
          <DialogDescription>{mode === "date" ? "Select a calendar date." : "Select a calendar date and time."}</DialogDescription>

          <div className="space-y-3">
            <div className={cn("grid gap-3", mode === "date" ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2")}>
              <label className="space-y-1">
                <span className="text-xs text-muted-foreground">Date</span>
                <Input type="date" value={draftDate} onChange={(event) => setDraftDate(event.target.value)} />
              </label>
              {mode === "datetime" ? (
                <label className="space-y-1">
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock3 className="h-3 w-3" />
                    Time
                  </span>
                  <Input type="time" value={draftTime} onChange={(event) => setDraftTime(event.target.value)} />
                </label>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2">
              {mode === "datetime" ? (
                <>
                  <Button type="button" variant="outline" size="sm" onClick={setNow}>
                    Now
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={setTomorrowMorning}>
                    Tomorrow 9:00
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const today = new Date();
                      setDraftDate(toLocalDateInputValue(today));
                    }}
                  >
                    Today
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const tomorrow = new Date();
                      tomorrow.setDate(tomorrow.getDate() + 1);
                      setDraftDate(toLocalDateInputValue(tomorrow));
                    }}
                  >
                    Tomorrow
                  </Button>
                </>
              )}
            </div>
          </div>

          <DialogFooter className="sm:justify-between">
            <Button type="button" variant="outline" onClick={() => applyValue("")}>
              Clear
            </Button>
            <Button
              type="button"
              onClick={() => applyValue(mode === "date" ? draftDate : `${draftDate}T${draftTime || "09:00"}`)}
              disabled={!draftDate}
            >
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

