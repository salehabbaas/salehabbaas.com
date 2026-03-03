"use client";

import { FormEvent, useEffect, useState } from "react";

import { AdminFieldLabel } from "@/components/admin/admin-field-label";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DEFAULT_COMPANY_TYPE_OPTIONS } from "@/lib/company-directory/utils";
import type { CompanyUpsertInput } from "@/lib/company-directory/client";

type CompanyEditorDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  submitLabel?: string;
  initialValue?: Partial<CompanyUpsertInput>;
  saving?: boolean;
  onSubmit: (value: CompanyUpsertInput) => Promise<void>;
};

const emptyValue: CompanyUpsertInput = {
  name: "",
  city: "",
  companyType: "other",
  careersUrl: "",
  websiteUrl: "",
  notes: ""
};

export function CompanyEditorDialog({
  open,
  onOpenChange,
  title = "Create Company",
  description = "Add a reusable company profile for job tracking and cross-system linking.",
  submitLabel = "Save Company",
  initialValue,
  saving,
  onSubmit
}: CompanyEditorDialogProps) {
  const [form, setForm] = useState<CompanyUpsertInput>(emptyValue);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setForm({
      ...emptyValue,
      ...initialValue,
      companyType: initialValue?.companyType?.trim() || "other"
    });
    setError("");
  }, [initialValue, open]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = form.name.trim();
    if (!name) {
      setError("Company name is required");
      return;
    }

    setError("");
    await onSubmit({
      name,
      city: form.city?.trim() || "",
      companyType: form.companyType?.trim() || "other",
      careersUrl: form.careersUrl?.trim() || "",
      websiteUrl: form.websiteUrl?.trim() || "",
      notes: form.notes?.trim() || ""
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <form className="space-y-3" onSubmit={submit}>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <AdminFieldLabel label="Company Name" required />
              <Input value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} required />
            </div>

            <div className="space-y-2">
              <AdminFieldLabel label="City" />
              <Input value={form.city || ""} onChange={(event) => setForm((prev) => ({ ...prev, city: event.target.value }))} placeholder="Remote" />
            </div>

            <div className="space-y-2">
              <AdminFieldLabel label="Company Type" />
              <Select
                value={form.companyType || "other"}
                onChange={(event) => setForm((prev) => ({ ...prev, companyType: event.target.value }))}
              >
                {DEFAULT_COMPANY_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-2">
              <AdminFieldLabel label="Careers URL" />
              <Input
                type="url"
                value={form.careersUrl || ""}
                onChange={(event) => setForm((prev) => ({ ...prev, careersUrl: event.target.value }))}
                placeholder="https://company.com/careers"
              />
            </div>

            <div className="space-y-2">
              <AdminFieldLabel label="Website URL" />
              <Input
                type="url"
                value={form.websiteUrl || ""}
                onChange={(event) => setForm((prev) => ({ ...prev, websiteUrl: event.target.value }))}
                placeholder="https://company.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <AdminFieldLabel label="Notes" />
            <Textarea rows={4} value={form.notes || ""} onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))} />
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving..." : submitLabel}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
