"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bot, Minus, Plus, SendHorizontal, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type ChatRole = "user" | "assistant";

type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: number;
};

type AgentAction = {
  tool: string;
  args: Record<string, unknown>;
  reason?: string;
  requiresConfirmation: boolean;
  knownTool: boolean;
};

type AgentResult = {
  tool: string;
  ok: boolean;
  message: string;
};

type AgentResponse = {
  reply: string;
  model: string;
  actions: AgentAction[];
  executed: boolean;
  results: AgentResult[];
  projectSelectionRequired?: boolean;
  projectOptions?: Array<{
    id: string;
    name: string;
    status: string;
    openTaskCount: number;
    overdueCount: number;
    p1Count: number;
  }>;
  error?: string;
};

const MAX_REQUEST_MESSAGES = 20;
const STORAGE_KEY = "sa_admin_agent_chat_v1";
const quickQuestions = [
  "Summarize my open projects and top blockers.",
  "What are my highest-priority tasks due this week?",
  "Propose 3 concrete tasks I should do today.",
  "Summarize recent audit activity in plain language.",
  "Draft a short Telegram status update for today.",
  "What actions should I run next?"
];

const defaultMessages: ChatMessage[] = [
  {
    id: "welcome",
    role: "assistant",
    content: "SA Agent online. Ask for summaries, project actions, or Telegram actions.",
    createdAt: Date.now()
  }
];

function newId() {
  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;
}

function toPayload(messages: ChatMessage[]) {
  return messages.slice(-MAX_REQUEST_MESSAGES).map((message) => ({
    role: message.role,
    content: message.content
  }));
}

