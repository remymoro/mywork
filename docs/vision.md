# Vision et périmètre

**MyWork** (`mywork.website`)

## Idée
Une application web de type SaaS qui regroupe dans un seul outil personnalisable des services aujourd'hui payés séparément (LinkedIn, Calendly, Trello, Google Drive). Elle sert d'abord à son auteur, puis sera ouverte à d'autres utilisateurs avec un abonnement unique et peu cher.

## Concept central : le profil public
Tout s'articule autour d'une page publique par utilisateur (ex. `mywork.website/<pseudo>`). Chaque module y expose sa partie publique :

| Module | Partie privée (propriétaire) | Partie publique (visiteur) |
|---|---|---|
| CV | Édition simple des sections | CV consultable par URL, export PDF ou image |
| Rendez-vous | Disponibilités, liste des réservations | Réservation d'un créneau |
| Boards | Plusieurs boards type Trello | Un board marqué public |
| Fichiers | Dossiers et fichiers privés | Dossier public téléchargeable |
| Sport : suivi du poids | Saisie du poids (date, kg) et courbe d'évolution dans le tableau de bord | Aucune : privé, jamais affiché sur le profil public |
| Visio (plus tard) | Rejoindre l'appel | Rejoindre l'appel lié au RDV |

## Modules et ordre prévu
1. **Socle** : authentification (compte propriétaire), profil public, modèle de données multi-utilisateur.
2. **CV** : première fonctionnalité livrée.
3. **Rendez-vous** (Calendly simplifié).
4. **Boards** (Trello simplifié).
5. **Fichiers** (Drive simplifié).
5 bis. **Sport** : suivi du poids avec courbe dans le tableau de bord (ordre à confirmer, module simple qui peut passer plus tôt).
6. **Abonnement** : offre unique avec quota de données, inscription ouverte au public.
7. **Visio** liée aux rendez-vous.

## Cibles et contraintes
- Web, conçu pour ordinateur ; tablette et mobile éventuellement plus tard.
- Interface en français.
- Utilisateurs européens, donc RGPD (données personnelles des CV et des réservations).

## Hors périmètre pour l'instant
Applications mobiles natives, offres multiples, collaboration à plusieurs sur un board, édition de documents en ligne.

## Porteur du projet
Non développeur : les agents font les choix techniques, expliquent simplement et ne posent que des questions de produit. Chaque étape se termine par une vérification concrète (ce qu'on doit voir à l'écran).

## Comptes à créer (gratuits au départ)
GitHub, Vercel, Supabase pour démarrer ; Resend (e-mails), Stripe (abonnement) et LiveKit (visio) plus tard. Un compte à la fois, avec l'aide de l'agent.
