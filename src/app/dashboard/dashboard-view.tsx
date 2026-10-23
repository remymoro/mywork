"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Clock, Copy, ExternalLink, Video } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "cn";
import type { Action, AppointmentCard, DashboardData } from "@/lib/dashboard";

/** Lien interne Next.js si l'adresse commence par `/`, balise `<a>` classique sinon. */
function SmartLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  if (href.startsWith("/")) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} className={className}>
      {children}
    </a>
  );
}

/** Lien d'action éditorial carmin avec flèche décorative (ignorée par les lecteurs d'écran). */
function EditorialLink({ action, className }: { action: Action; className?: string }) {
  return (
    <SmartLink
      href={action.href}
      className={cn(
        "inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-primary underline-offset-4 transition-colors hover:underline",
        className,
      )}
    >
      <span>{action.label}</span>
      <span aria-hidden="true">→</span>
    </SmartLink>
  );
}

/** Petit sur-titre en capitales espacées propre au style Éditorial. */
function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="text-[0.72rem] font-medium tracking-[0.18em] text-muted-foreground uppercase">
      {children}
    </p>
  );
}

/** Pastille compteur affichée à droite de l'en-tête des cartes. */
function CounterPill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-border bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
      {children}
    </span>
  );
}

/** État d'erreur local d'un bloc avec bouton de relecture serveur. */
function Unavailable({ message }: { message: string }) {
  const router = useRouter();
  return (
    <div
      role="status"
      className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-secondary/60 px-3.5 py-2.5 text-xs text-muted-foreground"
    >
      <p>{message}</p>
      <Button variant="outline" size="sm" onClick={() => router.refresh()}>
        Actualiser
      </Button>
    </div>
  );
}

/** Jauge fine carmin utilisant un vrai élément `<progress>` pour l'accessibilité. */
function EditorialGauge({
  ariaLabel,
  label,
  percent,
  value,
  max,
  help,
}: {
  ariaLabel: string;
  label: string;
  percent: number;
  value: number;
  max: number;
  help?: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs">
        <span className="font-medium text-foreground">{label}</span>
        <span className="text-muted-foreground">{percent} %</span>
      </div>
      <progress
        aria-label={ariaLabel}
        value={value}
        max={max}
        className="block h-1.5 w-full overflow-hidden rounded-full border border-border bg-secondary accent-primary [&::-moz-progress-bar]:rounded-full [&::-moz-progress-bar]:bg-primary [&::-webkit-progress-bar]:bg-secondary [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-primary"
      />
      {help && <p className="text-xs leading-relaxed text-muted-foreground">{help}</p>}
    </div>
  );
}

/** Structure commune des 4 cartes de la grille sous le bloc principal. */
function EditorialCard({
  eyebrow,
  title,
  badge,
  footer,
  children,
}: {
  eyebrow: string;
  title: string;
  badge?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      aria-label={title}
      className="flex min-w-0 flex-col justify-between gap-5 rounded-lg border border-border bg-card p-5 text-card-foreground sm:px-7 sm:py-6"
    >
      <div className="min-w-0 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-3.5">
          <div className="min-w-0">
            <Eyebrow>{eyebrow}</Eyebrow>
            <h2 className="mt-0.5 font-heading text-[1.3rem] font-normal tracking-tight text-foreground">
              {title}
            </h2>
          </div>
          {badge}
        </div>
        <div className="min-w-0 space-y-4">{children}</div>
      </div>
      {footer && (
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-3">
          {footer}
        </div>
      )}
    </section>
  );
}

