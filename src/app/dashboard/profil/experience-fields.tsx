"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DESCRIPTION_MAX,
  EMPLOYMENT_TYPES,
  WORK_MODES,
  formatMonth,
  toMonthInput,
} from "@/lib/profile-sections";

export const SELECT_CLASS =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 md:text-sm dark:bg-input/30";

export type ExperienceRow = {
  id: string;
  position: number;
  is_visible: boolean;
  title: string;
  company: string;
  employment_type: string | null;
  location: string | null;
  work_mode: string | null;
  start_date: string;
  end_date: string | null;
  is_current: boolean;
  description: string | null;
  skills: string[];
};

export function formatExperienceSummary(item: ExperienceRow): string {
  const end = item.is_current
    ? "aujourd'hui"
    : item.end_date
      ? formatMonth(item.end_date)
      : "";
  const dates = end
    ? `${formatMonth(item.start_date)} – ${end}`
    : formatMonth(item.start_date);
  return `${item.title} · ${item.company} — ${dates}`;
}

export function ExperienceFields({ item }: { item?: ExperienceRow }) {
  const [isCurrent, setIsCurrent] = useState(item?.is_current ?? false);
  const prefix = item ? `exp-${item.id}` : "exp-new";

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`${prefix}-title`}>Poste</Label>
          <Input
            id={`${prefix}-title`}
            name="title"
            required
            maxLength={100}
            defaultValue={item?.title ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${prefix}-company`}>Entreprise</Label>
          <Input
            id={`${prefix}-company`}
            name="company"
            required
            maxLength={100}
            defaultValue={item?.company ?? ""}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor={`${prefix}-employment_type`}>Type de contrat</Label>
          <select
            id={`${prefix}-employment_type`}
            name="employment_type"
            defaultValue={item?.employment_type ?? ""}
            className={SELECT_CLASS}
          >
            <option value="">— Choisir —</option>
            {EMPLOYMENT_TYPES.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${prefix}-location`}>Lieu</Label>
          <Input
            id={`${prefix}-location`}
            name="location"
            maxLength={100}
            defaultValue={item?.location ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${prefix}-work_mode`}>Mode de travail</Label>
          <select
            id={`${prefix}-work_mode`}
            name="work_mode"
            defaultValue={item?.work_mode ?? ""}
            className={SELECT_CLASS}
          >
            <option value="">— Choisir —</option>
            {WORK_MODES.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`${prefix}-start_date`}>Début</Label>
          <Input
            id={`${prefix}-start_date`}
            name="start_date"
            type="month"
            required
            defaultValue={toMonthInput(item?.start_date ?? null)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${prefix}-end_date`}>Fin</Label>
          <Input
            id={`${prefix}-end_date`}
            name="end_date"
            type="month"
            disabled={isCurrent}
            defaultValue={toMonthInput(item?.end_date ?? null)}
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          id={`${prefix}-is_current`}
          name="is_current"
          type="checkbox"
          checked={isCurrent}
          onChange={(e) => setIsCurrent(e.target.checked)}
          className="size-4 accent-primary"
        />
        <Label htmlFor={`${prefix}-is_current`}>Poste actuel</Label>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${prefix}-description`}>Description</Label>
        <Textarea
          id={`${prefix}-description`}
          name="description"
          rows={4}
          maxLength={DESCRIPTION_MAX}
          defaultValue={item?.description ?? ""}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${prefix}-skills`}>Compétences (séparées par des virgules)</Label>
        <Input
          id={`${prefix}-skills`}
          name="skills"
          defaultValue={item?.skills?.join(", ") ?? ""}
        />
      </div>
    </div>
  );
}
