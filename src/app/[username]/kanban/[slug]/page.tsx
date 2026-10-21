import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { KanbanWorkspace } from "@/components/kanban/kanban-workspace";
import { Logo } from "@/components/logo";
import { createClient } from "@/lib/supabase/server";
import { loadKanbanContent, loadPublicBoard } from "@/app/dashboard/kanban/data";

export const instant = false;

type Props = {
  params: Promise<{ username: string; slug: string }>;
  searchParams: Promise<{ carte?: string | string[] }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await connection();
  const { username, slug } = await params;
  const result = await loadPublicBoard(username, slug);
  return {
    title: result
      ? `${result.board.name} — ${result.profile.display_name || username}`
      : "Tableau introuvable — MyWork",
  };
}

export default async function PublicKanbanPage({ params, searchParams }: Props) {
  await connection();
  const { username, slug } = await params;
  const result = await loadPublicBoard(username, slug);
  if (!result) notFound();

  const { profile, board } = result;
  const supabase = await createClient();
  const content = await loadKanbanContent(supabase, [board]);
  const query = await searchParams;

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b bg-sidebar px-6 py-4">
        <Logo />
        <Link href={`/${username}`} className="text-sm text-primary hover:underline">
          Le profil de {profile.display_name || username}
        </Link>
      </header>
      <main className="mx-auto max-w-[1800px] space-y-6 p-6 sm:p-8">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            TABLEAU PUBLIC · LECTURE SEULE
          </p>
          <h1 className="font-heading text-3xl font-normal sm:text-4xl">{board.name}</h1>
        </div>
        <KanbanWorkspace
          boards={[board]}
          {...content}
          username={username}
          selectedSlug={slug}
          selectedCardId={typeof query.carte === "string" ? query.carte : undefined}
          readOnly
        />
      </main>
    </div>
  );
}