/** Détail d'un rendez-vous dans le grand bloc en tête de page. */
function HeroAppointmentDetails({ card }: { card: AppointmentCard }) {
  return (
    <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
      <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-baseline gap-2">
          <h3 className="font-heading text-2xl font-medium tracking-tight text-foreground sm:text-[1.75rem]">
            {card.guestName}
          </h3>
          {card.company && (
            <>
              <span aria-hidden="true" className="text-muted-foreground">
                ·
              </span>
              <span className="font-heading text-lg italic text-muted-foreground sm:text-xl">
                {card.company}
              </span>
            </>
          )}
        </div>
        {card.contextLabel && (
          <p className="text-sm font-medium text-foreground">{card.contextLabel}</p>
        )}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
          <Clock aria-hidden="true" className="size-4 shrink-0 text-primary" />
          <span>{card.scheduleLabel}</span>
          <span aria-hidden="true">·</span>
          <span>
            {card.durationLabel} · {card.relativeLabel}
          </span>
        </div>
      </div>

      {(card.joinAction || card.visioHint) && (
        <div className="flex shrink-0 flex-col items-stretch gap-2 border-t border-border pt-4 md:items-end md:border-t-0 md:border-l md:pt-0 md:pl-7">
          {card.joinAction ? (
            <SmartLink
              href={card.joinAction.href}
              className={cn(buttonVariants({ variant: "default" }), "gap-2 px-4 py-2")}
            >
              <Video aria-hidden="true" className="size-4 shrink-0" />
              <span>{card.joinAction.label}</span>
            </SmartLink>
          ) : (
            card.visioHint && (
              <span className="inline-flex items-center rounded-md border border-border bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground">
                {card.visioHint}
              </span>
            )
          )}
        </div>
      )}
    </div>
  );
}

/** Ligne compacte d'un rendez-vous dans la carte « Cette semaine ». */
function WeekAppointmentItem({ card }: { card: AppointmentCard }) {
  return (
    <article className="space-y-1 py-1.5 text-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-baseline gap-1.5">
          <h4 className="font-medium text-foreground">{card.guestName}</h4>
          {card.company && (
            <>
              <span aria-hidden="true" className="text-muted-foreground">
                ·
              </span>
              <span className="font-heading italic text-muted-foreground">{card.company}</span>
            </>
          )}
        </div>
        {card.joinAction ? (
          <EditorialLink action={card.joinAction} />
        ) : card.visioHint ? (
          <span className="inline-flex items-center rounded-sm border border-border bg-muted px-2 py-0.5 text-[0.72rem] font-medium text-muted-foreground">
            {card.visioHint}
          </span>
        ) : null}
      </div>
      <p className="font-mono text-xs text-primary">{card.scheduleLabel}</p>
      <p className="text-xs text-muted-foreground">
        {card.contextLabel ? `${card.contextLabel} · ` : ""}
        {card.durationLabel} · {card.relativeLabel}
      </p>
    </article>
  );
}

