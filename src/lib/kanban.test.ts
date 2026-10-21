import { describe, expect, it } from "vitest";
import {
  canEditCard,
  validateUsernameInput,
  doneListWarning,
  validateCardImage,
  BOARD_ICONS,
  LIST_COLORS,
  checklistProgress,
  parseMarkdown,
  slugify,
  validateBoardIcon,
  validateBoardName,
  validateCardTitle,
  validateChecklistText,
  validateComment,
  validateDescription,
  validateListColor,
  validateListTitle,
} from "./kanban";

describe("validation du Kanban", () => {
  it.each([
    ["nom de tableau", validateBoardName, 60],
    ["titre de liste", validateListTitle, 60],
    ["titre de carte", validateCardTitle, 150],
    ["élément de checklist", validateChecklistText, 200],
    ["commentaire", validateComment, 2000],
  ] as const)("valide %s, enlève les espaces et contrôle ses limites", (_label, validate, max) => {
    expect(validate("  Mon texte  ")).toEqual({ ok: true, value: "Mon texte" });
    expect(validate(" \n ").ok).toBe(false);
    expect(validate("a".repeat(max)).ok).toBe(true);
    expect(validate("a".repeat(max + 1)).ok).toBe(false);
  });

  it("accepte une description vide et garde ses retours à la ligne", () => {
    expect(validateDescription("  ")).toEqual({ ok: true, value: "" });
    expect(validateDescription("Une ligne\nUne autre")).toEqual({
      ok: true,
      value: "Une ligne\nUne autre",
    });
    expect(validateDescription("a".repeat(10000)).ok).toBe(true);
    expect(validateDescription("a".repeat(10001)).ok).toBe(false);
  });

  it("refuse les icônes et couleurs absentes des choix", () => {
    expect(BOARD_ICONS).toHaveLength(6);
    expect(LIST_COLORS).toHaveLength(6);
    expect(validateBoardIcon("document")).toEqual({ ok: true, value: "document" });
    expect(validateBoardIcon("inconnue").ok).toBe(false);
    expect(validateListColor("rose")).toEqual({ ok: true, value: "rose" });
    expect(validateListColor("rouge").ok).toBe(false);
  });
});

describe("slugify", () => {
  it("enlève les accents, les espaces et la ponctuation", () => {
    expect(slugify("  Été à Châlons : mon PROJET ! ")).toBe("ete-a-chalons-mon-projet");
    expect(slugify("Cœur d'œuvre")).toBe("coeur-d-oeuvre");
    expect(slugify("à---faire")).toBe("a-faire");
    expect(slugify("🚀 !")).toBe("tableau");
  });
});

describe("checklistProgress", () => {
  it("calcule une progression arrondie sans considérer une checklist vide terminée", () => {
    expect(checklistProgress([])).toEqual({ done: 0, total: 0, percent: 0, complete: false });
    expect(checklistProgress([{ done: true }, { done: false }, { done: false }])).toEqual({
      done: 1,
      total: 3,
      percent: 33,
      complete: false,
    });
    expect(checklistProgress([{ done: true }, { done: true }])).toEqual({
      done: 2,
      total: 2,
      percent: 100,
      complete: true,
    });
  });
});

