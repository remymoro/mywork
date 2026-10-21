// Règles du Kanban : validation et rendu limité, sans accès à la base.
import {
  ChartNoAxesCombined,
  FileText,
  Folder,
  Star,
  Target,
  UserRound,
  type LucideIcon,
} from "lucide-react";

export const MAX_LISTS = 5;
export const MAX_CARDS = 20;
export const MAX_CHECKLIST_ITEMS = 30;
export const BOARD_NAME_MAX = 60;
export const LIST_TITLE_MAX = 60;
export const CARD_TITLE_MAX = 150;
export const DESCRIPTION_MAX = 10000;
export const CHECKLIST_TEXT_MAX = 200;
export const COMMENT_MAX = 2000;

export const BOARD_ICONS = [
  { value: "document", label: "Document", icon: FileText },
  { value: "graphique", label: "Graphique", icon: ChartNoAxesCombined },
  { value: "personne", label: "Personne", icon: UserRound },
  { value: "dossier", label: "Dossier", icon: Folder },
  { value: "etoile", label: "Étoile", icon: Star },
  { value: "cible", label: "Cible", icon: Target },
] as const satisfies readonly { value: string; label: string; icon: LucideIcon }[];

export const LIST_COLORS = [
  {
    value: "rose",
    label: "Rose",
    headerClass: "bg-rose-100 text-rose-950 dark:bg-rose-950 dark:text-rose-100",
    dotClass: "bg-rose-500",
  },
  {
    value: "jaune",
    label: "Jaune",
    headerClass: "bg-amber-100 text-amber-950 dark:bg-amber-950 dark:text-amber-100",
    dotClass: "bg-amber-500",
  },
  {
    value: "bleu",
    label: "Bleu",
    headerClass: "bg-sky-100 text-sky-950 dark:bg-sky-950 dark:text-sky-100",
    dotClass: "bg-sky-500",
  },
  {
    value: "vert",
    label: "Vert",
    headerClass: "bg-emerald-100 text-emerald-950 dark:bg-emerald-950 dark:text-emerald-100",
    dotClass: "bg-emerald-500",
  },
  {
    value: "violet",
    label: "Violet",
    headerClass: "bg-violet-100 text-violet-950 dark:bg-violet-950 dark:text-violet-100",
    dotClass: "bg-violet-500",
  },
  {
    value: "gris",
    label: "Gris",
    headerClass: "bg-stone-200 text-stone-950 dark:bg-stone-800 dark:text-stone-100",
    dotClass: "bg-stone-500",
  },
] as const;

export type BoardIcon = (typeof BOARD_ICONS)[number]["value"];
export type ListColor = (typeof LIST_COLORS)[number]["value"];
export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

export type KanbanBoard = {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  icon: BoardIcon;
  is_public: boolean;
  position: number;
  created_at: string;
};

export type KanbanList = {
  id: string;
  board_id: string;
  title: string;
  color: ListColor;
  position: number;
  created_at: string;
};

export type KanbanCard = {
  id: string;
  list_id: string;
  board_id: string;
  title: string;
  description: string;
  position: number;
  author_profile_id: string | null;
  created_at: string;
  updated_at: string;
};

export type ChecklistItem = {
  id: string;
  card_id: string;
  text: string;
  done: boolean;
  position: number;
};

export type KanbanComment = {
  id: string;
  card_id: string;
  author_profile_id: string | null;
  body: string;
  created_at: string;
  author_name?: string;
};

function validateText(raw: string, label: string, max: number, required = true): Result<string> {
  if (typeof raw !== "string") return { ok: false, error: `${label} : texte invalide.` };
  const value = raw.trim();
  if (required && !value) return { ok: false, error: `${label} est obligatoire.` };
  if (value.length > max) return { ok: false, error: `${label} : ${max} caractères maximum.` };
  return { ok: true, value };
}

export function validateBoardName(raw: string): Result<string> {
  return validateText(raw, "Le nom du tableau", BOARD_NAME_MAX);
}

export function validateListTitle(raw: string): Result<string> {
  return validateText(raw, "Le titre de la liste", LIST_TITLE_MAX);
}

export function validateCardTitle(raw: string): Result<string> {
  return validateText(raw, "Le titre de la carte", CARD_TITLE_MAX);
}

export function validateDescription(raw: string): Result<string> {
  return validateText(raw, "La description", DESCRIPTION_MAX, false);
}

export function validateChecklistText(raw: string): Result<string> {
  return validateText(raw, "Le texte de l'élément", CHECKLIST_TEXT_MAX);
}

export function validateComment(raw: string): Result<string> {
  return validateText(raw, "Le commentaire", COMMENT_MAX);
}

export function validateBoardIcon(raw: string): Result<BoardIcon> {
  const icon = BOARD_ICONS.find((item) => item.value === raw);
  return icon
    ? { ok: true, value: icon.value }
    : { ok: false, error: "Choisis une icône proposée." };
}