/** Vue principale du tableau de bord selon la maquette A « Éditorial ». */
export function DashboardView({ data }: { data: DashboardData }) {
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [copyError, setCopyError] = useState(false);

  const todayLabel = new Intl.DateTimeFormat("fr-FR", {
    timeZone: data.timeZone,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(data.generatedAt));

  const isCopied = copiedUrl === data.profile.publicUrl && !copyError;

  async function copy() {
    try {
      await navigator.clipboard.writeText(data.profile.publicUrl);
      setCopiedUrl(data.profile.publicUrl);
      setCopyError(false);
    } catch {
      setCopyError(true);
    }
  }

  const nextCard =
    data.nextAppointment.state === "ready" ? data.nextAppointment.data : null;
  const rdvListAction =
    nextCard?.action ?? (data.week.state === "ready" ? data.week.data.action : null);

  return (
    <div className="mx-auto flex w-full max-w-[68rem] min-w-0 flex-col gap-6 text-sm text-foreground sm:gap-8">
      {/* En-tête éditorial */}
      <header className="flex flex-col gap-3 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <Eyebrow>ESPACE PRIVÉ</Eyebrow>
          <h1 className="mt-1 font-heading text-3xl font-normal tracking-tight text-foreground sm:text-[2.5rem] sm:leading-[1.15]">
            {data.greeting}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Mon tableau de bord — l’essentiel de ta journée et de ton espace en un coup d’œil.
          </p>
        </div>
        <p className="font-heading text-[0.95rem] italic text-muted-foreground">
          <time dateTime={data.generatedAt}>{todayLabel}</time>
        </p>
      </header>

      {/* Grand bloc « Prochain rendez-vous » pleine largeur avec liseré carmin */}
      <section
        aria-label="Prochain rendez-vous"
        className="flex min-w-0 flex-col gap-5 rounded-lg border border-border border-t-[3px] border-t-primary bg-card p-5 text-card-foreground sm:px-8 sm:py-7"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="font-sans text-[0.72rem] font-medium tracking-[0.18em] text-muted-foreground uppercase">
              Prochain rendez-vous
            </h2>
            {nextCard && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-foreground">
                <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
                {nextCard.relativeLabel}
              </span>
            )}
          </div>
          {rdvListAction && <EditorialLink action={rdvListAction} />}
        </div>

        {data.nextAppointment.state === "error" ? (
          <Unavailable message={data.nextAppointment.message} />
        ) : nextCard ? (
          <HeroAppointmentDetails card={nextCard} />
        ) : (
          <div className="py-1">
            <p className="font-heading text-xl text-foreground">Aucun rendez-vous prévu</p>
          </div>
        )}

        {/* Note sur l'état de la réservation */}
        <div className="border-t border-border pt-3.5 text-xs">
          {data.booking.state === "error" ? (
            <Unavailable message={data.booking.message} />
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-2 text-muted-foreground">
              <div className="flex min-w-0 items-center gap-2">
                <span
                  aria-hidden="true"
                  className={cn(
                    "size-2 shrink-0 rounded-full",
                    data.booking.data.enabled ? "bg-success" : "bg-warning",
                  )}
                />
                <p className="font-medium text-foreground">
                  {data.booking.data.visibilityLabel}
                </p>
              </div>
              <EditorialLink action={data.booking.data.action} />
            </div>
          )}
        </div>
      </section>

      {/* Grille 2 colonnes des 4 cartes modules */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Carte 1 : AGENDA / Cette semaine */}
        <EditorialCard
          eyebrow="AGENDA"
          title="Cette semaine"
          badge={
            data.week.state === "ready" && data.week.data.remainingCount > 0 ? (
              <CounterPill>
                {`${data.week.data.remainingCount} rendez-vous restants cette semaine`}
              </CounterPill>
            ) : undefined
          }
          footer={
            data.week.state === "ready" ? (
              <EditorialLink action={data.week.data.action} />
            ) : undefined
          }
        >
          {data.week.state === "error" ? (
            <Unavailable message={data.week.message} />
          ) : (
            <>
              <p className="text-xs text-muted-foreground">{data.week.data.periodLabel}</p>
              {data.week.data.remainingCount === 0 ? (
                <p className="font-heading text-lg text-foreground">
                  Aucun rendez-vous restant cette semaine
                </p>
              ) : (
                <div className="space-y-3">
                  {data.week.data.days.map((day) => (
                    <div
                      key={day.dayLabel}
                      className="space-y-1.5 border-t border-dashed border-border pt-3 first:border-t-0 first:pt-0"
                    >
                      <h3 className="text-[0.7rem] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                        {day.dayLabel}
                      </h3>
                      <div className="divide-y divide-border/60">
                        {day.appointments.map((card) => (
                          <WeekAppointmentItem key={card.id} card={card} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </EditorialCard>

        {/* Carte 2 : VITRINE / Mon profil public */}
        <EditorialCard
          eyebrow="VITRINE"
          title="Mon profil public"
          badge={
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
              <span
                aria-hidden="true"
                className={cn(
                  "size-2 rounded-full",
                  data.profile.isOnline ? "bg-success" : "bg-warning",
                )}
              />
              <span>
                {data.profile.isOnline ? data.profile.visibilityLabel : "Hors ligne"}
              </span>
            </span>
          }
          footer={<EditorialLink action={data.profile.editAction} />}
        >
          {!data.profile.isOnline && (
            <div className="rounded-md border border-border border-l-[3px] border-l-warning bg-secondary px-3.5 py-2.5 text-xs text-foreground">
              <p>{data.profile.visibilityLabel}</p>
            </div>
          )}

          {/* Encadré d'adresse publique en police mono + actions Copier / Ouvrir */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-md border border-border bg-secondary px-3.5 py-2.5">
            <p className="min-w-0 font-mono text-[0.8125rem] break-all text-foreground">
              {data.profile.publicUrl}
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              <Button variant="outline" size="sm" onClick={copy}>
                <Copy aria-hidden="true" className="size-3.5" />
                <span>{isCopied ? "Copié" : "Copier"}</span>
              </Button>
              <SmartLink
                href={data.profile.openAction.href}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              >
                <span>{data.profile.openAction.label}</span>
                <ExternalLink aria-hidden="true" className="size-3.5" />
              </SmartLink>
            </div>
          </div>

          <span role="status" className="sr-only">
            {isCopied ? "Adresse copiée" : ""}
          </span>
          {copyError && (
            <p role="alert" className="text-xs text-destructive">
              Copie impossible. Sélectionne l’adresse pour la copier.
            </p>
          )}

          {/* Jauge de complétude du profil */}
          {data.profile.completion.state === "error" ? (
            <Unavailable message={data.profile.completion.message} />
          ) : (
            <div className="space-y-2">
              <EditorialGauge
                ariaLabel="Complétude du profil"
                label={data.profile.completion.data.label}
                percent={data.profile.completion.data.percent}
                value={data.profile.completion.data.completed}
                max={data.profile.completion.data.total}
              />
              {data.profile.completion.data.suggestion && (
                <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5 text-xs text-muted-foreground">
                  <span>Prochaine étape :</span>
                  <EditorialLink action={data.profile.completion.data.suggestion} />
                </div>
              )}
            </div>
          )}
        </EditorialCard>

        {/* Carte 3 : ORGANISATION / Mes tableaux */}
        <EditorialCard
          eyebrow="ORGANISATION"
          title="Mes tableaux"
          badge={
            data.kanban.state === "ready" && data.kanban.data.boardCount > 0 ? (
              <CounterPill>{`${data.kanban.data.boardCount} tableaux accessibles`}</CounterPill>
            ) : undefined
          }
          footer={
            data.kanban.state === "ready" ? (
              <EditorialLink action={data.kanban.data.action} />
            ) : undefined
          }
        >
          {data.kanban.state === "error" ? (
            <Unavailable message={data.kanban.message} />
          ) : data.kanban.data.boardCount === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucun tableau. Ouvre le module pour créer ton premier tableau.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {data.kanban.data.boards.map((board) => (
                <li
                  key={board.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0 space-y-0.5">
                    <h3 className="font-medium text-foreground">{board.name}</h3>
                    <p className="text-xs text-muted-foreground">{board.countLabel}</p>
                  </div>
                  <EditorialLink action={board.action} />
                </li>
              ))}
            </ul>
          )}
        </EditorialCard>

        {/* Carte 4 : DOCUMENTS / Mes fichiers */}
        <EditorialCard
          eyebrow="DOCUMENTS"
          title="Mes fichiers"
          badge={
            data.drive.state === "ready" ? (
              <CounterPill>
                {data.drive.data.fileCount === 0
                  ? "Aucun fichier importé"
                  : `${data.drive.data.fileCount} fichiers importés`}
              </CounterPill>
            ) : undefined
          }
          footer={
            data.drive.state === "ready" ? (
              <EditorialLink action={data.drive.data.action} />
            ) : undefined
          }
        >
          {data.drive.state === "error" ? (
            <Unavailable message={data.drive.message} />
          ) : (
            <>
              <p className="text-xs text-muted-foreground">
                {data.drive.data.publicFilesLabel}
              </p>
              {data.drive.data.storage.state === "error" ? (
                <Unavailable message={data.drive.data.storage.message} />
              ) : (
                <EditorialGauge
                  ariaLabel="Stockage utilisé"
                  label={data.drive.data.storage.data.label}
                  percent={data.drive.data.storage.data.percent}
                  value={data.drive.data.storage.data.percent}
                  max={100}
                  help={data.drive.data.storage.data.help}
                />
              )}
            </>
          )}
        </EditorialCard>
      </div>
    </div>
  );
}