describe("Markdown limité", () => {
  it("reconnaît titre, gras, italique, lien et listes", () => {
    expect(
      parseMarkdown(
        "## Mon titre\n\n**Gras** et *italique* [site](https://exemple.fr)\n\n- un\n- deux\n\n1. premier\n2. second",
      ),
    ).toEqual([
      { type: "heading", children: [{ type: "text", text: "Mon titre" }] },
      {
        type: "paragraph",
        children: [
          { type: "strong", text: "Gras" },
          { type: "text", text: " et " },
          { type: "emphasis", text: "italique" },
          { type: "text", text: " " },
          { type: "link", text: "site", href: "https://exemple.fr" },
        ],
      },
      {
        type: "bullet-list",
        items: [[{ type: "text", text: "un" }], [{ type: "text", text: "deux" }]],
      },
      {
        type: "numbered-list",
        items: [[{ type: "text", text: "premier" }], [{ type: "text", text: "second" }]],
      },
    ]);
  });

  it("laisse le HTML, les images, le code et les liens dangereux en texte", () => {
    const text =
      '<script>alert("x")</script>\n[piratage](javascript:alert(1))\n[data](data:text/html,piratage)\n[relatif](/page)\n![image](https://exemple.fr/a.png)\n`code`';
    expect(parseMarkdown(text)).toEqual([
      { type: "paragraph", children: [{ type: "text", text }] },
    ]);
  });

  it("refuse aussi un protocole obfusqué et accepte http", () => {
    expect(parseMarkdown("[a](JaVaScRiPt:alert) [b](java&#115;cript:alert) [c](https://)")).toEqual(
      [
        {
          type: "paragraph",
          children: [
            {
              type: "text",
              text: "[a](JaVaScRiPt:alert) [b](java&#115;cript:alert) [c](https://)",
            },
          ],
        },
      ],
    );
    expect(parseMarkdown("[a](http://exemple.fr)")).toEqual([
      { type: "paragraph", children: [{ type: "link", text: "a", href: "http://exemple.fr" }] },
    ]);
  });

  it("garde les sauts de ligne et la syntaxe non reconnue", () => {
    expect(parseMarkdown("# Pas un titre pris en charge\r\nligne suivante\n**incomplet")).toEqual([
      {
        type: "paragraph",
        children: [
          { type: "text", text: "# Pas un titre pris en charge\nligne suivante\n**incomplet" },
        ],
      },
    ]);
  });

  it("ne reformate pas l'intérieur du code, du HTML ou d'une image", () => {
    for (const text of [
      "`code avec **gras**`",
      "***Pas une mise en forme prise en charge***",
      '<script>const value = "**gras**";</script>',
      "![*texte*](https://exemple.fr/image.png)",
      "```\n## Pas un titre\n**Pas de gras**\n```",
    ]) {
      expect(parseMarkdown(text)).toEqual([
        { type: "paragraph", children: [{ type: "text", text }] },
      ]);
    }
  });
});

describe("validateCardImage", () => {
  it("accepte JPEG, PNG et WebP jusqu'à 2 Mo, et refuse le reste", () => {
    expect(validateCardImage({ type: "image/png", size: 1000 })).toEqual({ ok: true, value: "png" });
    expect(validateCardImage({ type: "image/webp", size: 2 * 1024 * 1024 })).toEqual({ ok: true, value: "webp" });
    expect(validateCardImage({ type: "image/gif", size: 1000 })).toEqual({
      ok: false,
      error: "Formats acceptés : JPEG, PNG ou WebP.",
    });
    expect(validateCardImage({ type: "image/jpeg", size: 2 * 1024 * 1024 + 1 })).toEqual({
      ok: false,
      error: "L'image dépasse 2 Mo.",
    });
    expect(validateCardImage({ type: "image/jpeg", size: 0 }).ok).toBe(false);
  });
});

describe("doneListWarning", () => {
  const done = { id: "fin", is_done_list: true };
  const doing = { id: "cours" };
  const items = [{ done: true }, { done: false }];

  it("avertit seulement vers la liste de fin, avec une checklist inachevée", () => {
    expect(doneListWarning(items, doing, done)).toBe(
      "La checklist n'est pas finie (1/2). La déplacer quand même ?",
    );
    expect(doneListWarning(items, doing, { id: "revue" })).toBeNull();
    expect(doneListWarning([{ done: true }], doing, done)).toBeNull();
    expect(doneListWarning([], doing, done)).toBeNull();
    // Réordonner à l'intérieur de la liste de fin ne redemande rien.
    expect(doneListWarning(items, done, done)).toBeNull();
  });
});

describe("droits des membres", () => {
  it("le propriétaire modifie toutes les cartes, un membre seulement les siennes", () => {
    expect(canEditCard({ isOwner: true, userId: "proprio", authorId: "membre" })).toBe(true);
    expect(canEditCard({ isOwner: false, userId: "membre", authorId: "membre" })).toBe(true);
    expect(canEditCard({ isOwner: false, userId: "membre", authorId: "proprio" })).toBe(false);
    expect(canEditCard({ isOwner: false, userId: "membre", authorId: null })).toBe(false);
  });

  it("valide le pseudo d'une invitation", () => {
    expect(validateUsernameInput(" @Remy ")).toEqual({ ok: true, value: "remy" });
    expect(validateUsernameInput("")).toEqual({
      ok: false,
      error: "Indique le pseudo de la personne à inviter.",
    });
    expect(validateUsernameInput("a b").ok).toBe(false);
  });
});

