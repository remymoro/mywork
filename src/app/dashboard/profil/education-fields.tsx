"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DESCRIPTION_MAX } from "@/lib/profile-sections";

export type EducationRow = {
  id: string;
  position: number;
  is_visible: boolean;
  school: string;
  degree: string | null;
  field: string | null;
  start_year: number | null;
  end_year: number | null;
  grade: string | null;
  description: string | null;
};

export function formatEducationSummary(item: EducationRow): string {
  const details = [item.degree, item.field].filter(Boolean).join(" · ");
  const years = [item.start_year, item.end_year].filter(Boolean).join(" – ");
  const head = details ? `${item.school} · ${details}` : item.school;
  return years ? `${head} — ${years}` : head;
}

export function EducationFields({ item }: { item?: EducationRow }) {
  const prefix = item ? `edu-${item.id}` : "edu-new";

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor={`${prefix}-school`}>École</Label>
          <Input
            id={`${prefix}-school`}
            name="school"
            required
            maxLength={120}
            defaultValue={item?.school ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${prefix}-degree`}>Diplôme</Label>
          <Input
            id={`${prefix}-degree`}
            name="degree"
            maxLength={120}
            defaultValue={item?.degree ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${prefix}-field`}>Domaine</Label>
          <Input
            id={`${prefix}-field`}
            name="field"
            maxLength={120}
            defaultValue={item?.field ?? ""}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor={`${prefix}-start_year`}>Année de début</Label>
          <Input
            id={`${prefix}-start_year`}
            name="start_year"
            type="number"
            min={1950}
            max={2100}
            defaultValue={item?.start_year ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${prefix}-end_year`}>Année de fin</Label>
          <Input
            id={`${prefix}-end_year`}
            name="end_year"
            type="number"
            min={1950}
            max={2100}
            defaultValue={item?.end_year ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${prefix}-grade`}>Mention</Label>
          <Input
            id={`${prefix}-grade`}
            name="grade"
            maxLength={60}
            defaultValue={item?.grade ?? ""}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${prefix}-description`}>Description</Label>
        <Textarea
          id={`${prefix}-description`}
          name="description"
          rows={3}
          maxLength={DESCRIPTION_MAX}
          defaultValue={item?.description ?? ""}
        />
      </div>
    </div>
  );
}
