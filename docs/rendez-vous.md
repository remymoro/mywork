# Module Rendez-vous

Prise de rendez-vous « à la Calendly », version **minimale**, **avec visio** (décision du 2026-10-22 : la visio fait partie de ce module, au 4ᵉ rang de `docs/vision.md`). Voir `docs/decisions.md` (D26, D11, D25).

Statut : **acté le 2026-10-22** par le porteur (décisions V1 et réponses aux questions de détail).

## Décisions V1

| Sujet | Décision |
|---|---|
| Organisateur | Un propriétaire par profil public, avec son propre agenda (pas d'agenda partagé, pas d'équipe, pas de tour de rôle) |
| Réservation | Depuis le profil public MyWork, nouvel onglet **« Rendez-vous »** à côté de Profil et Drive (`/<pseudo>?onglet=rdv`, cohérent avec D25) |
| Compte visiteur | Non obligatoire : prénom, nom, e-mail et message facultatif |
| Durées | 15, 30 et 60 minutes. Le propriétaire active les durées de son choix ; le visiteur en choisit une parmi celles-là |
| Horaires par défaut | Lundi–vendredi, 9 h–12 h et 14 h–18 h |
| Personnalisation | Horaires modifiables par jour, et **exceptions** (jour de congé, horaires particuliers un jour précis) |
| Fuseau horaire | Europe/Paris pour tout le monde, avec la mention « Heure de Paris » sur la page |
| Confirmation | **Automatique** : pas de validation manuelle |
| Notifications | E-mails via Resend |
| Gestion | Consultation, **annulation** et **report** (par le visiteur avec un lien privé, et par le propriétaire depuis son tableau de bord) |

## Parcours du visiteur

1. Onglet « Rendez-vous » : choix de la durée, d'un jour (calendrier du mois), puis d'un créneau libre.
2. Formulaire : prénom, nom, e-mail, message facultatif. Bouton « Confirmer ».
3. Page de confirmation, et e-mail de confirmation avec un lien privé pour **annuler** ou **reporter**.
4. Un créneau déjà pris disparaît de la liste ; si deux visiteurs choisissent le même créneau en même temps, le second voit « Ce créneau vient d'être pris » et en choisit un autre.

## Parcours du propriétaire

