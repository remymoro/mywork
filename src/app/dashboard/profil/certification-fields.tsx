"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMonth, toMonthInput } from "@/lib/profile-sections";

export type CertificationRow = {
  id: string;
  position: number;
  is_visible: boolean;
  name: string;
  issuer: string | null;
  issued_on: string | null;
  expires_on: string | null;
  credential_url: string | null;
};

export function formatCertificationSummary(item: CertificationRow): string {
  const head = item.issuer ? `${item.name} · ${item.issuer}` : item.name;
  return item.issued_on ? `${head} — ${formatMonth(item.issued_on)}` : head;
}

export function CertificationFields({ item }: { item?: CertificationRow }) {
  const prefix = item ? `cert-${item.id}` : "cert-new";

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
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
          <Label htmlFor={`${prefix}-issuer`}>Organisme</Label>
          <Input
            id={`${prefix}-issuer`}
            name="issuer"
            maxLength={120}
            defaultValue={item?.issuer ?? ""}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`${prefix}-issued_on`}>Date d&apos;obtention</Label>
          <Input
            id={`${prefix}-issued_on`}
            name="issued_on"
            type="month"
            defaultValue={toMonthInput(item?.issued_on ?? null)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${prefix}-expires_on`}>Date d&apos;expiration</Label>
          <Input
            id={`${prefix}-expires_on`}
            name="expires_on"
            type="month"
            defaultValue={toMonthInput(item?.expires_on ?? null)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${prefix}-credential_url`}>Lien de vérification</Label>
        <Input
          id={`${prefix}-credential_url`}
          name="credential_url"
          maxLength={300}
          defaultValue={item?.credential_url ?? ""}
          placeholder="https://…"
        />
      </div>
    </div>
  );
}
