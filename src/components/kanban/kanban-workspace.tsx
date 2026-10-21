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
  KanbanPerson,
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
  people?: KanbanPerson[];
  userId: string;
  /** Identifiant du tableau ouvert (`?tableau=`) ; l'ancien format par slug reste accepté. */
  selectedBoard?: string;
  selectedCardId?: string;
};

export function KanbanWorkspace({
  boards,
  lists,
  cards,
  checklist,
  comments,
  images = [],
  people = [],
  userId,
  selectedBoard,
  selectedCardId,
}: KanbanWorkspaceProps) {
  const router = useRouter();
  const board =
    boards.find((item) => item.id === selectedBoard) ??
    boards.find((item) => item.slug === selectedBoard && item.owner_id === userId) ??
    boards[0];
  const storageKey = `mywork:kanban:last-board:${userId}`;

  useEffect(() => {
    if (boards.length === 0) return;
    try {
      if (!selectedBoard) {
        const previous = localStorage.getItem(storageKey);
        const restored = boards.find((item) => item.id === previous) ?? boards[0];
        const params = new URLSearchParams({ tableau: restored.id });
        if (selectedCardId) params.set("carte", selectedCardId);
        router.replace(`/dashboard/kanban?${params}`, { scroll: false });
      } else if (board) {
        localStorage.setItem(storageKey, board.id);
      }
    } catch {
      // Le tableau reste utilisable lorsque le navigateur bloque le stockage local.
    }
  }, [board, boards, router, selectedCardId, selectedBoard, storageKey]);

  function selectBoard(id: string) {
    router.push(`/dashboard/kanban?${new URLSearchParams({ tableau: id })}`, { scroll: false });
    try {
      localStorage.setItem(storageKey, id);
    } catch {
      // La mémorisation est facultative.
    }
  }

  function cardAddress(id?: string) {
    if (!board) return;
    const params = new URLSearchParams({ tableau: board.id });
    if (id) params.set("carte", id);
    router.push(`/dashboard/kanban?${params}`, { scroll: false });
  }

  const card = cards.find((item) => item.id === selectedCardId && item.board_id === board?.id);
  const cardList = card ? lists.find((item) => item.id === card.list_id) : undefined;
  const boardPeople = people.filter((person) => person.board_id === board?.id);

  return (
    <div className="grid min-w-0 gap-7 md:grid-cols-[14rem_minmax(0,1fr)]">
      <BoardSidebar
        boards={boards}
        cards={cards}
        people={people}
        selectedId={board?.id}
        userId={userId}
        onSelect={selectBoard}
      />
      {board ? (
        <BoardView
          key={board.id}
          board={board}
          lists={lists.filter((item) => item.board_id === board.id)}
          cards={cards.filter((item) => item.board_id === board.id)}
          checklist={checklist}
          comments={comments}
          images={images}
          people={boardPeople}
          userId={userId}
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
      {board && card && cardList && (
        <CardDialog
          key={card.id}
          card={card}
          list={cardList}
          checklist={checklist.filter((item) => item.card_id === card.id)}
          comments={comments.filter((item) => item.card_id === card.id)}
          images={images.filter((item) => item.card_id === card.id)}
          userId={userId}
          isOwner={board.owner_id === userId}
          onClose={() => cardAddress()}
        />
      )}
    </div>
  );
}
