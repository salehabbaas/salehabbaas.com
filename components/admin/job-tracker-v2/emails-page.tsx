"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { CalendarClock, FileText, Loader2, Mail, Sparkles, UserRound } from "lucide-react";

import { JobTrackerNav } from "@/components/admin/job-tracker-v2/job-tracker-nav";
import { formatDateTime, fromDateTimeLocalInput, toDateTimeLocalInput } from "@/components/admin/job-tracker-v2/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createEmailMessage, subscribeEmailAiResults, subscribeEmailMessages } from "@/lib/job-tracker/client";
import { callClassifyEmail } from "@/lib/job-tracker/functions-client";
import type { EmailAiResultRecord, EmailMessageRecord } from "@/types/job-tracker-system";

const defaultForm = {
  subject: "",
  fromEmail: "",
  receivedAt: new Date().toISOString(),
  bodyText: ""
};

export function JobTrackerEmailsPage({ ownerId }: { ownerId: string }) {
  const [form, setForm] = useState(defaultForm);
  const [composeOpen, setComposeOpen] = useState(false);
  const [messages, setMessages] = useState<EmailMessageRecord[]>([]);
  const [results, setResults] = useState<EmailAiResultRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    const unsubMessages = subscribeEmailMessages(ownerId, setMessages, (error) => setStatus(error.message));
    const unsubResults = subscribeEmailAiResults(ownerId, setResults, (error) => setStatus(error.message));

    return () => {
      unsubMessages();
      unsubResults();
    };
  }, [ownerId]);

  const resultByEmailId = useMemo(() => {
    const map = new Map<string, EmailAiResultRecord>();
    results.forEach((result) => {
      if (!map.has(result.emailId)) {
        map.set(result.emailId, result);
      }
    });
    return map;
  }, [results]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.subject.trim() || !form.fromEmail.trim() || !form.bodyText.trim()) {
      setStatus("Subject, from email, and body are required.");
      return;
    }

    setLoading(true);
    setStatus("");

    try {
      const emailId = await createEmailMessage({
        userId: ownerId,
        subject: form.subject,
        fromEmail: form.fromEmail,
        bodyText: form.bodyText,
        receivedAt: form.receivedAt,
        rawSource: "pasted"
      });

      await callClassifyEmail({ emailId });

      setForm((current) => ({
        ...defaultForm,
        fromEmail: current.fromEmail
      }));
      setStatus("Email saved and AI classification completed.");
      setComposeOpen(false);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to classify email.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Email AI Classification</h1>
        <p className="text-sm text-muted-foreground">
          Paste inbound job-related emails to auto-classify status updates and trigger interview/task actions.
        </p>
      </div>

      <JobTrackerNav />

      <Card className="overflow-hidden border-border/60 bg-card/70">
        <CardContent className="relative p-5">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsla(var(--accent),0.15),transparent_58%)]" />
          <div className="relative flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-foreground">Email actions</p>
              <p className="text-xs text-muted-foreground">
                Keep this page clean. Open the email classification form only when needed.
              </p>
            </div>
            <Button
              type="button"
              variant="cta"
              className="transition-all duration-300 hover:-translate-y-0.5"
              onClick={() => setComposeOpen(true)}
            >
              <Sparkles className="h-4 w-4" />
              Paste & Classify Email
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/60 bg-card/70">
          <CardHeader>
            <CardTitle>Email Messages</CardTitle>
            <CardDescription>{messages.length} saved emails.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {messages.length === 0 ? (
              <p className="text-sm text-muted-foreground">No saved emails yet.</p>
            ) : (
              messages.map((email) => {
                const result = resultByEmailId.get(email.id);
                return (
                  <div key={email.id} className="rounded-xl border border-border/60 p-3">
                    <p className="text-sm font-medium text-foreground">{email.subject}</p>
                    <p className="mt-1 text-xs text-muted-foreground">From: {email.fromEmail}</p>
                    <p className="text-xs text-muted-foreground">Received: {formatDateTime(email.receivedAt)}</p>
                    {result ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge variant="outline">{result.emailType || "unknown"}</Badge>
                        <Badge variant="outline">{result.detectedStatus}</Badge>
                        <Badge variant="outline">{(result.confidence * 100).toFixed(0)}%</Badge>
                      </div>
                    ) : (
                      <p className="mt-2 text-xs text-muted-foreground">No AI result yet.</p>
                    )}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/70">
          <CardHeader>
            <CardTitle>AI Results</CardTitle>
            <CardDescription>Structured classification outputs and matching action summary.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {results.length === 0 ? (
              <p className="text-sm text-muted-foreground">No AI results yet.</p>
            ) : (
              results.map((result) => (
                <div key={result.id} className="rounded-xl border border-border/60 p-3 text-xs">
                  <p className="font-medium text-foreground">{result.detectedCompanyName || "Unknown Company"}</p>
                  <p className="text-muted-foreground">{result.detectedJobTitle || "Unknown Role"}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge variant="outline">{result.emailType || "unknown"}</Badge>
                    <Badge variant="outline">{result.detectedStatus}</Badge>
                    <Badge variant="outline">{(result.confidence * 100).toFixed(0)}%</Badge>
                    <Badge variant="outline">Action: {result.actionRequired ? "Yes" : "No"}</Badge>
                  </div>
                  <p className="mt-2 text-muted-foreground">{result.reasoning || "No reasoning provided."}</p>
                  <p className="mt-1 text-muted-foreground">
                    Matched Job: {result.matchedJobId || "None"} • Matched Company: {result.matchedCompanyId || "None"}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}

      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent className="max-w-4xl overflow-hidden border-border/70 bg-[linear-gradient(180deg,rgba(59,130,246,0.12),rgba(7,12,23,0.95)_35%)]">
          <DialogHeader className="rounded-2xl border border-accent/30 bg-accent/10 p-4">
            <DialogTitle>Paste Email</DialogTitle>
            <DialogDescription>
              MVP source is pasted emails. Classification updates matching jobs when confidence and match criteria pass.
            </DialogDescription>
          </DialogHeader>

          <form className="grid gap-3" onSubmit={handleSubmit}>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="relative">
                <FileText className="pointer-events-none absolute z-10 left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-accent-foreground/70" />
                <Input
                  className="pl-10"
                  value={form.subject}
                  onChange={(event) => setForm((current) => ({ ...current, subject: event.target.value }))}
                  placeholder="Subject"
                  required
                />
              </div>
              <div className="relative">
                <UserRound className="pointer-events-none absolute z-10 left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-accent-foreground/70" />
                <Input
                  className="pl-10"
                  value={form.fromEmail}
                  onChange={(event) => setForm((current) => ({ ...current, fromEmail: event.target.value }))}
                  placeholder="From email"
                  required
                />
              </div>
              <div className="relative">
                <CalendarClock className="pointer-events-none absolute z-10 left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-accent-foreground/70" />
                <Input
                  className="pl-10"
                  type="datetime-local"
                  value={toDateTimeLocalInput(form.receivedAt)}
                  onChange={(event) => setForm((current) => ({ ...current, receivedAt: fromDateTimeLocalInput(event.target.value) }))}
                />
              </div>
            </div>

            <div className="relative">
              <Mail className="pointer-events-none absolute z-10 left-3 top-3 h-4 w-4 text-accent-foreground/70" />
              <Textarea
                rows={10}
                className="border-border/70 bg-background/45 pl-10"
                value={form.bodyText}
                onChange={(event) => setForm((current) => ({ ...current, bodyText: event.target.value }))}
                placeholder="Paste email body"
                required
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="submit" variant="cta" className="transition-all duration-300 hover:-translate-y-0.5" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                Save + Classify Email
              </Button>
              <Button
                type="button"
                variant="outline"
                className="transition-all duration-300 hover:-translate-y-0.5"
                onClick={() => setComposeOpen(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
