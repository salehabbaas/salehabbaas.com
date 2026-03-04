"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  CalendarClock,
  FileText,
  Globe2,
  Link2,
  Loader2,
  Mail,
  MapPin,
  Sparkles,
  Tags,
  Wallet,
  Wand2
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  createCompany,
  createEmailMessage,
  createJob,
  findCompanyByName,
  seedCompanyCategoriesIfMissing,
  subscribeCompanyCategories
} from "@/lib/job-tracker/client";
import { callAiExtractFromInput, callClassifyEmail } from "@/lib/job-tracker/functions-client";
import type { AiExtractFromInputResponse, CompanyCategoryRecord, JobExtractionPreview, JobSourceType } from "@/types/job-tracker-system";

type IntakeMode = "analyze" | "preview";

const emptyPreview: JobExtractionPreview = {
  job_title: "",
  company_name: "",
  company_website: "",
  job_url: "",
  location: "",
  employment_type: "",
  salary_range: "",
  department: "",
  posting_date: "",
  application_deadline: "",
  job_description: "",
  requirements: [],
  responsibilities: [],
  skills: [],
  source_platform: "Other",
  confidence: 0
};

function looksLikeEmail(text: string) {
  const normalized = text.toLowerCase();
  return ["from:", "subject:", "dear", "regards", "sincerely"].some((marker) => normalized.includes(marker));
}

