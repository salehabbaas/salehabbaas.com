"use client";

import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";

import { AdminFieldLabel } from "@/components/admin/admin-field-label";
import { CompanyPicker } from "@/components/admin/company/company-picker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { auth, db, storage } from "@/lib/firebase/client";
import { slugify } from "@/lib/utils";

type Direction = "asc" | "desc";

export type CmsField = {
  key: string;
  label: string;
  type: "text" | "textarea" | "number" | "url" | "datetime" | "select" | "tags" | "image" | "slug" | "company";
  required?: boolean;
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
  autoFrom?: string;
};

export type CmsColumn = {
  key: string;
  label: string;
  render?: (row: Record<string, unknown>) => ReactNode;
};

type CmsCollectionManagerProps = {
  title: string;
  description: string;
  collectionName: string;
  orderField: string;
  orderDirection?: Direction;
  defaultForm: Record<string, unknown>;
  fields: CmsField[];
  columns: CmsColumn[];
  statusField?: string;
  slugField?: string;
  getSiteHref?: (row: Record<string, unknown>) => string | null;
  ownerId?: string;
  filters?: Array<{
    field: string;
    operator: "<" | "<=" | "==" | "!=" | ">=" | ">" | "array-contains" | "in" | "array-contains-any" | "not-in";
    value: unknown;
  }>;
};

function rowWithId(id: string, data: Record<string, unknown>) {
  return { id, ...(data ?? {}) } as Record<string, unknown>;
}

function normalizeFieldValue(field: CmsField, value: unknown): unknown {
  if (field.type === "tags") {
    return Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];
  }
  if (field.type === "number") {
    return typeof value === "number" ? value : Number(value ?? 0);
  }
  if (typeof value === "string") return value;
  return value ?? "";
}

function fieldValueAsString(value: unknown) {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return "";
}

