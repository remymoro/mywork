import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { VisioInput } from "@/lib/visio";
import { getVisioAppointment, VisioError } from "@/lib/visio-server";
import { VisioSession } from "./visio-session";

/** Enveloppe partagée ; seul le rendez-vous autorisé est transmis au navigateur. */
export async function VisioPage({ input }: { input: VisioInput }) {
  let appointment;
  let failure;
  try { appointment = await getVisioAppointment(input); }
  catch (error) {
    if (!(error instanceof VisioError)) throw error;
    if (error.status === 401) redirect("/login");
    if (error.status === 404 || error.status === 400) notFound();
    failure = error.message;
  }
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6 sm:py-10">
        <Logo />
        <div className="space-y-1.5">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">{input.role === "owner" ? "ESPACE PRIVÉ" : "MON RENDEZ-VOUS"}</p>
          <h1 className="font-heading text-3xl font-normal tracking-tight sm:text-4xl">Ta visio</h1>
        </div>
        {appointment ? <VisioSession input={input} appointment={appointment} nowIso={new Date().toISOString()} /> : <Alert role="alert"><AlertDescription>{failure}</AlertDescription></Alert>}
        <Link href={input.role === "guest" ? `/rdv/${input.token}` : "/dashboard/rendez-vous"} className="text-sm underline">Retour au rendez-vous</Link>
      </main>
    </div>
  );
}
