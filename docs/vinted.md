# Module Vinted

Suivi de ses ventes Vinted, de l'article en stock jusqu'à l'argent reçu. Voir `docs/decisions.md` (D28).

Statut : **V1 de conception (2026-10-23)**, migration `20261023120000_vinted.sql` **appliquée à Supabase le 2026-10-23**, logique volontairement simple pour juger la maquette. **Aucune connexion à Vinted ni aux transporteurs** : tout est saisi à la main. Le suivi automatique des colis (API La Poste pour Colissimo et Chronopost) et la lecture des e-mails Vinted viendront plus tard.

## Page « Mes ventes Vinted » (`/dashboard/vinted`)

- Entrée **Vinted** dans le menu, après Fichiers. Module **privé** : rien n'apparaît sur le profil public.
- En haut, 4 chiffres : **En vente** (nombre et valeur affichée), **À expédier** (nombre, dont en retard), **Ventes du mois** (nombre et total encaissé ou à encaisser), **Marge du mois** (prix de vente moins prix d'achat, pour les articles dont le prix d'achat est connu).
- Onglets par étape (avec le nombre d'articles) : Tous · À mettre en ligne · En vente · À expédier · En livraison · Livrés · Terminés. Adresse : `?etape=a-expedier`.
- Recherche par titre ou marque (sans tenir compte des majuscules ni des accents). Tri : dernier article modifié en premier.
- **Tableau par étapes** (maquette B choisie le 2026-10-23, `.maquettes/vinted-B.html`) : une colonne par étape (nombre d'articles et total), cartes qu'on **fait glisser** vers la colonne voisine pour avancer ou reculer d'une étape (un saut de plusieurs colonnes est refusé). Sur téléphone, une colonne à la fois, choisie dans une liste.
- Bouton **Ajouter un article**. Un clic sur un article ouvre sa fiche dans un **panneau à droite** (modifier, passer à l'étape suivante, revenir en arrière, annuler la vente, supprimer avec confirmation).
- Écran vide : « Aucun article pour l'instant. Ajoute ton premier article. »

## Étapes d'un article (comme sur Vinted)

| Étape | Libellé | Ce qui se passe |
|---|---|---|
| `a_publier` | À mettre en ligne | En stock, pas encore publié. |
| `en_vente` | En vente | Publié sur Vinted. Date de mise en ligne enregistrée. |
| `vendu` | À expédier | Vendu : **prix de vente obligatoire**. Vinted laisse **5 jours ouvrés** pour expédier : la fiche affiche « À expédier avant le … » et l'article passe **en retard** après. |
| `expedie` | En livraison | **Transporteur obligatoire**, numéro de suivi facultatif (bouton « Copier »). |
| `livre` | Livré | L'acheteur a **2 jours** pour signaler un problème : « Argent disponible vers le … ». |
| `termine` | Terminé | L'argent est reçu. |

- On avance d'une étape à la fois, et on peut revenir d'une étape en arrière pour corriger une erreur. La date de chaque étape est enregistrée automatiquement.
- **Annuler la vente** (depuis À expédier, En livraison ou Livré) remet l'article **En vente** et efface prix de vente, acheteur, transporteur, numéro et dates de vente.

## Fiche d'un article

Titre (obligatoire, 100 caractères max), marque, taille, état (Neuf avec étiquette, Neuf sans étiquette, Très bon état, Bon état, Satisfaisant), prix d'achat, prix affiché, prix de vente, pseudo de l'acheteur, transporteur (Vinted Go, Mondial Relay, Relais Colis, Chronopost, Colissimo, Autre), numéro de suivi, note libre (1 000 caractères max).

- Prix en euros, saisis avec virgule ou point (« 12,50 »), enregistrés en centimes, entre 0 et 100 000 €.
- Vinted ne prend pas de frais au vendeur : marge = prix de vente − prix d'achat.
- Limite : **500 articles** par utilisateur. Pas de photo en V1.

## Technique

Table `vinted_items` (une ligne par article, rattachée au propriétaire, RLS : lecture et écriture par le propriétaire seul). Règles pures dans `src/lib/vinted.ts`, actions serveur dans `src/app/dashboard/vinted/actions.ts`.
