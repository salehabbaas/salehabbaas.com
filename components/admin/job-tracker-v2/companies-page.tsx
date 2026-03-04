"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Building2,
  ExternalLink,
  Globe,
  Link2,
  Loader2,
  NotebookPen,
  Plus,
  Radar,
  Save,
  Sparkles,
  Tags,
  TimerReset,
  Trash2
} from "lucide-react";

import { JobTrackerNav } from "@/components/admin/job-tracker-v2/job-tracker-nav";
import { formatDateTime } from "@/components/admin/job-tracker-v2/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  createCompanyCategory,
  createCompany,
  deleteCompany,
  seedCompanyCategoriesIfMissing,
  subscribeCompanies,
  subscribeCompanyCategories,
  updateCompany
} from "@/lib/job-tracker/client";
import type { CompanyCategoryRecord, CompanyRecord } from "@/types/job-tracker-system";

const emptyForm = {
  name: "",
  categoryId: "",
  websiteUrl: "",
  careerPageUrl: "",
  notes: "",
  watchEnabled: true,
  watchFrequency: "daily" as CompanyRecord["watchFrequency"]
};

export function JobTrackerCompaniesPage({ ownerId }: { ownerId: string }) {
  const [categories, setCategories] = useState<CompanyCategoryRecord[]>([]);
  const [companies, setCompanies] = useState<CompanyRecord[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingCompanyId, setEditingCompanyId] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [companyDialogOpen, setCompanyDialogOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [categorySaving, setCategorySaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    seedCompanyCategoriesIfMissing().catch(() => {
      // Non-blocking seeding.
    });

    const unsubCategories = subscribeCompanyCategories(
      (items) => {
        setCategories(items);
        setForm((current) => {
          if (current.categoryId || !items.length) return current;
          const other = items.find((item) => item.name.toLowerCase() === "other");
          return { ...current, categoryId: other?.id ?? items[0].id };
        });
      },
      (error) => setMessage(error.message)
    );

    const unsubCompanies = subscribeCompanies(ownerId, setCompanies, (error) => setMessage(error.message));

    return () => {
      unsubCategories();
      unsubCompanies();
    };
  }, [ownerId]);

  const categoryNameById = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((category) => map.set(category.id, category.name));
    return map;
  }, [categories]);

  const categoryUsageCount = useMemo(() => {
    const map = new Map<string, number>();
    companies.forEach((company) => {
      map.set(company.categoryId, (map.get(company.categoryId) ?? 0) + 1);
    });
    return map;
  }, [companies]);

  const defaultCategoryId = useMemo(() => {
    const other = categories.find((item) => item.name.toLowerCase() === "other");
    return other?.id ?? categories[0]?.id ?? "";
  }, [categories]);

  async function addCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCategorySaving(true);
    setMessage("");

    try {
      const newCategoryId = await createCompanyCategory(categoryName);
      setCategoryName("");
      setForm((current) => ({
        ...current,
        categoryId: current.categoryId || newCategoryId
      }));
      setMessage("Category added.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to create category.");
    } finally {
      setCategorySaving(false);
    }
  }

  async function seedDefaultCategories() {
    setCategorySaving(true);
    setMessage("");
    try {
      await seedCompanyCategoriesIfMissing();
      setMessage("Default categories seeded (if missing).");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to seed default categories.");
    } finally {
      setCategorySaving(false);
    }
  }

  async function saveCompany(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      if (!form.name.trim()) {
        setMessage("Company name is required.");
        setLoading(false);
        return;
      }
      if (!form.categoryId) {
        setMessage("Please select a company category.");
        setLoading(false);
        return;
      }

      if (editingCompanyId) {
        await updateCompany(editingCompanyId, form);
        setMessage("Company updated.");
      } else {
        await createCompany({
          userId: ownerId,
          name: form.name,
          categoryId: form.categoryId,
          websiteUrl: form.websiteUrl,
          careerPageUrl: form.careerPageUrl,
          notes: form.notes,
          watchEnabled: form.watchEnabled,
          watchFrequency: form.watchFrequency
        });
        setMessage("Company created.");
      }

      setForm({ ...emptyForm, categoryId: defaultCategoryId });
      setEditingCompanyId("");
      setCompanyDialogOpen(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save company.");
    } finally {
      setLoading(false);
    }
  }

  function startEdit(company: CompanyRecord) {
    setEditingCompanyId(company.id);
    setForm({
      name: company.name,
      categoryId: company.categoryId,
      websiteUrl: company.websiteUrl,
      careerPageUrl: company.careerPageUrl,
      notes: company.notes,
      watchEnabled: company.watchEnabled,
      watchFrequency: company.watchFrequency
    });
    setCompanyDialogOpen(true);
  }

  async function removeCompany(companyId: string) {
    if (!confirm("Delete this company?")) return;
    setLoading(true);
    setMessage("");
    try {
      await deleteCompany(companyId);
      setMessage("Company deleted.");
      if (editingCompanyId === companyId) {
        setEditingCompanyId("");
        setForm((current) => ({ ...emptyForm, categoryId: current.categoryId || defaultCategoryId }));
        setCompanyDialogOpen(false);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to delete company.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Companies</h1>
        <p className="text-sm text-muted-foreground">
          Manage tracked companies, categories, watched scans, and career-page redirect tracking.
        </p>
      </div>

      <JobTrackerNav />

      <Card className="overflow-hidden border-border/60 bg-card/70">
        <CardContent className="relative p-5">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsla(var(--warning),0.18),transparent_55%)]" />
          <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Quick actions</p>
              <p className="text-xs text-muted-foreground">
                Open forms only when needed. Keep the page clean and focused.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="cta"
                className="transition-all duration-300 hover:-translate-y-0.5"
                onClick={() => {
                  setEditingCompanyId("");
                  setForm({ ...emptyForm, categoryId: defaultCategoryId });
                  setCompanyDialogOpen(true);
                }}
              >
                <Plus className="h-4 w-4" />
                Add Company
              </Button>
              <Button
                type="button"
                variant="outline"
                className="transition-all duration-300 hover:-translate-y-0.5"
                onClick={() => setCategoryDialogOpen(true)}
              >
                <Tags className="h-4 w-4" />
                Manage Categories
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card/70">
        <CardHeader>
          <CardTitle>Tracked Companies</CardTitle>
          <CardDescription>{companies.length} companies in your tracker.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {companies.length === 0 ? (
            <p className="text-sm text-muted-foreground">No companies yet.</p>
          ) : (
            companies.map((company) => (
              <div key={company.id} className="rounded-xl border border-border/60 bg-background/30 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-medium text-foreground">{company.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      Category: {categoryNameById.get(company.categoryId) || "Uncategorized"}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{company.watchEnabled ? `Watching ${company.watchFrequency}` : "Watch off"}</Badge>
                    <Button size="sm" variant="outline" onClick={() => startEdit(company)}>
                      Edit
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => void removeCompany(company.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="mt-3 grid gap-2 text-xs text-muted-foreground md:grid-cols-2">
                  <p>Website: {company.websiteUrl || "-"}</p>
                  <p>Career Page: {company.careerPageUrl || "-"}</p>
                  <p>Last Checked: {formatDateTime(company.lastCheckedAt)}</p>
                  <p>Last Scan: {formatDateTime(company.lastScanAt)}</p>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {company.careerPageUrl ? (
                    <Link
                      href={`/r/company/${company.id}?source=open_button`}
                      className="inline-flex items-center gap-1 rounded-lg border border-warning/40 bg-warning/10 px-3 py-1 text-xs text-warning"
                      target="_blank"
                    >
                      Open Career Page
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  ) : null}
                  {company.websiteUrl ? (
                    <Link
                      href={company.websiteUrl}
                      className="inline-flex items-center gap-1 rounded-lg border border-border/60 px-3 py-1 text-xs text-muted-foreground"
                      target="_blank"
                    >
                      Open Website
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  ) : null}
                </div>

                {company.notes ? <p className="mt-3 text-sm text-muted-foreground">{company.notes}</p> : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
      <p className="text-xs text-muted-foreground">
        Redirect logging path: <code>/r/company/[companyId]</code> updates <code>lastCheckedAt</code> and writes <code>companyVisits</code>.
      </p>

      <Dialog
        open={companyDialogOpen}
        onOpenChange={(open) => {
          setCompanyDialogOpen(open);
          if (!open) {
            setEditingCompanyId("");
            setForm((current) => ({ ...emptyForm, categoryId: current.categoryId || defaultCategoryId }));
          }
        }}
      >
        <DialogContent className="max-w-3xl overflow-hidden border-border/70 bg-[linear-gradient(180deg,rgba(251,191,36,0.12),rgba(7,12,23,0.94)_32%)]">
          <DialogHeader className="rounded-2xl border border-warning/30 bg-warning/10 p-4">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-warning/35 bg-warning/15 px-3 py-1 text-[11px] uppercase tracking-wide text-warning">
              <Sparkles className="h-3.5 w-3.5" />
              Company Form
            </div>
            <DialogTitle className="pt-1">{editingCompanyId ? "Edit Company" : "Add Company"}</DialogTitle>
            <DialogDescription>
              Companies are first-class entities and power jobs, scanning, and reporting.
            </DialogDescription>
          </DialogHeader>

          <form className="grid gap-3 md:grid-cols-2" onSubmit={saveCompany}>
            <div className="relative">
              <Building2 className="pointer-events-none absolute z-10 left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-warning" />
              <Input
                className="pl-10"
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="Company name"
                required
              />
            </div>
            <div className="relative">
              <Tags className="pointer-events-none absolute z-10 left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-warning" />
              <Select
                className="pl-10"
                value={form.categoryId}
                onChange={(event) => setForm((current) => ({ ...current, categoryId: event.target.value }))}
                required
              >
                <option value="">Select category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="relative">
              <Globe className="pointer-events-none absolute z-10 left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-warning" />
              <Input
                className="pl-10"
                value={form.websiteUrl}
                onChange={(event) => setForm((current) => ({ ...current, websiteUrl: event.target.value }))}
                placeholder="Website URL"
              />
            </div>
            <div className="relative">
              <Link2 className="pointer-events-none absolute z-10 left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-warning" />
              <Input
                className="pl-10"
                value={form.careerPageUrl}
                onChange={(event) => setForm((current) => ({ ...current, careerPageUrl: event.target.value }))}
                placeholder="Career page URL"
              />
            </div>
            <div className="relative">
              <Radar className="pointer-events-none absolute z-10 left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-warning" />
              <Select
                className="pl-10"
                value={String(form.watchEnabled)}
                onChange={(event) => setForm((current) => ({ ...current, watchEnabled: event.target.value === "true" }))}
              >
                <option value="true">Watch enabled</option>
                <option value="false">Watch disabled</option>
              </Select>
            </div>
            <div className="relative">
              <TimerReset className="pointer-events-none absolute z-10 left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-warning" />
              <Select
                className="pl-10"
                value={form.watchFrequency}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    watchFrequency: event.target.value as CompanyRecord["watchFrequency"]
                  }))
                }
              >
                <option value="daily">Daily</option>
                <option value="twiceDaily">Twice Daily</option>
                <option value="weekly">Weekly</option>
              </Select>
            </div>
            <div className="md:col-span-2">
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/40 px-3 py-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                <NotebookPen className="h-3.5 w-3.5 text-warning" />
                Notes
              </div>
              <Textarea
                rows={4}
                className="border-border/70 bg-background/40"
                value={form.notes}
                onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                placeholder="Notes"
              />
            </div>

            <div className="md:col-span-2 flex flex-wrap gap-2">
              <Button type="submit" variant="cta" className="transition-all duration-300 hover:-translate-y-0.5" disabled={loading}>
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : editingCompanyId ? (
                  <Save className="mr-2 h-4 w-4" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                {editingCompanyId ? "Update Company" : "Add Company"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="transition-all duration-300 hover:-translate-y-0.5"
                onClick={() => {
                  setCompanyDialogOpen(false);
                  setEditingCompanyId("");
                  setForm((current) => ({ ...emptyForm, categoryId: current.categoryId || defaultCategoryId }));
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent className="max-w-2xl overflow-hidden border-border/70 bg-[linear-gradient(180deg,rgba(59,130,246,0.12),rgba(7,12,23,0.94)_35%)]">
          <DialogHeader className="rounded-2xl border border-accent/30 bg-accent/10 p-4">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-accent/35 bg-accent/10 px-3 py-1 text-[11px] uppercase tracking-wide text-accent-foreground">
              <Sparkles className="h-3.5 w-3.5" />
              Category Manager
            </div>
            <DialogTitle className="pt-1">Company Categories</DialogTitle>
            <DialogDescription>Define and manage categories used for company tracking.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <form className="flex flex-wrap items-center gap-2" onSubmit={addCategory}>
              <div className="relative min-w-[280px] flex-1">
                <Tags className="pointer-events-none absolute z-10 left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-accent-foreground/70" />
                <Input
                  value={categoryName}
                  onChange={(event) => setCategoryName(event.target.value)}
                  placeholder="Add category (e.g., Nonprofit, Education)"
                  className="max-w-md pl-10"
                />
              </div>
              <Button type="submit" variant="cta" className="transition-all duration-300 hover:-translate-y-0.5" disabled={categorySaving || !categoryName.trim()}>
                {categorySaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                Add Category
              </Button>
              <Button type="button" variant="outline" onClick={() => void seedDefaultCategories()} disabled={categorySaving}>
                Seed Default Categories
              </Button>
            </form>

            <div className="flex flex-wrap gap-2">
              {categories.length === 0 ? (
                <p className="text-sm text-muted-foreground">No categories yet. Add your first category.</p>
              ) : (
                categories.map((category) => (
                  <Badge
                    key={category.id}
                    variant="outline"
                    className="border-accent/40 bg-accent/10 text-foreground"
                  >
                    {category.name} ({categoryUsageCount.get(category.id) ?? 0})
                  </Badge>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
