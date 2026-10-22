# Module Drive (Fichiers)

Mini Google Drive **minimal**, sur une seule page. Voir `docs/decisions.md` (D7, D24).

Statut : **spécification validée le 2026-10-22** (migration `20261022100000_drive.sql` écrite, pas encore appliquée à Supabase), volontairement réduite à l'essentiel (le porteur trouvait la première version trop complexe). Elle sert d'abord à tester.

## Objectif

Une page `/dashboard/fichiers` pour ranger des fichiers dans quelques dossiers. Un fichier est **privé par défaut** ; s'il est rendu **public**, n'importe qui peut le télécharger et il apparaît dans l'onglet **« Ressources »** du profil public.

## Page « Mes fichiers »

- Boutons **Nouveau dossier** et **Importer** (plusieurs fichiers à la fois).
- **Un seul niveau de dossiers** : un dossier contient des fichiers, jamais d'autres dossiers. Un fil d'Ariane très simple (`Mes fichiers › Contrats`) permet de revenir à la racine.
- **Liste** (tableau) : nom, date de modification, taille, statut (Public ou cadenas). Les dossiers sont toujours en premier.
- **Tri** : clic sur l'en-tête **Nom** ou **Modifié le** (dans un sens puis dans l'autre). Par défaut : nom A→Z.
- **Recherche** : un champ qui filtre par nom les éléments du dossier ouvert (sans tenir compte des majuscules ni des accents).
- **Menu ⋮** d'un fichier : Télécharger, Renommer, Rendre public / privé, Supprimer. Dossier : Renommer, Supprimer (avec confirmation qui rappelle le nombre de fichiers perdus).
- Écran vide : « Aucun fichier ici. Cliquez sur Importer. »

## Visibilité

- **Privé par défaut**, y compris à l'import.
- La bascule « Rendre public » demande une confirmation : « N'importe qui pourra télécharger ce fichier. »
- La visibilité est propre à chaque fichier (les dossiers ne sont jamais publics).
- Si le profil est **hors ligne** (D21), l'onglet Ressources et les téléchargements publics sont inaccessibles.

## Onglet « Ressources » du profil public

- Affiché sur `/<pseudo>` **seulement s'il y a au moins un fichier public**.
- Liste simple : nom, taille, date, bouton **Télécharger**.
- Le téléchargement passe par une route de l'application qui vérifie que le fichier est public, puis redirige vers une adresse signée de courte durée. Le stockage reste privé.

## Jauge de stockage

Une barre en bas de la page : « **412 Mo utilisés sur 1 Go** ».

- Elle compare l'espace utilisé dans **tout le stockage Supabase du projet** au plafond de l'offre (1 Go en gratuit). MyWork n'est pas encore un SaaS : il n'y a pas de quota par utilisateur.
- Texte d'aide : « Cette capacité est partagée avec votre photo de profil et les images de vos tableaux Kanban. » (les images de projets du profil la consomment aussi).
- Le plafond est une valeur de configuration (`STORAGE_LIMIT_BYTES`, 1 Go). À 100 %, les imports sont refusés avec un message clair.

## Limites

| Élément | Limite |
|---|---|
| Taille d'un fichier | 10 Mo |
| Éléments par dossier | 100 |
| Nom | 100 caractères, sans `/` |
| Types refusés | programmes et scripts (`.exe`, `.msi`, `.bat`, `.cmd`, `.sh`, `.js`, `.jar`, `.apk`, `.dmg`…) |

Un fichier importé avec un nom déjà présent dans le dossier est renommé automatiquement (`nom (2).ext`).

## Modèle de données

- `drive_folders` : `id`, `owner_id`, `name`, `created_at`.
- `drive_files` : `id`, `owner_id`, `folder_id` (null à la racine), `name`, `storage_path`, `mime_type`, `size_bytes`, `is_public`, `updated_at`.
- Bucket **privé** `files`, chemin `<utilisateur>/<id du fichier>`.
- RLS : le propriétaire gère ses lignes ; un visiteur ne lit que les fichiers publics d'un profil en ligne. `grant` explicites à prévoir (voir `docs/decisions.md`).
- Fonction `storage_usage()` qui somme la taille de `storage.objects` pour la jauge.

## Tests prévus (D14)

- **Vitest** : tri (dossiers d'abord), recherche sans accents, formatage des tailles et dates, extensions refusées, renommage des doublons, pourcentage de la jauge.
- **Playwright** : un parcours — créer un dossier, importer un fichier, le rendre public, le voir dans Ressources et le télécharger en visiteur, le repasser en privé et constater que c'est refusé ; la jauge est visible.

## Plus tard (retiré de la V1 pour rester simple)

Vue grille, filtre par type, pagination, dossiers imbriqués, déplacement de fichiers, choix « Remplacer / Garder les deux », miniatures d'images, détail de la jauge par poste et seuils de couleur, colonne Propriétaire (utile avec le partage), recherche dans tous les dossiers, partage entre utilisateurs, corbeille, quota par utilisateur.

## Décisions prises

Validées avec la spécification le 2026-10-22.

| # | Sujet | Choix | Pourquoi |
|---|---|---|---|
| 1 | Périmètre | Liste seule, un niveau de dossiers, pas de filtre ni de pagination | Version la plus simple qui reste utile ; le reste est listé dans « Plus tard ». |
| 2 | Emplacement | `/dashboard/fichiers`, entrée « Fichiers » du menu activée | Le menu existe déjà (« Bientôt »). |
| 3 | Visibilité | Par fichier, privée par défaut | Évite d'exposer un fichier par erreur. |
| 4 | Stockage | Bucket privé et adresses signées, même pour un fichier public | Même méthode que le Kanban ; un fichier repassé en privé devient aussitôt inaccessible. |
| 5 | Profil hors ligne | Fichiers publics inaccessibles | Cohérent avec D21. |
| 6 | Ressources | Onglet affiché seulement s'il y a un fichier public | Pas d'onglet vide. |
| 7 | Limites | 10 Mo par fichier, 100 éléments par dossier | Protège le plafond de 1 Go ; 100 éléments évitent la pagination. |
| 8 | Doublons | Renommage automatique | Évite une fenêtre de dialogue. |
| 9 | Jauge | Total du stockage du projet face au plafond Supabase, configurable | Demande du porteur ; pas de quota par utilisateur. |
| 10 | Types refusés | Programmes et scripts | Un fichier public ne doit pas diffuser un programme. |
