import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { Logo } from "@/components/logo";
import type { RdvConfig } from "@/lib/rdv";
import type { RdvDescription } from "@/lib/rdv-emails";
import { createClient } from "@/lib/supabase/server";
import { GuestManage } from "./guest-manage";

export const instant = false;
// Page personnelle (lien privé reçu par e-mail) : jamais indexée.
export const metadata: Metadata = { title: "Mon rendez-vous", robots: { index: false, follow: false } };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function GuestAppointmentPage({ params }: { params: Promise<{ token: string }> }) {
  await connection();
  const { token } = await params;
  if (!UUID.test(token)) notFound();

  const supabase = await createClient();
  const { data } = await supabase.rpc("rdv_get", { p_token: token });
  if (!data) notFound();
  const appointment = data as RdvDescription;
  const { data: config } = await supabase.rpc("rdv_public_config", { p_username: appointment.owner_username });

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-xl space-y-6 px-4 py-6 sm:px-6 sm:py-10">
        <header className="flex items-center justify-between">
          <Logo />
        </header>
        <div className="space-y-1.5">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">MON RENDEZ-VOUS</p>
          <h1 className="font-heading text-3xl font-normal tracking-tight">Rendez-vous avec {appointment.owner_name}</h1>
        </div>
        <GuestManage
          token={token}
          appointment={{
            status: appointment.status,
            starts_at: appointment.starts_at,
            ends_at: appointment.ends_at,
            duration_min: appointment.duration_min,
            owner_name: appointment.owner_name,
          }}
          config={(config as RdvConfig | null) ?? null}
          nowIso={new Date().toISOString()}
        />
        <p className="text-sm text-muted-foreground">
          <Link href={`/${appointment.owner_username}`} className="underline">
            Voir le profil de {appointment.owner_name}
          </Link>
        </p>
      </main>
    </div>
  );
}