export function AdminAgentChatbot({ pathname }: { pathname: string }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(defaultMessages);
  const [results, setResults] = useState<AgentResult[]>([]);
  const [status, setStatus] = useState("");
  const [model, setModel] = useState("");
  const [projectSelectionRequired, setProjectSelectionRequired] = useState(false);
  const [projectOptions, setProjectOptions] = useState<NonNullable<AgentResponse["projectOptions"]>>([]);
  const [projectSelectionPrompt, setProjectSelectionPrompt] = useState("");

  const messagesRef = useRef<ChatMessage[]>(defaultMessages);
  const listRef = useRef<HTMLDivElement | null>(null);
  const hasUserMessage = messages.some((message) => message.role === "user");

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed) || !parsed.length) return;

      const hydrated = parsed
        .filter((item): item is Partial<ChatMessage> => Boolean(item && typeof item === "object"))
        .map((item) => ({
          id: item.id || newId(),
          role: (item.role === "user" ? "user" : "assistant") as ChatRole,
          content: typeof item.content === "string" ? item.content : "",
          createdAt: typeof item.createdAt === "number" ? item.createdAt : Date.now()
        }))
        .filter((item) => item.content.trim().length > 0)
        .slice(-40);

      if (hydrated.length) {
        messagesRef.current = hydrated;
        setMessages(hydrated);
      }
    } catch {
      // Ignore storage parsing issues.
    }
  }, []);

  useEffect(() => {
    messagesRef.current = messages;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-40)));
    } catch {
      // Ignore storage write issues.
    }
  }, [messages]);

  useEffect(() => {
    if (!open) return;
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [open, messages, pending]);

  function appendMessage(role: ChatRole, content: string) {
    const next = [
      ...messagesRef.current,
      {
        id: newId(),
        role,
        content,
        createdAt: Date.now()
      }
    ];
    messagesRef.current = next;
    setMessages(next);
  }

  async function dispatchMessage(raw: string) {
    const content = raw.trim();
    if (!content || pending) return;

    setPending(true);
    setStatus("");
    setResults([]);
    setProjectSelectionRequired(false);
    setProjectOptions([]);

    appendMessage("user", content);
    setDraft("");

    try {
      const response = await fetch("/api/admin/agent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          messages: toPayload(messagesRef.current),
          execute: true,
          page: pathname
        })
      });

      const payload = (await response.json().catch(() => null)) as AgentResponse | null;
      if (!response.ok) {
        throw new Error(payload?.error || `Request failed (${response.status})`);
      }

      appendMessage("assistant", payload?.reply?.trim() || "No response");
      setModel(payload?.model ?? "");
      setResults(payload?.results ?? []);
      setProjectSelectionRequired(payload?.projectSelectionRequired === true);
      setProjectOptions(payload?.projectSelectionRequired ? payload?.projectOptions ?? [] : []);
      if (payload?.projectSelectionRequired) {
        setProjectSelectionPrompt(content);
      } else {
        setProjectSelectionPrompt("");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to reach SA Agent";
      setStatus(message);
      appendMessage("assistant", `Error: ${message}`);
    } finally {
      setPending(false);
    }
  }

  async function sendMessage(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    await dispatchMessage(draft);
  }

  function clearChat() {
    setDraft("");
    setPending(false);
    setResults([]);
    setStatus("");
    setModel("");
    setProjectSelectionRequired(false);
    setProjectOptions([]);
    setProjectSelectionPrompt("");
    messagesRef.current = defaultMessages;
    setMessages(defaultMessages);
  }

  return (
    <>
      {!open ? (
        <div className="fixed bottom-4 right-4 z-[65]">
          <Button
            type="button"
            onClick={() => setOpen(true)}
            variant="cta"
            size="icon"
            className="group relative h-11 w-11 rounded-2xl border border-cyan-300/45 bg-gradient-to-br from-cyan-500 via-sky-500 to-indigo-600 text-white shadow-[0_14px_32px_-14px_rgba(14,165,233,0.9)] transition-all hover:brightness-110"
            aria-label="Open SA Agent"
            title="Open SA Agent"
          >
            <Bot className="h-5 w-5" />
            <span className="pointer-events-none absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border border-black/20 bg-emerald-400" />
          </Button>
        </div>
      ) : null}

      {open ? (
        <section
          className="fixed bottom-4 right-4 z-[70] flex h-[min(34rem,calc(100vh-2rem))] w-[min(26rem,calc(100vw-1rem))] flex-col overflow-hidden rounded-xl border border-white/10 bg-black text-white shadow-elev3"
          role="dialog"
          aria-label="SA Agent Chat"
        >
          <header className="flex items-center justify-between border-b border-white/10 bg-black px-3 py-2">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <Bot className="h-4 w-4" />
                SA Agent
              </p>
              {model ? <p className="truncate text-[11px] text-zinc-400">{`Model: ${model}`}</p> : null}
            </div>
            <div className="flex items-center gap-1">
              <Button type="button" variant="outline" size="icon" className="h-8 w-8 border-white/20 bg-black hover:bg-zinc-900" onClick={clearChat} aria-label="Start new chat">
                <Plus className="h-4 w-4" />
              </Button>
              <Button type="button" variant="outline" size="icon" className="h-8 w-8 border-white/20 bg-black hover:bg-zinc-900" onClick={() => setOpen(false)} aria-label="Minimize chat">
                <Minus className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8 border-white/20 bg-black hover:bg-zinc-900"
                onClick={() => {
                  clearChat();
                  setOpen(false);
                }}
                aria-label="Close chat"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </header>

          <div ref={listRef} className="flex-1 space-y-3 overflow-auto px-3 py-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "rounded-xl border px-3 py-2 text-sm",
                  message.role === "user"
                    ? "ml-auto max-w-[92%] border-white/25 bg-zinc-900"
                    : "mr-auto max-w-[92%] border-white/15 bg-zinc-950"
                )}
              >
                <p className="text-[10px] uppercase tracking-[0.12em] text-zinc-400">{message.role === "user" ? "You" : "Agent"}</p>
                <p className="mt-1 whitespace-pre-wrap">{message.content}</p>
              </div>
            ))}

            {pending ? (
              <div className="mr-auto rounded-xl border border-white/15 bg-zinc-950 px-3 py-2 text-sm text-zinc-400">Working...</div>
            ) : null}
          </div>

          <div className="space-y-2 border-t border-white/10 bg-black p-3">
            {results.some((result) => !result.ok) ? (
              <div className="max-h-24 space-y-1 overflow-auto rounded-xl border border-red-400/35 bg-red-950/30 p-2">
                {results
                  .filter((result) => !result.ok)
                  .map((result, index) => (
                    <p key={`${result.tool}-${index}`} className="text-[11px] text-red-200">
                      {result.message}
                    </p>
                  ))}
              </div>
            ) : null}

            <AnimatePresence initial={false}>
              {!hasUserMessage ? (
                <motion.div
                  key="quick-questions"
                  className="space-y-1"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  transition={{ duration: 0.2 }}
                >
                  <p className="text-[11px] text-zinc-400">Quick questions</p>
                  <div className="flex flex-wrap gap-1.5">
                    {quickQuestions.map((question, index) => (
                      <motion.div
                        key={question}
                        initial={{ opacity: 0, y: 8, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 4 }}
                        transition={{ duration: 0.18, delay: 0.04 + index * 0.04 }}
                        whileHover={{ y: -2, scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 border-white/20 bg-zinc-950/60 px-2 text-[11px] transition-colors hover:border-cyan-300/40 hover:bg-zinc-900"
                          disabled={pending}
                          onClick={() => {
                            void dispatchMessage(question);
                          }}
                        >
                          {question}
                        </Button>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>

            <form className="flex items-end gap-2" onSubmit={sendMessage}>
              <Textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Ask SA Agent..."
                className="min-h-[44px] flex-1 resize-none border-white/15 bg-zinc-950 text-white placeholder:text-zinc-500"
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void sendMessage();
                  }
                }}
              />
              <Button type="submit" size="sm" className="h-11 px-3" disabled={pending || !draft.trim()}>
                <SendHorizontal className="mr-1 h-3.5 w-3.5" />
                Send
              </Button>
            </form>

            {projectSelectionRequired && projectOptions.length ? (
              <div className="space-y-1.5 rounded-xl border border-white/15 bg-zinc-950 p-2">
                <p className="text-[11px] text-zinc-400">Choose project</p>
                <div className="flex flex-wrap gap-1.5">
                  {projectOptions.map((project) => (
                    <Button
                      key={project.id}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-[11px]"
                      disabled={pending}
                      onClick={() => {
                        const prompt = projectSelectionPrompt || "Continue with this project context.";
                        void dispatchMessage(`${prompt}\nProject: ${project.name} (ID: ${project.id})`);
                      }}
                    >
                      {project.name}
                    </Button>
                  ))}
                </div>
              </div>
            ) : null}

            {status ? <p className="text-xs text-destructive">{status}</p> : null}
          </div>
        </section>
      ) : null}
    </>
  );
}
