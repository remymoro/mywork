"use client";

import { useEffect, useRef, useState, type DragEvent } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { MAX_CARD_IMAGES, validateCardImage, type KanbanCardImage } from "@/lib/kanban";
import { deleteCardImage, uploadCardImage } from "@/app/dashboard/kanban/actions";

type Props = {
  boardId: string;
  cardId: string;
  images: KanbanCardImage[];
  readOnly?: boolean;
};

// Images d'une carte : bouton, glisser-déposer d'un fichier ou collage (Ctrl/⌘ + V).
export function CardImages({ boardId, cardId, images, readOnly = false }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const remaining = MAX_CARD_IMAGES - images.length;

  async function upload(files: File[]) {
    if (readOnly || uploading || files.length === 0) return;
    setError(null);
    if (remaining <= 0) {
      setError("5 images au maximum par carte.");
      return;
    }
    const messages: string[] = [];
    if (files.length > remaining) {
      messages.push(`Seules ${remaining} image${remaining > 1 ? "s ont" : " a"} été gardée${remaining > 1 ? "s" : ""} : 5 au maximum par carte.`);
    }
    setUploading(true);
    try {
      // Une image par envoi : chaque requête reste sous la limite de taille des actions serveur.
      for (const file of files.slice(0, remaining)) {
        const checked = validateCardImage(file);
        if (!checked.ok) {
          messages.push(`${file.name} : ${checked.error}`);
          continue;
        }
        const formData = new FormData();
        formData.append("image", file);
        const result = await uploadCardImage(boardId, cardId, formData);
        if (result.error) messages.push(`${file.name} : ${result.error}`);
      }
    } catch {
      messages.push("Connexion perdue pendant l'envoi. Réessaie.");
    } finally {
      setUploading(false);
      if (messages.length) setError(messages.join(" "));
      router.refresh();
    }
  }

  // Collage d'une image copiée (capture d'écran…) tant que la fenêtre de la carte est ouverte.
  const uploadRef = useRef(upload);
  useEffect(() => {
    uploadRef.current = upload;
  });
  useEffect(() => {
    if (readOnly) return;
    function onPaste(event: ClipboardEvent) {
      const files = Array.from(event.clipboardData?.files ?? []).filter((file) =>
        file.type.startsWith("image/"),
      );
      if (files.length === 0) return;
      event.preventDefault();
      void uploadRef.current(files);
    }
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [readOnly]);

  function onDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    setDragOver(false);
    void upload(Array.from(event.dataTransfer.files));
  }

  async function remove(image: KanbanCardImage) {
    setError(null);
    try {
      const result = await deleteCardImage(boardId, cardId, image.id);
      if (result.error) setError(result.error);
      router.refresh();
    } catch {
      setError("Connexion perdue. Réessaie.");
    }
  }

  if (readOnly && images.length === 0) return null;

  return (
    <section
      aria-labelledby="card-images-heading"
      className={
        dragOver
          ? "space-y-3 rounded-lg border-t border-dashed border-primary bg-accent/40 pt-4"
          : "space-y-3 border-t pt-4"
      }
      onDragOver={(event) => {
        if (readOnly || !event.dataTransfer.types.includes("Files")) return;
        event.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={readOnly ? undefined : onDrop}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 id="card-images-heading" className="font-heading text-xl">
          Images
        </h3>
        <span className="text-sm text-muted-foreground">
          {images.length}/{MAX_CARD_IMAGES}
        </span>
      </div>

      {images.length > 0 && (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {images.map((image, index) => (
            <li key={image.id} className="group relative">
              {image.url ? (
                // Clic : l'image en grand dans un nouvel onglet (adresse signée, valable une heure).
                <a href={image.url} target="_blank" rel="noreferrer noopener" className="block">
                  {/* eslint-disable-next-line @next/next/no-img-element -- adresse signée temporaire */}
                  <img
                    src={image.url}
                    alt={`Image ${index + 1} de la carte`}
                    className="aspect-square w-full rounded-md border object-cover"
                  />
                </a>
              ) : (
                <div className="flex aspect-square items-center justify-center rounded-md border text-xs text-muted-foreground">
                  Indisponible
                </div>
              )}
              {!readOnly && (
                <button
                  type="button"
                  aria-label={`Supprimer l'image ${index + 1}`}
                  onClick={() => void remove(image)}
                  className="absolute top-1 right-1 rounded-full bg-background/90 p-1 shadow-sm hover:text-destructive"
                >
                  <X aria-hidden="true" className="size-3.5" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {!readOnly && (
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading || remaining <= 0}
            onClick={() => inputRef.current?.click()}
          >
            <ImagePlus aria-hidden="true" />
            {uploading ? "Envoi…" : "Ajouter une image"}
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            hidden
            aria-label="Choisir des images"
            onChange={(event) => {
              void upload(Array.from(event.target.files ?? []));
              event.target.value = "";
            }}
          />
          <p className="text-xs text-muted-foreground">
            {remaining <= 0
              ? "5 images au maximum : supprime-en une pour en ajouter."
              : "Ou glisse un fichier ici, ou colle une image (Ctrl/⌘ + V). JPEG, PNG ou WebP, 2 Mo."}
          </p>
        </div>
      )}

      {error && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </section>
  );
}
