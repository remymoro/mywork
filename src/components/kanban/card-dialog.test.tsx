import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { KanbanCard, KanbanList } from "@/lib/kanban";

const actions = vi.hoisted(() => ({
  updateCard: vi.fn(),
  addChecklistItem: vi.fn(),
  setChecklistItemDone: vi.fn(),
  deleteChecklistItem: vi.fn(),
  addComment: vi.fn(),
  deleteComment: vi.fn(),
}));
const refresh = vi.hoisted(() => vi.fn());

vi.mock("@/app/dashboard/kanban/actions", () => actions);
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

import { CardDialog } from "./card-dialog";
import { Markdown } from "./markdown";

const card: KanbanCard = {
  id: "card-1",
  board_id: "board-1",
  list_id: "list-1",
  title: "Préparer le lancement",
  description: "Un premier paragraphe",
  position: 0,
  author_profile_id: "owner-1",
  created_at: "2026-10-21T10:00:00Z",
  updated_at: "2026-10-21T10:00:00Z",
};
const list: KanbanList = {
  id: "list-1",
  board_id: "board-1",
  title: "À faire",
  color: "rose",
  position: 0,
  created_at: card.created_at,
};

beforeEach(() => {
  vi.clearAllMocks();
  for (const action of Object.values(actions)) action.mockResolvedValue({ saved: true });
});

/** `member` : un membre qui ouvre la carte d'un autre (ici celle du propriétaire). */
function renderCard(member = false) {
  const onClose = vi.fn();
  render(
    <CardDialog
      card={card}
      list={list}
      checklist={[]}
      comments={[]}
      userId={member ? "membre-1" : "owner-1"}
      isOwner={!member}
      onClose={onClose}
    />,
  );
  return { onClose };
}

