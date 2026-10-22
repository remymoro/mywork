# Module Drive (Fichiers)

Détail fonctionnel du module Fichiers, un mini Google Drive. Voir `docs/decisions.md` (D7, D24) pour les choix techniques et `docs/vision.md` pour la place du module.

Statut : **spécification proposée le 2026-10-22**, d'après le brief du porteur. Les choix faits par l'agent sont listés dans [Décisions prises](#décisions-prises) : à relire et valider.

## Objectif

Un espace de stockage personnel sur **une seule page** (`/dashboard/fichiers`) : pas de colonne de navigation propre au module, seulement la zone centrale (le menu principal de l'app reste là). On y crée des dossiers pour s'organiser et on y dépose tous types de fichiers. Un fichier est **privé par défaut** ; s'il est rendu **public**, n'importe qui peut le télécharger et il apparaît dans l'onglet **« Ressources »** du profil public (`/<pseudo>`).

Pour l'instant, le propriétaire est toujours l'utilisateur connecté (pas de partage entre utilisateurs).

## Ce que l'on voit à l'écran

De haut en bas, dans la zone centrale :

1. **Titre** « Mes fichiers » (avec la petite ligne « ESPACE PRIVÉ », comme les autres pages) et boutons **« Nouveau dossier »** et **« Importer des fichiers »**.
2. **Fil d'Ariane** (`Mes fichiers › Projets › 2026`) pour remonter d'un niveau.
3. **Barre d'outils** : recherche, filtre par type, tri, bascule liste / grille.
4. **Contenu** : dossiers puis fichiers, en liste ou en grille.
5. **Pagination** en bas.
6. **Indicateur de stockage** (voir plus bas).

Écran vide : message « Aucun fichier ici. Glissez des fichiers dans cette zone ou cliquez sur Importer. »

## Dossiers

- Création, renommage, déplacement et suppression. Les dossiers peuvent être **imbriqués** (3 niveaux au maximum).
- Supprimer un dossier supprime tout son contenu, après confirmation qui rappelle le nombre de fichiers perdus.
- Un dossier n'est jamais public lui-même : seule la visibilité des **fichiers** compte (voir [Visibilité](#visibilité-privé-ou-public)).
- Nom : 1 à 100 caractères, sans `/`, unique dans un même dossier.

## Fichiers

- **Import** : bouton, ou glisser-déposer sur la page. Plusieurs fichiers à la fois, avec une barre de progression par fichier.
- **Types acceptés** : tous, **sauf** les programmes exécutables et scripts (`.exe`, `.msi`, `.bat`, `.cmd`, `.sh`, `.com`, `.scr`, `.js`, `.vbs`, `.jar`, `.apk`, `.dmg`). Le contrôle se fait sur l'extension, côté serveur.
- **Actions** (menu ⋮ de chaque ligne ou carte) : télécharger, renommer, déplacer, rendre public / privé, supprimer.
- **Aperçu** : miniature pour les images en grille ; icône par type pour les autres.
- **Remplacement** : importer un fichier du même nom dans le même dossier demande « Remplacer » ou « Garder les deux » (le second est renommé `nom (2).ext`).

### Informations affichées

| Colonne (liste) / texte (grille) | Contenu |
|---|---|
| Nom | Nom avec extension, icône du type |
| Propriétaire | Nom affiché de l'utilisateur (toujours « moi » pour l'instant) |
| Date de modification | Format court en français (`22 oct. 2026`) |
| Taille | Format lisible (`1,4 Mo`) ; « — » pour un dossier |
| Visibilité | Pastille « Public » ou cadenas « Privé » |

## Affichage liste ou grille

- Bascule par deux boutons dans la barre d'outils. Le choix est **mémorisé dans le navigateur** (`localStorage`), comme le thème.
- **Liste** : tableau avec les colonnes ci-dessus ; les en-têtes **Nom** et **Date de modification** sont cliquables pour trier.
- **Grille** : cartes avec aperçu ou icône, nom, taille et pastille de visibilité ; propriétaire et date dans une infobulle. Sur mobile, la grille passe à 2 colonnes et la liste masque les colonnes Propriétaire et Taille.

## Tri, filtre, recherche, pagination

- **Tri** : par nom (A→Z / Z→A) et par date de modification (récent / ancien). Par défaut : nom A→Z. **Les dossiers restent toujours avant les fichiers.**
- **Filtre par type** : Tout, Dossiers, Documents (PDF, Word, texte, tableurs, présentations), Images, Vidéos, Audio, Archives, Autres. Choisir un type ne garde que ce type dans la liste.
- **Recherche** : champ « Rechercher dans ce dossier… » qui filtre par nom (sans tenir compte des majuscules ni des accents), pendant la frappe (avec un court délai). La recherche porte sur le dossier ouvert ; une case « Chercher dans tous les dossiers » l'étend à tout l'espace.
- **Pagination** classique : 24 éléments par page, boutons Précédent / Suivant et numéros de page. Tri, filtre, recherche et page sont **dans l'adresse** (`?q=…&type=…&tri=…&page=2`) : on peut recharger ou partager l'adresse (privée) sans perdre la vue.
- Tout changement de tri, de filtre ou de recherche revient à la page 1.

## Visibilité : privé ou public

- **Privé par défaut**, y compris à l'import. Seul le propriétaire le voit et le télécharge.
- **Public** : bascule dans le menu ⋮ ou en sélection multiple. Un avertissement avant la première mise en public : « N'importe qui pourra télécharger ce fichier. ».
- Un fichier public d'un dossier privé reste public : la visibilité est propre à chaque fichier.
- Cohérence avec le profil (D21) : si le **profil est hors ligne**, l'onglet Ressources n'est visible que par le propriétaire, et le téléchargement public est refusé tant que le profil est hors ligne.
- Les fichiers ne sont **pas indexés** par les moteurs de recherche (`noindex` sur la route de téléchargement).

## Onglet « Ressources » du profil public

- Nouvel onglet **« Ressources »** sur `/<pseudo>`, affiché **seulement s'il y a au moins un fichier public**.
- Liste des fichiers publics, à plat (pas de dossiers), en grille de cartes : nom, type, taille, date de modification et bouton **Télécharger**. Tri par date de modification décroissante, pagination à partir de 24 fichiers.
- Si une recherche ou un filtre de type est utile à cet endroit, il reprend la même barre que le Drive (V2).
- Le téléchargement passe par une route de l'application (`/<pseudo>/ressources/<id>`) qui vérifie que le fichier est public, puis redirige vers une **adresse signée de courte durée**. Le stockage reste privé, ce qui permet d'ajouter plus tard des limites contre les abus de bande passante.

## Indicateur de stockage

Une jauge en bas de page (et son détail au survol ou au clic) :

> **412 Mo utilisés sur 1 Go** (41 %) — offre gratuite Supabase

- Le total à comparer est le **plafond de stockage de l'offre Supabase du projet** (1 Go en gratuit, voir `docs/decisions.md`). Il s'agit de **la capacité de tout le projet**, pas d'un quota par utilisateur (MyWork n'est pas encore un SaaS).
- **D'autres éléments consomment cette même capacité** : les fichiers du Drive, mais aussi la **photo de profil**, les **images des projets du profil** et les **images des cartes du Kanban**. La jauge affiche donc le total réel du stockage et le détaille :

