import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));
vi.mock("@/app/dashboard/kanban/actions", () => ({}));

import { BoardView } from "./board-view";

const board = {
  id: "b1",
  owner_id: "u1",
  name: "MyWork",
  slug: "mywork",
  icon: "document",
  position: 0,
  created_at: "2026-10-21T10:00:00Z",
} as const;
const list = {
  id: "l1",
  board_id: "b1",
  title: "À faire",
  color: "rose",
  position: 0,
  created_at: "2026-10-21T10:00:00Z",
} as const;
const card = (id: string, title: string) => ({
  id,
  list_id: "l1",
  board_id: "b1",
  title,
  description: "",
  position: 0,
  author_profile_id: null,
  created_at: "2026-10-21T10:00:00Z",
  updated_at: "2026-10-21T10:00:00Z",
});
const image = (id: string, cardId: string, position: number) => ({
  id,
  card_id: cardId,
  board_id: "b1",
  path: `u1/b1/${cardId}/${id}.png`,
  position,
  created_at: "2026-10-21T10:00:00Z",
  url: `https://exemple.supabase.co/sign/${id}.png`,
});

describe("BoardView — aperçu des images", () => {
  it("montre la première image en haut de la carte, et rien pour une carte sans image", () => {
    const { container } = render(
      <BoardView
        board={{ ...board }}
        lists={[{ ...list }]}
        cards={[card("c1", "Maquette"), { ...card("c2", "Textes"), position: 1 }]}
        checklist={[]}
        comments={[]}
        images={[image("i2", "c1", 1000), image("i1", "c1", 0)]}
        userId="u1"
        onOpen={vi.fn()}
        onSelect={vi.fn()}
      />,
    );
    const covers = container.querySelectorAll("article img");
    expect(covers).toHaveLength(1);
    expect(covers[0]).toHaveAttribute("src", "https://exemple.supabase.co/sign/i1.png");
    const first = screen.getByText("Maquette").closest("article")!;
    expect(within(first).getByLabelText("2 images")).toBeInTheDocument();
  });

  it("signale la liste de fin dans son en-tête", () => {
    render(
      <BoardView
        board={{ ...board }}
        lists={[{ ...list, is_done_list: true }]}
        cards={[]}
        checklist={[]}
        comments={[]}
        userId="u1"
        onOpen={vi.fn()}
        onSelect={vi.fn()}
      />,
    );
    expect(screen.getByText("Liste de fin")).toBeInTheDocument();
  });
});
