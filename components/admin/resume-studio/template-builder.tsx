"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { Save } from "lucide-react";

import { ResumeCanvas } from "@/components/admin/resume-studio/resume-canvas";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { BUILT_IN_RESUME_TEMPLATES, SECTION_CATALOG, createDefaultResumeDocument, getBuiltInTemplateById } from "@/lib/resume-studio/defaults";
import { db, storage } from "@/lib/firebase/client";
import { createMarginBox, resolveMarginBox } from "@/lib/resume-studio/normalize";
import type { ResumeSectionKind, ResumeTemplateCategory, ResumeTemplateRecord } from "@/types/resume-studio";

const categories: ResumeTemplateCategory[] = ["single_column", "two_column", "sidebar", "compact", "executive", "modern", "academic"];
const templateRegions = ["header", "main", "sidebar", "footer"] as const;
type TemplateRegion = (typeof templateRegions)[number];
const FONT_OPTIONS = [
  "Arial",
  "Calibri",
  "Inter",
  "Arimo",
  "Helvetica",
  "Verdana",
  "Georgia",
  "Times New Roman",
  "Merriweather",
  "Source Sans Pro",
  "Poppins",
  "Lato",
  "Roboto",
  "Cambria"
];
const COLOR_SWATCHES = ["#0f172a", "#1d4ed8", "#0f766e", "#b45309", "#9333ea", "#be123c", "#111827", "#334155"];

const structureSections: Array<{ kind: ResumeSectionKind; label: string; description: string }> = [
  { kind: "header", label: "Header", description: "Name, headline, and contact information." },
  ...SECTION_CATALOG
];

function hexToRgb(hex: string) {
  const cleaned = hex.replace("#", "").trim();
  if (cleaned.length !== 6) return null;
  const r = Number.parseInt(cleaned.slice(0, 2), 16);
  const g = Number.parseInt(cleaned.slice(2, 4), 16);
  const b = Number.parseInt(cleaned.slice(4, 6), 16);
  if ([r, g, b].some((value) => Number.isNaN(value))) return null;
  return { r, g, b };
}

function contrastRatio(foregroundHex: string, backgroundHex: string) {
  const fg = hexToRgb(foregroundHex);
  const bg = hexToRgb(backgroundHex);
  if (!fg || !bg) return 0;

  const normalize = (channel: number) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  const luminance = (rgb: { r: number; g: number; b: number }) =>
    0.2126 * normalize(rgb.r) + 0.7152 * normalize(rgb.g) + 0.0722 * normalize(rgb.b);

  const l1 = luminance(fg);
  const l2 = luminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return Math.round(((lighter + 0.05) / (darker + 0.05)) * 100) / 100;
}

async function generatePreviewBlob(template: ResumeTemplateRecord) {
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 1600;
  const context = canvas.getContext("2d");
  if (!context) return null;

  context.fillStyle = template.styleTokens.colors.background;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.strokeStyle = "#e2e8f0";
  context.lineWidth = 4;
  context.strokeRect(60, 60, canvas.width - 120, canvas.height - 120);

  context.fillStyle = template.styleTokens.colors.accent;
  context.fillRect(100, 110, canvas.width - 200, 90);

  context.fillStyle = "#ffffff";
  context.font = "bold 38px Arimo";
  context.fillText(template.name, 130, 165);

  context.fillStyle = template.styleTokens.colors.text;
  context.font = "28px Arimo";
  context.fillText(template.category.replace(/_/g, " "), 130, 220);

  const leftWidth = template.constraints.supportsTwoColumn ? (canvas.width - 240) * 0.68 : canvas.width - 240;
  const rightX = 140 + leftWidth + 40;

  let y = 280;
  for (let index = 0; index < 8; index += 1) {
    context.fillStyle = index % 2 === 0 ? "#f8fafc" : "#eef2ff";
    context.fillRect(120, y, leftWidth, 92);
    context.fillStyle = template.styleTokens.colors.accent;
    context.fillRect(136, y + 16, 220, 14);
    context.fillStyle = template.styleTokens.colors.text;
    context.fillRect(136, y + 44, leftWidth - 32, 10);
    context.fillRect(136, y + 64, leftWidth - 160, 10);
    y += 116;
  }

  if (template.constraints.supportsTwoColumn) {
    let sideY = 280;
    for (let index = 0; index < 10; index += 1) {
      context.fillStyle = "#f8fafc";
      context.fillRect(rightX, sideY, 240, 58);
      context.fillStyle = template.styleTokens.colors.accent;
      context.fillRect(rightX + 10, sideY + 14, 140, 10);
      context.fillStyle = template.styleTokens.colors.text;
      context.fillRect(rightX + 10, sideY + 32, 180, 8);
      sideY += 70;
    }
  }

  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png", 0.92);
  });
}

