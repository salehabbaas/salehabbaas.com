"use client";

import { useRef } from "react";
import { motion } from "framer-motion";
import { Filter, Keyboard, Plus, Settings2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

type BoardToolbarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  onOpenFilters: () => void;
  onOpenSettings: () => void;
  onCreate: () => void;
  onFocusSearchRef?: (el: HTMLInputElement | null) => void;
};

export function BoardToolbar({
  search,
  onSearchChange,
  onOpenFilters,
  onOpenSettings,
  onCreate,
  onFocusSearchRef,
}: BoardToolbarProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <motion.div
      className="space-y-3"
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.16 }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full min-w-[14rem] max-w-md">
          <Input
            ref={(el) => {
              inputRef.current = el;
              onFocusSearchRef?.(el);
            }}
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search"
            className="h-9 w-full transition-shadow focus-visible:shadow-elev1"
          />
        </div>
        <motion.div whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }}>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onOpenFilters}
          >
            <Filter className="h-4 w-4" />
            Filter
          </Button>
        </motion.div>
        <motion.div whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }}>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onOpenSettings}
            title="Board settings"
            aria-label="Board settings"
          >
            <Settings2 className="h-4 w-4" />
          </Button>
        </motion.div>
        <Dialog>
          <motion.div whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }}>
            <DialogTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                title="Shortcuts"
                aria-label="Shortcuts"
              >
                <Keyboard className="h-4 w-4" />
              </Button>
            </DialogTrigger>
          </motion.div>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Shortcuts</DialogTitle>
            </DialogHeader>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between rounded-md border border-border/70 bg-card/60 px-2 py-1.5">
                <span>Focus search</span>
                <kbd className="rounded border border-border/70 px-1.5 py-0.5 text-xs">
                  /
                </kbd>
              </div>
              <div className="flex items-center justify-between rounded-md border border-border/70 bg-card/60 px-2 py-1.5">
                <span>Create task</span>
                <kbd className="rounded border border-border/70 px-1.5 py-0.5 text-xs">
                  Ctrl + C
                </kbd>
              </div>
              <div className="flex items-center justify-between rounded-md border border-border/70 bg-card/60 px-2 py-1.5">
                <span>Close drawer / cancel inline create</span>
                <kbd className="rounded border border-border/70 px-1.5 py-0.5 text-xs">
                  Esc
                </kbd>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        <motion.div whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }}>
          <Button type="button" onClick={onCreate}>
            <Plus className="h-4 w-4" />
            Create
          </Button>
        </motion.div>
      </div>
    </motion.div>
  );
}