| Poste | Source |
|---|---|
| Fichiers du Drive | bucket `files` |
| Photo de profil et images de projets | buckets `avatars` et `project-images` |
| Images des tableaux Kanban | bucket des images Kanban |

- Texte d'aide sous la jauge : « Cette capacité est partagée avec votre photo de profil, les images de vos projets et les images de vos tableaux Kanban. »
- **Couleur** : carmin neutre jusqu'à 70 %, orange de 70 à 90 %, rouge au-delà. À partir de 90 %, un bandeau prévient ; à 100 %, les imports sont refusés avec un message clair.
- Le plafond est une valeur de configuration (`STORAGE_LIMIT_BYTES`, 1 Go par défaut) à ajuster si l'offre Supabase change. Il n'est pas lu automatiquement depuis Supabase.

## Limites

| Élément | Limite |
|---|---|
| Taille d'un fichier | 50 Mo |
| Fichiers importés d'un coup | 10 |
| Profondeur des dossiers | 3 niveaux |
| Nom d'un fichier ou d'un dossier | 100 caractères |
| Éléments par dossier | 500 |
| Capacité totale | plafond de l'offre Supabase (1 Go en gratuit) |

Les limites sont contrôlées côté serveur et dans la base, avec des messages clairs (« Ce fichier dépasse 50 Mo »). Remarque : le plafond de taille par fichier de l'offre gratuite Supabase est de 50 Mo ; il passera à une valeur plus haute avec une offre payante.

## Modèle de données (pour la migration)

