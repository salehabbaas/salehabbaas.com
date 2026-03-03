"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  CircleDot,
  Clock3,
  type LucideIcon,
  UserRound,
} from "lucide-react";

import { priorityIconMap } from "@/lib/project-management/priority-ui";
import { cn } from "@/lib/utils";
import {
  priorityLabelMap,
  type TaskPriority,
} from "@/types/project-management";

type AnimatedOption = {
  value: string;
  label: string;
  icon: LucideIcon;
  toneClass: string;
  iconClass: string;
  initials?: string;
};

type AnimatedOptionSelectProps = {
  value: string;
  options: AnimatedOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
};

function getInitials(value: string) {
  const normalized = value.trim();
  if (!normalized) return "?";
  const chunks = normalized.split(/\s+/).filter(Boolean);
  if (chunks.length === 1) return chunks[0].slice(0, 2).toUpperCase();
  return `${chunks[0][0] ?? ""}${chunks[1][0] ?? ""}`.toUpperCase();
}

function AnimatedOptionSelect({
  value,
  options,
  onChange,
  disabled = false,
  className,
  placeholder = "Select",
}: AnimatedOptionSelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [placement, setPlacement] = useState<"top" | "bottom">("bottom");
  const [menuMaxHeight, setMenuMaxHeight] = useState(260);
  const activeOption =
    options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;

    function updatePosition() {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const margin = 8;
      const preferredMaxHeight = 260;
      const minHeight = 140;
      const spaceBelow = window.innerHeight - rect.bottom - margin;
      const spaceAbove = rect.top - margin;
      const placeTop = spaceBelow < 180 && spaceAbove > spaceBelow;
      const availableSpace = placeTop ? spaceAbove : spaceBelow;
      const maxHeight = Math.max(
        minHeight,
        Math.min(preferredMaxHeight, availableSpace),
      );

      setPlacement(placeTop ? "top" : "bottom");
      setMenuMaxHeight(maxHeight);
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (rootRef.current?.contains(target)) return;
      setOpen(false);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div
      ref={rootRef}
      className={cn("relative min-w-0 flex-1", open ? "z-[120]" : "z-0")}
    >
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className={cn(
          "flex h-8 w-full items-center justify-between rounded-xl border border-white/20 bg-black px-2.5 text-left text-xs font-medium text-white",
          disabled
            ? "cursor-not-allowed opacity-55"
            : "hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
          className,
        )}
      >
        <span className="inline-flex min-w-0 items-center gap-1.5">
          <span
            className={cn(
              "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border",
              activeOption
                ? activeOption.iconClass
                : "border-white/20 bg-black text-zinc-300",
            )}
          >
            {activeOption?.initials ? (
              <span className="text-[10px] font-semibold">
                {activeOption.initials}
              </span>
            ) : activeOption ? (
              <activeOption.icon className="h-3.5 w-3.5" />
            ) : (
              <CircleDot className="h-3.5 w-3.5" />
            )}
          </span>
          <span className="truncate">
            {activeOption ? activeOption.label : placeholder}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 shrink-0",
            open ? "rotate-180" : "rotate-0",
          )}
        />
      </button>

      {open && !disabled ? (
        <div
          className={cn(
            "absolute left-0 right-0 z-[130] overflow-y-auto rounded-xl border border-white/20 bg-black p-1 shadow-elev2",
            placement === "top" ? "bottom-full mb-1" : "top-full mt-1",
          )}
          style={{ maxHeight: menuMaxHeight }}
        >
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              className={cn(
                "mb-0.5 flex w-full items-center gap-2 rounded-lg border px-2 py-1.5 text-left text-xs",
                option.value === value
                  ? "border-primary/45 bg-primary/30 text-white"
                  : "border-transparent bg-black text-zinc-200 hover:border-primary/30 hover:bg-primary/22 hover:text-white",
              )}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
            >
              <span
                className={cn(
                  "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border",
                  option.iconClass,
                )}
              >
                {option.initials ? (
                  <span className="text-[10px] font-semibold">
                    {option.initials}
                  </span>
                ) : (
                  <option.icon className="h-3.5 w-3.5" />
                )}
              </span>
              <span className="truncate">{option.label}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

type PrioritySelectProps = {
  value: TaskPriority;
  onChange: (value: TaskPriority) => void;
  disabled?: boolean;
  className?: string;
};

export function TaskPrioritySelect({
  value,
  onChange,
  disabled = false,
  className,
}: PrioritySelectProps) {
  const options = useMemo<AnimatedOption[]>(
    () => [
      {
        value: "P1",
        label: priorityLabelMap.P1,
        icon: priorityIconMap.P1,
        toneClass:
          "border-red-500/45 bg-red-500/12 text-red-700 dark:text-red-200",
        iconClass:
          "border-red-500/35 bg-red-500/18 text-red-700 dark:text-red-200",
      },
      {
        value: "P2",
        label: priorityLabelMap.P2,
        icon: priorityIconMap.P2,
        toneClass:
          "border-orange-500/45 bg-orange-500/12 text-orange-700 dark:text-orange-200",
        iconClass:
          "border-orange-500/35 bg-orange-500/18 text-orange-700 dark:text-orange-200",
      },
      {
        value: "P3",
        label: priorityLabelMap.P3,
        icon: priorityIconMap.P3,
        toneClass:
          "border-blue-500/45 bg-blue-500/12 text-blue-700 dark:text-blue-200",
        iconClass:
          "border-blue-500/35 bg-blue-500/18 text-blue-700 dark:text-blue-200",
      },
      {
        value: "P4",
        label: priorityLabelMap.P4,
        icon: priorityIconMap.P4,
        toneClass:
          "border-slate-500/45 bg-slate-500/15 text-slate-700 dark:text-slate-200",
        iconClass:
          "border-slate-500/35 bg-slate-500/20 text-slate-700 dark:text-slate-200",
      },
    ],
    [],
  );

  return (
    <AnimatedOptionSelect
      value={value}
      options={options}
      onChange={(next) => onChange(next as TaskPriority)}
      disabled={disabled}
      className={className}
      placeholder="Priority"
    />
  );
}

type StatusSelectProps = {
  value: string;
  columns: Array<{ id: string; name: string }>;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
};

function statusOptionMeta(column: { id: string; name: string }) {
  const name = `${column.name} ${column.id}`.toLowerCase();
  if (/done|complete|closed|archive/.test(name)) {
    return {
      icon: CheckCircle2,
      toneClass:
        "border-emerald-500/45 bg-emerald-500/12 text-emerald-700 dark:text-emerald-200",
      iconClass:
        "border-emerald-500/35 bg-emerald-500/18 text-emerald-700 dark:text-emerald-200",
    };
  }
  if (/progress|review|qa|in-?progress|waiting/.test(name)) {
    return {
      icon: Clock3,
      toneClass:
        "border-amber-500/45 bg-amber-500/12 text-amber-700 dark:text-amber-200",
      iconClass:
        "border-amber-500/35 bg-amber-500/18 text-amber-700 dark:text-amber-200",
    };
  }
  return {
    icon: CircleDot,
    toneClass: "border-primary/45 bg-primary/10 text-primary",
    iconClass: "border-primary/35 bg-primary/18 text-primary",
  };
}

export function TaskStatusSelect({
  value,
  columns,
  onChange,
  disabled = false,
  className,
}: StatusSelectProps) {
  const options = useMemo<AnimatedOption[]>(
    () =>
      columns.map((column) => {
        const meta = statusOptionMeta(column);
        return {
          value: column.id,
          label: column.name,
          icon: meta.icon,
          toneClass: meta.toneClass,
          iconClass: meta.iconClass,
        };
      }),
    [columns],
  );

  return (
    <AnimatedOptionSelect
      value={value}
      options={options}
      onChange={onChange}
      disabled={disabled}
      className={className}
      placeholder="Status"
    />
  );
}

type AssigneeSelectProps = {
  value: string;
  members: Array<{ uid: string; label: string }>;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
};

export function TaskAssigneeSelect({
  value,
  members,
  onChange,
  disabled = false,
  className,
}: AssigneeSelectProps) {
  const options = useMemo<AnimatedOption[]>(
    () => [
      {
        value: "",
        label: "Unassigned",
        icon: UserRound,
        toneClass: "border-border/65 bg-card/70 text-muted-foreground",
        iconClass: "border-border/60 bg-card/75 text-muted-foreground",
      },
      ...members.map((member) => ({
        value: member.uid,
        label: member.label,
        icon: UserRound,
        toneClass: "border-accent/45 bg-accent/12 text-accent",
        iconClass: "border-accent/35 bg-accent/18 text-accent",
        initials: getInitials(member.label),
      })),
    ],
    [members],
  );

  return (
    <AnimatedOptionSelect
      value={value}
      options={options}
      onChange={onChange}
      disabled={disabled}
      className={className}
      placeholder="Assignee"
    />
  );
}
