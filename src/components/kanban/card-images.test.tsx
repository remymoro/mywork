import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const uploadCardImage = vi.fn();
const deleteCardImage = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/app/dashboard/kanban/actions", () => ({
  uploadCardImage: (...args: unknown[]) => uploadCardImage(...args),
  deleteCardImage: (...args: unknown[]) => deleteCardImage(...args),
}));

import { CardImages } from "./card-images";

const image = (id: string) => ({
  id,
  card_id: "c1",
  board_id: "b1",
  path: `u/b1/c1/${id}.png`,
  position: 0,
  created_at: "2026-10-21T10:00:00Z",
  url: `https://exemple.supabase.co/storage/v1/object/sign/kanban-images/u/b1/c1/${id}.png?token=x`,
});

const png = (name: string, size = 1000) => new File([new Uint8Array(size)], name, { type: "image/png" });

describe("CardImages", () => {
  beforeEach(() => {
    uploadCardImage.mockReset().mockResolvedValue({ saved: true });
    deleteCardImage.mockReset().mockResolvedValue({ saved: true });
  });

  it("affiche les vignettes et supprime une image", async () => {
    render(<CardImages boardId="b1" cardId="c1" images={[image("i1"), image("i2")]} />);
    expect(screen.getByText("2/5")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Image 1 de la carte" })).toHaveAttribute("src", image("i1").url);
    fireEvent.click(screen.getByRole("button", { name: "Supprimer l'image 2" }));
    await waitFor(() => expect(deleteCardImage).toHaveBeenCalledWith("b1", "c1", "i2"));
  });

  it("envoie les fichiers choisis un par un, et refuse un mauvais format sans l'envoyer", async () => {
    render(<CardImages boardId="b1" cardId="c1" images={[]} />);
    const gif = new File(["x"], "anim.gif", { type: "image/gif" });
    fireEvent.change(screen.getByLabelText("Choisir des images"), {
      target: { files: [png("a.png"), gif, png("b.png")] },
    });
    await waitFor(() => expect(uploadCardImage).toHaveBeenCalledTimes(2));
    expect(uploadCardImage.mock.calls[0][0]).toBe("b1");
    expect((uploadCardImage.mock.calls[0][2] as FormData).get("image")).toBeInstanceOf(File);
    expect(await screen.findByRole("alert")).toHaveTextContent("anim.gif : Formats acceptés");
  });

  it("bloque l'ajout à 5 images", () => {
    render(
      <CardImages
        boardId="b1"
        cardId="c1"
        images={["1", "2", "3", "4", "5"].map((id) => image(id))}
      />,
    );
    expect(screen.getByRole("button", { name: "Ajouter une image" })).toBeDisabled();
    expect(screen.getByText(/5 images au maximum/)).toBeInTheDocument();
  });

  it("en lecture seule : vignettes sans bouton, et rien si la carte n'a pas d'image", () => {
    const { rerender, container } = render(
      <CardImages boardId="b1" cardId="c1" images={[image("i1")]} readOnly />,
    );
    expect(screen.getByRole("img", { name: "Image 1 de la carte" })).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    rerender(<CardImages boardId="b1" cardId="c1" images={[]} readOnly />);
    expect(container).toBeEmptyDOMElement();
  });
});
