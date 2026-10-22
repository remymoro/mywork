import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  from: vi.fn(),
  rpc: vi.fn(),
  remove: vi.fn(),
  createSignedUrl: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: mocks.getUser },
    from: mocks.from,
    rpc: mocks.rpc,
    storage: { from: () => ({ remove: mocks.remove, createSignedUrl: mocks.createSignedUrl }) },
  }),
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

import {
  createFolder,
  deleteFile,
  deleteFolder,
  downloadFile,
  finalizeUpload,
  prepareUpload,
  setFilePublic,
} from "./actions";

type Reply = { data: unknown; error: { message: string; code?: string } | null };
const replies: Reply[] = [];
const queries: ReturnType<typeof query>[] = [];

function query() {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockReturnThis(),
    then(resolve: (reply: Reply) => unknown) {
      return Promise.resolve(replies.shift() ?? { data: null, error: null }).then(resolve);
    },
  };
}
const ok = (data: unknown): Reply => ({ data, error: null });
const FOLDER = "5b3f0c1e-1111-4222-8333-444455556666";
const FILE = "9a8b7c6d-1111-4222-8333-444455556666";
const MB = 1024 * 1024;

beforeEach(() => {
  vi.clearAllMocks();
  replies.length = 0;
  queries.length = 0;
  delete process.env.STORAGE_LIMIT_BYTES;
  mocks.getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
  mocks.redirect.mockImplementation(() => {
    throw new Error("REDIRECT");
  });
  mocks.from.mockImplementation(() => {
    const result = query();
    queries.push(result);
    return result;
  });
  mocks.rpc.mockResolvedValue({ data: [{ bucket_id: "files", bytes: 100 }], error: null });
  mocks.remove.mockResolvedValue({ error: null });
});

describe("actions Drive : session et validation", () => {
  it("renvoie le visiteur vers la connexion avant tout accès", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } });
    await expect(createFolder("Photos")).rejects.toThrow("REDIRECT");
    expect(mocks.redirect).toHaveBeenCalledWith("/login");
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("refuse un nom de dossier vide ou avec « / » sans toucher la base", async () => {
    expect((await createFolder("  ")).error).toBeDefined();
    expect((await createFolder("a/b")).error).toContain("/");
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("crée un dossier au nom du propriétaire connecté", async () => {
    replies.push(ok({ id: "d1" }));
    expect(await createFolder(" Photos ")).toEqual({ saved: true, id: "d1" });
    expect(queries[0].insert).toHaveBeenCalledWith({ owner_id: "user-1", name: "Photos" });
  });

  it("explique un nom déjà pris sans exposer l'erreur de la base", async () => {
    replies.push({ data: null, error: { message: 'duplicate key "drive_folders_owner_id_name_key"', code: "23505" } });
    expect((await createFolder("Photos")).error).toBe("Ce nom existe déjà à cet endroit.");
  });
});

describe("prepareUpload", () => {
  it("refuse un programme, un fichier trop lourd, sans interroger la base", async () => {
    expect((await prepareUpload(null, "setup.exe", 10)).error).toContain("programme ou script");
    expect((await prepareUpload(null, "gros.zip", 11 * MB)).error).toContain("dépasse");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("refuse un dossier qui n'est pas au propriétaire", async () => {
    replies.push(ok(null));
    expect((await prepareUpload(FOLDER, "a.txt", 10)).error).toBe("Dossier introuvable.");
  });

  it("refuse l'import quand le stockage serait dépassé", async () => {
    process.env.STORAGE_LIMIT_BYTES = "1000";
    mocks.rpc.mockResolvedValue({ data: [{ bucket_id: "files", bytes: 995 }], error: null });
    const result = await prepareUpload(null, "a.txt", 10);
    expect(result.error).toContain("stockage est plein");
    expect(result.id).toBeUndefined();
  });

  it("prépare le chemin <utilisateur>/<id> et renomme un doublon", async () => {
    replies.push(ok([{ name: "a.txt" }]));
    const result = await prepareUpload(null, "A.txt", 10);
    expect(result.error).toBeUndefined();
    expect(result.name).toBe("A (2).txt");
    expect(result.path).toBe(`user-1/${result.id}`);
  });
});

describe("finalizeUpload", () => {
  const input = { id: FILE, folderId: null, name: "a.txt", size: 10, mimeType: "text/plain" };

  it("enregistre le fichier avec le propriétaire connecté et un chemin imposé par le serveur", async () => {
    replies.push(ok(null));
    expect(await finalizeUpload(input)).toEqual({ saved: true, id: FILE });
    expect(queries[0].insert).toHaveBeenCalledWith(
      expect.objectContaining({ owner_id: "user-1", storage_path: `user-1/${FILE}`, folder_id: null }),
    );
    // Privé par défaut : la visibilité n'est jamais choisie à l'import.
    expect(queries[0].insert.mock.calls[0][0]).not.toHaveProperty("is_public");
  });

  it("retire le fichier du stockage si la base le refuse (dossier plein)", async () => {
    replies.push({ data: null, error: { message: "100 éléments au maximum par dossier", code: "23514" } });
    const result = await finalizeUpload(input);
    expect(result.error).toContain("100 éléments");
    expect(mocks.remove).toHaveBeenCalledWith([`user-1/${FILE}`]);
  });

  it("retire le fichier du stockage s'il porte une extension interdite", async () => {
    const result = await finalizeUpload({ ...input, name: "virus.exe" });
    expect(result.error).toBeDefined();
    expect(mocks.remove).toHaveBeenCalledWith([`user-1/${FILE}`]);
    expect(mocks.from).not.toHaveBeenCalled();
  });
});

describe("visibilité, suppression, téléchargement", () => {
  it("filtre la visibilité sur le propriétaire", async () => {
    replies.push(ok({ id: FILE }));
    expect((await setFilePublic(FILE, true)).saved).toBe(true);
    expect(queries[0].update).toHaveBeenCalledWith({ is_public: true });
    expect(queries[0].eq).toHaveBeenCalledWith("owner_id", "user-1");
  });

  it("supprime la ligne puis l'objet du stockage", async () => {
    replies.push(ok({ storage_path: `user-1/${FILE}` }));
    expect((await deleteFile(FILE)).saved).toBe(true);
    expect(mocks.remove).toHaveBeenCalledWith([`user-1/${FILE}`]);
  });

  it("ne supprime rien dans le stockage si le fichier n'est pas à l'utilisateur", async () => {
    replies.push(ok(null));
    expect((await deleteFile(FILE)).error).toBeDefined();
    expect(mocks.remove).not.toHaveBeenCalled();
  });

  it("supprime un dossier avec les objets de ses fichiers", async () => {
    replies.push(ok({ id: FOLDER })); // dossier trouvé
    replies.push(ok([{ storage_path: "user-1/a" }, { storage_path: "user-1/b" }])); // fichiers du dossier
    replies.push(ok({ id: FOLDER })); // suppression
    expect((await deleteFolder(FOLDER)).saved).toBe(true);
    expect(mocks.remove).toHaveBeenCalledWith(["user-1/a", "user-1/b"]);
  });

  it("donne une adresse signée de 60 secondes avec le nom du fichier", async () => {
    replies.push(ok({ name: "cv.pdf", storage_path: `user-1/${FILE}` }));
    mocks.createSignedUrl.mockResolvedValue({ data: { signedUrl: "https://x/signed" }, error: null });
    expect(await downloadFile(FILE)).toEqual({ url: "https://x/signed" });
    expect(mocks.createSignedUrl).toHaveBeenCalledWith(`user-1/${FILE}`, 60, { download: "cv.pdf" });
  });
});
