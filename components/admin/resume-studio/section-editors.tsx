"use client";

/**
 * Structured form-based section editors for the Resume Studio.
 * Each section kind gets its own dedicated editor with proper input fields,
 * drag-to-reorder, and real-time updates.
 */

import { useCallback } from "react";
import { GripVertical, Plus, Trash2, ExternalLink } from "lucide-react";
import type { ResumeSectionBlock } from "@/types/resume-studio";
import { cn } from "@/lib/utils";

// ─── Generic helpers ─────────────────────────────────────────────────────────

type InputProps = {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  className?: string;
};

function FieldInput({ label, value, onChange, placeholder, type = "text", required, className }: InputProps) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-8 px-2.5 rounded-md border border-slate-200 bg-white text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 transition"
      />
    </div>
  );
}

function FieldTextarea({ label, value, onChange, placeholder, rows = 3, className }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; rows?: number; className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</label>
      <textarea
        value={value}
        rows={rows}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="px-2.5 py-2 rounded-md border border-slate-200 bg-white text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 transition resize-none leading-relaxed"
      />
    </div>
  );
}

function SectionCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("bg-white border border-slate-200 rounded-xl p-4 shadow-sm", className)}>
      {children}
    </div>
  );
}

function AddItemButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium mt-2 px-1 py-1 rounded-md hover:bg-blue-50 transition"
    >
      <Plus className="w-4 h-4" />
      {label}
    </button>
  );
}

function RemoveButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="ml-auto flex-shrink-0 p-1.5 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 transition"
      title="Remove"
    >
      <Trash2 className="w-3.5 h-3.5" />
    </button>
  );
}

// ─── Bullets editor ───────────────────────────────────────────────────────────