export function AiIntakeCard({ ownerId, compact = false }: { ownerId: string; compact?: boolean }) {
  const [categories, setCategories] = useState<CompanyCategoryRecord[]>([]);

  const [open, setOpen] = useState(false);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [extractResult, setExtractResult] = useState<AiExtractFromInputResponse | null>(null);
  const [preview, setPreview] = useState<JobExtractionPreview>(emptyPreview);
  const [status, setStatus] = useState("");

  useEffect(() => {
    seedCompanyCategoriesIfMissing().catch(() => {
      // Non-blocking seeding.
    });

    const unsub = subscribeCompanyCategories(
      (items) => setCategories(items),
      (error) => setStatus(error.message)
    );
    return unsub;
  }, []);

  const defaultCategoryId = useMemo(() => {
    if (!categories.length) return "";
    return categories.find((category) => category.name.toLowerCase() === "other")?.id ?? categories[0].id;
  }, [categories]);

  async function runIntake(mode: IntakeMode) {
    const text = inputText.trim();
    if (!text) {
      setStatus("Paste a URL, job description, or email first.");
      return;
    }

    setLoading(true);
    setStatus("");
    try {
      const result = await callAiExtractFromInput({ inputText: text });
      setExtractResult(result);
      setPreview(result.preview);
      setStatus(mode === "analyze" ? `Detected input type: ${result.inputType}` : "Preview updated.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to analyze input.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateJob() {
    if (!preview.job_title.trim() || !preview.company_name.trim()) {
      setStatus("Job title and company are required before creating a job.");
      return;
    }

    if (!defaultCategoryId) {
      setStatus("No company categories available yet. Reload and try again.");
      return;
    }

    setCreating(true);
    setStatus("");

    try {
      const existingCompany = await findCompanyByName(ownerId, preview.company_name);
      const companyId = existingCompany?.id
        ? String(existingCompany.id)
        : await createCompany({
            userId: ownerId,
            name: preview.company_name,
            categoryId: defaultCategoryId,
            websiteUrl: preview.company_website || "",
            careerPageUrl: preview.job_url || preview.company_website || "",
            notes: "Created from AI Intake",
            watchEnabled: true,
            watchFrequency: "daily"
          });

      const sourceType: JobSourceType =
        extractResult?.inputType === "url" || extractResult?.inputType === "linkedin_url" ? "url_import" : "ai_intake";

      await createJob({
        userId: ownerId,
        companyId,
        roleTitle: preview.job_title,
        jobUrl: preview.job_url || "",
        location: preview.location || "",
        salaryRateText: preview.salary_range || "",
        status: "SAVED",
        applicationDate: "",
        deadline: preview.application_deadline || "",
        sourceType,
        resumeStudioDocId: null
      });

      setStatus("Job created from intake preview.");
      setOpen(false);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to create job.");
    } finally {
      setCreating(false);
    }
  }

  async function handleSaveEmail() {
    const text = inputText.trim();
    if (!text) {
      setStatus("Paste email text first.");
      return;
    }

    setCreating(true);
    setStatus("");

    try {
      const extractedSubject = text.match(/subject:\s*(.+)$/im)?.[1]?.trim() ?? "Pasted email";
      const extractedFrom = text.match(/from:\s*(.+)$/im)?.[1]?.trim() ?? "unknown@unknown";

      const emailId = await createEmailMessage({
        userId: ownerId,
        subject: extractedSubject,
        fromEmail: extractedFrom,
        bodyText: text,
        receivedAt: new Date().toISOString(),
        rawSource: "pasted"
      });

      await callClassifyEmail({ emailId });
      setStatus("Email saved and classified.");
      setOpen(false);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to save email.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <Card className="overflow-hidden border-warning/35 bg-card/70">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-5 w-5 text-warning" />
          AI Intake Studio
        </CardTitle>
        <CardDescription>
          URL, LinkedIn job, raw description, or email intake is hidden behind a guided modal flow.
        </CardDescription>
      </CardHeader>

      <CardContent className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsla(var(--warning),0.18),transparent_58%)]" />
        <div className="relative flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="cta"
            className="transition-all duration-300 hover:-translate-y-0.5"
            onClick={() => setOpen(true)}
          >
            <Sparkles className="h-4 w-4" />
            {compact ? "Open Intake" : "Open AI Intake Form"}
          </Button>
          {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}
        </div>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl overflow-hidden border-border/70 bg-[linear-gradient(180deg,rgba(251,191,36,0.12),rgba(7,12,23,0.95)_35%)]">
          <DialogHeader className="rounded-2xl border border-warning/30 bg-warning/10 p-4">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-warning/35 bg-warning/10 px-3 py-1 text-[11px] uppercase tracking-wide text-warning">
              <Wand2 className="h-3.5 w-3.5" />
              Universal Intake
            </div>
            <DialogTitle className="pt-1">AI Intake Form</DialogTitle>
            <DialogDescription>
              Analyze source text, edit extracted fields, then create a job or classify and save email.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="relative">
              <FileText className="pointer-events-none absolute z-10 left-3 top-3 h-4 w-4 text-warning" />
              <Textarea
                value={inputText}
                onChange={(event) => setInputText(event.target.value)}
                placeholder="Paste URL, job description, or email text"
                rows={compact ? 7 : 9}
                className="border-border/70 bg-background/45 pl-10"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="cta"
                className="transition-all duration-300 hover:-translate-y-0.5"
                onClick={() => void runIntake("analyze")}
                disabled={loading || creating}
              >
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                Analyze
              </Button>
              <Button
                type="button"
                variant="outline"
                className="transition-all duration-300 hover:-translate-y-0.5"
                onClick={() => void runIntake("preview")}
                disabled={loading || creating}
              >
                Extract & Preview
              </Button>
              <Button
                type="button"
                variant="outline"
                className="transition-all duration-300 hover:-translate-y-0.5"
                onClick={() => void handleCreateJob()}
                disabled={creating || loading || !preview.job_title}
              >
                {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Create Job
              </Button>
              <Button
                type="button"
                variant="outline"
                className="transition-all duration-300 hover:-translate-y-0.5"
                onClick={() => void handleSaveEmail()}
                disabled={creating || loading || (!looksLikeEmail(inputText) && extractResult?.inputType !== "email")}
              >
                <Mail className="mr-2 h-4 w-4" />
                Save Email
              </Button>
            </div>

            {extractResult ? (
              <div className="rounded-xl border border-border/60 bg-background/45 p-3 text-xs text-muted-foreground">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">Type: {extractResult.inputType}</Badge>
                  <Badge variant="outline">Confidence: {(preview.confidence * 100).toFixed(0)}%</Badge>
                  {extractResult.blocked ? <Badge variant="outline">Blocked Source</Badge> : null}
                </div>
                {extractResult.hint ? <p className="mt-2 text-warning">{extractResult.hint}</p> : null}
              </div>
            ) : null}

            {extractResult ? (
              <div className="grid gap-3 md:grid-cols-2">
                <div className="relative">
                  <Tags className="pointer-events-none absolute z-10 left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-warning" />
                  <Input
                    value={preview.job_title}
                    onChange={(event) => setPreview((current) => ({ ...current, job_title: event.target.value }))}
                    placeholder="Job title"
                    className="pl-10"
                  />
                </div>
                <div className="relative">
                  <Building2 className="pointer-events-none absolute z-10 left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-warning" />
                  <Input
                    value={preview.company_name}
                    onChange={(event) => setPreview((current) => ({ ...current, company_name: event.target.value }))}
                    placeholder="Company"
                    className="pl-10"
                  />
                </div>
                <div className="relative">
                  <Globe2 className="pointer-events-none absolute z-10 left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-warning" />
                  <Input
                    value={preview.company_website}
                    onChange={(event) => setPreview((current) => ({ ...current, company_website: event.target.value }))}
                    placeholder="Company website"
                    className="pl-10"
                  />
                </div>
                <div className="relative">
                  <Link2 className="pointer-events-none absolute z-10 left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-warning" />
                  <Input
                    value={preview.job_url}
                    onChange={(event) => setPreview((current) => ({ ...current, job_url: event.target.value }))}
                    placeholder="Job URL"
                    className="pl-10"
                  />
                </div>
                <div className="relative">
                  <MapPin className="pointer-events-none absolute z-10 left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-warning" />
                  <Input
                    value={preview.location}
                    onChange={(event) => setPreview((current) => ({ ...current, location: event.target.value }))}
                    placeholder="Location"
                    className="pl-10"
                  />
                </div>
                <div className="relative">
                  <Wallet className="pointer-events-none absolute z-10 left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-warning" />
                  <Input
                    value={preview.salary_range}
                    onChange={(event) => setPreview((current) => ({ ...current, salary_range: event.target.value }))}
                    placeholder="Salary/Rate"
                    className="pl-10"
                  />
                </div>
                <div className="relative">
                  <CalendarClock className="pointer-events-none absolute z-10 left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-warning" />
                  <Input
                    value={preview.application_deadline}
                    onChange={(event) => setPreview((current) => ({ ...current, application_deadline: event.target.value }))}
                    placeholder="Deadline"
                    className="pl-10"
                  />
                </div>
                <div className="relative">
                  <Tags className="pointer-events-none absolute z-10 left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-warning" />
                  <Input
                    value={preview.department}
                    onChange={(event) => setPreview((current) => ({ ...current, department: event.target.value }))}
                    placeholder="Department"
                    className="pl-10"
                  />
                </div>
                <div className="md:col-span-2">
                  <Textarea
                    value={preview.job_description}
                    onChange={(event) => setPreview((current) => ({ ...current, job_description: event.target.value }))}
                    rows={8}
                    placeholder="Extracted job description"
                    className="border-border/70 bg-background/45"
                  />
                </div>
              </div>
            ) : null}

            {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
