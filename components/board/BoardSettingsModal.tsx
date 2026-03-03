"use client";

import { motion } from "framer-motion";
import {
  CalendarClock,
  CheckSquare,
  LayoutGrid,
  MessageSquare,
  ShieldCheck,
  Tag,
  Target,
  UserRound
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

type BoardSettings = {
  showLabels: boolean;
  showDueDate: boolean;
  showSubtasks: boolean;
  showComments: boolean;
  showPriority: boolean;
  showAssignee: boolean;
};

type BoardSettingsModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: BoardSettings;
  onChange: (settings: BoardSettings) => void;
  accessSummary: string;
};

export function BoardSettingsModal({ open, onOpenChange, settings, onChange, accessSummary }: BoardSettingsModalProps) {
  function set<K extends keyof BoardSettings>(key: K, value: BoardSettings[K]) {
    onChange({ ...settings, [key]: value });
  }

  const cardOptions: Array<{
    key: keyof BoardSettings;
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    {
      key: "showLabels",
      label: "Labels",
      description: "Show task labels on board cards",
      icon: Tag
    },
    {
      key: "showDueDate",
      label: "Due date",
      description: "Show due date badge on each card",
      icon: CalendarClock
    },
    {
      key: "showSubtasks",
      label: "Subtasks",
      description: "Show subtask progress and inline subtask statuses",
      icon: CheckSquare
    },
    {
      key: "showComments",
      label: "Comments",
      description: "Show comments counter on cards",
      icon: MessageSquare
    },
    {
      key: "showPriority",
      label: "Priority",
      description: "Show priority icon and color tone",
      icon: Target
    },
    {
      key: "showAssignee",
      label: "Assignee",
      description: "Show assignee avatar indicator on cards",
      icon: UserRound
    }
  ];

  const visibleCount = cardOptions.filter((item) => settings[item.key]).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between gap-2">
            <DialogTitle className="inline-flex items-center gap-2">
              <LayoutGrid className="h-4 w-4 text-muted-foreground" />
              Board settings
            </DialogTitle>
            <Badge variant="secondary">
              {visibleCount} visible
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">Choose what appears on task cards in the board.</p>
        </DialogHeader>
        <div className="space-y-4">
          <motion.section
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.16 }}
            className="space-y-3 rounded-xl border border-border/70 bg-card/50 p-3"
          >
            <Label className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">Card display</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {cardOptions.map((option, index) => {
                const Icon = option.icon;
                const active = settings[option.key];
                return (
                  <motion.button
                    key={option.key}
                    type="button"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.14, delay: index * 0.02 }}
                    className={`group flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left transition ${
                      active
                        ? "border-primary/45 bg-primary/10"
                        : "border-border/70 bg-card/60 hover:bg-card/80"
                    }`}
                    onClick={() => set(option.key, !active)}
                    aria-pressed={active}
                  >
                    <div className="min-w-0">
                      <p className="inline-flex items-center gap-1.5 text-sm font-medium">
                        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                        {option.label}
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">{option.description}</p>
                    </div>
                    <span
                      className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border transition ${
                        active ? "border-primary/60 bg-primary/35" : "border-border/70 bg-card/70"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 h-3.5 w-3.5 rounded-full bg-white shadow transition ${
                          active ? "left-[1.125rem]" : "left-0.5"
                        }`}
                      />
                    </span>
                  </motion.button>
                );
              })}
            </div>
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  onChange({
                    showLabels: true,
                    showDueDate: true,
                    showSubtasks: true,
                    showComments: true,
                    showPriority: true,
                    showAssignee: true
                  })
                }
              >
                Reset defaults
              </Button>
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.16, delay: 0.02 }}
            className="rounded-xl border border-border/70 bg-card/40 px-3 py-2"
          >
            <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5" />
              Permissions: <span className="font-medium text-foreground/90">{accessSummary}</span>
            </p>
          </motion.section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
