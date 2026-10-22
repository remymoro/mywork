import { connection } from "next/server";
import { redirect } from "next/navigation";
import { DriveWorkspace } from "@/components/drive/drive-workspace";
import { storageLimit } from "@/lib/drive";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "../shell";
import { loadDrive } from "./data";

export const instant = false;

export default async function DrivePage({
  searchParams,
}: {
  searchParams: Promise<{ dossier?: string | string[] }>;
}) {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("username, display_name, is_online")
    .eq("id", user.id)
    .maybeSingle();
  if (error) throw new Error(`Lecture du profil impossible : ${error.message}`);
  if (!profile) redirect("/onboarding");

  const query = await searchParams;
  const folderId = typeof query.dossier === "string" ? query.dossier : null;
  const content = await loadDrive(supabase, user.id, folderId);

  return (
    <DashboardShell
      active="fichiers"
      email={user.email ?? ""}
      displayName={profile.display_name}
      username={profile.username}
      isOnline={profile.is_online}
    >
      <div className="space-y-1.5">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          ESPACE PRIVÉ
        </p>
        <h1 className="font-heading text-3xl font-normal tracking-tight sm:text-4xl">Mes fichiers</h1>
        <p className="text-sm text-muted-foreground">
          Range tes fichiers. Ceux que tu rends publics apparaissent dans « Ressources » sur ton profil.
        </p>
      </div>
      <DriveWorkspace
        folder={content.folder}
        entries={content.entries}
        usedBytes={content.usedBytes}
        limitBytes={storageLimit(process.env.STORAGE_LIMIT_BYTES)}
      />
    </DashboardShell>
  );
}
