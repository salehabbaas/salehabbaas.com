"use client";

import { useEffect } from "react";

type ShortcutHandlers = {
  onCreate?: () => void;
  onFocusSearch?: () => void;
  onEscape?: () => void;
};

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") return true;
  if (target.isContentEditable) return true;
  return false;
}

export function useShortcuts({ onCreate, onFocusSearch, onEscape }: ShortcutHandlers) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (isTypingTarget(event.target)) {
        if (event.key === "Escape") onEscape?.();
        return;
      }

      if (event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey && event.key.toLowerCase() === "c") {
        event.preventDefault();
        onCreate?.();
        return;
      }

      if (event.key === "/") {
        event.preventDefault();
        onFocusSearch?.();
        return;
      }

      if (event.key === "Escape") {
        onEscape?.();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onCreate, onEscape, onFocusSearch]);
}