export function CmsCollectionManager({
  title,
  description,
  collectionName,
  orderField,
  orderDirection = "asc",
  defaultForm,
  fields,
  columns,
  statusField,
  slugField,
  getSiteHref,
  ownerId,
  filters = []
}: CmsCollectionManagerProps) {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [mediaAssets, setMediaAssets] = useState<Array<{ id: string; name: string; url: string }>>([]);
  const [form, setForm] = useState<Record<string, unknown>>(defaultForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [step, setStep] = useState<"form" | "preview">("form");
  const [previewOnly, setPreviewOnly] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [uploadingField, setUploadingField] = useState<string>("");
  const [authReady, setAuthReady] = useState(false);
  const [authUid, setAuthUid] = useState<string | null>(() => (auth ? auth.currentUser?.uid ?? null : null));

  useEffect(() => {
    if (!auth) {
      setAuthReady(true);
      setAuthUid(null);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthUid(user?.uid ?? null);
      setAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!authReady || !authUid) {
      setRows([]);
      return;
    }

    const constraints = [...filters.map((item) => where(item.field, item.operator, item.value)), orderBy(orderField, orderDirection)];
    const snapshotQuery = query(collection(db, collectionName), ...constraints);
    const unsub = onSnapshot(
      snapshotQuery,
      (snap) => {
        setRows(snap.docs.map((document) => rowWithId(document.id, document.data() as Record<string, unknown>)));
      },
      (error) => {
        setRows([]);
        setMessage(error.code === "permission-denied" ? "You do not have permission to view this collection." : error.message);
      }
    );
    return () => unsub();
  }, [authReady, authUid, collectionName, filters, orderDirection, orderField]);

  useEffect(() => {
    if (!authReady || !authUid) {
      setMediaAssets([]);
      return;
    }
    if (!fields.some((field) => field.type === "image")) return;
    const unsub = onSnapshot(
      query(collection(db, "mediaAssets"), orderBy("createdAt", "desc")),
      (snap) => {
        setMediaAssets(
          snap.docs.slice(0, 120).map((document) => ({
            id: document.id,
            name: String(document.data().name ?? "media"),
            url: String(document.data().url ?? "")
          }))
        );
      },
      (error) => {
        setMediaAssets([]);
        setMessage(error.code === "permission-denied" ? "You do not have permission to view media assets." : error.message);
      }
    );
    return () => unsub();
  }, [authReady, authUid, fields]);

  const visibleRows = useMemo(
    () => rows.filter((row) => (showArchived ? true : row.isDeleted !== true)),
    [rows, showArchived]
  );

  const suggestions = useMemo(() => {
    const map: Record<string, string[]> = {};
    fields.forEach((field) => {
      if (field.type === "tags") {
        const values = new Set<string>();
        rows.forEach((row) => {
          const tags = row[field.key];
          if (!Array.isArray(tags)) return;
          tags.forEach((item) => {
            if (typeof item === "string" && item.trim()) values.add(item.trim());
          });
        });
        map[field.key] = Array.from(values).slice(0, 60);
        return;
      }
      if (field.type !== "text" && field.type !== "url" && field.type !== "slug") return;
      const values = new Set<string>();
      rows.forEach((row) => {
        const value = row[field.key];
        if (typeof value === "string" && value.trim()) values.add(value.trim());
      });
      map[field.key] = Array.from(values).slice(0, 30);
    });
    return map;
  }, [fields, rows]);

  function resetForm() {
    setForm(defaultForm);
    setEditingId(null);
    setErrors({});
    setStep("form");
    setPreviewOnly(false);
  }

  function openAddDialog() {
    resetForm();
    setDialogOpen(true);
  }

  function openEditDialog(row: Record<string, unknown>, options?: { previewOnly?: boolean }) {
    const nextForm: Record<string, unknown> = {};
    fields.forEach((field) => {
      nextForm[field.key] = normalizeFieldValue(field, row[field.key]);
      if (field.type === "company") {
        nextForm[`${field.key}Id`] = fieldValueAsString(row[`${field.key}Id`]);
      }
    });
    setForm({
      ...defaultForm,
      ...nextForm
    });
    setEditingId(String(row.id));
    setErrors({});
    setStep(options?.previewOnly ? "preview" : "form");
    setPreviewOnly(Boolean(options?.previewOnly));
    setDialogOpen(true);
  }

  function openPreviewDialog(row: Record<string, unknown>) {
    openEditDialog(row, { previewOnly: true });
  }

  function setFieldValue(field: CmsField, value: unknown) {
    setForm((prev) => {
      const next = { ...prev, [field.key]: value };
      if (field.type !== "slug") {
        const slugFieldConfig = fields.find((item) => item.type === "slug" && item.autoFrom === field.key);
        if (slugFieldConfig && !String(prev[slugFieldConfig.key] ?? "").trim()) {
          next[slugFieldConfig.key] = slugify(String(value ?? ""));
        }
      }
      return next;
    });
    setErrors((prev) => ({ ...prev, [field.key]: "" }));
  }

  function validate() {
    const nextErrors: Record<string, string> = {};
    fields.forEach((field) => {
      const value = form[field.key];
      if (!field.required) return;
      if (field.type === "tags") {
        const list = Array.isArray(value) ? value : [];
        if (!list.length) nextErrors[field.key] = `${field.label} is required`;
        return;
      }
      if (field.type === "number") {
        if (!Number.isFinite(Number(value))) nextErrors[field.key] = `${field.label} must be a number`;
        return;
      }
      if (field.type === "company") {
        if (!String(value ?? "").trim()) {
          nextErrors[field.key] = `${field.label} is required`;
        }
        return;
      }
      if (!String(value ?? "").trim()) {
        nextErrors[field.key] = `${field.label} is required`;
      }
    });

    if (slugField) {
      const slugValue = String(form[slugField] ?? "").trim();
      if (slugValue) {
        const duplicate = rows.some((row) => {
          if (String(row.id) === editingId) return false;
          if (row.isDeleted === true) return false;
          return String(row[slugField] ?? "").trim() === slugValue;
        });
        if (duplicate) nextErrors[slugField] = "Slug must be unique";
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function archiveRow(row: Record<string, unknown>) {
    const id = String(row.id);
    await updateDoc(doc(db, collectionName, id), {
      isDeleted: true,
      deletedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    setMessage("Item archived.");
  }

  async function restoreRow(row: Record<string, unknown>) {
    const id = String(row.id);
    await updateDoc(doc(db, collectionName, id), {
      isDeleted: false,
      deletedAt: null,
      updatedAt: serverTimestamp()
    });
    setMessage("Item restored.");
  }

  async function togglePublish(row: Record<string, unknown>) {
    if (!statusField) return;
    const id = String(row.id);
    const current = String(row[statusField] ?? defaultForm[statusField] ?? "draft");
    const next = current === "published" ? "hidden" : "published";
    await updateDoc(doc(db, collectionName, id), {
      [statusField]: next,
      updatedAt: serverTimestamp()
    });
    setMessage(next === "published" ? "Item published." : "Item hidden.");
  }

  async function uploadImage(fieldKey: string, file: File) {
    setUploadingField(fieldKey);
    setMessage("");
    try {
      const path = `media/${Date.now()}-${file.name}`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, file, { contentType: file.type });
      const url = await getDownloadURL(storageRef);
      await addDoc(collection(db, "mediaAssets"), {
        name: file.name,
        url,
        path,
        size: file.size,
        contentType: file.type,
        createdAt: serverTimestamp()
      });
      setFieldValue({ key: fieldKey, label: fieldKey, type: "image" }, url);
      setMessage("Image uploaded.");
    } finally {
      setUploadingField("");
    }
  }

  async function onSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (previewOnly) return;
    if (step === "form") {
      if (!validate()) return;
      setStep("preview");
      return;
    }

    const payload: Record<string, unknown> = {};
    fields.forEach((field) => {
      const value = form[field.key];
      if (field.type === "tags") {
        payload[field.key] = Array.isArray(value) ? value : [];
        return;
      }
      if (field.type === "number") {
        payload[field.key] = Number(value ?? 0);
        return;
      }
      if (field.type === "company") {
        payload[field.key] = String(value ?? "").trim();
        payload[`${field.key}Id`] = String(form[`${field.key}Id`] ?? "").trim();
        return;
      }
      if (field.type === "slug") {
        payload[field.key] = slugify(String(value ?? ""));
        return;
      }
      payload[field.key] = value;
    });

    if (collectionName === "blogPosts") {
      const status = String(payload.status ?? "draft");
      if (status === "published" && !String(payload.publishedAt ?? "").trim()) {
        payload.publishedAt = new Date().toISOString();
      }
      if (status !== "published") {
        payload.publishedAt = "";
      }
    }

    payload.updatedAt = serverTimestamp();
    if (typeof payload.isDeleted !== "boolean") {
      payload.isDeleted = false;
    }

    if (editingId) {
      await updateDoc(doc(db, collectionName, editingId), payload);
      setMessage("Item updated.");
    } else {
      await addDoc(collection(db, collectionName), {
        ...payload,
        createdAt: serverTimestamp()
      });
      setMessage("Item created.");
    }

    setDialogOpen(false);
    resetForm();
  }

  const previewSiteHref = getSiteHref
    ? getSiteHref({
        id: editingId ?? "",
        ...form
      })
    : null;

  return (
    <div className="admin-workspace space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
          {message ? <p className="text-sm text-primary">{message}</p> : null}
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={openAddDialog}>Add</Button>
            <Button variant="outline" onClick={() => setShowArchived((prev) => !prev)}>
              {showArchived ? "Hide Archived" : "Show Archived"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">{visibleRows.length} item(s)</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((column) => (
                  <TableHead key={column.key}>{column.label}</TableHead>
                ))}
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleRows.map((row) => (
                <TableRow key={String(row.id)}>
                  {columns.map((column) => (
                    <TableCell key={`${String(row.id)}-${column.key}`}>
                      {column.render ? column.render(row) : String(row[column.key] ?? "-")}
                    </TableCell>
                  ))}
                  <TableCell className="space-x-2">
                    <Button size="sm" variant="outline" onClick={() => openPreviewDialog(row)}>
                      Preview
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => openEditDialog(row)}>
                      Edit
                    </Button>
                    {getSiteHref ? (
                      (() => {
                        const siteHref = getSiteHref(row);
                        if (!siteHref) return null;
                        return (
                          <Button size="sm" variant="outline" asChild>
                            <a href={siteHref} target="_blank" rel="noreferrer">
                              Open Site
                            </a>
                          </Button>
                        );
                      })()
                    ) : null}
                    {statusField ? (
                      <Button size="sm" variant="outline" onClick={() => togglePublish(row)}>
                        {String(row[statusField] ?? "") === "published" ? "Hide" : "Publish"}
                      </Button>
                    ) : null}
                    {row.isDeleted === true ? (
                      <Button size="sm" variant="outline" onClick={() => restoreRow(row)}>
                        Restore
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => archiveRow(row)}>
                        Archive
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {previewOnly ? "Preview Item" : editingId ? "Edit Item" : "Add Item"}
            </DialogTitle>
            <DialogDescription>
              {previewOnly
                ? "Read-only preview from current record."
                : `Step ${step === "form" ? "1" : "2"} of 2: ${step === "form" ? "Fill fields and validate." : "Preview then confirm save."}`}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={onSave} className="space-y-4">
            {step === "form" ? (
              <div className="space-y-3">
                {fields.map((field) => {
                  const suggestionId = `suggestion-${collectionName}-${field.key}`;
                  const suggestionsForField = suggestions[field.key] ?? [];
                  const value = form[field.key];

                  if (field.type === "textarea") {
                    return (
                      <div key={field.key} className="space-y-2">
                        <AdminFieldLabel label={field.label} required={field.required} />
                        <Textarea
                          value={fieldValueAsString(value)}
                          onChange={(event) => setFieldValue(field, event.target.value)}
                          placeholder={field.placeholder}
                        />
                        {errors[field.key] ? <p className="text-xs text-destructive">{errors[field.key]}</p> : null}
                      </div>
                    );
                  }

                  if (field.type === "select") {
                    return (
                      <div key={field.key} className="space-y-2">
                        <AdminFieldLabel label={field.label} required={field.required} />
                        <Select
                          value={fieldValueAsString(value)}
                          onChange={(event) => setFieldValue(field, event.target.value)}
                        >
                          {field.options?.map((option) => (
                            <option key={`${field.key}-${option.value}`} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </Select>
                        {errors[field.key] ? <p className="text-xs text-destructive">{errors[field.key]}</p> : null}
                      </div>
                    );
                  }

                  if (field.type === "tags") {
                    return (
                      <div key={field.key} className="space-y-2">
                        <AdminFieldLabel label={field.label} required={field.required} helper="Comma separated list." />
                        <Input
                          value={Array.isArray(value) ? value.join(", ") : ""}
                          onChange={(event) =>
                            setFieldValue(
                              field,
                              event.target.value
                                .split(",")
                                .map((item) => item.trim())
                                .filter(Boolean)
                            )
                          }
                          placeholder={field.placeholder || "Comma separated"}
                          list={suggestionsForField.length ? suggestionId : undefined}
                        />
                        {suggestionsForField.length ? (
                          <datalist id={suggestionId}>
                            {suggestionsForField.map((item) => (
                              <option key={item} value={item} />
                            ))}
                          </datalist>
                        ) : null}
                        {errors[field.key] ? <p className="text-xs text-destructive">{errors[field.key]}</p> : null}
                      </div>
                    );
                  }

                  if (field.type === "image") {
                    return (
                      <div key={field.key} className="space-y-2">
                        <AdminFieldLabel label={field.label} required={field.required} />
                        <Input
                          value={fieldValueAsString(value)}
                          onChange={(event) => setFieldValue(field, event.target.value)}
                          placeholder={field.placeholder || "https://..."}
                          list={suggestionsForField.length ? suggestionId : undefined}
                        />
                        <div className="space-y-2">
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={(event) => {
                              const file = event.target.files?.[0];
                              if (!file) return;
                              void uploadImage(field.key, file);
                            }}
                          />
                          <p className="text-xs text-muted-foreground">
                            {uploadingField === field.key ? "Uploading selected file..." : "Select an image file to upload directly."}
                          </p>
                        </div>
                        <Select
                          value=""
                          onChange={(event) => {
                            if (!event.target.value) return;
                            setFieldValue(field, event.target.value);
                          }}
                        >
                          <option value="">Choose from media library</option>
                          {mediaAssets.map((asset) => (
                            <option key={asset.id} value={asset.url}>
                              {asset.name}
                            </option>
                          ))}
                        </Select>
                        {fieldValueAsString(value) ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={fieldValueAsString(value)} alt={field.label} className="h-28 w-full rounded-lg border border-border/70 object-cover" />
                        ) : null}
                        {errors[field.key] ? <p className="text-xs text-destructive">{errors[field.key]}</p> : null}
                      </div>
                    );
                  }

                  if (field.type === "company") {
                    if (!ownerId) {
                      return (
                        <div key={field.key} className="space-y-2">
                          <AdminFieldLabel label={field.label} required={field.required} />
                          <Input
                            value={fieldValueAsString(value)}
                            onChange={(event) => setFieldValue(field, event.target.value)}
                            placeholder={field.placeholder || "Company"}
                          />
                        </div>
                      );
                    }

                    return (
                      <div key={field.key} className="space-y-2">
                        <AdminFieldLabel label={field.label} required={field.required} />
                        <CompanyPicker
                          ownerId={ownerId}
                          companyId={fieldValueAsString(form[`${field.key}Id`])}
                          companyName={fieldValueAsString(value)}
                          inputId={`${collectionName}-${field.key}`}
                          required={field.required}
                          placeholder={field.placeholder || "Type company name"}
                          onSelect={(company) => {
                            setForm((prev) => ({
                              ...prev,
                              [field.key]: company.name,
                              [`${field.key}Id`]: company.id
                            }));
                            setErrors((prev) => ({ ...prev, [field.key]: "" }));
                          }}
                          onNameChange={(name) => {
                            setForm((prev) => ({
                              ...prev,
                              [field.key]: name,
                              [`${field.key}Id`]: ""
                            }));
                          }}
                        />
                        {errors[field.key] ? <p className="text-xs text-destructive">{errors[field.key]}</p> : null}
                      </div>
                    );
                  }

                  return (
                    <div key={field.key} className="space-y-2">
                      <AdminFieldLabel label={field.label} required={field.required} />
                      <Input
                        type={
                          field.type === "number"
                            ? "number"
                            : field.type === "datetime"
                              ? "datetime-local"
                              : field.type === "url"
                                ? "url"
                                : "text"
                        }
                        value={fieldValueAsString(value)}
                        onChange={(event) => {
                          if (field.type === "number") {
                            setFieldValue(field, Number(event.target.value || 0));
                            return;
                          }
                          if (field.type === "slug") {
                            setFieldValue(field, slugify(event.target.value));
                            return;
                          }
                          setFieldValue(field, event.target.value);
                        }}
                        placeholder={field.placeholder}
                        list={suggestionsForField.length ? suggestionId : undefined}
                      />
                      {suggestionsForField.length ? (
                        <datalist id={suggestionId}>
                          {suggestionsForField.map((item) => (
                            <option key={item} value={item} />
                          ))}
                        </datalist>
                      ) : null}
                      {errors[field.key] ? <p className="text-xs text-destructive">{errors[field.key]}</p> : null}
                    </div>
                  );
                })}
              </div>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Preview</CardTitle>
                  <CardDescription>Review values before confirming.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {fields.map((field) => {
                    const value = form[field.key];
                    return (
                      <div key={`preview-${field.key}`} className="rounded-lg border border-border/70 bg-card/70 p-3">
                        <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">{field.label}</p>
                        {field.type === "image" && fieldValueAsString(value) ? (
                          <div className="space-y-2">
                            <p className="text-sm break-all">{fieldValueAsString(value)}</p>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={fieldValueAsString(value)} alt={field.label} className="h-28 w-full rounded-lg border border-border/70 object-cover" />
                          </div>
                        ) : (
                          <p className="mt-1 break-words">
                            {field.type === "tags"
                              ? Array.isArray(value)
                                ? value.join(", ")
                                : ""
                              : typeof value === "number"
                                ? String(value)
                                : fieldValueAsString(value) || "-"}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}

            {previewOnly ? (
              <div className="flex items-center justify-between gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDialogOpen(false);
                    resetForm();
                  }}
                >
                  Close
                </Button>
                <div className="flex items-center gap-2">
                  {previewSiteHref ? (
                    <Button type="button" variant="outline" asChild>
                      <a href={previewSiteHref} target="_blank" rel="noreferrer">
                        Open Site
                      </a>
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    onClick={() => {
                      setPreviewOnly(false);
                      setStep("form");
                    }}
                  >
                    Edit
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2">
                {step === "preview" ? (
                  <Button type="button" variant="outline" onClick={() => setStep("form")}>
                    Back to Form
                  </Button>
                ) : (
                  <span />
                )}
                <div className="flex items-center gap-2">
                  {step === "preview" && previewSiteHref ? (
                    <Button type="button" variant="outline" asChild>
                      <a href={previewSiteHref} target="_blank" rel="noreferrer">
                        Open Site
                      </a>
                    </Button>
                  ) : null}
                  <Button type="submit">{step === "form" ? "Continue to Preview" : editingId ? "Save Update" : "Create Item"}</Button>
                </div>
              </div>
            )}
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
