"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LayoutGrid } from "lucide-react";
import type {
  ChecklistItem,
  KanbanBoard,
  KanbanCard,
  KanbanCardImage,
  KanbanComment,
  KanbanList,
} from "@/lib/kanban";
import { BoardSidebar } from "./board-sidebar";
import { BoardView } from "./board-view";
import { CardDialog } from "./card-dialog";

export type KanbanWorkspaceProps = {
  boards: KanbanBoard[];
  lists: KanbanList[];
  cards: KanbanCard[];
  checklist: ChecklistItem[];
  comments: KanbanComment[];
  images?: KanbanCardImage[];
  username: string;
  selectedSlug?: string;
  selectedCardId?: string;
  readOnly?: boolean;
};

export function KanbanWorkspace({
  boards,
  lists,
  cards,
  checklist,
  comments,
  images = [],
  username,
  selectedSlug,
  selectedCardId,
  readOnly = false,
}: KanbanWorkspaceProps) {
  const router = useRouter();
  const board = boards.find((item) => item.slug === selectedSlug) ?? boards[0];
  const storageKey = `mywork:kanban:last-board:${username}`;

  useEffect(() => {
    if (readOnly || boards.length === 0) return;
    try {
      if (!selectedSlug) {
        const previous = localStorage.getItem(storageKey);
        const restored = boards.find((item) => item.slug === previous) ?? boards[0];
        const params = new URLSearchParams({ tableau: restored.slug });
        if (selectedCardId) params.set("carte", selectedCardId);
        router.replace(`/dashboard/kanban?${params}`, { scroll: false });
      } else if (board) {
        localStorage.setItem(storageKey, board.slug);
      }
    } catch {
      // Le tableau reste utilisable lorsque le navigateur bloque le stockage local.
    }
  }, [board, boards, readOnly, router, selectedCardId, selectedSlug, storageKey]);

  function selectBoard(slug: string) {
    router.push(`/dashboard/kanban?${new URLSearchParams({ tableau: slug })}`, { scroll: false });
    try {
      localStorage.setItem(storageKey, slug);
    } catch {
      // La mémorisation est facultative.
    }
  }

  function cardAddress(id?: string) {
    if (!board) return;
    const params = new URLSearchParams();
    if (!readOnly) params.set("tableau", board.slug);
    if (id) params.set("carte", id);
    const path = readOnly ? `/${username}/kanban/${board.slug}` : "/dashboard/kanban";
    router.push(`${path}${params.size ? `?${params}` : ""}`, { scroll: false });
  }

  const card = cards.find((item) => item.id === selectedCardId && item.board_id === board?.id);
  const cardList = card ? lists.find((item) => item.id === card.list_id) : undefined;

  return (
    <div className={readOnly ? "min-w-0" : "grid min-w-0 gap-7 md:grid-cols-[14rem_minmax(0,1fr)]"}>
      {!readOnly && (
        <BoardSidebar
          boards={boards}
          cards={cards}
          selectedId={board?.id}
          username={username}
          onSelect={selectBoard}
        />
      )}
      {board ? (
        <BoardView
          key={board.id}
          board={board}
          lists={lists.filter((item) => item.board_id === board.id)}
          cards={cards.filter((item) => item.board_id === board.id)}
          checklist={checklist}
          comments={comments}
          images={images}
          username={username}
          readOnly={readOnly}
          onOpen={cardAddress}
          onSelect={selectBoard}
        />
      ) : (
        <div className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-xl border border-dashed p-8 text-center">
          <LayoutGrid aria-hidden="true" className="size-8 text-primary" strokeWidth={1.5} />
          <h2 className="font-heading text-2xl">Une place pour tes projets</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            Crée ton premier tableau avec « Nouveau », puis ajoute tes listes et tes cartes.
          </p>
        </div>
      )}
      {card && cardList && (
        <CardDialog
          key={card.id}
          card={card}
          list={cardList}
          checklist={checklist.filter((item) => item.card_id === card.id)}
          comments={comments.filter((item) => item.card_id === card.id)}
          images={images.filter((item) => item.card_id === card.id)}
          readOnly={readOnly}
          onClose={() => cardAddress()}
        />
      )}
    </div>
  );
}
