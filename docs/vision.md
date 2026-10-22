# Vision et périmètre

**MyWork** (`mywork.website`)

## Idée
Une application web de type SaaS qui regroupe dans un seul outil personnalisable des services aujourd'hui payés séparément (LinkedIn, Calendly, Trello, Google Drive). Elle sert d'abord à son auteur, puis sera ouverte à d'autres utilisateurs avec un abonnement unique et peu cher.

## Concept central : le profil public
Tout s'articule autour d'une page publique par utilisateur (ex. `mywork.website/<pseudo>`). Chaque module y expose sa partie publique :

| Module | Partie privée (propriétaire) | Partie publique (visiteur) |
|---|---|---|
| Profil (anciennement « CV ») | Édition simple des sections | Profil professionnel consultable par URL, export PDF ou image |
| Kanban (anciennement « Boards ») | Plusieurs tableaux type Trello, partageables avec d'autres utilisateurs de MyWork | Aucune (jamais public, révision du 2026-10-21) |
| Rendez-vous | Disponibilités, liste des réservations | Réservation d'un créneau |
| Fichiers | Dossiers et fichiers privés (une seule page, liste simple) | Fichiers publics téléchargeables, onglet « Ressources » (voir `docs/drive.md`) |
| Visio (plus tard) | Rejoindre l'appel | Rejoindre l'appel lié au RDV |

## Modules et ordre prévu
1. **Socle** : authentification (compte propriétaire), profil public, modèle de données multi-utilisateur.
2. **Profil** (anciennement « CV ») : première fonctionnalité livrée.
3. **Kanban** (Trello simplifié) : prochain module, choisi le 2026-10-21 (avant Rendez-vous).
4. **Rendez-vous** (Calendly simplifié).
5. **Fichiers** (Drive simplifié).
6. **Abonnement** : offre unique avec quota de données, inscription ouverte au public.
7. **Visio** liée aux rendez-vous.

## Cibles et contraintes
- Web, conçu pour ordinateur ; tablette et mobile éventuellement plus tard.
- Interface en français.
- Utilisateurs européens, donc RGPD (données personnelles des profils et des réservations).

## Hors périmètre pour l'instant
Applications mobiles natives, offres multiples, édition de documents en ligne. (Le travail à plusieurs sur un tableau Kanban, entre utilisateurs de MyWork, est entré dans le périmètre le 2026-10-21 : voir `docs/kanban.md`.)

## Porteur du projet
Non développeur : les agents font les choix techniques, expliquent simplement et ne posent que des questions de produit. Chaque étape se termine par une vérification concrète (ce qu'on doit voir à l'écran).

## Comptes à créer (gratuits au départ)
GitHub, Vercel, Supabase pour démarrer ; Resend (e-mails), Stripe (abonnement) et LiveKit (visio) plus tard. Un compte à la fois, avec l'aide de l'agent.
