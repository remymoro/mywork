# Module Kanban

Détail fonctionnel du module Kanban (anciennement « Boards »), un Trello simplifié. Voir `docs/modules.md` pour les autres modules et `docs/decisions.md` pour les choix techniques.

Statut : **révisé le 2026-10-21** par le porteur : les tableaux ne sont **jamais publics**. Ils sont privés et peuvent être **partagés avec d'autres utilisateurs connectés de MyWork** pour y travailler ensemble (cartes, checklist, commentaires). Aucune page publique, aucun visiteur anonyme.

## Maquettes retenues (2026-10-21)

Dessinées dans un canvas Claude Design privé, au thème Éditorial (D22, carmin `#911128`). Seules les maquettes choisies sont gardées ; les autres pistes (proposition B, tableau public côté visiteur) sont abandonnées.

| Maquette retenue | Ce qu'elle fixe | Sections de ce document |
|---|---|---|
| **Kanban — proposition A (classique)** | Rendu du tableau : listes en colonnes à en-tête pastel, cartes blanches encadrées, carte en cours de glisser, « + Carte », « + Ajouter une liste » | [Interface](#interface), [Listes](#listes), [Cartes](#cartes) |
| **Navigation de la proposition C** | **Double barre de navigation à gauche** : le menu principal de l'app, puis la colonne « MES TABLEAUX » (« + Nouveau », un tableau par ligne avec icône et menu ⋮, tableau ouvert sur fond rose carmin clair) | [Interface](#interface), [Tableaux](#tableaux) |
| **Fenêtre d'une carte — proposition A** | Titre, liste d'origine, description et sa barre de mise en forme, images, checklist avec barre de progression, commentaires, actions sur le côté | [Fenêtre de détail](#fenêtre-de-détail) |

Liens des maquettes : *à ajouter (canvas Claude Design du porteur, accès privé)*.

Recherche et cloche de notifications vues dans les maquettes : **V2**, non affichées en V1.

## Objectif

Une expérience proche de Trello avec beaucoup moins de fonctions : plusieurs tableaux, des listes, des cartes que l'on déplace à la souris, et la possibilité d'inviter d'autres utilisateurs de MyWork sur un tableau. Le Kanban n'a **pas de partie publique** sur le profil (`/<pseudo>`).

## Limites

| Élément | Limite |
|---|---|
| Listes par tableau | 5 |
| Cartes par liste | 20 |
| Tableaux par utilisateur | pas de limite en V1 |
| Membres invités par tableau | 10 **(à valider)** |
| Titre d'une carte | 150 caractères |
| Description | 10 000 caractères |
| Commentaire | 2 000 caractères |
| Images par carte | 5, 2 Mo chacune |
| Éléments de checklist par carte | 30 |

Les limites sont appliquées côté serveur et dans la base : une 6ᵉ liste ou une 21ᵉ carte est refusée avec un message clair (« Cette liste est pleine : 20 cartes au maximum »). Quand la limite est atteinte, le bouton d'ajout est désactivé et explique pourquoi.

## Tableaux

- **Toujours privés** : un tableau n'est visible que par son propriétaire et ses membres. Aucune adresse publique, y compris par lien direct.
- **Partage avec des membres** : le propriétaire invite un autre utilisateur de MyWork par son **pseudo** (menu ⋮ du tableau, « Partager »). Le membre voit le tableau dans sa colonne « MES TABLEAUX », avec une icône « partagé » et le nom du propriétaire. Le propriétaire peut retirer un membre ; un membre peut quitter le tableau.
- **Changer de tableau** : la colonne « MES TABLEAUX » de la navigation (maquette C). Le dernier tableau ouvert est rouvert au prochain passage.
- Actions **du propriétaire seul** : créer, renommer, choisir l'icône, partager, supprimer (avec confirmation qui rappelle le nombre de cartes perdues).
- **Icône** : choisie parmi document, graphique, personne, dossier, étoile, cible.

## Listes

- Gérées **uniquement par le propriétaire** : créer, renommer, changer la couleur (6 pastels : rose, jaune, bleu, vert, violet, gris), supprimer (avec confirmation si elle contient des cartes), **réordonner par glisser-déposer**.
- « + Ajouter une liste » sous les listes, jusqu'à 5.
- **Liste de fin** : une liste par tableau peut être marquée « liste de fin » (menu ⋮). Y déposer une carte dont la checklist n'est pas finie **avertit** (« La checklist n'est pas finie (2/5). La déplacer quand même ? ») sans bloquer.

## Cartes

### Dans la liste

- **Ajout rapide** : « + Carte » en bas de chaque liste ouvre un champ ; Entrée valide et laisse le champ ouvert, Échap ferme.
- **Aperçu** : la première image en haut de la carte, le titre, puis seulement si présents : description (≡), nombre de commentaires (💬), d'images (🖼), et checklist « ☑ 2/5 » (verte quand tout est coché).
- **Qui peut quoi** : le propriétaire et les membres créent, modifient, déplacent et suppriment toutes les cartes du tableau **(à valider : ou un membre seulement ses cartes)**.
- **Déplacer** : glisser-déposer dans une liste et d'une liste à l'autre, à la souris, au doigt ou au clavier. Un déplacement vers une liste pleine est refusé (la carte revient à sa place avec un message).

### Fenêtre de détail

Maquette « fenêtre d'une carte — proposition A ». Un clic sur une carte ouvre une fenêtre avec :

1. le **titre** (modifiable en place) et la liste d'origine (« dans la liste À faire ») ;
2. la **description** ;
3. les **images** ;
4. la **checklist** ;
5. les **commentaires**.

Le lien de la fenêtre se partage entre membres (`/dashboard/kanban?tableau=<tableau>&carte=<id>`), et Échap ou un clic à côté la ferme.

### Description

Texte en **Markdown limité**, affiché proprement quand on n'est pas en train d'écrire.

| Mise en forme | Raccourci clavier | Markdown |
|---|---|---|
| Gras | Ctrl/⌘ + B | `**texte**` |
| Italique | Ctrl/⌘ + I | `*texte*` |
| Lien | Ctrl/⌘ + K | `[texte](adresse)` |
| Liste à puces | `- ` en début de ligne | `- élément` |
| Liste numérotée | `1. ` en début de ligne | `1. élément` |
| Titre | `## ` en début de ligne | `## Titre` |

- **Entrée** va à la ligne ; **Ctrl/⌘ + Entrée** ou « Enregistrer » enregistre ; Échap annule.
- Une barre de boutons reprend les mêmes actions et affiche leur raccourci au survol.
- Rien d'autre : pas de tableaux, pas de code, pas de HTML. Le texte est nettoyé à l'affichage.

### Images

- Ajout par bouton, **glisser-déposer** d'un fichier ou **collage** (Ctrl/⌘ + V).
- JPEG, PNG ou WebP, 2 Mo maximum, 5 par carte ; vignettes cliquables, suppression.
- Stockage **privé** (`kanban-images`), lu par des adresses signées d'une heure créées côté serveur, seulement pour le propriétaire et les membres du tableau.

### Checklist

- Une checklist par carte : éléments à cocher, ajout par saisie + Entrée, suppression. Barre de progression dans la fenêtre, « ☑ cochés/total » sur la carte.

### Commentaires

- Gardés pour **travailler à plusieurs** : visibles par le propriétaire et les membres du tableau. Texte brut avec retours à la ligne, 2 000 caractères.
- Chaque commentaire montre son auteur (nom affiché du compte) et la date.
- **Suppression** : chacun supprime ses commentaires ; le propriétaire supprime tous les commentaires. Pas de modification en V1.

## Droits : récapitulatif

| Action | Propriétaire | Membre invité | Autre utilisateur / non connecté |
|---|---|---|---|
| Voir le tableau | Oui | Oui | Non |
| Créer, renommer, supprimer, déplacer une liste ; liste de fin | Oui | Non | Non |
| Créer, modifier, déplacer, supprimer une carte | Oui | Oui **(à valider)** | Non |
| Images, checklist | Oui | Oui | Non |
| Commenter | Oui | Oui | Non |
| Supprimer un commentaire | Tous | Les siens | Non |
| Renommer, partager, supprimer le tableau | Oui | Non (peut le quitter) | Non |

## Interface

- **Page** : `/dashboard/kanban` uniquement, entrée « Kanban » du menu principal. Pas de page publique.
- **Disposition** (maquette A + navigation C) : à gauche, **deux barres** côte à côte : le menu principal de l'app (entrée active en bloc plein carmin), puis « MES TABLEAUX ». À droite, « TABLEAU : <NOM> » en capitales avec un menu ⋯, puis les listes côte à côte, avec défilement horizontal si l'écran est étroit.
- Style Éditorial (D22) : fond crème, titres des listes en serif, carmin pour les actions et l'indicateur de glisser-déposer.
- Glisser-déposer avec une zone d'insertion claire ; au clavier : Espace pour attraper, flèches, Espace pour poser.
- États : aucun tableau, tableau vide, limite atteinte, chargement, erreur réseau avec réessai.
- Écran d'ordinateur d'abord (D1).

## Données et sécurité

- **Tables** : `kanban_boards` (propriétaire, nom, slug, icône), `kanban_board_members` (tableau, membre, ajouté le) **à créer**, `kanban_lists` (couleur, position, liste de fin), `kanban_cards`, `kanban_checklist_items`, `kanban_card_images`, `kanban_comments`.
- **RLS** : lecture et écriture pour le propriétaire et les membres selon le tableau des droits ; **aucune lecture pour `anon`**.
- **Limites dans la base** : déclencheurs qui refusent la 6ᵉ liste, la 21ᵉ carte, le 31ᵉ élément de checklist, la 6ᵉ image.
- **Ordre** : colonne `position` ; déplacements « tout ou rien » par des fonctions SQL (`kanban_move_card`, `kanban_move_list`).
- **Glisser-déposer** : `@dnd-kit` (`core`, `sortable`, `utilities`).
- **Tests** (D14) : Vitest pour les règles (limites, droits, validation, liste de fin) ; Playwright pour un parcours complet.

## Décisions (2026-10-21)

1. **Aucune visibilité publique** : ni tableau public, ni page publique, ni visiteur anonyme (révision du porteur ; remplace les décisions précédentes sur les visiteurs et le public / privé).
2. **Travail à plusieurs entre utilisateurs de MyWork** : partage d'un tableau par invitation d'un pseudo ; commentaires conservés pour ça.
3. **Rendu** : maquette A ; **navigation** : maquette C (double barre à gauche) ; **fenêtre de carte** : maquette A.
4. **Description** : Entrée va à la ligne, Ctrl/⌘ + Entrée enregistre.
5. **Checklist** : une seule par carte en V1.
6. **Images** : 5 par carte, 2 Mo, stockage privé, adresses signées.
7. **Tableaux** : pas de limite en V1.
8. **Glisser-déposer** : `@dnd-kit`.
9. **Suppression** d'une liste ou d'un tableau : définitive, avec confirmation (corbeille en V2).
10. **Couleur d'une liste** : 6 pastels ; **icône d'un tableau** : 6 choix.
11. **Menu principal** : entrée active en bloc plein carmin dans toute l'app.
12. **Liste de fin** : avertissement (pas de blocage) si la checklist n'est pas finie.

## Questions à valider

1. **Cartes des membres** : un membre peut-il modifier, déplacer et supprimer **toutes** les cartes (proposé), ou seulement les siennes ?
2. **Nombre de membres** par tableau : 10 (proposé) ?
3. **Invitation** : par pseudo, sans acceptation de l'invité en V1 (proposé) ; ou une invitation à accepter ?

## Livraison

Déjà livré sur la branche `feature/kanban` (2026-10-21) : tableaux, listes en couleur, cartes, glisser-déposer, fenêtre de carte (description, checklist, commentaires du propriétaire), images avec aperçu sur la carte, liste de fin. Code : `src/lib/kanban.ts`, `src/app/dashboard/kanban/`, `src/components/kanban/`, migrations `20261021190000` à `20261021210000`.

À faire pour suivre cette révision :

1. **Retirer la visibilité publique** : supprimer la page `src/app/[username]/kanban/[slug]/`, le réglage public / privé et « Copier le lien public » ; migration qui retire `is_public` et toute lecture `anon` (tables et images).
2. **Partage entre utilisateurs** : table des membres, invitation par pseudo, RLS ouverte aux membres, colonne « MES TABLEAUX » avec les tableaux partagés.
3. **Commentaires et cartes des membres**, selon le tableau des droits.
4. **Navigation C** : vérifier la double barre à gauche par rapport à la maquette.

## Version 2

Étiquettes de couleur, dates d'échéance, archivage des cartes, plusieurs checklists, modèles de tableau, recherche, notifications (cloche, e-mail avec Resend), journal d'activité, corbeille.
