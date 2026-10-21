# Module Kanban

Détail fonctionnel du module Kanban (anciennement « Boards »), un Trello simplifié. Voir `docs/modules.md` pour les autres modules et `docs/decisions.md` pour les choix techniques. Les maquettes seront reliées à ce document une fois validées.

Statut : **proposition du 2026-10-21**, à valider avec le porteur. Les points marqués **(à valider)** sont des choix proposés là où la demande ne tranchait pas ; la liste complète est en fin de document.

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

Choix à faire : proposition A ou B, et barre de gauche avec ou sans la liste des tableaux.

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

## Questions à valider

1. **Cartes des autres, tableau public** : un visiteur peut-il modifier, déplacer ou supprimer **seulement ses cartes** (proposé) ? Ou seulement en créer, sans pouvoir ensuite les modifier ?
2. **Entrée dans la description** : Entrée enregistre et Maj + Entrée va à la ligne (proposé, comme un LLM) ; ou l'inverse, plus naturel pour écrire un long texte ?
3. **Une checklist ou plusieurs** par carte en V1 ? (une seule est proposée)
4. **Images** : qui peut en ajouter (propriétaire et auteur de la carte, proposé) ; 5 par carte ; stockage privé avec adresses signées.
5. **Limites sur les tableaux** : combien de tableaux par utilisateur ? (aucune limite en V1, proposé ; à revoir avec l'abonnement)
6. **Profil hors ligne** : un tableau public reste-t-il visible quand le profil est hors ligne ? (non, proposé)
7. **Bibliothèque de glisser-déposer** : accord pour ajouter `@dnd-kit` ?
8. **Suppression d'une liste ou d'un tableau** : suppression définitive avec confirmation (proposé) ou corbeille ?