- Table `drive_folders` : `id`, `owner_id`, `parent_id` (null à la racine), `name`, `created_at`, `updated_at`.
- Table `drive_files` : `id`, `owner_id`, `folder_id` (null à la racine), `name`, `storage_path`, `mime_type`, `size_bytes`, `is_public`, `created_at`, `updated_at`.
- Bucket **privé** `files`, chemin `<utilisateur>/<id du fichier>` (le nom d'origine n'est pas dans le chemin : pas de collision, pas de caractères problématiques).
- Sécurité (RLS) : le propriétaire lit et écrit ses lignes ; un visiteur ne lit que les fichiers `is_public` d'un profil en ligne. Les `grant` explicites sont à prévoir (piège noté dans `docs/decisions.md`).
- Vue ou fonction `storage_usage()` qui somme `storage.objects` par bucket, pour la jauge.
- `updated_at` est mis à jour par un déclencheur quand le fichier est renommé, déplacé, remplacé ou que sa visibilité change.

## Hors périmètre (V2 ou plus tard)

Partage avec un autre utilisateur, lien de partage temporaire pour un fichier privé, corbeille avec restauration, versions d'un fichier, aperçu intégré (PDF, vidéo), sélection multiple avec glisser-déposer entre dossiers, quota par utilisateur (arrivera avec l'abonnement), antivirus.

## Tests prévus (D14)

- **Vitest** : formatage des tailles et dates, tri (dossiers toujours en premier), filtre par type, recherche sans accents, pagination, validation des noms, extensions interdites, calcul du pourcentage et de la couleur de la jauge.
- **Playwright** : un parcours complet — créer un dossier, importer un fichier, passer en grille, trier, filtrer, chercher, rendre public, vérifier l'onglet Ressources sur la page publique, télécharger en visiteur, repasser en privé et constater que le téléchargement est refusé ; la jauge est visible avec la mention des autres consommateurs.

## Décisions prises

Toutes proposées par l'agent, en l'absence de précision du porteur ; à valider.

| # | Sujet | Choix | Pourquoi |
|---|---|---|---|
| 1 | Emplacement | Page `/dashboard/fichiers`, entrée « Fichiers » du menu principal activée | Cohérent avec Profil et Kanban ; le menu existe déjà (« Bientôt »). |
| 2 | Dossiers | Imbriqués sur 3 niveaux, non publics | Assez pour s'organiser sans devenir un vrai Drive ; la visibilité reste simple (par fichier). |
| 3 | Visibilité | Par fichier, privé par défaut | Correspond au brief ; évite d'exposer un fichier par erreur. |
| 4 | Stockage | Bucket privé + adresses signées (même si le fichier est public) | Même méthode que le Kanban ; permet de limiter les abus plus tard. |
| 5 | Téléchargement public | Route de l'application qui vérifie puis redirige | Un fichier repassé en privé devient aussitôt inaccessible. |
| 6 | Profil hors ligne | Les fichiers publics sont aussi inaccessibles | Cohérent avec l'interrupteur « Profil en ligne » (D21). |
| 7 | Onglet Ressources | Visible seulement s'il contient au moins un fichier | Pas d'onglet vide sur le profil. |
| 8 | Tri | Nom et date de modification ; dossiers toujours avant les fichiers | Comme Google Drive. |
| 9 | Filtre de type | Tout, Dossiers, Documents, Images, Vidéos, Audio, Archives, Autres | Couvre « dossier, document… » du brief avec des catégories lisibles. |
| 10 | Recherche | Dans le dossier ouvert, avec case pour chercher partout | Simple par défaut, utile quand il y a beaucoup de fichiers. |
| 11 | Pagination | 24 éléments par page, état dans l'adresse | Divisible par 2, 3, 4 colonnes de la grille ; la vue survit au rechargement. |
| 12 | Mémorisation de l'affichage | Liste ou grille dans `localStorage` | Même mécanisme que le thème. |
| 13 | Limites | 50 Mo par fichier, 10 par import, 500 par dossier | 50 Mo = plafond de l'offre gratuite Supabase ; les autres évitent les abus. |
| 14 | Types refusés | Exécutables et scripts | Un fichier public ne doit pas servir à diffuser un programme. |
| 15 | Doublons | « Remplacer » ou « Garder les deux » | Comportement connu de tous. |
| 16 | Jauge | Total réel du stockage du projet face au plafond Supabase, avec détail par poste | Demande du porteur : pas de quota par utilisateur tant que ce n'est pas un SaaS. |
| 17 | Plafond | Valeur de configuration (1 Go) et non lue depuis Supabase | Supabase ne fournit pas ce plafond par API simple ; une constante reste facile à changer. |
| 18 | Seuils de la jauge | Avertissement à 70 % et 90 %, blocage des imports à 100 % | Prévenir avant d'atteindre la limite. |
| 19 | Moteurs de recherche | Téléchargements en `noindex` | Point d'attention existant (profil public). |
| 20 | Hors périmètre | Partage entre utilisateurs, corbeille, versions, aperçu intégré | Gardés pour une V2 afin de livrer vite. |
