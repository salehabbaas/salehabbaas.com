"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { ArrowLeft, DownloadCloud } from "lucide-react";

import { CompanyPicker } from "@/components/admin/company/company-picker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ensureCompanyByName } from "@/lib/company-directory/client";
import { db } from "@/lib/firebase/client";

function parseCompany(source: string) {
  const lines = source
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.find((line) => /inc|ltd|corp|company|technologies|systems/i.test(line)) || lines[1] || "";
}

function parseTitle(source: string) {
  const lines = source
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  return lines[0] || "";
}

export function JobTrackerImport({ ownerId }: { ownerId: string }) {
  const router = useRouter();
  const [jobUrl, setJobUrl] = useState("");
  const [rawDescription, setRawDescription] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const parsed = useMemo(() => {
    return {
      title: parseTitle(rawDescription),
      company: parseCompany(rawDescription)
    };
  }, [rawDescription]);

  async function createFromImport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setStatus("");

    try {
      const requestedCompanyName = companyName.trim() || parsed.company || "Unknown Company";
      const linkedCompany = await ensureCompanyByName(ownerId, { name: requestedCompanyName });

      const ref = await addDoc(collection(db, "jobTrackerJobs"), {
        ownerId,
        companyId: linkedCompany.id,
        company: linkedCompany.name,
        title: parsed.title || "Imported Role",
        location: "",
        jobUrl: jobUrl.trim() || "",
        status: "saved",
        appliedAt: null,
        nextFollowUpAt: null,
        descriptionText: rawDescription.trim(),
        descriptionSource: "import",
        tags: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      router.push(`/admin/job-tracker/${ref.id}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to import job");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="admin-workspace space-y-6">
      <Card>
        <CardHeader className="gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle>Import Job</CardTitle>
              <CardDescription>Paste a job URL and description, then create a tracked job record.</CardDescription>
            </div>
            <Button variant="outline" onClick={() => router.push("/admin/job-tracker")}>
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </div>
          {status ? <p className="text-sm text-destructive">{status}</p> : null}
        </CardHeader>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <form className="space-y-4" onSubmit={createFromImport}>
            <Input value={jobUrl} onChange={(event) => setJobUrl(event.target.value)} placeholder="https://company.com/careers/job-id" />
            <CompanyPicker
              ownerId={ownerId}
              companyId={companyId}
              companyName={companyName || parsed.company}
              required
              onSelect={(company) => {
                setCompanyId(company.id);
                setCompanyName(company.name);
              }}
              onNameChange={(name) => {
                setCompanyId("");
                setCompanyName(name);
              }}
            />
            <Textarea
              rows={16}
              required
              value={rawDescription}
              onChange={(event) => setRawDescription(event.target.value)}
              placeholder="Paste full job description text"
            />

            <div className="rounded-xl border border-border/70 bg-muted/30 p-3 text-sm">
              <p>Detected title: <strong>{parsed.title || "-"}</strong></p>
              <p>Detected company: <strong>{companyName || parsed.company || "-"}</strong></p>
            </div>

            <Button type="submit" disabled={loading}>
              <DownloadCloud className="h-4 w-4" />
              {loading ? "Importing..." : "Create Job Record"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
