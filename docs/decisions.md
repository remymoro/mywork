# Décisions et questions ouvertes

Statuts : **Acté** (validé avec le porteur du projet), **Proposé** (recommandation en attente de validation), **Ouvert** (à trancher).

## Décisions

| # | Sujet | Statut | Contenu |
|---|---|---|---|
| D1 | Plateforme | Acté | Application web, écran d'ordinateur d'abord. |
| D2 | Première fonctionnalité | Proposé | Module CV et profil public. |
| D3 | Multi-utilisateur | Proposé | Toutes les données sont rattachées à un utilisateur dès le premier jour, même si un seul compte existe au départ. Cela évite une migration lourde à l'ouverture publique. |
| D4 | Authentification | Proposé | Authentification minimale dans le socle (le propriétaire doit se connecter pour éditer). L'inscription publique et l'abonnement viennent plus tard. |
| D5 | Export PDF | Proposé | Générer le PDF à partir du même gabarit HTML que la page publique : une seule mise en page à maintenir. Sur Vercel, le navigateur headless est lourd (`@sparticuz/chromium`) ; alternative : `@react-pdf/renderer`. À trancher au module CV. |
| D6 | Visio | Acté | LiveKit (offre gratuite au départ), pas de développement maison. |
| D7 | Stockage des fichiers | Acté | Supabase Storage, avec quota par utilisateur prévu dans le modèle dès le module Fichiers. |
| D8 | Stack technique | Acté | Voir section Stack ci-dessous. Priorité : gratuit au départ. |
| D12 | Authentification | Acté | Supabase Auth (inclus, pas de service en plus). |
| D13 | Accès aux données | Acté | Client Supabase seul, sans ORM : moins de pièces à comprendre. À revoir si le projet grossit. |
| D14 | Tests | Acté | Standard Next.js : **Vitest** + React Testing Library pour les tests unitaires (logique : créneaux de RDV, quotas, validation) et **Playwright** pour les tests de bout en bout (parcours réels dans un navigateur : se connecter, remplir son CV, réserver un créneau). Lancés automatiquement par GitHub Actions à chaque envoi de code. |
| D15 | Budget | Acté | Zéro pendant le développement : uniquement des offres gratuites. Seul le domaine est payant. |
| D16 | RGPD | Acté | S'appuie sur Supabase : projet créé dans une **région européenne** (Francfort), suppression de compte et export des données via Supabase. Les autres services (Resend, Stripe, LiveKit) seront vérifiés quand on les branchera. |
| D9 | Nom et domaine | Acté | Projet **MyWork**, domaine `mywork.website`. |
| D10 | Langue de l'interface | Acté | Français. |
| D11 | URL publique | Acté (révisable) | `mywork.website/<pseudo>` (pages de modules : `/<pseudo>/rdv`, `/<pseudo>/boards`). Pseudos réservés : `admin`, `login`, `api`, `app`… Domaine personnalisé possible plus tard. |

## Points d'attention
- **Rendez-vous** : fuseaux horaires, e-mails de confirmation et d'annulation, synchronisation avec un agenda externe pour éviter les doubles réservations.
- **Fichiers publics** : risque d'abus de bande passante ; prévoir des limites.
- **Profil public** : choisir ce qui est indexable par les moteurs de recherche.
- **RGPD** (D16) : consentement, suppression de compte, export des données.

## Questions ouvertes
- Export PDF (D5), à trancher au module CV.

## Stack (D8)
Next.js (App Router) + TypeScript, Tailwind CSS + shadcn/ui, déployé sur Vercel. Supabase (Postgres, Auth, Storage). Resend (e-mails), Stripe (abonnement), LiveKit (visio). Code sur GitHub (`remymoro/mywork`, privé). Gestionnaire de paquets : **pnpm**. Node 24.

Initialisé le 2026-10-20 : Next.js 16, React 19, Tailwind 4, shadcn/ui (composant `button` pour l'instant), code dans `src/`. Lancer le site : `pnpm dev` puis ouvrir http://localhost:3000.

Limites des offres gratuites à garder en tête :
- **Vercel Hobby** : usage non commercial uniquement. Passer à l'offre Pro avant d'ouvrir l'abonnement payant.
- **Supabase gratuit** : projet mis en pause après environ une semaine d'inactivité, 1 Go de fichiers, 500 Mo de base. Le quota de données de l'abonnement devra tenir compte de ces plafonds.
- **Resend gratuit** : domaine à vérifier (`mywork.website`) et volume limité par jour.
- **Stripe** : pas d'abonnement, mais commission par transaction.
- **LiveKit** : minutes gratuites limitées par mois.
- Le domaine `mywork.website` reste payant.

## Tests (D14)
- Chaque fonctionnalité livrée s'accompagne de ses tests ; l'agent les écrit et les lance lui-même.
- Vitest : calculs et règles métier. Playwright : un parcours complet par module (CV, RDV, boards, fichiers).
- Le porteur du projet n'a rien à lancer : l'agent indique « tests passés » ou ce qui échoue, en langage simple.

### Boucle de travail (à chaque fonctionnalité)
1. L'agent ajoute la fonctionnalité.
2. **Tous** les tests sont relancés (Vitest et Playwright), pas seulement les nouveaux : c'est ce qui repère les régressions (une ancienne fonction cassée par la nouvelle).
3. Tout passe : commit et push. Une régression est repérée : l'agent corrige, puis relance tous les tests.
- Les pages Next.js rendues côté serveur ne se testent pas bien avec Vitest : elles sont couvertes par Playwright.

Installé le 2026-10-20 : commandes `pnpm test` (Vitest, fichiers `*.test.ts(x)` à côté du code), `pnpm test:e2e` (Playwright, dossier `e2e/`), `pnpm test:all` (les deux). GitHub Actions (`.github/workflows/ci.yml`) lance lint, Vitest et Playwright à chaque push. Chromium pour Playwright : `pnpm exec playwright install chromium`.
