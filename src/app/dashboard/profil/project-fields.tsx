"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DESCRIPTION_MAX, formatMonth, toMonthInput } from "@/lib/profile-sections";

export type ProjectRow = {
  id: string;
  position: number;
  is_visible: boolean;
  name: string;
  start_date: string | null;
  end_date: string | null;
  description: string | null;
  url: string | null;
  skills: string[];
};

export function formatProjectSummary(item: ProjectRow): string {
  if (!item.start_date) return item.name;
  const period = item.end_date
    ? `${formatMonth(item.start_date)} – ${formatMonth(item.end_date)}`
    : formatMonth(item.start_date);
  return `${item.name} — ${period}`;
}

export function ProjectFields({ item }: { item?: ProjectRow }) {
  const prefix = item ? `proj-${item.id}` : "proj-new";

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor={`${prefix}-name`}>Nom</Label>
          <Input
            id={`${prefix}-name`}
            name="name"
            required
            maxLength={120}
            defaultValue={item?.name ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${prefix}-start_date`}>Début</Label>
          <Input
            id={`${prefix}-start_date`}
            name="start_date"
            type="month"
            defaultValue={toMonthInput(item?.start_date ?? null)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${prefix}-end_date`}>Fin</Label>
          <Input
            id={`${prefix}-end_date`}
            name="end_date"
            type="month"
            defaultValue={toMonthInput(item?.end_date ?? null)}
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

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`${prefix}-url`}>Lien</Label>
          <Input
            id={`${prefix}-url`}
            name="url"
            maxLength={300}
            defaultValue={item?.url ?? ""}
            placeholder="https://…"
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
    </div>
  );
}
