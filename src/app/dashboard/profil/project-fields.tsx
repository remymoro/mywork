"use client";

import Image from "next/image";
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
  image_url: string | null;
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
        <Label htmlFor={`${prefix}-image`}>Image du projet</Label>
        {item?.image_url && (
          <div className="flex items-center gap-3">
            <Image
              src={item.image_url}
              alt={`Image actuelle de ${item.name}`}
              width={160}
              height={90}
              className="h-[90px] w-40 rounded-md border object-cover"
            />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="remove_image" className="size-4 accent-primary" />
              Retirer l&apos;image
            </label>
          </div>
        )}
        <Input
          id={`${prefix}-image`}
          name="image"
          type="file"
          accept="image/jpeg,image/png,image/webp"
        />
        <p className="text-xs text-muted-foreground">JPEG, PNG ou WebP, 2 Mo maximum.</p>
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
