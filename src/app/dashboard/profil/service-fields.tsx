"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatEuros } from "@/lib/profile-sections";

export type ServiceRow = {
  id: string;
  position: number;
  is_visible: boolean;
  title: string;
  description: string | null;
  starting_price: number | null;
};

export function formatServiceSummary(item: ServiceRow): string {
  return item.starting_price ? `${item.title} — à partir de ${formatEuros(item.starting_price)}` : item.title;
}

export function ServiceFields({ item }: { item?: ServiceRow }) {
  const prefix = item ? `service-${item.id}` : "service-new";

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-[1fr_12rem]">
        <div className="space-y-2">
          <Label htmlFor={`${prefix}-title`}>Prestation</Label>
          <Input
            id={`${prefix}-title`}
            name="title"
            required
            maxLength={100}
            defaultValue={item?.title ?? ""}
            placeholder="Ex. Création de site vitrine"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${prefix}-starting_price`}>À partir de (€ HT)</Label>
          <Input
            id={`${prefix}-starting_price`}
            name="starting_price"
            type="number"
            min={1}
            inputMode="numeric"
            defaultValue={item?.starting_price ?? ""}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${prefix}-description`}>Description</Label>
        <Textarea
          id={`${prefix}-description`}
          name="description"
          rows={3}
          maxLength={1000}
          defaultValue={item?.description ?? ""}
        />
      </div>
    </div>
  );
}