function defaultTemplate(ownerId: string): ResumeTemplateRecord {
  const base = getBuiltInTemplateById("classic-single-column");
  return {
    ...base,
    id: "new",
    ownerId,
    name: "New Template",
    source: "custom"
  };
}

export function TemplateBuilder({
  ownerId,
  initialTemplate,
  templateId
}: {
  ownerId: string;
  initialTemplate?: ResumeTemplateRecord | null;
  templateId: string;
}) {
  const router = useRouter();
  const [template, setTemplate] = useState<ResumeTemplateRecord>(() => {
    if (!initialTemplate) return defaultTemplate(ownerId);
    return {
      ...initialTemplate,
      ownerId: initialTemplate.ownerId || ownerId,
      source: initialTemplate.source || "custom"
    };
  });
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [lockedMargins, setLockedMargins] = useState(true);
  const [rulerSnap, setRulerSnap] = useState<2 | 4>(2);
  const [presets, setPresets] = useState<Array<{ name: string; template: ResumeTemplateRecord }>>([]);

  function patchTemplate(next: (current: ResumeTemplateRecord) => ResumeTemplateRecord) {
    setTemplate((current) => next(current));
  }

  const regionBySection = useMemo(() => {
    const map = new Map<ResumeSectionKind, TemplateRegion>();
    for (const region of template.layout.regions) {
      const regionName = region.region as TemplateRegion;
      for (const kind of region.sectionSlots) {
        map.set(kind, regionName);
      }
    }
    return map;
  }, [template.layout.regions]);

  function patchRegionConfig(regionName: TemplateRegion, patch: { columns?: string; gap?: number }) {
    patchTemplate((current) => ({
      ...current,
      layout: {
        ...current.layout,
        regions: current.layout.regions.map((region) =>
          region.region === regionName
            ? {
                ...region,
                columns: patch.columns ?? region.columns,
                gap: patch.gap ?? region.gap
              }
            : region
        )
      }
    }));
  }

  function patchDefaultMarginBox(side: "top" | "right" | "bottom" | "left", value: number) {
    patchTemplate((current) => {
      const currentBox = resolveMarginBox({
        marginBox: current.paper.defaultMarginBox,
        margins: current.paper.defaultMargins,
        fallback: 22
      });
      const clamped = Math.max(0, value);
      const nextBox = lockedMargins
        ? createMarginBox(clamped)
        : {
            ...currentBox,
            [side]: clamped
          };
      const average = (nextBox.top + nextBox.right + nextBox.bottom + nextBox.left) / 4;
      return {
        ...current,
        paper: {
          ...current.paper,
          defaultMarginBox: nextBox,
          defaultMargins: Math.round(average * 100) / 100
        }
      };
    });
  }

  function resetToTemplateDefaults() {
    const defaults = getBuiltInTemplateById(template.id);
    patchTemplate((current) => {
      const base = defaults ?? getBuiltInTemplateById("classic-single-column");
      return {
        ...base,
        id: current.id,
        ownerId: current.ownerId,
        name: current.name,
        source: current.source,
        previewImagePath: current.previewImagePath
      };
    });
    setStatus("Template reset to defaults.");
  }

  function createPresetFromCurrent() {
    const name = window.prompt("Preset name", `${template.name} preset`)?.trim();
    if (!name) return;
    setPresets((current) => [...current, { name, template: JSON.parse(JSON.stringify(template)) as ResumeTemplateRecord }]);
    setStatus(`Preset created: ${name}`);
  }

  function applyPreset(name: string) {
    const found = presets.find((item) => item.name === name);
    if (!found) return;
    setTemplate({
      ...found.template,
      id: template.id,
      ownerId: template.ownerId,
      name: template.name,
      source: template.source,
      previewImagePath: template.previewImagePath
    });
    setStatus(`Applied preset: ${name}`);
  }

  function patchSectionRegion(kind: ResumeSectionKind, nextRegion: TemplateRegion) {
    setTemplate((current) => ({
      ...current,
      layout: {
        ...current.layout,
        regions: current.layout.regions.map((region) => {
          const withoutKind = region.sectionSlots.filter((slot) => slot !== kind);
          if (region.region !== nextRegion) {
            return {
              ...region,
              sectionSlots: withoutKind
            };
          }
          return {
            ...region,
            sectionSlots: [...withoutKind, kind]
          };
        })
      }
    }));
  }

  const sampleDoc = useMemo(() => {
    const data = createDefaultResumeDocument({
      ownerId,
      templateId: template.id,
      title: "Template Preview Resume"
    });
    return {
      id: "preview",
      ...data,
      page: {
        ...data.page,
        size: "A4" as const,
        margins: template.paper.defaultMargins,
        marginBox: resolveMarginBox({
          marginBox: template.paper.defaultMarginBox,
          margins: template.paper.defaultMargins,
          fallback: 22
        }),
        sectionSpacing: template.styleTokens.spacing.section
      },
      style: {
        ...data.style,
        primaryColor: template.styleTokens.colors.text,
        accentColor: template.styleTokens.colors.accent,
        background: template.styleTokens.colors.background,
        fontFamily: template.styleTokens.fonts.body,
        inheritTemplateColors: true,
        inheritTemplateFonts: true,
        lineHeight: template.styleTokens.spacing.line
      }
    };
  }, [
    ownerId,
    template.id,
    template.paper.defaultMarginBox,
    template.paper.defaultMargins,
    template.styleTokens.colors.accent,
    template.styleTokens.colors.background,
    template.styleTokens.colors.text,
    template.styleTokens.fonts.body,
    template.styleTokens.spacing.line,
    template.styleTokens.spacing.section
  ]);

  async function saveTemplate() {
    setSaving(true);
    setStatus("");

    try {
      const previewBlob = await generatePreviewBlob(template);
      let previewPath = template.previewImagePath;

      const targetId = templateId === "new" || BUILT_IN_RESUME_TEMPLATES.some((item) => item.id === templateId)
        ? `tpl-${Date.now()}`
        : templateId;

      if (previewBlob) {
        const storagePath = `resume-templates/${ownerId}/${targetId}/preview.png`;
        const storageRef = ref(storage, storagePath);
        await uploadBytes(storageRef, previewBlob, { contentType: "image/png" });
        previewPath = storagePath;
        try {
          await getDownloadURL(storageRef);
        } catch {
          // Access is controlled by auth rules; path is enough for storage retrieval.
        }
      }

      await setDoc(
        doc(db, "resumeTemplates", targetId),
        {
          ...template,
          ownerId,
          id: undefined,
          source: template.source === "built_in" ? "custom" : template.source,
          previewImagePath: previewPath,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );

      setStatus("Template saved.");
      router.replace(`/admin/resume-studio/templates/${targetId}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to save template");
    } finally {
      setSaving(false);
    }
  }

  const defaultMarginBox = resolveMarginBox({
    marginBox: template.paper.defaultMarginBox,
    margins: template.paper.defaultMargins,
    fallback: 22
  });
  const textContrast = contrastRatio(template.styleTokens.colors.text, template.styleTokens.colors.background);

  return (
    <div className="admin-workspace space-y-6">
      <Card>
        <CardHeader className="gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle>Template Builder</CardTitle>
              <CardDescription>Create and configure renderable resume templates.</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={resetToTemplateDefaults}>
                Reset Defaults
              </Button>
              <Button variant="outline" onClick={createPresetFromCurrent}>
                Create Preset
              </Button>
              <Button onClick={saveTemplate} disabled={saving}>
                <Save className="h-4 w-4" />
                {saving ? "Saving..." : "Save Template"}
              </Button>
            </div>
          </div>
          {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}
        </CardHeader>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[420px_minmax(0,1fr)]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Identity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Input value={template.name} onChange={(event) => patchTemplate((current) => ({ ...current, name: event.target.value }))} />
              <Select value={template.category} onChange={(event) => patchTemplate((current) => ({ ...current, category: event.target.value as ResumeTemplateCategory }))}>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category.replace(/_/g, " ")}
                  </option>
                ))}
              </Select>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <Input value="A4 (Fixed)" readOnly />
                <Input value={`Avg margin ${template.paper.defaultMargins ?? 22}px`} readOnly />
              </div>
              <label className="inline-flex items-center gap-2 text-sm">
                <input type="checkbox" checked={lockedMargins} onChange={(event) => setLockedMargins(event.target.checked)} />
                Lock margin sides
              </label>
              <div className="space-y-2 rounded-xl border border-border/70 p-3">
                <div className="flex items-center justify-between text-sm font-medium">
                  <span>Page Margins</span>
                  <span>{Math.round(defaultMarginBox.top)}</span>
                </div>
                <input
                  type="range"
                  min={6}
                  max={40}
                  step={1}
                  value={defaultMarginBox.top}
                  onChange={(event) => patchDefaultMarginBox("top", Number(event.target.value || 22))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground"><span>narrow</span><span>wide</span></div>
              </div>
              {presets.length ? (
                <Select value="" onChange={(event) => applyPreset(event.target.value)}>
                  <option value="">Apply preset...</option>
                  {presets.map((preset) => (
                    <option key={preset.name} value={preset.name}>
                      {preset.name}
                    </option>
                  ))}
                </Select>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Layout Grid</CardTitle>
              <CardDescription>Grid columns, rows, region spacing, and section structure mapping.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Input
                value={template.layout.grid.columns}
                placeholder="Grid columns (e.g., 1fr or 1.8fr 1fr)"
                onChange={(event) =>
                  setTemplate((current) => ({
                    ...current,
                    layout: {
                      ...current.layout,
                      grid: {
                        ...current.layout.grid,
                        columns: event.target.value
                      }
                    }
                  }))
                }
              />
              <Input
                value={template.layout.grid.rows}
                placeholder="Grid rows (e.g., auto 1fr auto)"
                onChange={(event) =>
                  setTemplate((current) => ({
                    ...current,
                    layout: {
                      ...current.layout,
                      grid: {
                        ...current.layout.grid,
                        rows: event.target.value
                      }
                    }
                  }))
                }
              />
              <Input
                type="number"
                value={template.layout.grid.gap}
                placeholder="Grid gap"
                onChange={(event) =>
                  setTemplate((current) => ({
                    ...current,
                    layout: {
                      ...current.layout,
                      grid: {
                        ...current.layout.grid,
                        gap: Number(event.target.value || 12)
                      }
                    }
                  }))
                }
              />
              <div className="space-y-2 rounded-xl border border-border/70 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Region controls</p>
                {templateRegions.map((region) => {
                  const config = template.layout.regions.find((entry) => entry.region === region);
                  return (
                    <div key={region} className="grid grid-cols-[90px_1fr_92px] items-center gap-2">
                      <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">{region}</p>
                      <Input
                        value={config?.columns ?? "1fr"}
                        placeholder="columns"
                        onChange={(event) => patchRegionConfig(region, { columns: event.target.value })}
                      />
                      <Input
                        type="number"
                        value={config?.gap ?? 8}
                        placeholder="gap"
                        onChange={(event) => patchRegionConfig(region, { gap: Number(event.target.value || 8) })}
                      />
                    </div>
                  );
                })}
              </div>

              <div className="space-y-2 rounded-xl border border-border/70 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Section structure</p>
                {structureSections.map((entry) => (
                  <div key={entry.kind} className="grid grid-cols-[1fr_130px] items-center gap-2">
                    <div>
                      <p className="text-sm font-medium">{entry.label}</p>
                      <p className="text-xs text-muted-foreground">{entry.description}</p>
                    </div>
                    <Select
                      value={regionBySection.get(entry.kind) ?? "main"}
                      onChange={(event) => patchSectionRegion(entry.kind, (event.target.value as TemplateRegion) || "main")}
                    >
                      <option value="header">Header</option>
                      <option value="main">Main</option>
                      <option value="sidebar">Sidebar</option>
                      <option value="footer">Footer</option>
                    </Select>
                  </div>
                ))}
              </div>

              <div className="space-y-2 rounded-xl border border-border/70 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Page Break Rules</p>
                <Input
                  type="number"
                  value={template.layout.pageBreak.minLinesPerBlock}
                  placeholder="Minimum lines per block"
                  onChange={(event) =>
                    patchTemplate((current) => ({
                      ...current,
                      layout: {
                        ...current.layout,
                        pageBreak: {
                          ...current.layout.pageBreak,
                          minLinesPerBlock: Math.max(1, Number(event.target.value || 1))
                        }
                      }
                    }))
                  }
                />
                <Input
                  value={template.layout.pageBreak.avoidSplitKinds.join(", ")}
                  placeholder="Avoid split kinds (comma separated)"
                  onChange={(event) =>
                    patchTemplate((current) => ({
                      ...current,
                      layout: {
                        ...current.layout,
                        pageBreak: {
                          ...current.layout.pageBreak,
                          avoidSplitKinds: event.target.value
                            .split(",")
                            .map((item) => item.trim())
                            .filter(Boolean) as ResumeSectionKind[]
                        }
                      }
                    }))
                  }
                />
                <Input
                  value={template.layout.pageBreak.preferSplitKinds.join(", ")}
                  placeholder="Prefer split kinds (comma separated)"
                  onChange={(event) =>
                    patchTemplate((current) => ({
                      ...current,
                      layout: {
                        ...current.layout,
                        pageBreak: {
                          ...current.layout.pageBreak,
                          preferSplitKinds: event.target.value
                            .split(",")
                            .map((item) => item.trim())
                            .filter(Boolean) as ResumeSectionKind[]
                        }
                      }
                    }))
                  }
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Style Tokens</CardTitle>
              <CardDescription>
                Contrast ratio {textContrast}:1 {textContrast < 4.5 ? "(low for body text)" : "(pass)"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <Select value={template.styleTokens.fonts.heading} onChange={(event) => patchTemplate((current) => ({ ...current, styleTokens: { ...current.styleTokens, fonts: { ...current.styleTokens.fonts, heading: event.target.value } } }))}>
                  {FONT_OPTIONS.map((font) => (
                    <option key={`h-${font}`} value={font}>{font}</option>
                  ))}
                </Select>
                <Select value={template.styleTokens.fonts.body} onChange={(event) => patchTemplate((current) => ({ ...current, styleTokens: { ...current.styleTokens, fonts: { ...current.styleTokens.fonts, body: event.target.value } } }))}>
                  {FONT_OPTIONS.map((font) => (
                    <option key={`b-${font}`} value={font}>{font}</option>
                  ))}
                </Select>
                <Select value={template.styleTokens.iconStyle} onChange={(event) => patchTemplate((current) => ({ ...current, styleTokens: { ...current.styleTokens, iconStyle: event.target.value as ResumeTemplateRecord["styleTokens"]["iconStyle"] } }))}>
                  <option value="none">No icons</option>
                  <option value="line">Line icons</option>
                  <option value="solid">Solid icons</option>
                </Select>
                <Input type="number" value={template.styleTokens.borderRadius} placeholder="Border radius" onChange={(event) => patchTemplate((current) => ({ ...current, styleTokens: { ...current.styleTokens, borderRadius: Number(event.target.value || 8) } }))} />
              </div>
              <div className="space-y-3 rounded-xl border border-border/70 p-3">
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.12em] text-muted-foreground">
                  <span>Font Size</span>
                  <span>{template.styleTokens.sizes.body.toFixed(1)} body</span>
                </div>
                <input type="range" min={24} max={44} step={1} value={template.styleTokens.sizes.title} onChange={(event) => patchTemplate((current) => ({ ...current, styleTokens: { ...current.styleTokens, sizes: { ...current.styleTokens.sizes, title: Number(event.target.value || 31) } } }))} className="w-full" />
                <input type="range" min={9} max={18} step={0.5} value={template.styleTokens.sizes.heading} onChange={(event) => patchTemplate((current) => ({ ...current, styleTokens: { ...current.styleTokens, sizes: { ...current.styleTokens.sizes, heading: Number(event.target.value || 12) } } }))} className="w-full" />
                <input type="range" min={8} max={14} step={0.1} value={template.styleTokens.sizes.body} onChange={(event) => patchTemplate((current) => ({ ...current, styleTokens: { ...current.styleTokens, sizes: { ...current.styleTokens.sizes, body: Number(event.target.value || 10.5) } } }))} className="w-full" />
                <input type="range" min={7} max={12} step={0.1} value={template.styleTokens.sizes.small} onChange={(event) => patchTemplate((current) => ({ ...current, styleTokens: { ...current.styleTokens, sizes: { ...current.styleTokens.sizes, small: Number(event.target.value || 9) } } }))} className="w-full" />
              </div>
              <div className="space-y-3 rounded-xl border border-border/70 p-3">
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.12em] text-muted-foreground">
                  <span>Spacing</span>
                  <span>section {template.styleTokens.spacing.section}</span>
                </div>
                <input type="range" min={6} max={24} step={1} value={template.styleTokens.spacing.section} onChange={(event) => patchTemplate((current) => ({ ...current, styleTokens: { ...current.styleTokens, spacing: { ...current.styleTokens.spacing, section: Number(event.target.value || 12) } } }))} className="w-full" />
                <input type="range" min={4} max={16} step={1} value={template.styleTokens.spacing.item} onChange={(event) => patchTemplate((current) => ({ ...current, styleTokens: { ...current.styleTokens, spacing: { ...current.styleTokens.spacing, item: Number(event.target.value || 8) } } }))} className="w-full" />
                <input type="range" min={1.1} max={1.9} step={0.05} value={template.styleTokens.spacing.line} onChange={(event) => patchTemplate((current) => ({ ...current, styleTokens: { ...current.styleTokens, spacing: { ...current.styleTokens.spacing, line: Number(event.target.value || 1.35) } } }))} className="w-full" />
              </div>
              <div className="space-y-2 rounded-xl border border-border/70 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Palette</p>
                <div className="flex flex-wrap gap-2">
                  {COLOR_SWATCHES.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className="h-8 w-8 rounded-full border border-border/70"
                      style={{ backgroundColor: color }}
                      onClick={() => patchTemplate((current) => ({ ...current, styleTokens: { ...current.styleTokens, colors: { ...current.styleTokens.colors, text: color, accent: color } } }))}
                    />
                  ))}
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <Input type="color" value={template.styleTokens.colors.text} onChange={(event) => patchTemplate((current) => ({ ...current, styleTokens: { ...current.styleTokens, colors: { ...current.styleTokens.colors, text: event.target.value } } }))} />
                  <Input type="color" value={template.styleTokens.colors.accent} onChange={(event) => patchTemplate((current) => ({ ...current, styleTokens: { ...current.styleTokens, colors: { ...current.styleTokens.colors, accent: event.target.value } } }))} />
                  <Input type="color" value={template.styleTokens.colors.muted} onChange={(event) => patchTemplate((current) => ({ ...current, styleTokens: { ...current.styleTokens, colors: { ...current.styleTokens.colors, muted: event.target.value } } }))} />
                  <Input type="color" value={template.styleTokens.colors.background} onChange={(event) => patchTemplate((current) => ({ ...current, styleTokens: { ...current.styleTokens, colors: { ...current.styleTokens.colors, background: event.target.value } } }))} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Constraints</CardTitle>
              <CardDescription>ATS and capability toggles.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <label className="inline-flex items-center gap-2"><input type="checkbox" checked={template.constraints.atsFriendly} onChange={(event) => setTemplate((current) => ({ ...current, constraints: { ...current.constraints, atsFriendly: event.target.checked } }))} /> ATS friendly</label>
              <label className="inline-flex items-center gap-2"><input type="checkbox" checked={template.constraints.supportsTwoColumn} onChange={(event) => setTemplate((current) => ({ ...current, constraints: { ...current.constraints, supportsTwoColumn: event.target.checked } }))} /> Supports two-column canvas</label>
              <label className="inline-flex items-center gap-2"><input type="checkbox" checked={template.constraints.supportsPhoto} onChange={(event) => setTemplate((current) => ({ ...current, constraints: { ...current.constraints, supportsPhoto: event.target.checked } }))} /> Supports photo</label>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Live Preview</CardTitle>
              <CardDescription>Preview using a sample resume dataset.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>Ruler snap</span>
                <Select value={String(rulerSnap)} onChange={(event) => setRulerSnap((Number(event.target.value) === 4 ? 4 : 2) as 2 | 4)}>
                  <option value="2">2px</option>
                  <option value="4">4px</option>
                </Select>
              </div>
              <div className="relative">
                <ResumeCanvas doc={sampleDoc} template={template} zoom={0.82} />
                <div
                  className="pointer-events-none absolute inset-4 rounded-3xl border border-dashed border-primary/30"
                  style={{
                    backgroundImage: `repeating-linear-gradient(to right, rgba(37,99,235,0.08) 0, rgba(37,99,235,0.08) 1px, transparent 1px, transparent ${rulerSnap * 4}px), repeating-linear-gradient(to bottom, rgba(37,99,235,0.06) 0, rgba(37,99,235,0.06) 1px, transparent 1px, transparent ${rulerSnap * 4}px)`
                  }}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{template.source === "built_in" ? "Built-in base" : template.source}</Badge>
            <Badge variant="outline">{template.paper.size}</Badge>
            {template.constraints.atsFriendly ? <Badge>ATS Friendly</Badge> : <Badge variant="secondary">Creative Mode</Badge>}
          </div>
        </div>
      </div>
    </div>
  );
}
