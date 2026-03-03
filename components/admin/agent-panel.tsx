"use client";

import { FormEvent, useRef, useState } from "react";
import { Bot, SendHorizontal, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type ChatRole = "user" | "assistant";

type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
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

const defaultMessages: ChatMessage[] = [
  {
    id: "welcome",
    role: "assistant",
    content:
      "SA Agent is online. Ask for summaries, project context, task creation, or Telegram actions. I will execute actions directly when needed."
  }
];

function newId() {
  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;
}

function toPayload(messages: ChatMessage[]) {
  return messages.map((message) => ({ role: message.role, content: message.content }));
}

export function AdminAgentPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>(defaultMessages);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState("");
  const [model, setModel] = useState("");
  const [results, setResults] = useState<AgentResult[]>([]);
  const [projectSelectionRequired, setProjectSelectionRequired] = useState(false);
  const [projectOptions, setProjectOptions] = useState<NonNullable<AgentResponse["projectOptions"]>>([]);
  const [projectSelectionPrompt, setProjectSelectionPrompt] = useState("");

  const messagesRef = useRef<ChatMessage[]>(defaultMessages);

  function syncMessages(next: ChatMessage[]) {
    messagesRef.current = next;
    setMessages(next);
  }

  async function sendChat(event?: FormEvent<HTMLFormElement>, forcedContent?: string) {
    event?.preventDefault();

    const content = (forcedContent ?? draft).trim();
    if (!content || pending) return;

    setPending(true);
    setStatus("");
    setResults([]);
    setProjectSelectionRequired(false);
    setProjectOptions([]);

    const userMessage: ChatMessage = {
      id: newId(),
      role: "user",
      content
    };

    const history = [...messagesRef.current, userMessage];
    syncMessages(history);
    setDraft("");

    try {
      const response = await fetch("/api/admin/agent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          messages: toPayload(history),
          execute: true,
          page: typeof window === "undefined" ? undefined : window.location.pathname
        })
      });

      const payload = (await response.json().catch(() => null)) as AgentResponse | null;
      if (!response.ok) {
        throw new Error(payload?.error || `Request failed (${response.status})`);
      }

      const assistantMessage: ChatMessage = {
        id: newId(),
        role: "assistant",
        content: payload?.reply?.trim() || "No response"
      };

      syncMessages([...history, assistantMessage]);
      setResults(payload?.results ?? []);
      setModel(payload?.model ?? "");
      setProjectSelectionRequired(payload?.projectSelectionRequired === true);
      setProjectOptions(payload?.projectSelectionRequired ? payload?.projectOptions ?? [] : []);
      if (payload?.projectSelectionRequired) {
        setProjectSelectionPrompt(content);
      } else {
        setProjectSelectionPrompt("");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to reach agent";
      setStatus(message);
      syncMessages([
        ...history,
        {
          id: newId(),
          role: "assistant",
          content: `Error: ${message}`
        }
      ]);
    } finally {
      setPending(false);
    }
  }

  function clearConversation() {
    setDraft("");
    setStatus("");
    setModel("");
    setResults([]);
    setProjectSelectionRequired(false);
    setProjectOptions([]);
    setProjectSelectionPrompt("");
    syncMessages(defaultMessages);
  }

  return (
    <div className="admin-workspace space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            SA Agent Console
          </CardTitle>
          <CardDescription>Planner + tool execution for your admin workflows. Actions run directly when needed.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="secondary">Secure admin route</Badge>
          <Badge variant="outline">Telegram-ready</Badge>
          {model ? <Badge variant="outline">Model: {model}</Badge> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Conversation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="max-h-[28rem] space-y-3 overflow-auto rounded-xl border border-border/70 bg-card/50 p-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "rounded-xl border px-3 py-2 text-sm",
                  message.role === "user"
                    ? "ml-auto max-w-[92%] border-primary/35 bg-primary/10"
                    : "mr-auto max-w-[92%] border-border/70 bg-card/70"
                )}
              >
                <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                  {message.role === "user" ? "You" : "SA Agent"}
                </p>
                <p className="mt-1 whitespace-pre-wrap">{message.content}</p>
              </div>
            ))}
          </div>

          <form className="space-y-2" onSubmit={sendChat}>
            <Textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Example: summarize my open projects and propose tasks for this week"
              className="min-h-[96px]"
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void sendChat();
                }
              }}
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button type="submit" disabled={pending || !draft.trim()}>
                <SendHorizontal className="mr-2 h-4 w-4" />
                {pending ? "Working..." : "Send"}
              </Button>
              <Button type="button" variant="outline" onClick={clearConversation} disabled={pending}>
                <Trash2 className="mr-2 h-4 w-4" />
                Clear
              </Button>
              <p className="text-xs text-muted-foreground">Press Enter to send.</p>
            </div>
          </form>

          {projectSelectionRequired && projectOptions.length ? (
            <div className="space-y-2 rounded-xl border border-border/70 bg-card/60 p-3">
              <p className="text-xs text-muted-foreground">Choose project</p>
              <div className="flex flex-wrap gap-2">
                {projectOptions.map((project) => (
                  <Button
                    key={project.id}
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={pending}
                    onClick={() => {
                      const prompt = projectSelectionPrompt || "Continue with this project context.";
                      void sendChat(undefined, `${prompt}\nProject: ${project.name} (ID: ${project.id})`);
                    }}
                  >
                    {project.name}
                  </Button>
                ))}
              </div>
            </div>
          ) : null}

          {status ? <p className="text-sm text-destructive">{status}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Execution Issues</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {results.some((result) => !result.ok) ? (
            results
              .filter((result) => !result.ok)
              .map((result, index) => (
                <div key={`${result.tool}-${index}`} className="rounded-xl border border-destructive/35 bg-destructive/10 p-3">
                  <p className="text-muted-foreground">{result.message}</p>
                </div>
              ))
          ) : (
            <p className="text-muted-foreground">No execution errors.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
