"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpenText, Clapperboard, FolderKanban, Search } from "lucide-react";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Action = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  toHref: (query: string) => string;
  hint: string;
};

const actions: Action[] = [
  {
    id: "knowledge",
    label: "Blog",
    icon: BookOpenText,
    toHref: (query) => (query ? `/knowledge?q=${encodeURIComponent(query)}` : "/knowledge"),
    hint: "Articles and technical notes"
  },
  {
    id: "creator",
    label: "Creator",
    icon: Clapperboard,
    toHref: (query) => (query ? `/creator?q=${encodeURIComponent(query)}` : "/creator"),
    hint: "Short-form content and posts"
  },
  {
    id: "projects",
    label: "Projects",
    icon: FolderKanban,
    toHref: (query) => (query ? `/projects?q=${encodeURIComponent(query)}` : "/projects"),
    hint: "Case studies and shipped systems"
  }
];

export function SiteSearch({ className }: { className?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  const primary = useMemo(() => actions[0], []);
  const shortcut = useMemo(() => {
    if (typeof navigator === "undefined") return "Ctrl K";
    return navigator.platform.toLowerCase().includes("mac") ? "Cmd K" : "Ctrl K";
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const isMac = navigator.platform.toLowerCase().includes("mac");
      const hotkey = isMac ? event.metaKey : event.ctrlKey;
      if (hotkey && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => inputRef.current?.focus(), 30);
    return () => window.clearTimeout(id);
  }, [open]);

  function go(action: Action) {
    const href = action.toHref(query.trim());
    setOpen(false);
    router.push(href);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex h-9 items-center gap-2 rounded-full border border-border/70 bg-card/80 px-2.5 text-xs text-foreground/75 shadow-elev1 backdrop-blur transition hover:bg-card/95 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          className
        )}
        aria-label="Search"
      >
        <Search className="h-4 w-4" aria-hidden />
        <span className="hidden sm:inline text-[11px] text-muted-foreground">{shortcut}</span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="p-0">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle className="text-foreground">Search</DialogTitle>
            <DialogDescription className="text-muted-foreground">Jump to Blog, Creator, or Projects.</DialogDescription>
          </DialogHeader>

          <div className="px-6 pb-2">
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type a keyword, tag, or topic..."
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  go(primary);
                }
              }}
              aria-label="Search query"
            />
          </div>

          <div className="grid gap-2 px-6 pb-6">
            {actions.map((action) => {
              const Icon = action.icon;
              return (
                <Button
                  key={action.id}
                  variant="outline"
              className="h-auto justify-between rounded-2xl border-border/70 bg-card/75 px-4 py-3 text-foreground"
              onClick={() => go(action)}
            >
              <span className="flex items-start gap-3 text-left">
                <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border/70 bg-card/75">
                  <Icon className="h-4 w-4 text-foreground/90" aria-hidden />
                </span>
                <span className="flex flex-col">
                  <span className="font-medium text-foreground">{action.label}</span>
                  <span className="text-xs text-muted-foreground">{action.hint}</span>
                </span>
              </span>
              <span className="text-xs text-muted-foreground">
                {query.trim() ? "Search" : "Open"}
              </span>
            </Button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