function BulletsEditor({ bullets, onChange }: { bullets: string[]; onChange: (b: string[]) => void }) {
  const update = (i: number, val: string) => {
    const next = [...bullets];
    next[i] = val;
    onChange(next);
  };
  const remove = (i: number) => onChange(bullets.filter((_, idx) => idx !== i));
  const add = () => onChange([...bullets, ""]);

  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Bullet Points</label>
      <div className="flex flex-col gap-1.5">
        {bullets.map((b, i) => (
          <div key={i} className="flex items-start gap-1.5">
            <span className="mt-2 text-slate-300 text-xs select-none">•</span>
            <input
              value={b}
              onChange={e => update(i, e.target.value)}
              placeholder="Describe an achievement with metrics..."
              className="flex-1 h-8 px-2 rounded border border-slate-200 bg-white text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 transition"
            />
            <button onClick={() => remove(i)} className="mt-1 p-1 rounded text-slate-300 hover:text-red-400 transition">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
      <AddItemButton label="Add bullet" onClick={add} />
    </div>
  );
}

// ─── HEADER ──────────────────────────────────────────────────────────────────

export function HeaderSectionEditor({ section, onChange }: { section: ResumeSectionBlock; onChange: (data: ResumeSectionBlock["data"]) => void }) {
  const d = section.data as Record<string, string>;
  const set = (key: string) => (val: string) => onChange({ ...d, [key]: val });

  const links = Array.isArray(d.links) ? d.links as unknown as Array<{ label: string; url: string }> : [];
  const setLinks = (newLinks: Array<{ label: string; url: string }>) => onChange({ ...d, links: newLinks as unknown as string });

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <FieldInput label="Full Name" value={d.fullName ?? ""} onChange={set("fullName")} placeholder="Your Name" required className="col-span-2" />
        <FieldInput label="Headline / Title" value={d.headline ?? ""} onChange={set("headline")} placeholder="Software Engineer" className="col-span-2" />
        <FieldInput label="Email" value={d.email ?? ""} onChange={set("email")} placeholder="you@example.com" type="email" required />
        <FieldInput label="Phone" value={d.phone ?? ""} onChange={set("phone")} placeholder="+1 (555) 000-0000" />
        <FieldInput label="Location" value={d.location ?? ""} onChange={set("location")} placeholder="City, Province/State" className="col-span-2" />
      </div>

      <div>
        <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2 block">Links (LinkedIn, GitHub, Portfolio…)</label>
        <div className="flex flex-col gap-2">
          {links.map((link, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                value={link.label}
                onChange={e => {
                  const next = [...links];
                  next[i] = { ...next[i], label: e.target.value };
                  setLinks(next);
                }}
                placeholder="Label (e.g. LinkedIn)"
                className="w-28 h-8 px-2 rounded border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400"
              />
              <input
                value={link.url}
                onChange={e => {
                  const next = [...links];
                  next[i] = { ...next[i], url: e.target.value };
                  setLinks(next);
                }}
                placeholder="https://..."
                className="flex-1 h-8 px-2 rounded border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400"
              />
              <button onClick={() => setLinks(links.filter((_, idx) => idx !== i))} className="p-1 rounded text-slate-300 hover:text-red-400 transition">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          <AddItemButton label="Add link" onClick={() => setLinks([...links, { label: "", url: "" }])} />
        </div>
      </div>
    </div>
  );
}

// ─── SUMMARY ─────────────────────────────────────────────────────────────────

export function SummarySectionEditor({ section, onChange }: { section: ResumeSectionBlock; onChange: (data: ResumeSectionBlock["data"]) => void }) {
  const d = section.data as Record<string, string>;
  const text = d.text ?? "";
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;

  return (
    <div className="flex flex-col gap-2">
      <FieldTextarea
        label="Professional Summary"
        value={text}
        onChange={v => onChange({ ...d, text: v })}
        placeholder="Write a concise 3-5 sentence summary of your experience, key skills, and what makes you a strong candidate..."
        rows={5}
      />
      <div className="flex justify-end">
        <span className={cn("text-xs", wordCount > 100 ? "text-amber-500" : "text-slate-400")}>
          {wordCount} / 80 words recommended
        </span>
      </div>
    </div>
  );
}

// ─── EXPERIENCE ───────────────────────────────────────────────────────────────

type ExperienceItem = {
  id?: string;
  company: string;
  role: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  current?: boolean;
  bullets: string[];
};

export function ExperienceSectionEditor({ section, onChange }: { section: ResumeSectionBlock; onChange: (data: ResumeSectionBlock["data"]) => void }) {
  const d = section.data as Record<string, unknown>;
  const items: ExperienceItem[] = Array.isArray(d.items) ? d.items as ExperienceItem[] : [];

  const setItems = useCallback((newItems: ExperienceItem[]) => {
    onChange({ ...d, items: newItems });
  }, [d, onChange]);

  const updateItem = (i: number, updates: Partial<ExperienceItem>) => {
    const next = [...items];
    next[i] = { ...next[i], ...updates };
    setItems(next);
  };

  const addItem = () => {
    setItems([...items, { company: "", role: "", bullets: [""] }]);
  };

  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));

  return (
    <div className="flex flex-col gap-4">
      {items.map((item, i) => (
        <SectionCard key={i} className="relative">
          <div className="flex items-start justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Position {i + 1}</span>
            <RemoveButton onClick={() => removeItem(i)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FieldInput label="Company" value={item.company} onChange={v => updateItem(i, { company: v })} placeholder="Acme Corp" required className="col-span-2" />
            <FieldInput label="Job Title" value={item.role} onChange={v => updateItem(i, { role: v })} placeholder="Senior Software Engineer" required className="col-span-2" />
            <FieldInput label="Location" value={item.location ?? ""} onChange={v => updateItem(i, { location: v })} placeholder="Remote / Ottawa, ON" className="col-span-2" />
            <FieldInput label="Start Date" value={item.startDate ?? ""} onChange={v => updateItem(i, { startDate: v })} placeholder="Jan 2022" />
            <div className="flex flex-col gap-1">
              <FieldInput
                label="End Date"
                value={item.current ? "Present" : (item.endDate ?? "")}
                onChange={v => updateItem(i, { endDate: v, current: false })}
                placeholder="Dec 2024"
              />
              <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer hover:text-slate-700 mt-0.5">
                <input
                  type="checkbox"
                  checked={!!item.current}
                  onChange={e => updateItem(i, { current: e.target.checked, endDate: e.target.checked ? "" : item.endDate })}
                  className="rounded border-slate-300 text-blue-500"
                />
                Currently here
              </label>
            </div>
          </div>
          <div className="mt-3">
            <BulletsEditor bullets={item.bullets ?? []} onChange={b => updateItem(i, { bullets: b })} />
          </div>
        </SectionCard>
      ))}
      <AddItemButton label="Add position" onClick={addItem} />
    </div>
  );
}

// ─── EDUCATION ────────────────────────────────────────────────────────────────

type EducationItem = {
  school: string;
  degree: string;
  field?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  current?: boolean;
  gpa?: string;
  details?: string;
};

export function EducationSectionEditor({ section, onChange }: { section: ResumeSectionBlock; onChange: (data: ResumeSectionBlock["data"]) => void }) {
  const d = section.data as Record<string, unknown>;
  const items: EducationItem[] = Array.isArray(d.items) ? d.items as EducationItem[] : [];

  const setItems = useCallback((newItems: EducationItem[]) => onChange({ ...d, items: newItems }), [d, onChange]);
  const updateItem = (i: number, updates: Partial<EducationItem>) => {
    const next = [...items];
    next[i] = { ...next[i], ...updates };
    setItems(next);
  };

  return (
    <div className="flex flex-col gap-4">
      {items.map((item, i) => (
        <SectionCard key={i}>
          <div className="flex items-start justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Degree {i + 1}</span>
            <RemoveButton onClick={() => setItems(items.filter((_, idx) => idx !== i))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FieldInput label="Institution" value={item.school} onChange={v => updateItem(i, { school: v })} placeholder="University of Ottawa" required className="col-span-2" />
            <FieldInput label="Degree" value={item.degree} onChange={v => updateItem(i, { degree: v })} placeholder="Bachelor of Science" required />
            <FieldInput label="Field of Study" value={item.field ?? ""} onChange={v => updateItem(i, { field: v })} placeholder="Computer Science" />
            <FieldInput label="Start Date" value={item.startDate ?? ""} onChange={v => updateItem(i, { startDate: v })} placeholder="Sep 2018" />
            <FieldInput label="End Date" value={item.endDate ?? ""} onChange={v => updateItem(i, { endDate: v })} placeholder="May 2022" />
            <FieldInput label="GPA (optional)" value={item.gpa ?? ""} onChange={v => updateItem(i, { gpa: v })} placeholder="3.8 / 4.0" />
            <FieldTextarea label="Details / Honors" value={item.details ?? ""} onChange={v => updateItem(i, { details: v })} placeholder="Dean's List, relevant coursework, thesis..." rows={2} className="col-span-2" />
          </div>
        </SectionCard>
      ))}
      <AddItemButton label="Add degree" onClick={() => setItems([...items, { school: "", degree: "" }])} />
    </div>
  );
}

// ─── SKILLS ───────────────────────────────────────────────────────────────────

type SkillItem = { name: string; level?: string };

const SKILL_LEVELS = ["Expert", "Advanced", "Intermediate", "Beginner", ""];

export function SkillsSectionEditor({ section, onChange }: { section: ResumeSectionBlock; onChange: (data: ResumeSectionBlock["data"]) => void }) {
  const d = section.data as Record<string, unknown>;
  const items: SkillItem[] = Array.isArray(d.items) ? d.items as SkillItem[] : [];

  const setItems = useCallback((newItems: SkillItem[]) => onChange({ ...d, items: newItems }), [d, onChange]);
  const updateItem = (i: number, updates: Partial<SkillItem>) => {
    const next = [...items];
    next[i] = { ...next[i], ...updates };
    setItems(next);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="grid gap-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              value={item.name}
              onChange={e => updateItem(i, { name: e.target.value })}
              placeholder="Skill name (e.g. Python, React, SQL)"
              className="flex-1 h-8 px-2.5 rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 transition"
            />
            <select
              value={item.level ?? ""}
              onChange={e => updateItem(i, { level: e.target.value })}
              className="w-32 h-8 px-2 rounded-md border border-slate-200 bg-white text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition"
            >
              {SKILL_LEVELS.map(l => <option key={l} value={l}>{l || "No level"}</option>)}
            </select>
            <button onClick={() => setItems(items.filter((_, idx) => idx !== i))} className="p-1 rounded text-slate-300 hover:text-red-400 transition">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
      <AddItemButton label="Add skill" onClick={() => setItems([...items, { name: "" }])} />
      {items.length > 0 && (
        <p className="text-xs text-slate-400 mt-1">
          Tip: Add 8–15 skills. Prioritize those mentioned in the job description.
        </p>
      )}
    </div>
  );
}

// ─── PROJECTS ─────────────────────────────────────────────────────────────────

type ProjectItem = {
  name: string;
  link?: string;
  description?: string;
  bullets: string[];
  techStack?: string;
  startDate?: string;
  endDate?: string;
};

export function ProjectsSectionEditor({ section, onChange }: { section: ResumeSectionBlock; onChange: (data: ResumeSectionBlock["data"]) => void }) {
  const d = section.data as Record<string, unknown>;
  const items: ProjectItem[] = Array.isArray(d.items) ? d.items as ProjectItem[] : [];

  const setItems = useCallback((newItems: ProjectItem[]) => onChange({ ...d, items: newItems }), [d, onChange]);
  const updateItem = (i: number, updates: Partial<ProjectItem>) => {
    const next = [...items];
    next[i] = { ...next[i], ...updates };
    setItems(next);
  };

  return (
    <div className="flex flex-col gap-4">
      {items.map((item, i) => (
        <SectionCard key={i}>
          <div className="flex items-start justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Project {i + 1}</span>
            <RemoveButton onClick={() => setItems(items.filter((_, idx) => idx !== i))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FieldInput label="Project Name" value={item.name} onChange={v => updateItem(i, { name: v })} placeholder="My Project" required className="col-span-2" />
            <div className="col-span-2 flex items-end gap-2">
              <FieldInput label="Link (GitHub / Live)" value={item.link ?? ""} onChange={v => updateItem(i, { link: v })} placeholder="https://github.com/..." className="flex-1" />
              {item.link && (
                <a href={item.link} target="_blank" rel="noopener noreferrer" className="mb-0.5 p-1.5 rounded border border-slate-200 text-slate-400 hover:text-blue-500 transition">
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
            <FieldInput label="Tech Stack" value={item.techStack ?? ""} onChange={v => updateItem(i, { techStack: v })} placeholder="React, Node.js, PostgreSQL" className="col-span-2" />
            <FieldInput label="Start Date" value={item.startDate ?? ""} onChange={v => updateItem(i, { startDate: v })} placeholder="Jan 2023" />
            <FieldInput label="End Date" value={item.endDate ?? ""} onChange={v => updateItem(i, { endDate: v })} placeholder="Present" />
            <FieldTextarea label="Description" value={item.description ?? ""} onChange={v => updateItem(i, { description: v })} placeholder="Brief description of what this project does and your role..." className="col-span-2" rows={2} />
          </div>
          <div className="mt-3">
            <BulletsEditor bullets={item.bullets ?? []} onChange={b => updateItem(i, { bullets: b })} />
          </div>
        </SectionCard>
      ))}
      <AddItemButton label="Add project" onClick={() => setItems([...items, { name: "", bullets: [] }])} />
    </div>
  );
}

// ─── LANGUAGES ───────────────────────────────────────────────────────────────

type LanguageItem = { name: string; level?: string };
const LANGUAGE_LEVELS = ["Native", "Fluent", "Advanced", "Intermediate", "Basic", ""];

export function LanguagesSectionEditor({ section, onChange }: { section: ResumeSectionBlock; onChange: (data: ResumeSectionBlock["data"]) => void }) {
  const d = section.data as Record<string, unknown>;
  const items: LanguageItem[] = Array.isArray(d.items) ? d.items as LanguageItem[] : [];

  const setItems = useCallback((newItems: LanguageItem[]) => onChange({ ...d, items: newItems }), [d, onChange]);
  const updateItem = (i: number, updates: Partial<LanguageItem>) => {
    const next = [...items];
    next[i] = { ...next[i], ...updates };
    setItems(next);
  };

  return (
    <div className="flex flex-col gap-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            value={item.name}
            onChange={e => updateItem(i, { name: e.target.value })}
            placeholder="Language (e.g. Arabic, French)"
            className="flex-1 h-8 px-2.5 rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition"
          />
          <select
            value={item.level ?? ""}
            onChange={e => updateItem(i, { level: e.target.value })}
            className="w-36 h-8 px-2 rounded-md border border-slate-200 bg-white text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition"
          >
            {LANGUAGE_LEVELS.map(l => <option key={l} value={l}>{l || "Proficiency"}</option>)}
          </select>
          <button onClick={() => setItems(items.filter((_, idx) => idx !== i))} className="p-1 rounded text-slate-300 hover:text-red-400 transition">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
      <AddItemButton label="Add language" onClick={() => setItems([...items, { name: "" }])} />
    </div>
  );
}

// ─── AWARDS ──────────────────────────────────────────────────────────────────

type AwardItem = { title: string; issuer?: string; year?: string; description?: string };

export function AwardsSectionEditor({ section, onChange }: { section: ResumeSectionBlock; onChange: (data: ResumeSectionBlock["data"]) => void }) {
  const d = section.data as Record<string, unknown>;
  const items: AwardItem[] = Array.isArray(d.items) ? d.items as AwardItem[] : [];

  const setItems = useCallback((newItems: AwardItem[]) => onChange({ ...d, items: newItems }), [d, onChange]);
  const updateItem = (i: number, updates: Partial<AwardItem>) => {
    const next = [...items];
    next[i] = { ...next[i], ...updates };
    setItems(next);
  };

  return (
    <div className="flex flex-col gap-4">
      {items.map((item, i) => (
        <SectionCard key={i}>
          <div className="flex items-start justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Award {i + 1}</span>
            <RemoveButton onClick={() => setItems(items.filter((_, idx) => idx !== i))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FieldInput label="Award Title" value={item.title} onChange={v => updateItem(i, { title: v })} placeholder="Excellence Award" required className="col-span-2" />
            <FieldInput label="Issuing Organization" value={item.issuer ?? ""} onChange={v => updateItem(i, { issuer: v })} placeholder="Company / Institution" />
            <FieldInput label="Year" value={item.year ?? ""} onChange={v => updateItem(i, { year: v })} placeholder="2023" />
            <FieldTextarea label="Description (optional)" value={item.description ?? ""} onChange={v => updateItem(i, { description: v })} placeholder="Brief description of the achievement..." rows={2} className="col-span-2" />
          </div>
        </SectionCard>
      ))}
      <AddItemButton label="Add award" onClick={() => setItems([...items, { title: "" }])} />
    </div>
  );
}

// ─── VOLUNTEERING ─────────────────────────────────────────────────────────────

type VolunteerItem = { organization: string; role: string; startDate?: string; endDate?: string; details?: string };

export function VolunteeringSectionEditor({ section, onChange }: { section: ResumeSectionBlock; onChange: (data: ResumeSectionBlock["data"]) => void }) {
  const d = section.data as Record<string, unknown>;
  const items: VolunteerItem[] = Array.isArray(d.items) ? d.items as VolunteerItem[] : [];

  const setItems = useCallback((newItems: VolunteerItem[]) => onChange({ ...d, items: newItems }), [d, onChange]);
  const updateItem = (i: number, updates: Partial<VolunteerItem>) => {
    const next = [...items];
    next[i] = { ...next[i], ...updates };
    setItems(next);
  };

  return (
    <div className="flex flex-col gap-4">
      {items.map((item, i) => (
        <SectionCard key={i}>
          <div className="flex items-start justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Role {i + 1}</span>
            <RemoveButton onClick={() => setItems(items.filter((_, idx) => idx !== i))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FieldInput label="Organization" value={item.organization} onChange={v => updateItem(i, { organization: v })} placeholder="Red Cross" required className="col-span-2" />
            <FieldInput label="Role" value={item.role} onChange={v => updateItem(i, { role: v })} placeholder="Volunteer Coordinator" required className="col-span-2" />
            <FieldInput label="Start Date" value={item.startDate ?? ""} onChange={v => updateItem(i, { startDate: v })} placeholder="Jan 2020" />
            <FieldInput label="End Date" value={item.endDate ?? ""} onChange={v => updateItem(i, { endDate: v })} placeholder="Present" />
            <FieldTextarea label="Details" value={item.details ?? ""} onChange={v => updateItem(i, { details: v })} placeholder="What you did and impact..." rows={2} className="col-span-2" />
          </div>
        </SectionCard>
      ))}
      <AddItemButton label="Add role" onClick={() => setItems([...items, { organization: "", role: "" }])} />
    </div>
  );
}

// ─── INTERESTS ────────────────────────────────────────────────────────────────

export function InterestsSectionEditor({ section, onChange }: { section: ResumeSectionBlock; onChange: (data: ResumeSectionBlock["data"]) => void }) {
  const d = section.data as Record<string, unknown>;
  const interests: string[] = Array.isArray(d.items) ? d.items as string[] : [];

  const set = (newItems: string[]) => onChange({ ...d, items: newItems });

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Interests (one per line)</label>
      {interests.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            value={item}
            onChange={e => {
              const next = [...interests];
              next[i] = e.target.value;
              set(next);
            }}
            placeholder="e.g. Open Source, Rock Climbing, Photography"
            className="flex-1 h-8 px-2.5 rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition"
          />
          <button onClick={() => set(interests.filter((_, idx) => idx !== i))} className="p-1 rounded text-slate-300 hover:text-red-400 transition">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
      <AddItemButton label="Add interest" onClick={() => set([...interests, ""])} />
    </div>
  );
}

// ─── CUSTOM ───────────────────────────────────────────────────────────────────

export function CustomSectionEditor({ section, onChange }: { section: ResumeSectionBlock; onChange: (data: ResumeSectionBlock["data"]) => void }) {
  const d = section.data as Record<string, string>;
  const set = (key: string) => (val: string) => onChange({ ...d, [key]: val });

  return (
    <div className="flex flex-col gap-3">
      <FieldInput label="Section Title" value={d.title ?? ""} onChange={set("title")} placeholder="Certifications, Publications, etc." />
      <FieldTextarea label="Content" value={d.text ?? ""} onChange={set("text")} placeholder="Add your content here..." rows={6} />
    </div>
  );
}

// ─── PUBLICATIONS ─────────────────────────────────────────────────────────────

type PublicationItem = { title: string; venue?: string; year?: string; details?: string; link?: string };

export function PublicationsSectionEditor({ section, onChange }: { section: ResumeSectionBlock; onChange: (data: ResumeSectionBlock["data"]) => void }) {
  const d = section.data as Record<string, unknown>;
  const items: PublicationItem[] = Array.isArray(d.items) ? d.items as PublicationItem[] : [];

  const setItems = useCallback((newItems: PublicationItem[]) => onChange({ ...d, items: newItems }), [d, onChange]);
  const updateItem = (i: number, updates: Partial<PublicationItem>) => {
    const next = [...items];
    next[i] = { ...next[i], ...updates };
    setItems(next);
  };

  return (
    <div className="flex flex-col gap-4">
      {items.map((item, i) => (
        <SectionCard key={i}>
          <div className="flex items-start justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Publication {i + 1}</span>
            <RemoveButton onClick={() => setItems(items.filter((_, idx) => idx !== i))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FieldInput label="Title" value={item.title} onChange={v => updateItem(i, { title: v })} placeholder="Paper or article title" required className="col-span-2" />
            <FieldInput label="Venue / Journal" value={item.venue ?? ""} onChange={v => updateItem(i, { venue: v })} placeholder="Nature, JAMA, IEEE..." />
            <FieldInput label="Year" value={item.year ?? ""} onChange={v => updateItem(i, { year: v })} placeholder="2023" />
            <FieldInput label="Link (DOI / URL)" value={item.link ?? ""} onChange={v => updateItem(i, { link: v })} placeholder="https://doi.org/..." className="col-span-2" />
            <FieldTextarea label="Details" value={item.details ?? ""} onChange={v => updateItem(i, { details: v })} placeholder="Co-authors, citations, abstract excerpt..." rows={2} className="col-span-2" />
          </div>
        </SectionCard>
      ))}
      <AddItemButton label="Add publication" onClick={() => setItems([...items, { title: "" }])} />
    </div>
  );
}

// ─── DISPATCHER ──────────────────────────────────────────────────────────────

/**
 * Picks the right section editor based on section.kind.
 */
export function SectionEditor({ section, onChange }: {
  section: ResumeSectionBlock;
  onChange: (data: ResumeSectionBlock["data"]) => void;
}) {
  switch (section.kind) {
    case "header":       return <HeaderSectionEditor section={section} onChange={onChange} />;
    case "summary":      return <SummarySectionEditor section={section} onChange={onChange} />;
    case "experience":   return <ExperienceSectionEditor section={section} onChange={onChange} />;
    case "education":    return <EducationSectionEditor section={section} onChange={onChange} />;
    case "skills":       return <SkillsSectionEditor section={section} onChange={onChange} />;
    case "projects":     return <ProjectsSectionEditor section={section} onChange={onChange} />;
    case "languages":    return <LanguagesSectionEditor section={section} onChange={onChange} />;
    case "awards":       return <AwardsSectionEditor section={section} onChange={onChange} />;
    case "volunteering": return <VolunteeringSectionEditor section={section} onChange={onChange} />;
    case "interests":    return <InterestsSectionEditor section={section} onChange={onChange} />;
    case "publications": return <PublicationsSectionEditor section={section} onChange={onChange} />;
    case "custom":
    default:             return <CustomSectionEditor section={section} onChange={onChange} />;
  }
}
