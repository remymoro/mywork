import { describe, expect, it } from "vitest";
import { DriveNotReadyError, loadDrive } from "./data";

type Reply = { data: unknown; error: { code?: string; message: string } | null };

/** Faux client Supabase : chaque requête renvoie la réponse prévue pour sa table. */
function fakeSupabase(tables: Record<string, Reply>, rpc: Reply) {
  const chain = (reply: Reply) => {
    const q: Record<string, unknown> = {};
    for (const m of ["select", "eq", "is", "limit"]) q[m] = () => q;
    q.maybeSingle = () => Promise.resolve(reply);
    q.then = (resolve: (r: Reply) => unknown) => Promise.resolve(reply).then(resolve);
    return q;
  };
  return { from: (table: string) => chain(tables[table]), rpc: () => Promise.resolve(rpc) } as never;
}

const ok = (data: unknown): Reply => ({ data, error: null });

describe("loadDrive", () => {
  it("détecte une base sans la migration du Drive (table absente)", async () => {
    const missing: Reply = { data: null, error: { code: "PGRST205", message: "Could not find the table" } };
    const supabase = fakeSupabase({ drive_files: missing, drive_folders: missing }, missing);
    await expect(loadDrive(supabase, "u1", null)).rejects.toBeInstanceOf(DriveNotReadyError);
  });

  it("remonte les autres erreurs telles quelles", async () => {
    const broken: Reply = { data: null, error: { code: "XX000", message: "boom" } };
    const supabase = fakeSupabase({ drive_files: broken, drive_folders: ok([]) }, ok([]));
    await expect(loadDrive(supabase, "u1", null)).rejects.not.toBeInstanceOf(DriveNotReadyError);
  });

  it("assemble dossiers, fichiers et espace utilisé", async () => {
    const supabase = fakeSupabase(
      {
        drive_folders: ok([{ id: "d1", name: "Contrats", created_at: "2026-10-18T10:00:00Z" }]),
        drive_files: ok([
          { id: "f1", name: "cv.pdf", size_bytes: "1000", mime_type: "application/pdf", is_public: true, updated_at: "2026-10-22T10:00:00Z" },
        ]),
      },
      ok([{ bucket_id: "files", bytes: 1000 }, { bucket_id: "avatars", bytes: "24" }]),
    );
    const content = await loadDrive(supabase, "u1", null);
    expect(content.folder).toBeNull();
    expect(content.usedBytes).toBe(1024);
    expect(content.entries.map((e) => [e.kind, e.name, e.size, e.isPublic])).toEqual([
      ["folder", "Contrats", null, false],
      ["file", "cv.pdf", 1000, true],
    ]);
  });
});
