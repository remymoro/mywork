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
| D16 | RGPD | Acté | S'appuie sur Supabase : projet dans une **région européenne** (`eu-west-1`, Irlande), suppression de compte et export des données via Supabase. Les autres services (Resend, Stripe, LiveKit) seront vérifiés quand on les branchera. |
| D18 | Pseudo | Acté | Modifiable. L'ancien pseudo redirige vers le nouveau (table `username_history`) et reste réservé à son propriétaire. Format : 3 à 30 caractères, minuscules, chiffres et tirets. |
| D19 | Connexion | Acté | **Google uniquement** (OAuth via Supabase Auth). Premier passage : choix du pseudo (`/onboarding`), puis `/dashboard`. Pages : `/login`, `/dashboard`, `/<pseudo>` (profil public, redirige les anciens pseudos). D'autres moyens (e-mail, GitHub) pourront s'ajouter. |
| D20 | Style visuel | Acté | Variante **A : sobre et professionnelle**. Fond blanc, noir et gris (palette neutre shadcn), pas de couleur de marque, logo « M » noir provisoire + nom MyWork (`src/components/logo.tsx`), police Geist. Boutons de connexion blancs bordés avec logo Google. Thème sombre et couleur d'accent : à décider plus tard. |
| D21 | Design system | Acté | Dans le code, sur la base de D20. Couleurs = jetons dans `src/app/globals.css` (dont `success` et `warning`), jamais de couleur en dur dans une page. Composants = bibliothèque shadcn/ui dans `src/components/ui/` (`button`, `card`, `input`, `label`, `badge`, `alert`), pas de composant maison à la place. Page de référence : `/design` (non indexée). Tout nouveau composant s'y ajoute. Le registre shadcn est bloqué dans le cloud de Claude : les composants y sont écrits à la main dans la même structure, à remplacer par `pnpm dlx shadcn@latest add <composant>` depuis un poste connecté. |
| D22 | Accent bleu et thème sombre | Proposé | Accent bleu (couleur `primary`, logo, boutons, focus) et thème clair/sombre avec bouton en haut à droite (choix gardé dans le navigateur, thème du système par défaut). Remplace le « pas de couleur de marque » de D20 si validé. |
| D23 | Profil public | Proposé | Le profil affiche photo (ou initiales), nom, titre, localisation, présentation (500 car. max) et liens (site, LinkedIn, GitHub). Modifiable depuis `/dashboard/profil` (pseudo compris, D18). Photos dans le bucket Supabase Storage `avatars` (public en lecture, un fichier par utilisateur dans `<id>/`, 2 Mo, JPEG/PNG/WebP). Migration `20261020200000_profile_details.sql` : **à appliquer (`pnpm exec supabase db push`) avant la mise en ligne**, sinon l'enregistrement du profil échoue (la lecture continue de marcher). Page d'exemple : `/design/profil`. |
| D24 | Sport : suivi du poids | Proposé | Module « Sport » : l'utilisateur saisit son poids (date + kg) et voit une **courbe d'évolution dans le tableau de bord** (`/dashboard`). Table `weight_entries` (utilisateur, date, poids en kg), rattachée à l'utilisateur (D3) avec RLS : lisible et modifiable par son seul propriétaire. **Privé par défaut, jamais affiché sur le profil public** : c'est une donnée de santé, sensible au sens du RGPD (D16), avec export et suppression à prévoir. Courbe : composant `chart` de shadcn/ui (basé sur Recharts) à confirmer, car cela ajoute une dépendance (D8). Tests : Vitest pour le calcul (écart, moyenne, validation des valeurs), Playwright pour saisir un poids et voir la courbe. Ordre de livraison à confirmer (voir `docs/vision.md`). |
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
- Sport (D24) : valider la bibliothèque de courbes (shadcn `chart` / Recharts), l'unité (kg seulement ?), et si d'autres mesures s'ajoutent plus tard (séances, objectifs).

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

Déployé sur Vercel le 2026-10-20 : projet `mywork` (compte `remymoro`, offre Hobby), connecté au dépôt GitHub. Chaque push sur `main` met le site à jour automatiquement. Adresse de production provisoire : https://mywork-pearl-two.vercel.app (le domaine `mywork.website` sera branché plus tard). Dépôt GitHub public pour que les vérifications automatiques restent gratuites : ne jamais y mettre de clé secrète (variables d'environnement dans Vercel et dans `.env.local`, ignoré par git).

Supabase (2026-10-20) : projet `mywork` (réf. `egdspbycutxqvxlvsskn`, Postgres 17, `eu-west-1`) dans l'organisation `remy_moro.org`, offre gratuite. CLI installée en dépendance du projet (`pnpm exec supabase ...`), connectée au compte et reliée au projet (`supabase link`). Le dossier `supabase/` contiendra les migrations (changements de la base, versionnés dans git).

