import { describe, expect, it } from "vitest";
import {
  DEFAULT_STORAGE_LIMIT_BYTES,
  MAX_FILE_BYTES,
  categoryOf,
  filterEntries,
  formatSize,
  hasForbiddenExtension,
  sortEntries,
  storageLimit,
  totalUsage,
  uniqueName,
  usagePercent,
  validateName,
  validateUpload,
  type DriveEntry,
} from "./drive";

const entry = (over: Partial<DriveEntry>): DriveEntry => ({
  kind: "file",
  id: over.name ?? "x",
  name: "a.txt",
  size: 10,
  mimeType: "text/plain",
  updatedAt: "2026-10-01T10:00:00Z",
  isPublic: false,
  ...over,
});

describe("noms et types", () => {
  it("refuse les programmes et scripts, quelle que soit la casse", () => {
    expect(hasForbiddenExtension("setup.EXE")).toBe(true);
    expect(hasForbiddenExtension("run.sh")).toBe(true);
    expect(hasForbiddenExtension("cv.pdf")).toBe(false);
    expect(hasForbiddenExtension("exe")).toBe(false);
  });

  it("valide un nom de fichier ou de dossier", () => {
    expect(validateName("  cv.pdf ", { file: true })).toEqual({ ok: true, value: "cv.pdf" });
    expect(validateName("", { file: true }).ok).toBe(false);
    expect(validateName("a/b", { file: true }).ok).toBe(false);
    expect(validateName("x".repeat(101), { file: true }).ok).toBe(false);
    expect(validateName("outil.exe", { file: true }).ok).toBe(false);
    // Un dossier peut s'appeler comme il veut (pas de contrôle d'extension).
    expect(validateName("archives.js", { file: false }).ok).toBe(true);
  });

  it("refuse un fichier trop lourd", () => {
    expect(validateUpload("a.zip", MAX_FILE_BYTES).ok).toBe(true);
    const tooBig = validateUpload("a.zip", MAX_FILE_BYTES + 1);
    expect(tooBig.ok).toBe(false);
  });
});

describe("doublons", () => {
  it("renomme avec un numéro, en gardant l'extension", () => {
    expect(uniqueName("cv.pdf", [])).toBe("cv.pdf");
    expect(uniqueName("cv.pdf", ["CV.pdf"])).toBe("cv (2).pdf");
    expect(uniqueName("cv.pdf", ["cv.pdf", "cv (2).pdf"])).toBe("cv (3).pdf");
    expect(uniqueName("notes", ["notes"])).toBe("notes (2)");
    expect(uniqueName(".env", [".env"])).toBe(".env (2)");
  });

  it("reste dans 100 caractères", () => {
    const name = "x".repeat(96) + ".txt";
    expect(uniqueName(name, [name]).length).toBeLessThanOrEqual(100);
  });
});

describe("tri, recherche", () => {
  const entries = [
    entry({ name: "b.txt", updatedAt: "2026-10-05T10:00:00Z" }),
    entry({ kind: "folder", name: "Zèbre", size: null, mimeType: null }),
    entry({ name: "A.txt", updatedAt: "2026-10-10T10:00:00Z" }),
    entry({ kind: "folder", name: "Alpha", size: null, mimeType: null }),
  ];

  it("trie par nom avec les dossiers toujours en premier", () => {
    expect(sortEntries(entries, "name", "asc").map((e) => e.name)).toEqual(["Alpha", "Zèbre", "A.txt", "b.txt"]);
    expect(sortEntries(entries, "name", "desc").map((e) => e.name)).toEqual(["Zèbre", "Alpha", "b.txt", "A.txt"]);
  });

  it("trie par date de modification", () => {
    expect(sortEntries(entries, "date", "desc").filter((e) => e.kind === "file").map((e) => e.name)).toEqual([
      "A.txt",
      "b.txt",
    ]);
    expect(sortEntries(entries, "date", "asc")[2].name).toBe("b.txt");
  });

  it("ne modifie pas la liste d'origine", () => {
    const copy = [...entries];
    sortEntries(entries, "name", "desc");
    expect(entries).toEqual(copy);
  });

  it("cherche sans accents ni majuscules", () => {
    const list = [entry({ name: "Résumé.pdf" }), entry({ name: "budget.xlsx" })];
    expect(filterEntries(list, "RESUME").map((e) => e.name)).toEqual(["Résumé.pdf"]);
    expect(filterEntries(list, "  ").length).toBe(2);
    expect(filterEntries(list, "zzz")).toEqual([]);
  });
});

describe("affichage", () => {
  it("formate les tailles", () => {
    expect(formatSize(0)).toBe("0 o");
    expect(formatSize(88_064)).toBe("86 Ko");
    expect(formatSize(1_468_006)).toBe("1,4 Mo");
    expect(formatSize(10 * 1024 * 1024)).toBe("10 Mo");
    expect(formatSize(412 * 1024 * 1024)).toBe("412 Mo");
    expect(formatSize(1_073_741_824)).toBe("1 Go");
  });
});

describe("jauge de stockage", () => {
  it("additionne les dossiers de stockage (valeurs texte ou nombre)", () => {
    expect(
      totalUsage([
        { bucket_id: "files", bytes: 500 },
        { bucket_id: "avatars", bytes: "20" },
      ]),
    ).toBe(520);
    expect(totalUsage([])).toBe(0);
  });

  it("calcule le pourcentage, plafonné à 100", () => {
    expect(usagePercent(412, 1000)).toBe(41);
    expect(usagePercent(2000, 1000)).toBe(100);
    expect(usagePercent(1, 0)).toBe(100);
  });

  it("lit le plafond depuis la configuration, sinon 1 Go", () => {
    expect(storageLimit("500000000")).toBe(500_000_000);
    expect(storageLimit(undefined)).toBe(DEFAULT_STORAGE_LIMIT_BYTES);
    expect(storageLimit("abc")).toBe(DEFAULT_STORAGE_LIMIT_BYTES);
    expect(storageLimit("-5")).toBe(DEFAULT_STORAGE_LIMIT_BYTES);
  });
});

describe("type d'un fichier (filtre du Drive public)", () => {
  it("classe d'après le type MIME", () => {
    expect(categoryOf("application/pdf", "a.pdf")).toBe("documents");
    expect(categoryOf("text/plain", "a.txt")).toBe("documents");
    expect(categoryOf("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "a.xlsx")).toBe("documents");
    expect(categoryOf("image/png", "a.png")).toBe("images");
    expect(categoryOf("application/zip", "a.zip")).toBe("autres");
  });

  it("se rabat sur l'extension quand le type est absent ou générique", () => {
    expect(categoryOf(null, "Logo.PNG")).toBe("images");
    expect(categoryOf("application/octet-stream", "notes.docx")).toBe("documents");
    expect(categoryOf("", "archive.zip")).toBe("autres");
    expect(categoryOf("application/zip", "photo.png")).toBe("autres");
  });
});
