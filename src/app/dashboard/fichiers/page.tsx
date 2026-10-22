import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { DriveWorkspace } from "@/components/drive/drive-workspace";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { storageLimit } from "@/lib/drive";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "../shell";
import { DriveNotReadyError, loadDrive, type DriveContent } from "./data";

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
  let content: DriveContent | null = null;
  try {
    content = await loadDrive(supabase, user.id, folderId);
  } catch (failure) {
    // Migration pas encore appliquée : message clair au lieu d'une page d'erreur (voir docs/drive.md).
    if (!(failure instanceof DriveNotReadyError)) throw failure;
  }

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
      {content ? (
        <DriveWorkspace
          folder={content.folder}
          entries={content.entries}
          usedBytes={content.usedBytes}
          limitBytes={storageLimit(process.env.STORAGE_LIMIT_BYTES)}
        />
      ) : (
        <Alert role="status">
          <AlertTitle>Le Drive n’est pas encore activé</AlertTitle>
          <AlertDescription>
            <p>
              La base de données n’a pas encore reçu la migration du Drive
              (<code>20261022100000_drive.sql</code>). Une fois appliquée, cette page fonctionne sans
              autre changement.
            </p>
            <p>
              En attendant, essaie le{" "}
              <Link href="/design/fichiers" className="font-medium underline">
                Drive avec de fausses données
              </Link>
              .
            </p>
          </AlertDescription>
        </Alert>
      )}
    </DashboardShell>
  );
}
