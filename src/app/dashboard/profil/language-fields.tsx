"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LANGUAGE_LEVELS, labelOf } from "@/lib/profile-sections";
import { SELECT_CLASS } from "./experience-fields";

export type LanguageRow = {
  id: string;
  position: number;
  is_visible: boolean;
  name: string;
  level: string;
};

export function formatLanguageSummary(item: LanguageRow): string {
  const levelLabel = labelOf(LANGUAGE_LEVELS, item.level) ?? item.level;
  return `${item.name} — ${levelLabel}`;
}

export function LanguageFields({ item }: { item?: LanguageRow }) {
  const prefix = item ? `lang-${item.id}` : "lang-new";

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor={`${prefix}-name`}>Langue</Label>
        <Input
          id={`${prefix}-name`}
          name="name"
          required
          maxLength={60}
          defaultValue={item?.name ?? ""}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${prefix}-level`}>Niveau</Label>
        <select
          id={`${prefix}-level`}
          name="level"
          required
          defaultValue={item?.level ?? ""}
          className={SELECT_CLASS}
        >
          <option value="">— Choisir —</option>
          {LANGUAGE_LEVELS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
