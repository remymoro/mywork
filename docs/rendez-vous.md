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
2. Formulaire : « Tu es… » (obligatoire : recruteur, client ou prospect, partenaire ou collègue, autre), prénom, nom, e-mail, entreprise (facultative), motif (obligatoire : offre d'emploi, mission ou projet, conseil ou échange, autre), précisions facultatives. Bouton « Confirmer ». Rôle, entreprise et motif figurent dans l'e-mail envoyé au propriétaire (décision du porteur, 2026-10-23).
3. Page de confirmation, et e-mail de confirmation avec un lien privé pour **annuler** ou **reporter**.
4. Un créneau déjà pris disparaît de la liste ; si deux visiteurs choisissent le même créneau en même temps, le second voit « Ce créneau vient d'être pris » et en choisit un autre.

## Parcours du propriétaire

Page `/dashboard/rendez-vous` (entrée « Rendez-vous » du menu, aujourd'hui en « Bientôt ») :
- **Horaires** : plages par jour de la semaine, durées proposées.
- **Exceptions** : jours de congé ou horaires particuliers à une date.
- **Rendez-vous** : liste (date, durée, nom, e-mail, et d'emblée rôle · entreprise · motif), avec annuler et reporter ; menu « ⋯ » → **Détails** : fiche du rendez-vous (statut, horaire, e-mail à copier, fonction, entreprise, motif, date de réservation, référence courte, objet ; « Rejoindre », « Copier le lien de l'invité », « Annuler le rendez-vous »).

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

## Visio (réalisée le 2026-10-23)

- Salle intégrée à MyWork avec LiveKit Cloud Build gratuit (D6, D16), deux participants maximum, sans enregistrement. Aucune migration supplémentaire.
- Visiteur : `/rdv/<code privé>/visio` (page et e-mails de confirmation/report). Propriétaire : `/dashboard/rendez-vous/<id>/visio` (liste À venir, fiche Détails, e-mails).
- Ouverture **10 min avant**, jusqu’à `ends_at` exclu ; attente avec l’heure de Paris, puis préparation séparée du micro et de la caméra (facultative). Appareils activés sur demande, commandes françaises, affichage mobile et sombre. L’état « terminé » du visiteur se base sur la fin, pas le début.
- `POST /api/visio/token` : origine du site exigée, JSON strict, visiteur autorisé par `rdv_get`, propriétaire par session + lecture filtrée et RLS. Statut et horaires recontrôlés à chaque demande, avant tout appel LiveKit. Salle `rdv-<id>`, identités `owner:<id>` / `guest:<id>` : rejoindre sur un autre appareil remplace la connexion du même rôle.
- Jeton de 60 s maximum, expiration plafonnée à la fin, caméra/micro seulement ; aucun droit de partage d’écran, données ou administration. Réponse privée sans cache ; jeton uniquement en mémoire, jamais dans les e-mails, l’URL ou les journaux. Pages non indexées et sans référent ; caméra/micro limités au site. Pas de nouvelle CSP.
- À la fin : déconnexion et arrêt des appareils **dans l’interface**. L’expiration du jeton ne coupe pas un appel déjà connecté ([cycle des jetons LiveKit](https://docs.livekit.io/frontends/reference/tokens-grants/)) ; une coupure garantie contre un client modifié demanderait une tâche serveur supplémentaire. Annulation/report recontrôlés au clic, pas de révocation en direct d’un appel en cours en V1.
- Tests Vitest : règles, autorisations, SDK/Supabase simulés, API, appareils, fin d’appel, boutons et e-mails. `e2e/visio.spec.ts` : lien mal formé, propriétaire non connecté et écran 360 px, sans fixtures de base ni connexion LiveKit. Playwright non lancé pendant cette réalisation, à la demande du porteur.

Mise en service et vérification :
1. Créer le projet LiveKit Cloud gratuit et renseigner `LIVEKIT_URL` (adresse `wss://…`), `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` dans `.env.local` et Vercel, puis redéployer. Clés distinctes pour les aperçus ; aucun secret dans le dépôt.
2. À envisager dans Vercel : limite du POST (ex. 20 demandes/min/IP). Le lien privé du visiteur reste transférable ; surveiller les quotas gratuits LiveKit. Les erreurs de service sont affichées sans détail interne.
3. Ouvrir un rendez-vous futur : le propriétaire voit « Ouvre 10 min avant », le visiteur peut ouvrir l’écran d’attente sans demande caméra/micro. Dans la fenêtre, rejoindre depuis un ordinateur et un téléphone : même salle, son dans les deux sens, caméra facultative. Vérifier permissions refusées/appareil absent, reconnexion, deuxième appareil du même rôle, modes clair/sombre et largeur 360 px.
4. À la fin, vérifier que l’appel et les voyants caméra/micro s’arrêtent ; un rendez-vous annulé ou terminé ne permet plus de rejoindre. Vérifier les liens des e-mails et lancer Playwright sur un build local avant livraison.

## Réalisation (2026-10-22)

- **Maquette retenue : B** (parcours en étapes sur une seule colonne : Durée, Jour, Créneau, Coordonnées), choisie par le porteur ; dessinée puis intégrée par Gemini (`agy`, `src/app/[username]/booking-widget.tsx`).
- **Pages** : onglet « Rendez-vous » du profil public (`/<pseudo>?onglet=rdv`, visible seulement si la réservation est activée) ; `/rdv/<lien privé>` pour le visiteur (consulter, reporter, annuler ; jamais indexée) ; `/dashboard/rendez-vous` pour le propriétaire, « Mes rendez-vous » (maquette du porteur, 2026-10-23), en deux onglets : **Rendez-vous** (sous-onglets À venir / Passés / Annulés ; sur un rendez-vous à venir : « Rejoindre », actif de 10 min avant jusqu’à la fin, « Annuler » et « Reporter » dans le menu « ⋯ ») et **Disponibilités** (activation, horaires de la semaine, jours particuliers, durées ; les autres règles sont affichées en lecture seule). Bouton « Copier l'adresse de réservation ». « rdv » est un pseudo réservé.
- **Base de données** : migrations `20261022200000_rdv.sql`, `20261022210000_rdv_extension_schema.sql`, `20261022220000_rdv_review.sql`, `20261022230000_rdv_same_slot.sql` (refus d'un report vers le créneau actuel, repéré à l'essai). Les visiteurs n'ont aucun accès direct aux tables : tout passe par des fonctions qui revalident les règles (plage ouverte, préavis, horizon, minutes multiples de 5, refus des créneaux à cheval sur le changement d'heure, pas de double réservation garantie par une contrainte d'exclusion, limites anti-abus sous verrou : 3 rendez-vous à venir par e-mail, 5 réservations par heure et par e-mail, 30 par heure au total). Réglages et horaires sont enregistrés d'un seul bloc (`rdv_save_settings`). L'e-mail du propriétaire utilisé pour les notifications est l'e-mail de contact de son profil (déjà public par choix, D25) ; sans e-mail de contact, il ne reçoit pas de notification mais voit tout dans son tableau de bord.
- **Règles en TypeScript** : `src/lib/rdv.ts` (mêmes règles que la base, pour afficher les créneaux), e-mails dans `src/lib/rdv-emails.ts`, envoi dans `src/lib/email.ts`.
- **Tests** : Vitest (règles, e-mails, actions, écrans), Playwright (pages privées, liens inconnus) et `supabase/tests/rdv.sql` (37 vérifications sur la vraie base, annulées à la fin ; mode d'emploi en tête du fichier).
- **Relecture Codex** (sécurité et justesse) : 5 problèmes corrigés par la 3ᵉ migration et le code (limites contournables en parallèle, nuit du changement d'heure, minutes non rondes, sauvegarde non atomique, horizon en fin de mois).
- **Limite connue (acceptée en V1)** : quelqu'un qui appelle directement l'API publique (sans passer par le site) peut réserver, reporter ou annuler sans que les e-mails partent, car ils sont envoyés par le serveur du site. Les règles restent appliquées et le propriétaire voit tout dans son tableau de bord. Correction possible plus tard : une file de notifications écrite par la base.

## Hors V1 (plus tard)

Synchronisation avec un agenda externe, plusieurs types de rendez-vous, plusieurs fuseaux horaires, rappels avant le rendez-vous, fichier de calendrier joint (`.ics`), paiement.