export function validateListColor(raw: string): Result<ListColor> {
  const color = LIST_COLORS.find((item) => item.value === raw);
  return color
    ? { ok: true, value: color.value }
    : { ok: false, error: "Choisis une couleur proposée." };
}

/** L'unicité du slug est vérifiée par l'action et la contrainte de la base. */
export function slugify(raw: string): string {
  return (
    raw
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/œ/g, "oe")
      .replace(/æ/g, "ae")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "tableau"
  );
}

export function checklistProgress(items: readonly { done: boolean }[]) {
  const total = items.length;
  const done = items.filter((item) => item.done).length;
  return {
    done,
    total,
    percent: total ? Math.round((done / total) * 100) : 0,
    complete: total > 0 && done === total,
  };
}

export type MarkdownInline =
  | { type: "text"; text: string }
  | { type: "strong" | "emphasis"; text: string }
  | { type: "link"; text: string; href: string };

export type MarkdownNode =
  | { type: "paragraph"; children: MarkdownInline[] }
  | { type: "heading"; children: MarkdownInline[] }
  | { type: "bullet-list"; items: MarkdownInline[][] }
  | { type: "numbered-list"; items: MarkdownInline[][] };

function safeLink(raw: string): boolean {
  if (!/^https?:\/\//i.test(raw) || /\s/.test(raw)) return false;
  try {
    const url = new URL(raw);
    return (url.protocol === "https:" || url.protocol === "http:") && Boolean(url.hostname);
  } catch {
    return false;
  }
}

/** Aucune chaîne n'est traitée comme du HTML ; une syntaxe inconnue reste du texte. */
function parseInline(raw: string): MarkdownInline[] {
  const nodes: MarkdownInline[] = [];
  // Les constructions hors périmètre sont prises en un bloc avant les mises en forme.
  const pattern =
    /`+[^`\n]*`+|<([a-z][a-z\d]*)\b[^>]*>[\s\S]*?<\/\1>|<[^>\n]*>|\*{3,}[^*\n]*\*{3,}|!?\[[^\]\n]*\]\([^\n)]*\)|\*\*[^*\n]+\*\*|\*[^*\n]+\*/gi;
  let cursor = 0;
  function appendText(text: string) {
    if (!text) return;
    const previous = nodes.at(-1);
    if (previous?.type === "text") previous.text += text;
    else nodes.push({ type: "text", text });
  }
  for (const match of raw.matchAll(pattern)) {
    appendText(raw.slice(cursor, match.index));
    const token = match[0];
    if (token.startsWith("***")) {
      appendText(token);
    } else if (token.startsWith("**")) {
      nodes.push({ type: "strong", text: token.slice(2, -2) });
    } else if (token.startsWith("*")) {
      nodes.push({ type: "emphasis", text: token.slice(1, -1) });
    } else {
      const link = /^\[([^\]]*)\]\((.*)\)$/.exec(token);
      if (link && safeLink(link[2])) nodes.push({ type: "link", text: link[1], href: link[2] });
      else appendText(token);
    }
    cursor = match.index + token.length;
  }
  appendText(raw.slice(cursor));
  return nodes;
}

/** Seulement ##, listes, gras, italique et liens http(s). Les retours à la ligne sont conservés. */
export function parseMarkdown(raw: string): MarkdownNode[] {
  const nodes: MarkdownNode[] = [];
  const lines = raw.replace(/\r\n?/g, "\n").split("\n");
  let paragraph: string[] = [];
  let code: string[] | null = null;
  function flushParagraph() {
    if (paragraph.length)
      nodes.push({ type: "paragraph", children: parseInline(paragraph.join("\n")) });
    paragraph = [];
  }
  for (const line of lines) {
    if (code) {
      code.push(line);
      if (/^```/.test(line)) {
        nodes.push({ type: "paragraph", children: [{ type: "text", text: code.join("\n") }] });
        code = null;
      }
      continue;
    }
    if (/^```/.test(line)) {
      flushParagraph();
      code = [line];
      continue;
    }
    if (!line.trim()) {
      flushParagraph();
      continue;
    }
    const heading = /^## (.+)$/.exec(line);
    const bullet = /^- (.+)$/.exec(line);
    const numbered = /^\d+\. (.+)$/.exec(line);
    if (heading) {
      flushParagraph();
      nodes.push({ type: "heading", children: parseInline(heading[1]) });
    } else if (bullet || numbered) {
      flushParagraph();
      const type = bullet ? "bullet-list" : "numbered-list";
      const children = parseInline((bullet ?? numbered)![1]);
      const previous = nodes.at(-1);
      if (previous?.type === type) previous.items.push(children);
      else nodes.push({ type, items: [children] });
    } else {
      paragraph.push(line);
    }
  }
  flushParagraph();
  if (code) nodes.push({ type: "paragraph", children: [{ type: "text", text: code.join("\n") }] });
  return nodes;
}
