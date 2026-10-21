"use client";

import { useState, useTransition } from "react";
import { ArrowDown, ArrowUp, GripVertical } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PUBLIC_SECTIONS, moveInList, type PublicSectionId } from "@/lib/profile-sections";
import { updateSectionOrder } from "./actions";
import { SECTION_HEADER, SECTION_TITLE } from "./section-style";

const LABELS = Object.fromEntries(PUBLIC_SECTIONS.map((s) => [s.id, s.label])) as Record<
  PublicSectionId,
  string
>;

// Glisser-déposer natif du navigateur (pas de bibliothèque) ; les flèches servent au clavier.
export function SectionOrderForm({ initialOrder }: { initialOrder: PublicSectionId[] }) {
  const [order, setOrder] = useState(initialOrder);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [status, setStatus] = useState<{ error?: string; saved?: boolean }>({});
  const [pending, startTransition] = useTransition();

  function move(from: number, to: number) {
    if (from === to) return;
    const previous = order;
    const next = moveInList(order, from, to);
    setOrder(next);
    setStatus({});
    startTransition(async () => {
      const res = await updateSectionOrder(next);
      if (res.error) setOrder(previous);
      setStatus(res);
    });
  }

  return (
    <Card>
      <CardHeader className={SECTION_HEADER}>
        <CardTitle className={SECTION_TITLE}>Ordre des sections</CardTitle>
        <CardDescription>
          Fais glisser les sections pour choisir leur ordre sur ta page publique. L&apos;en-tête
          (photo, nom, contact) reste toujours en haut ; une section vide n&apos;est pas affichée.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <ol className="space-y-2" aria-label="Ordre des sections">
          {order.map((id, index) => (
            <li
              key={id}
              draggable
              onDragStart={(e) => {
                setDragIndex(index);
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", id);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setOverIndex(index);
              }}
              onDragLeave={() => setOverIndex((current) => (current === index ? null : current))}
              onDrop={(e) => {
                e.preventDefault();
                if (dragIndex !== null) move(dragIndex, index);
                setDragIndex(null);
                setOverIndex(null);
              }}
              onDragEnd={() => {
                setDragIndex(null);
                setOverIndex(null);
              }}
              className={[
                "flex cursor-grab items-center gap-3 rounded-lg border bg-card px-3 py-2 text-sm active:cursor-grabbing",
                dragIndex === index ? "opacity-50" : "",
                overIndex === index && dragIndex !== index ? "border-primary ring-1 ring-primary" : "",
              ].join(" ")}
            >
              <GripVertical aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
              <span className="w-5 text-muted-foreground">{index + 1}.</span>
              <span className="flex-1 font-medium">{LABELS[id]}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Monter ${LABELS[id]}`}
                disabled={index === 0 || pending}
                onClick={() => move(index, index - 1)}
              >
                <ArrowUp aria-hidden="true" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Descendre ${LABELS[id]}`}
                disabled={index === order.length - 1 || pending}
                onClick={() => move(index, index + 1)}
              >
                <ArrowDown aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ol>
        {status.error && (
          <Alert variant="destructive" role="alert">
            <AlertDescription>{status.error}</AlertDescription>
          </Alert>
        )}
        {status.saved && !pending && (
          <p role="status" className="text-sm text-muted-foreground">
            Ordre enregistré.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