## Sécurité : détection des secrets (D17)
Dépôt public, donc aucun secret dans le code. Deux filets avec **gitleaks** :
- **En local** : un hook (`.githooks/pre-commit`, activé par `pnpm install`) bloque tout commit contenant une clé, un jeton ou un mot de passe. Nécessite le programme `gitleaks` installé sur la machine (sinon le hook prévient et laisse passer).
- **Sur GitHub** : `.github/workflows/secrets.yml` scanne tout l'historique à chaque push.
Les secrets vont dans `.env.local` (ignoré par git) et dans les variables d'environnement de Vercel.

Branchement Next.js ↔ Supabase (2026-10-20) : bibliothèques `@supabase/supabase-js` et `@supabase/ssr`. Clients dans `src/lib/supabase/client.ts` (navigateur) et `server.ts` (serveur). Variables `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (clé publique, modèle dans `.env.example`) dans `.env.local` ; ajoutées aussi dans Vercel (production, preview, development) le 2026-10-20. La clé secrète (`service_role`) n'est jamais utilisée sans accord explicite.

### Deux liaisons vers Supabase
1. **L'agent agit au nom du porteur** : CLI Supabase (`pnpm exec supabase ...`), connectée une fois par `supabase login` (code de vérification dans le navigateur). Sert à créer les tables et gérer le projet.
2. **L'application accède aux données** : `.env.local` (adresse du projet + clé publique `sb_publishable_…`), jamais sur GitHub.

Le mot de passe de la base de données ne sert à aucune des deux pour l'instant. Le porteur le garde (gestionnaire de mots de passe) : la CLI en aura besoin pour certaines opérations (ex. envoyer les migrations).

Base de données (2026-10-20) : migrations dans `supabase/migrations/` (appliquées avec `pnpm exec supabase db push`). Tables `profiles` (pseudo, nom affiché, titre), `username_history` (redirections), `reserved_usernames` (pseudos interdits). Sécurité RLS : profils lisibles par tous, modifiables seulement par leur propriétaire ; l'historique des pseudos n'est écrit que par la base elle-même. Piège : sur ce projet Supabase, chaque nouvelle table demande aussi des `grant` explicites (voir la 2e migration), sinon l'API répond « permission denied ».

Authentification Google (2026-10-20) : code prêt (`src/app/login`, `auth/callback`, `onboarding`, `dashboard`, `[username]`, `src/proxy.ts` pour la session). **À configurer côté services, sinon le bouton échoue** : (1) client OAuth Google dans Google Cloud Console avec l'URI de redirection `https://egdspbycutxqvxlvsskn.supabase.co/auth/v1/callback` ; (2) fournisseur Google activé dans Supabase (Authentication > Providers) avec l'ID et le secret client ; (3) dans Supabase (Authentication > URL Configuration), Site URL de production et URLs de redirection autorisées (`http://localhost:3000/**`, adresse Vercel). La CI GitHub lit les deux variables publiques Supabase dans les variables du dépôt (`gh variable`).

Piège Next.js 16 (`cacheComponents` activé dans `next.config.ts`) : toute page qui lit des données de requête (cookies, `params`, `searchParams`) doit être sous une frontière Suspense, ici `src/app/loading.tsx`. Sans elle, `pnpm build` échoue. Conséquence : une page introuvable répond en code 200 (le texte « Page introuvable » s'affiche), donc les tests vérifient le contenu et non le code. Les tests Playwright doivent tourner sur un vrai build : arrêter `pnpm dev` avant `pnpm test:e2e`, sinon un build cassé passe inaperçu en local.

Pages qui dépendent de la session ou de l'URL (`/login`, `/dashboard`, `/onboarding`, `/[username]`) : `export const instant = false` (voie de migration officielle de Next.js 16 avec Cache Components), sinon le mode dev affiche des erreurs. Pour une navigation instantanée plus tard : suivre `node_modules/next/dist/docs/01-app/02-guides/authentication-with-cache-components.md`. Test réussi le 2026-10-20 : connexion Google, création du profil, profil public, déconnexion.

Audit sécurité (2026-10-20) : `pnpm audit --prod` sans faille (l'outil `shadcn` est passé en dépendance de développement) ; `supabase db advisors --linked --type security` : seul reste « leaked password protection », sans objet car il n'y a pas de mot de passe (connexion Google). Fonctions de déclencheur retirées de l'API publique (migration `lock_down_functions`). À refaire avant d'ouvrir l'abonnement : audit complet, écran de consentement Google en production, limites de débit.
