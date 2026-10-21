"use client";

import { useActionState, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, Eye, EyeOff, Pencil, Plus, Trash2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { SectionName } from "@/lib/profile-sections";
import {
  deleteSectionItem,
  moveSectionItem,
  saveSectionItem,
  setSectionItemVisible,
  type FormState,
} from "./actions";
import {
  CertificationFields,
  formatCertificationSummary,
  type CertificationRow,
} from "./certification-fields";
import { EducationFields, formatEducationSummary, type EducationRow } from "./education-fields";
import { ExperienceFields, formatExperienceSummary, type ExperienceRow } from "./experience-fields";
import { LanguageFields, formatLanguageSummary, type LanguageRow } from "./language-fields";
import { ProjectFields, formatProjectSummary, type ProjectRow } from "./project-fields";
import { SECTION_HEADER, SECTION_TITLE } from "./section-style";
import { ServiceFields, formatServiceSummary, type ServiceRow } from "./service-fields";

export type BaseSectionItem = {
  id: string;
  position: number;
  is_visible: boolean;
};

type SectionItemFormProps = {
  section: SectionName;
  itemId?: string;
  onCancel: () => void;
  onSaved: () => void;
  children: ReactNode;
};

function SectionItemForm({ section, itemId, onCancel, onSaved, children }: SectionItemFormProps) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    async (prev, formData) => {
      const res = await saveSectionItem(section, prev, formData);
      if (res?.saved) onSaved();
      return res;
    },
    {},
  );

  return (
    <form action={action} className="space-y-4 rounded-lg border bg-muted/20 p-4">
      {itemId && <input type="hidden" name="id" value={itemId} />}
      {children}
      {state.error && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          Enregistrer
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={pending}>
          Annuler
        </Button>
      </div>
    </form>
  );
}

function defaultSummary(section: SectionName, item: BaseSectionItem): string {
  switch (section) {
    case "experiences":
      return formatExperienceSummary(item as ExperienceRow);
    case "educations":
      return formatEducationSummary(item as EducationRow);
    case "languages":
      return formatLanguageSummary(item as LanguageRow);
    case "certifications":
      return formatCertificationSummary(item as CertificationRow);
    case "projects":
      return formatProjectSummary(item as ProjectRow);
    case "services":
      return formatServiceSummary(item as ServiceRow);
  }
}

function defaultFields(section: SectionName, item?: BaseSectionItem): ReactNode {
  switch (section) {
    case "experiences":
      return <ExperienceFields item={item as ExperienceRow | undefined} />;
    case "educations":
      return <EducationFields item={item as EducationRow | undefined} />;
    case "languages":
      return <LanguageFields item={item as LanguageRow | undefined} />;
    case "certifications":
      return <CertificationFields item={item as CertificationRow | undefined} />;
    case "projects":
      return <ProjectFields item={item as ProjectRow | undefined} />;
    case "services":
      return <ServiceFields item={item as ServiceRow | undefined} />;
  }
}

export type SectionListProps<T extends BaseSectionItem = BaseSectionItem> = {
  section: SectionName;
  title: string;
  items: T[];
  /** Texte du bouton d'ajout, ex. « Ajouter une expérience ». */
  addLabel: string;
  /** Intégrée dans une autre carte (ex. prestations dans l'offre freelance) : petit titre, pas de carte. */
  embedded?: boolean;
  renderSummary?: (item: T) => string;
  renderFields?: (item?: T) => ReactNode;
};

export function SectionList<T extends BaseSectionItem>({
  section,
  title,
  items,
  addLabel,
  embedded = false,
  renderSummary,
  renderFields,
}: SectionListProps<T>) {
  const [openForm, setOpenForm] = useState<"new" | string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const getSummary = (item: T) =>
    renderSummary ? renderSummary(item) : defaultSummary(section, item);
  const getFields = (item?: T) =>
    renderFields ? renderFields(item) : defaultFields(section, item);

  async function handleToggleVisible(item: T) {
    setActionError(null);
    const res = await setSectionItemVisible(section, item.id, !item.is_visible);
    if (res?.error) setActionError(res.error);
  }

  async function handleMove(id: string, direction: -1 | 1) {
    setActionError(null);
    const res = await moveSectionItem(section, id, direction);
    if (res?.error) setActionError(res.error);
  }

  async function handleConfirmDelete() {
    if (!deletingId) return;
    setActionError(null);
    const res = await deleteSectionItem(section, deletingId);
    if (res?.error) setActionError(res.error);
    setDeletingId(null);
  }

  const content = (
    <>
      {actionError && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      )}

      <ul className="space-y-2">
        {items.map((item, index) => {
          const isEditing = openForm === item.id;
          return (
            <li key={item.id} className="space-y-2 rounded-lg border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={
                      item.is_visible
                        ? "text-sm font-medium text-foreground"
                        : "text-sm text-muted-foreground opacity-60"
                    }
                  >
                    {getSummary(item)}
                  </span>
                  {!item.is_visible && <Badge variant="secondary">Masqué</Badge>}
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Modifier"
                    onClick={() => setOpenForm(isEditing ? null : item.id)}
                  >
                    <Pencil aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={item.is_visible ? "Masquer" : "Afficher"}
                    onClick={() => handleToggleVisible(item)}
                  >
                    {item.is_visible ? (
                      <EyeOff aria-hidden="true" />
                    ) : (
                      <Eye aria-hidden="true" />
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Monter"
                    disabled={index === 0}
                    onClick={() => handleMove(item.id, -1)}
                  >
                    <ArrowUp aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Descendre"
                    disabled={index === items.length - 1}
                    onClick={() => handleMove(item.id, 1)}
                  >
                    <ArrowDown aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Supprimer"
                    onClick={() => setDeletingId(item.id)}
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                </div>
              </div>

              {isEditing && (
                <SectionItemForm
                  key={item.id}
                  section={section}
                  itemId={item.id}
                  onCancel={() => setOpenForm(null)}
                  onSaved={() => setOpenForm(null)}
                >
                  {getFields(item)}
                </SectionItemForm>
              )}
            </li>
          );
        })}
      </ul>

      {openForm === "new" ? (
        <SectionItemForm
          key="new"
          section={section}
          onCancel={() => setOpenForm(null)}
          onSaved={() => setOpenForm(null)}
        >
          {getFields(undefined)}
        </SectionItemForm>
      ) : (
        <Button type="button" variant="outline" onClick={() => setOpenForm("new")}>
          <Plus aria-hidden="true" />
          {addLabel}
        </Button>
      )}

      <Dialog open={deletingId !== null} onOpenChange={(open) => !open && setDeletingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer cet élément ?</DialogTitle>
            <DialogDescription>
              Cette action est définitive. Tu peux aussi simplement le masquer au public.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeletingId(null)}>
              Annuler
            </Button>
            <Button type="button" variant="destructive" onClick={handleConfirmDelete}>
              Confirmer la suppression
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );

  if (embedded) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">{title}</h3>
        {content}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className={SECTION_HEADER}>
        <CardTitle className={SECTION_TITLE}>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">{content}</CardContent>
    </Card>
  );
}
