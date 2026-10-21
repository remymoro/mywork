# Module Kanban

Détail fonctionnel du module Kanban (anciennement « Boards »), un Trello simplifié. Voir `docs/modules.md` pour les autres modules et `docs/decisions.md` pour les choix techniques. Les maquettes seront reliées à ce document une fois validées.

Statut : **validé le 2026-10-21** (maquette du porteur + recommandations de Claude, acceptées par le porteur). Les mentions **(à valider)** ci-dessous sont tranchées dans « Décisions », en fin de document.

## Maquettes (2026-10-21)

Dessinées dans un canvas Claude Design privé (lien à demander au porteur du projet), au thème Éditorial (D22) : fond crème, titres en Newsreader, carmin `#911128` pour les actions (palette du site, D22).

| Maquette | Ce qu'elle montre |
|---|---|
| Système de design MyWork | Rappel des couleurs (modes clair et sombre), de la typographie et des composants |
| Kanban — proposition A (classique) | Barre latérale complète, listes en colonnes grises, cartes encadrées, carte en cours de glisser ; au plus près de Trello |
| Kanban — proposition B (éditoriale) | Barre latérale réduite aux icônes, grand titre serif, onglets de tableaux en haut, listes en colonnes ouvertes séparées par des filets |
| Kanban — mes tableaux dans la barre de gauche | Liste des tableaux imbriquée sous l'entrée « Kanban » du menu : cadenas pour un tableau privé, globe pour un tableau public, nombre de cartes, « Nouveau tableau » |
| Kanban — fenêtre d'une carte | Description et sa barre de mise en forme, images, checklist avec barre de progression, commentaires, actions sur le côté |
| Kanban — tableau public, visiteur | Page publique et fenêtre « Avant d'ajouter ta carte » (prénom, nom, consentement) |

