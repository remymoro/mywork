import { NextResponse, type NextRequest } from "next/server";
import { FILES_BUCKET } from "@/lib/drive";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Téléchargement d'un fichier public : on vérifie qu'il est public et que le profil est en ligne
// (règles RLS de drive_files), puis on redirige vers une adresse signée de 60 secondes. Un fichier
// repassé en privé devient donc inaccessible aussitôt. Les moteurs de recherche ne l'indexent pas.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ username: string; fileId: string }> },
) {
  const { username, fileId } = await params;
  const headers = { "X-Robots-Tag": "noindex, nofollow" };
  if (!UUID.test(fileId)) return new NextResponse("Fichier introuvable", { status: 404, headers });

  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select("id").eq("username", username).maybeSingle();
  if (!profile) return new NextResponse("Fichier introuvable", { status: 404, headers });

  const { data: file } = await supabase
    .from("drive_files")
    .select("name, storage_path")
    .eq("id", fileId)
    .eq("owner_id", profile.id)
    .eq("is_public", true)
    .maybeSingle();
  if (!file) return new NextResponse("Fichier introuvable", { status: 404, headers });

  const { data, error } = await supabase.storage
    .from(FILES_BUCKET)
    .createSignedUrl(file.storage_path as string, 60, { download: file.name as string });
  if (error || !data) return new NextResponse("Téléchargement indisponible", { status: 502, headers });

  return NextResponse.redirect(data.signedUrl, { status: 302, headers });
}