Page `/dashboard/rendez-vous` (entrée « Rendez-vous » du menu, aujourd'hui en « Bientôt ») :
- **Horaires** : plages par jour de la semaine, durées proposées.
- **Exceptions** : jours de congé ou horaires particuliers à une date.
- **Rendez-vous à venir** : liste (date, durée, nom, e-mail, message), avec annuler et reporter.

## E-mails (Resend)

| E-mail | Pour qui | Quand |
|---|---|---|
| Confirmation | Visiteur | À la réservation, avec le lien d'annulation/report |
| Nouvelle réservation | Propriétaire | À la réservation |
| Annulation | L'autre partie | Quand le visiteur ou le propriétaire annule |
| Report | L'autre partie | Quand le rendez-vous est déplacé : l'ancien créneau est libéré, les deux parties reçoivent un e-mail |

Pas de rappel avant le rendez-vous en V1.

## Règles de fonctionnement

- Aucun créneau passé, aucun créneau trop proche (préavis minimum : 4 h) ni trop lointain (horizon : 2 mois à partir d'aujourd'hui). Aucune pause entre deux rendez-vous en V1.
- **Pas de double réservation** : garantie par la base de données elle-même (contrainte d'unicité sur le créneau), pas seulement par l'écran.
- Le lien privé d'un rendez-vous contient un code long et aléatoire ; il ne donne accès qu'à ce rendez-vous.
- Anti-abus : limite de réservations par adresse e-mail et par appareil, champ piège contre les robots.
- Un profil **hors ligne** (D21) n'expose pas l'onglet Rendez-vous.
- Données personnelles des visiteurs (nom, e-mail) : lisibles seulement par le propriétaire ; à vérifier côté RGPD avec Resend (D16).

## Resend : état au 2026-10-22 et mise en service

Le porteur n'a **ni compte Resend ni domaine** pour l'instant. Le module est donc construit avec un envoi d'e-mails « débrayable » :
- sans clé `RESEND_API_KEY`, aucun e-mail ne part : le contenu est écrit dans les journaux du serveur et la réservation fonctionne quand même ;
- avec un compte Resend sans domaine vérifié, on peut tester avec l'expéditeur de test de Resend, qui n'écrit qu'à l'adresse du compte ;
- avec le domaine vérifié, il suffit de renseigner la clé et l'adresse d'expédition (`RESEND_FROM`, ex. `rdv@mywork.website`), sans toucher au code.

Les tests automatiques utilisent un faux envoi.

À faire par le porteur avant d'ouvrir la réservation à de vrais visiteurs :
1. Acheter `mywork.website` (seul coût du projet, D15).
2. Créer le compte gratuit sur resend.com, y ajouter le domaine, copier les enregistrements DNS chez le registrar, vérifier.
3. Clé d'API dans `.env.local` et dans Vercel, jamais dans le dépôt (D17).

## Visio (étape 2 du module)

Chaque rendez-vous confirmé a sa **salle de visio** : le lien est dans l'e-mail de confirmation, sur la page du rendez-vous du visiteur et dans la liste du propriétaire (bouton « Rejoindre »). Outil prévu : LiveKit (D8). Ordre de réalisation dans le module : **1) réservation** (tout ce qui précède), **2) visio**. Pendant l'étape 1, un rendez-vous garde déjà un emplacement pour un lien de visio, afin que l'étape 2 n'oblige à aucune refonte. Choix de la forme de la visio (salle intégrée à MyWork avec LiveKit, ou lien externe collé par le propriétaire) : **à trancher avant l'étape 2**. Compte LiveKit (offre gratuite) à créer par le porteur à ce moment-là.

## Réalisation (2026-10-22)

- **Maquette retenue : B** (parcours en étapes sur une seule colonne : Durée, Jour, Créneau, Coordonnées), choisie par le porteur ; dessinée puis intégrée par Gemini (`agy`, `src/app/[username]/booking-widget.tsx`).
- **Pages** : onglet « Rendez-vous » du profil public (`/<pseudo>?onglet=rdv`, visible seulement si la réservation est activée) ; `/rdv/<lien privé>` pour le visiteur (consulter, reporter, annuler ; jamais indexée) ; `/dashboard/rendez-vous` pour le propriétaire (activation, durées, horaires, exceptions, rendez-vous à venir avec annuler et reporter). « rdv » est un pseudo réservé.
- **Base de données** : migrations `20261022200000_rdv.sql`, `20261022210000_rdv_extension_schema.sql`, `20261022220000_rdv_review.sql`, `20261022230000_rdv_same_slot.sql` (refus d'un report vers le créneau actuel, repéré à l'essai). Les visiteurs n'ont aucun accès direct aux tables : tout passe par des fonctions qui revalident les règles (plage ouverte, préavis, horizon, minutes multiples de 5, refus des créneaux à cheval sur le changement d'heure, pas de double réservation garantie par une contrainte d'exclusion, limites anti-abus sous verrou : 3 rendez-vous à venir par e-mail, 5 réservations par heure et par e-mail, 30 par heure au total). Réglages et horaires sont enregistrés d'un seul bloc (`rdv_save_settings`). L'e-mail du propriétaire utilisé pour les notifications est l'e-mail de contact de son profil (déjà public par choix, D25) ; sans e-mail de contact, il ne reçoit pas de notification mais voit tout dans son tableau de bord.
- **Règles en TypeScript** : `src/lib/rdv.ts` (mêmes règles que la base, pour afficher les créneaux), e-mails dans `src/lib/rdv-emails.ts`, envoi dans `src/lib/email.ts`.
- **Tests** : Vitest (règles, e-mails, actions, écrans), Playwright (pages privées, liens inconnus) et `supabase/tests/rdv.sql` (37 vérifications sur la vraie base, annulées à la fin ; mode d'emploi en tête du fichier).
- **Relecture Codex** (sécurité et justesse) : 5 problèmes corrigés par la 3ᵉ migration et le code (limites contournables en parallèle, nuit du changement d'heure, minutes non rondes, sauvegarde non atomique, horizon en fin de mois).
- **Limite connue (acceptée en V1)** : quelqu'un qui appelle directement l'API publique (sans passer par le site) peut réserver, reporter ou annuler sans que les e-mails partent, car ils sont envoyés par le serveur du site. Les règles restent appliquées et le propriétaire voit tout dans son tableau de bord. Correction possible plus tard : une file de notifications écrite par la base.

## Hors V1 (plus tard)

Synchronisation avec un agenda externe, plusieurs types de rendez-vous, plusieurs fuseaux horaires, rappels avant le rendez-vous, fichier de calendrier joint (`.ics`), paiement.