**Maquette retenue (porteur, 2026-10-21)** : proche de la proposition A. Menu principal à gauche (entrée active en bloc plein carmin, pour toute l'app) ; dans la page, sous « ESPACE PRIVÉ / Kanban », une colonne « MES TABLEAUX » (bouton plein « + Nouveau », un tableau par ligne avec son icône et un menu ⋮, tableau ouvert sur fond rose carmin clair avec un point carmin) ; à droite « TABLEAU : <NOM> » en capitales avec un menu ⋯, les listes côte à côte (en-tête pastel à la couleur de la liste, point de couleur, titre serif, « n cartes », menu ⋮), cartes blanches avec un menu ⋯, bouton « + Carte » en bas de chaque liste, « + Ajouter une liste » sous les listes. Recherche et cloche de notifications de la maquette : V2 (non affichées en V1).

## Objectif

Offrir une expérience proche de Trello avec beaucoup moins de fonctions : plusieurs tableaux, des listes, des cartes que l'on déplace à la souris. Un tableau peut être public : c'est la partie visible du module sur le profil public (`/<pseudo>/kanban/<tableau>`, voir D11).

## Limites

| Élément | Limite |
|---|---|
| Listes par tableau | 5 |
| Cartes par liste | 20 |
| Tableaux par utilisateur | pas de limite en V1 **(à valider)** |
| Titre d'une carte | 150 caractères |
| Description | 10 000 caractères |
| Commentaire | 2 000 caractères |
| Images par carte | 5 **(à valider)** |
| Éléments de checklist par carte | 30 **(à valider)** |

Les limites sont appliquées côté serveur et dans la base (pas seulement dans l'écran) : une 6ᵉ liste ou une 21ᵉ carte est refusée, avec un message clair (« Cette liste est pleine : 20 cartes au maximum »). Quand la limite est atteinte, le bouton d'ajout est désactivé et explique pourquoi.

## Tableaux

- **Public ou privé**, choisi à la création et modifiable ensuite. Un tableau privé n'est visible que par son propriétaire, pour tout le monde, y compris via l'adresse directe. Un tableau public est lisible par n'importe qui.
- **Changer de tableau à tout moment** : un sélecteur en haut de la page (nom du tableau courant, liste de tous les tableaux avec une icône cadenas pour les privés, « Nouveau tableau »). Le dernier tableau ouvert est rouvert au prochain passage.
- Actions du propriétaire : créer, renommer, passer en public ou privé, supprimer (avec confirmation, qui rappelle le nombre de cartes perdues).
- Un tableau public est lié au profil : il n'apparaît sur la page publique que si le profil est en ligne (« Profil en ligne », D21) **(à valider)**.

## Listes

- Gérées **uniquement par le propriétaire**, sur tous les tableaux : créer, renommer, supprimer (avec confirmation si elle contient des cartes), **réordonner par glisser-déposer**.
- Une liste ajoutée se crée en tapant son titre dans une colonne « Ajouter une liste » à droite des autres (comme Trello), jusqu'à 5.

## Cartes

### Dans la liste

- **Ajout rapide** : en bas de chaque liste, « + Ajouter une carte » ouvre un champ ; on tape un texte court, Entrée valide et laisse le champ ouvert pour enchaîner, Échap ferme.
- **Aperçu** sur la carte : le titre, et seulement si présents : un indicateur de description, le nombre de commentaires, les images (icône + nombre) et la **checklist** sous la forme « ☑ 2/5 » (devient verte quand tout est coché).
- **Qui peut créer** : le propriétaire et tous les visiteurs d'un tableau public (après saisie du prénom et du nom pour un visiteur non connecté, voir plus bas). Sur un tableau privé, seul le propriétaire.
- **Qui peut modifier ou supprimer une carte** **(à valider)** : le propriétaire peut tout ; un visiteur peut modifier le titre, la description, la checklist et les images de **ses propres cartes** uniquement, et les supprimer.
- **Déplacer** : par glisser-déposer, d'une position à l'autre dans une liste et d'une liste à l'autre. Le propriétaire déplace toutes les cartes ; un visiteur ne déplace que les siennes **(à valider)**. Un déplacement vers une liste pleine est refusé (la carte revient à sa place avec un message).

### Fenêtre de détail

Un clic sur une carte ouvre une fenêtre (composant `dialog`, déjà présent) avec :

1. le **titre** (modifiable en place) et la liste d'origine (« dans la liste À faire ») ;
2. la **description**, grande zone de texte (voir ci-dessous) ;
3. les **images** ;
4. la **checklist** ;
5. les **commentaires**, du plus ancien au plus récent, avec le champ d'ajout en bas.

Le lien de la fenêtre est partageable (`…/kanban/<tableau>?carte=<id>`), et Échap ou un clic à côté la ferme.

### Description

Mise en forme volontairement plus simple que Trello, sur le modèle d'une zone de saisie de LLM. Le texte est stocké en **Markdown limité** et affiché proprement quand on n'est pas en train d'écrire.

| Mise en forme | Raccourci clavier | Markdown |
|---|---|---|
| Gras | Ctrl/⌘ + B | `**texte**` |
| Italique | Ctrl/⌘ + I | `*texte*` |
| Lien | Ctrl/⌘ + K | `[texte](adresse)` |
| Liste à puces | `- ` en début de ligne | `- élément` |
| Liste numérotée | `1. ` en début de ligne | `1. élément` |
| Titre | `## ` en début de ligne | `## Titre` |

- **Maj + Entrée** : saut de ligne (comme dans un LLM). **Entrée** enregistre la description. Ctrl/⌘ + Entrée et un bouton « Enregistrer » font la même chose, Échap annule **(à valider : le comportement d'Entrée)**.
- Une barre de boutons discrète reprend les mêmes actions pour qui ne connaît pas les raccourcis, et affiche leur raccourci au survol.
- Rien d'autre : pas de tableaux, pas de code, pas de HTML. Le texte est nettoyé à l'affichage, une page ne peut donc pas être détournée par un contenu collé.

### Images

- Ajout par bouton « Ajouter une image », **glisser-déposer** ou **coller** (Ctrl/⌘ + V) depuis le presse-papiers.
- JPEG, PNG ou WebP, 2 Mo maximum chacune, 5 par carte (comme les images de projet du profil, D7).
- Stockées dans Supabase Storage, dossier `kanban-images/<utilisateur>/<tableau>/<carte>/` ; affichées en vignettes dans la fenêtre, agrandissables au clic.
- Un tableau privé ne doit jamais exposer ses images : voir « Données et sécurité ».
- Qui peut ajouter : le propriétaire, et l'auteur de la carte. Qui peut supprimer une image : les mêmes **(à valider)**.

### Checklist

- Une checklist par carte **(à valider : une seule, ou plusieurs comme Trello)** : titre libre, éléments à cocher, ajout par saisie + Entrée, suppression d'un élément, réordonnancement par glisser-déposer.
- Une barre de progression apparaît dans la fenêtre ; sur la carte dans la liste, la présence de la checklist se voit avec « ☑ cochés/total ».
- Peuvent cocher ou décocher : le propriétaire et l'auteur de la carte.

### Commentaires

- Visibles par tous ceux qui voient le tableau. Texte brut avec retours à la ligne (Maj + Entrée), 2 000 caractères.
- Chaque commentaire montre l'auteur (prénom et nom, ou nom affiché pour un compte connecté), la date, et « modifié » si besoin.
- **Suppression** : chacun supprime **ses** commentaires ; le propriétaire du tableau supprime **tous** les commentaires. Pas de modification des commentaires en V1.

## Visiteurs non connectés

Un visiteur ne crée pas de compte. Avant sa **première action** (créer une carte ou écrire un commentaire), une petite fenêtre lui demande son **prénom** et son **nom**.

- **Mémorisation** : l'identité est gardée dans le navigateur, pour ne pas la redemander à chaque action, sous la forme d'un **jeton aléatoire** (cookie `HttpOnly`) accompagné du prénom et du nom. Un lien « Ce n'est pas moi ? » permet de changer de nom.
- **Ce que le jeton permet** : reconnaître « ses » cartes et « ses » commentaires pour qu'il puisse les supprimer (ou les modifier pour les cartes). En changeant de navigateur, ou en vidant ses cookies, il perd cette main : c'est assumé et à dire clairement dans la fenêtre.
- **Ce que ça ne prouve pas** : le prénom et le nom ne sont pas vérifiés, n'importe qui peut écrire n'importe quoi. C'est une identité « déclarée », pas une authentification. L'écran les affiche avec une mention discrète « visiteur ».
- **Protection contre les abus** : limite de fréquence par jeton et par adresse IP (par exemple 10 actions par minute), champ « piège » invisible contre les robots, les limites de 20 cartes par liste jouent aussi un rôle de garde-fou. Le propriétaire peut supprimer n'importe quelle carte ou commentaire.
- **RGPD** (D16) : le prénom et le nom sont des données personnelles. Un court texte de consentement dans la fenêtre (« Ton nom sera visible par les visiteurs de ce tableau »), et suppression possible par leur auteur ou le propriétaire.
- **Réutilisable** : ce mécanisme est conçu comme une brique générique « identité visiteur » (table `visitors`, fonction serveur `getVisitor()`, fenêtre de saisie), que le module **Rendez-vous** réutilisera pour les réservations, avec en plus une adresse e-mail pour les confirmations. Il est donc développé à part du Kanban.
- **Utilisateur connecté qui n'est pas propriétaire** (autre compte, plus tard) : traité comme un visiteur, mais sous son nom affiché, sans fenêtre de saisie.

## Droits : récapitulatif

| Action | Propriétaire | Visiteur / autre compte (tableau public) | Tableau privé |
|---|---|---|---|
| Voir le tableau | Oui | Oui | Propriétaire seul |
| Créer, renommer, supprimer, déplacer une liste | Oui | Non | Propriétaire seul |
| Créer une carte | Oui | Oui (nom demandé) | Propriétaire seul |
| Modifier, supprimer, déplacer une carte | Toutes | Les siennes **(à valider)** | Propriétaire seul |
| Commenter | Oui | Oui (nom demandé) | Propriétaire seul |
| Supprimer un commentaire | Tous | Les siens | Propriétaire seul |
| Changer public / privé, supprimer le tableau | Oui | Non | Propriétaire seul |

## Interface

- **Page privée** : `/dashboard/kanban`, entrée « Kanban » du menu (déjà prévue en « Bientôt », D21). **Page publique** : `/<pseudo>/kanban/<tableau>`.
- Disposition : barre du haut avec le sélecteur de tableau, son nom, son réglage public / privé et le lien « Copier le lien public » ; dessous, les listes côte à côte, avec défilement horizontal si l'écran est étroit.
- Style Éditorial (D22) : fond crème, titres des listes en serif, carmin pour les actions et pour l'indicateur de glisser-déposer.
- Déplacements : le glisser-déposer montre une zone d'insertion claire. Il est aussi possible **au clavier** (accessibilité) : sélection de la carte avec Espace, flèches pour la déplacer, Espace pour la poser.
- États : tableau vide (invite à créer une liste), liste vide, limite atteinte, chargement, erreur réseau avec réessai.
- Écran d'ordinateur d'abord (D1). Tablette ensuite : le glisser-déposer au doigt doit marcher dès la V1 si la bibliothèque le permet.

## Données et sécurité (pistes techniques)

À préciser dans `docs/decisions.md` avant le développement.

- **Tables** (migration Supabase, avec `user_id` du propriétaire partout, D3) :
  - `kanban_boards` (id, owner, nom, slug, is_public, créé le) ;
  - `kanban_lists` (id, board, titre, `position`) ;
  - `kanban_cards` (id, list, titre, description, `position`, auteur : compte ou visiteur) ;
  - `kanban_card_images`, `kanban_checklist_items` (carte, texte, coché, position) ;
  - `kanban_comments` (carte, auteur : compte ou visiteur, texte, créé le) ;
  - `visitors` (id, prénom, nom, hash du jeton, créé le), brique commune avec Rendez-vous.
- **RLS** : un tableau privé n'est lisible que par son propriétaire ; un tableau public est lisible par tous. Les écritures des visiteurs passent par des **actions serveur** (jeton vérifié côté serveur) et non par l'API publique, car un visiteur n'a pas de session Supabase.
- **Limites dans la base** : déclencheurs (`trigger`) qui refusent la 6ᵉ liste et la 21ᵉ carte, pour que deux actions simultanées ne dépassent pas la limite.
- **Ordre** : colonne `position` (entier espacé de 1 000, renumérotation si besoin) pour déplacer sans réécrire tout le tableau.
- **Glisser-déposer** : une bibliothèque (`@dnd-kit`) est proposée : accessible au clavier, compatible tactile, et nécessaire pour déplacer des cartes entre listes. Le glisser-déposer natif du navigateur, utilisé pour « Ordre des sections » du Profil, convient à une seule liste mais pas à ce cas **(à valider, nouvelle dépendance)**.
- **Images** : bucket Storage **privé**, avec adresses signées de courte durée, pour que les images d'un tableau privé ne fuitent pas ; les images d'un tableau public passent par la même route, qui vérifie les droits.
- **Tests** (D14) : Vitest pour les règles (limites, droits, validation du texte) ; Playwright pour un parcours complet (créer un tableau, trois listes, des cartes, déplacer une carte, commenter en visiteur, supprimer).

## Version 1

Tout ce qui précède : tableaux publics et privés, 5 listes, 20 cartes par liste, ajout rapide, fenêtre de détail (description mise en forme, images, checklist, commentaires), glisser-déposer des cartes et des listes, identité visiteur par prénom et nom, changement de tableau.

## Version 2

Étiquettes de couleur, dates d'échéance, archivage des cartes (au lieu de seulement les supprimer), plusieurs checklists, modèles de tableau, recherche dans un tableau, journal d'activité, notification par e-mail au propriétaire en cas de nouvelle carte ou de nouveau commentaire (avec Resend).

## Plus tard

Collaboration à plusieurs sur un tableau (membres, rôles), pièces jointes autres que les images, assignation de cartes. Les deux premières sont hors périmètre aujourd'hui (voir `docs/vision.md`).

## Décisions (2026-10-21)

1. **Visiteur** : il modifie, déplace et supprime **ses** cartes uniquement.
2. **Description** : **Entrée va à la ligne** ; **Ctrl/⌘ + Entrée** ou le bouton « Enregistrer » enregistre ; Échap annule.
3. **Checklist** : une seule par carte en V1.
4. **Images** : propriétaire et auteur de la carte ; 5 par carte, 2 Mo ; stockage privé, adresses signées.
5. **Tableaux** : pas de limite en V1.
6. **Profil hors ligne** : ses tableaux publics sont cachés (page introuvable).
7. **Glisser-déposer** : `@dnd-kit` (`core`, `sortable`, `utilities`) ajouté.
8. **Suppression** d'une liste ou d'un tableau : définitive, avec confirmation (corbeille en V2).
9. **Couleur d'une liste** : choisie parmi 6 pastels (rose, jaune, bleu, vert, violet, gris), par le menu ⋮ de la liste.
10. **Public / privé** : icône 🔒 ou 🌐 à côté du nom du tableau, réglage dans son menu ⋮ (et à la création).
11. **Icône d'un tableau** : choisie dans une petite liste (document, graphique, personne, dossier, étoile, cible).
12. **Menu principal** : entrée active en bloc plein carmin dans toute l'application.

13. **Liste de fin** (2026-10-21) : une liste par tableau peut être marquée « liste de fin » (menu ⋮ de la liste, mention « Liste de fin » dans son en-tête). Y déposer une carte dont la checklist n'est pas finie **avertit** (« La checklist n'est pas finie (2/5). La déplacer quand même ? ») sans bloquer : on peut classer une tâche abandonnée. Règle dans `doneListWarning` (`src/lib/kanban.ts`), colonne `is_done_list` (migration `20261021210000_kanban_done_list.sql`).

## Livraison par étapes

1. **Étape 1** (code livré le 2026-10-21, migration à appliquer par Claude) : tableaux (création, icône, couleur des listes, public / privé, renommer, supprimer), listes et cartes, glisser-déposer souris/tactile/clavier, fenêtre de carte avec description (Markdown limité sans HTML), checklist et commentaires **du propriétaire** ; page publique **en lecture seule**. Dernier tableau mémorisé, liens de cartes partageables, confirmations de suppression, limites et erreurs affichées. Menu Kanban actif et sélection carmin dans tout le menu principal.
2. **Étape 2** : identité visiteur (prénom, nom, jeton) ; cartes et commentaires des visiteurs sur un tableau public, protections contre les abus.
3. **Étape 3** (livrée le 2026-10-21, avant l'étape 2 à la demande du porteur) : images des cartes du propriétaire. Bouton, glisser-déposer d'un fichier ou collage (Ctrl/⌘ + V) dans la fenêtre de la carte ; 5 par carte, 2 Mo, JPEG/PNG/WebP ; vignettes cliquables (grand format dans un nouvel onglet), suppression ; sur la carte dans la liste, la première image sert d'aperçu en haut de la carte (comme Trello), avec l'indicateur 🖼 et le nombre d'images. Dossier Storage **privé** `kanban-images`, adresses signées d'une heure créées côté serveur ; le stockage ne signe que les images d'un tableau que l'appelant peut voir (règles de la migration `20261021200000_kanban_images.sql`). Les fichiers sont effacés avec leur carte, leur liste ou leur tableau. Code : `src/components/kanban/card-images.tsx`, actions `uploadCardImage` / `deleteCardImage`.

### Fichiers de l'étape 1

- `supabase/migrations/20261021190000_kanban.sql` : tables, droits de lecture/écriture, limites simultanées (5/20/30), déplacements atomiques et ordre par pas de 1 000.
- `src/lib/kanban.ts` : limites, icônes/couleurs, validations, slug, progression et arbre Markdown limité ; tests voisins.
- `src/app/dashboard/kanban/` : page privée, lectures, actions serveur et écran de réessai. Les écritures vérifient la session puis le propriétaire ; renommer un tableau conserve son adresse.
- `src/components/kanban/` : colonne des tableaux, listes/cartes et glisser-déposer, fenêtre de carte, rendu Markdown ; tests des interactions et raccourcis.
- `src/app/[username]/kanban/[slug]/` : page publique, métadonnées et réessai. Un tableau privé ou un profil hors ligne reste introuvable, même pour son propriétaire à cette adresse publique.
- `src/app/dashboard/sidebar.tsx`, `modules.ts`, `shell.tsx` et `e2e/auth.spec.ts` : navigation et scénarios d'accès.

**Vérification après application de la migration** : ouvrir `/dashboard/kanban`, créer un tableau puis deux listes, ajouter plusieurs cartes avec Entrée ; déplacer une carte et rouvrir son lien `?tableau=<slug>&carte=<id>`. Dans la description, Entrée va à la ligne et Ctrl/⌘ + Entrée enregistre. Passer le tableau en public puis ouvrir son lien dans une fenêtre privée ; couper « Profil en ligne » doit rendre ce lien introuvable. Les visiteurs ne peuvent pas encore écrire ; les images arrivent à l'étape 3.
