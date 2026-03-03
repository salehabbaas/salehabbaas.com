"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  createTrackedCompany,
  ensureCompanyByName,
  subscribeTrackedCompanies,
  type CompanyUpsertInput
} from "@/lib/company-directory/client";
import { normalizeCompanyNameKey } from "@/lib/company-directory/utils";
import type { JobTrackerCompanyRecord } from "@/types/resume-studio";
import { CompanyEditorDialog } from "@/components/admin/company/company-editor-dialog";

type CompanyPickerProps = {
  ownerId: string;
  companyId?: string;
  companyName?: string;
  inputId?: string;
  required?: boolean;
  placeholder?: string;
  onSelect: (company: JobTrackerCompanyRecord) => void;
  onNameChange?: (name: string) => void;
};

export function CompanyPicker({
  ownerId,
  companyId,
  companyName,
  inputId,
  required,
  placeholder = "Type company name",
  onSelect,
  onNameChange
}: CompanyPickerProps) {
  const [companies, setCompanies] = useState<JobTrackerCompanyRecord[]>([]);
  const [manualName, setManualName] = useState(companyName ?? "");
  const [creating, setCreating] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const unsub = subscribeTrackedCompanies(
      ownerId,
      setCompanies,
      (error) => setMessage(error.code === "permission-denied" ? "Missing Firestore permissions for trackedCompanies." : error.message)
    );
    return () => unsub();
  }, [ownerId]);

  useEffect(() => {
    setManualName(companyName ?? "");
  }, [companyName]);

  const selected = useMemo(() => {
    if (!companyId) return null;
    return companies.find((company) => company.id === companyId) ?? null;
  }, [companies, companyId]);

  const byName = useMemo(() => {
    const map = new Map<string, JobTrackerCompanyRecord>();
    companies.forEach((company) => {
      const key = normalizeCompanyNameKey(company.name);
      if (key && !map.has(key)) map.set(key, company);
    });
    return map;
  }, [companies]);

  const exactMatch = useMemo(() => {
    const key = normalizeCompanyNameKey(manualName);
    if (!key) return null;
    return byName.get(key) ?? null;
  }, [byName, manualName]);

  function handleManualName(next: string) {
    setManualName(next);
    onNameChange?.(next);
    setMessage("");
  }

  function selectExisting(company: JobTrackerCompanyRecord) {
    onSelect(company);
    handleManualName(company.name);
  }

  async function ensureFromName() {
    const name = manualName.trim();
    if (!name) return;

    setCreating(true);
    setMessage("");
    try {
      const company = await ensureCompanyByName(ownerId, { name });
      selectExisting(company);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save company");
    } finally {
      setCreating(false);
    }
  }

  async function createFromDialog(value: CompanyUpsertInput) {
    setCreating(true);
    setMessage("");
    try {
      const company = await createTrackedCompany(ownerId, value);
      selectExisting(company);
      setCreateOpen(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to create company");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-2">
      <Select
        value={selected?.id || ""}
        onChange={(event) => {
          const next = companies.find((company) => company.id === event.target.value);
          if (next) {
            selectExisting(next);
          }
        }}
      >
        <option value="">Select existing company</option>
        {companies.map((company) => (
          <option key={company.id} value={company.id}>{company.name}</option>
        ))}
      </Select>

      <Input
        id={inputId}
        value={manualName}
        onChange={(event) => handleManualName(event.target.value)}
        placeholder={placeholder}
        required={required}
      />

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={ensureFromName} disabled={creating || !manualName.trim()}>
          {exactMatch ? "Use Existing Match" : "Create or Use Typed Name"}
        </Button>
        <Button type="button" variant="outline" onClick={() => setCreateOpen(true)}>
          New Company
        </Button>
      </div>

      {message ? <p className="text-xs text-destructive">{message}</p> : null}

      <CompanyEditorDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        initialValue={{ name: manualName }}
        saving={creating}
        onSubmit={createFromDialog}
      />
    </div>
  );
}
