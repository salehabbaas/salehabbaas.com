"use client";

import { AnimatePresence, motion } from "framer-motion";
import { SendHorizontal, Terminal, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useReducedMotion } from "@/lib/motion/useReducedMotion";
import { cn } from "@/lib/utils";

type ChatRole = "user" | "assistant";

type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: number;
};

const STORAGE_KEY = "saleh_os_messages_v1";
const MAX_STORED_MESSAGES = 40;
const MAX_REQUEST_MESSAGES = 16;

const DEFAULT_MESSAGES: ChatMessage[] = [
  {
    id: "welcome",
    role: "assistant",
    content:
      "Saleh-OS 2.0 online. Ask me about HL7/FHIR, clinical integrations, projects, or my experience at The Ottawa Hospital and WHO.",
    createdAt: Date.now()
  }
];

function newId() {
  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;
}

function toRequestMessages(messages: ChatMessage[]) {
  return messages.slice(-MAX_REQUEST_MESSAGES).map((m) => ({ role: m.role, content: m.content }));
}

export function SalehOs() {
  const reducedMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(DEFAULT_MESSAGES);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);

  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const messagesRef = useRef<ChatMessage[]>(DEFAULT_MESSAGES);

  const motionConfig = useMemo(
    () => ({
      duration: reducedMotion ? 0 : 0.22
    }),
    [reducedMotion]
  );

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed) || parsed.length === 0) return;

      const hydrated = parsed
        .filter((item): item is ChatMessage => {
          if (!item || typeof item !== "object") return false;
          const msg = item as Partial<ChatMessage>;
          return (msg.role === "user" || msg.role === "assistant") && typeof msg.content === "string";
        })
        .slice(-MAX_STORED_MESSAGES)
        .map((msg) => ({
          id: msg.id || newId(),
          role: msg.role,
          content: msg.content,
          createdAt: typeof msg.createdAt === "number" ? msg.createdAt : Date.now()
        }));

      if (hydrated.length) setMessages(hydrated);
    } catch {
      // Ignore localStorage parse errors.
    }
  }, []);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    try {
      const trimmed = messages.slice(-MAX_STORED_MESSAGES);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } catch {
      // Ignore localStorage quota errors.
    }
  }, [messages]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 30);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const node = listRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [messages, open, pending]);

  useEffect(() => {
    function onOpen() {
      setOpen(true);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("saleh-os:open" as never, onOpen);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("saleh-os:open" as never, onOpen);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  async function sendMessage(content: string) {
    if (pending) return;

    const trimmed = content.trim();
    if (!trimmed) return;

    const userMsg: ChatMessage = {
      id: newId(),
      role: "user",
      content: trimmed,
      createdAt: Date.now()
    };

    setDraft("");
    setPending(true);

    const nextHistory = [...messagesRef.current, userMsg];
    setMessages(nextHistory);

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/saleh-os", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: toRequestMessages(nextHistory),
          page: typeof window === "undefined" ? undefined : window.location.pathname
        }),
        signal: controller.signal
      });

      const data = (await res.json().catch(() => null)) as { text?: string; error?: string } | null;
      if (!res.ok) {
        throw new Error(data?.error || `Request failed (${res.status})`);
      }

      const text = data?.text?.trim();
      if (!text) {
        throw new Error("Empty response from model");
      }

      setMessages((prev) => [
        ...prev,
        {
          id: newId(),
          role: "assistant",
          content: text,
          createdAt: Date.now()
        }
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to reach assistant";
      setMessages((prev) => [
        ...prev,
        {
          id: newId(),
          role: "assistant",
          content: `Error: ${message}`,
          createdAt: Date.now()
        }
      ]);
    } finally {
      setPending(false);
    }
  }

  function clearChat() {
    abortRef.current?.abort();
    setPending(false);
    setDraft("");
    setMessages(DEFAULT_MESSAGES);
  }

  return (
    <>
      {!open ? (
        <div className="fixed bottom-4 right-4 z-[54]">
          <Button
            type="button"
            onClick={() => setOpen(true)}
            variant="cta"
            size="icon"
            className={cn("h-12 w-12 rounded-2xl shadow-elev3")}
            aria-label="Open Saleh-OS"
          >
            <Terminal className="h-5 w-5" aria-hidden />
          </Button>
        </div>
      ) : null}

      <AnimatePresence>
        {open ? (
          <>
            <motion.div
              key="overlay"
              className="fixed inset-0 z-[55] bg-black/45 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: motionConfig }}
              exit={{ opacity: 0, transition: motionConfig }}
              onClick={() => setOpen(false)}
              aria-hidden="true"
            />

            <motion.section
              key="panel"
              role="dialog"
              aria-label="Saleh-OS"
              aria-modal="true"
              className="fixed bottom-4 right-4 z-[60] flex h-[min(40rem,calc(100vh-2rem))] w-[min(32rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-[1.75rem] border border-border/70 bg-[hsl(var(--surface-950))/0.96] shadow-elev3"
              initial={{ opacity: 0, y: 14, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1, transition: motionConfig }}
              exit={{ opacity: 0, y: 14, scale: 0.98, transition: motionConfig }}
            >
              <div className="pointer-events-none absolute inset-0 opacity-25 noise-overlay" aria-hidden="true" />
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    "radial-gradient(circle at 15% 10%, hsl(var(--glow-primary) / 0.25), transparent 55%), radial-gradient(circle at 90% 0%, hsl(var(--accent) / 0.14), transparent 60%), radial-gradient(circle at 50% 100%, rgba(0,0,0,0.55), transparent 55%)"
                }}
                aria-hidden="true"
              />

              <header className="relative flex items-center justify-between gap-3 border-b border-border/70 px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-border/70 bg-card/80">
                    <Terminal className="h-4 w-4 text-[hsl(var(--accent-strong))]" aria-hidden />
                  </span>
                  <div className="leading-tight">
                    <p className="font-mono text-sm font-semibold tracking-tight text-foreground">Saleh-OS 2.0</p>
                    <p className="text-xs text-muted-foreground">Gemini-backed assistant</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" size="icon" className="h-9 w-9 rounded-2xl border-border/70 bg-card/75 text-foreground/90 hover:bg-card/90" onClick={clearChat} aria-label="Clear chat">
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </Button>
                  <Button type="button" variant="outline" size="icon" className="h-9 w-9 rounded-2xl border-border/70 bg-card/75 text-foreground/90 hover:bg-card/90" onClick={() => setOpen(false)} aria-label="Close Saleh-OS">
                    <X className="h-4 w-4" aria-hidden />
                  </Button>
                </div>
              </header>

              <div ref={listRef} className="relative flex-1 space-y-4 overflow-auto px-4 py-4 font-mono">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      "rounded-2xl border px-3 py-2 text-sm leading-7 shadow-[0_20px_70px_-55px_rgba(0,0,0,0.85)]",
                      msg.role === "user"
                        ? "ml-auto max-w-[92%] border-border/70 bg-card/80 text-foreground"
                        : "mr-auto max-w-[92%] border-[hsl(var(--accent-strong)/0.18)] bg-[hsl(var(--accent-strong)/0.08)] text-foreground"
                    )}
                  >
                    <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
                      {msg.role === "user" ? "You" : "Saleh"}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap">{msg.content}</p>
                  </div>
                ))}

                {pending ? (
                  <div className="mr-auto max-w-[92%] rounded-2xl border border-border/70 bg-card/75 px-3 py-2 text-sm text-foreground/90">
                    <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">Saleh</p>
                    <p className="mt-1 animate-pulse">Typing...</p>
                  </div>
                ) : null}
              </div>

              <form
                className="relative border-t border-border/70 bg-black/20 p-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  void sendMessage(draft);
                }}
              >
                <Textarea
                  ref={inputRef}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Ask a recruiter-style question, e.g. “Tell me about your HL7/FHIR work.”"
                  className="min-h-[88px] resize-none rounded-2xl border-border/70 bg-black/40 font-mono text-sm text-foreground placeholder:text-muted-foreground/80 focus-visible:ring-[hsl(var(--accent-strong)/0.6)]"
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void sendMessage(draft);
                    }
                  }}
                  aria-label="Message to Saleh-OS"
                />

                <div className="mt-2 flex items-center justify-between gap-3">
                  <p className="text-xs text-muted-foreground/80">Enter to send, Shift+Enter for newline.</p>
                  <Button type="submit" variant="cta" className="h-9 px-4" disabled={pending || !draft.trim()}>
                    <SendHorizontal className="h-4 w-4" aria-hidden />
                    Send
                  </Button>
                </div>
              </form>
            </motion.section>
          </>
        ) : null}
      </AnimatePresence>
    </>
  );
}