describe("fenêtre d'une carte", () => {
  it.each(["ctrlKey", "metaKey"])(
    "enregistre la description avec %s + Entrée, jamais avec Entrée seule",
    async (modifier) => {
      renderCard();
      fireEvent.click(screen.getByRole("button", { name: "Modifier la description" }));
      const input = screen.getByRole("textbox", { name: "Description de la carte" });
      fireEvent.change(input, { target: { value: "Première ligne\nDeuxième ligne" } });
      fireEvent.keyDown(input, { key: "Enter", code: "Enter" });
      expect(actions.updateCard).not.toHaveBeenCalled();
      expect(input).toHaveValue("Première ligne\nDeuxième ligne");
      fireEvent.keyDown(input, { key: "Enter", code: "Enter", [modifier]: true });
      await waitFor(() =>
        expect(actions.updateCard).toHaveBeenCalledWith("board-1", "card-1", {
          title: card.title,
          description: "Première ligne\nDeuxième ligne",
        }),
      );
      await waitFor(() =>
        expect(
          screen.queryByRole("textbox", { name: "Description de la carte" }),
        ).not.toBeInTheDocument(),
      );
      expect(refresh).toHaveBeenCalled();
    },
  );

  it("annule la description avec Échap sans fermer la carte", () => {
    const { onClose } = renderCard();
    fireEvent.click(screen.getByRole("button", { name: "Modifier la description" }));
    const input = screen.getByRole("textbox", { name: "Description de la carte" });
    fireEvent.change(input, { target: { value: "Brouillon" } });
    fireEvent.keyDown(input, { key: "Escape" });
    expect(actions.updateCard).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByText(card.description)).toBeInTheDocument();
  });

  it("propose les raccourcis de mise en forme sur la sélection", () => {
    renderCard();
    fireEvent.click(screen.getByRole("button", { name: "Modifier la description" }));
    const input = screen.getByRole("textbox", {
      name: "Description de la carte",
    }) as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: "important" } });
    input.setSelectionRange(0, 9);
    fireEvent.keyDown(input, { key: "b", ctrlKey: true });
    expect(input).toHaveValue("**important**");
    expect(actions.updateCard).not.toHaveBeenCalled();
  });

  it("conserve la saisie et affiche un message après une erreur réseau", async () => {
    actions.updateCard.mockRejectedValueOnce(new Error("network"));
    renderCard();
    fireEvent.click(screen.getByRole("button", { name: "Modifier la description" }));
    const input = screen.getByRole("textbox", { name: "Description de la carte" });
    fireEvent.change(input, { target: { value: "À garder" } });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("ta saisie est conservée");
    expect(input).toHaveValue("À garder");
  });

  it("sur la carte d'un autre, un membre peut seulement commenter", () => {
    renderCard(true);
    expect(screen.getByText(card.title)).toBeInTheDocument();
    expect(screen.getByText(/Cette carte appartient à quelqu'un d'autre/)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Modifier|Ajouter à la checklist|Ajouter une image/ }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "Nouvel élément de checklist" })).not.toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Ajouter un commentaire" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Publier le commentaire" })).toBeInTheDocument();
  });

  it("montre progression, commentaires triés et nom affiché", () => {
    render(
      <CardDialog
        card={card}
        list={list}
        onClose={vi.fn()}
        userId="membre-1"
        isOwner={false}
        checklist={[{ id: "item-1", card_id: card.id, text: "Préparer", done: true, position: 0 }]}
        comments={[
          {
            id: "c-2",
            card_id: card.id,
            body: "Second message",
            author_profile_id: "owner-1",
            author_name: "Rémy Moro",
            created_at: "2026-10-21T12:00:00Z",
          },
          {
            id: "c-1",
            card_id: card.id,
            body: "Premier message",
            author_profile_id: "owner-1",
            author_name: "Rémy Moro",
            created_at: "2026-10-21T10:00:00Z",
          },
        ]}
      />,
    );
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
    expect(screen.getByRole("checkbox", { name: "Préparer" })).toBeChecked();
    expect(screen.getAllByText("Rémy Moro")).toHaveLength(2);
    const earlier = screen.getByText("Premier message");
    expect(
      earlier.compareDocumentPosition(screen.getByText("Second message")) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("ajoute un élément et un commentaire avec les identifiants de la carte", async () => {
    renderCard();
    fireEvent.change(screen.getByRole("textbox", { name: "Nouvel élément de checklist" }), {
      target: { value: "Relire" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Ajouter à la checklist" }));
    await waitFor(() =>
      expect(actions.addChecklistItem).toHaveBeenCalledWith("board-1", "card-1", "Relire"),
    );
    await waitFor(() =>
      expect(screen.getByRole("textbox", { name: "Nouvel élément de checklist" })).toHaveValue(""),
    );
    fireEvent.change(screen.getByRole("textbox", { name: "Ajouter un commentaire" }), {
      target: { value: "C'est prêt" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Publier le commentaire" }));
    await waitFor(() =>
      expect(actions.addComment).toHaveBeenCalledWith("board-1", "card-1", "C'est prêt"),
    );
  });
});

describe("affichage Markdown sûr", () => {
  it("rend les éléments autorisés et garde les injections visibles comme texte", () => {
    const { container } = render(
      <Markdown
        text={
          "## Titre\n**Gras** *Italique* [site](https://exemple.fr)\n<script>alert(1)</script> [attaque](javascript:alert(1))"
        }
      />,
    );
    expect(screen.getByRole("heading", { name: "Titre" })).toBeInTheDocument();
    expect(container.querySelector("strong")).toHaveTextContent("Gras");
    expect(container.querySelector("em")).toHaveTextContent("Italique");
    expect(screen.getByRole("link", { name: "site" })).toHaveAttribute(
      "href",
      "https://exemple.fr",
    );
    expect(container.querySelector("script")).toBeNull();
    expect(screen.queryByRole("link", { name: "attaque" })).not.toBeInTheDocument();
    expect(container).toHaveTextContent("<script>alert(1)</script>");
    expect(container).toHaveTextContent("[attaque](javascript:alert(1))");
  });
});
