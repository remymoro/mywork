# AGENTS.md

Carte du projet pour les agents (Claude, Codex, Antigravity…).

## Le projet en une phrase
**MyWork** (`mywork.website`) : une application web SaaS personnelle (CV, rendez-vous, boards, fichiers, puis visio) centrée sur un profil public, ouverte plus tard à d'autres utilisateurs par abonnement.

## Lire la documentation dans cet ordre
1. `docs/vision.md` : idée, concept du profil public, modules et ordre de livraison, périmètre.
2. `docs/decisions.md` : décisions actées ou proposées, stack, points d'attention, questions ouvertes.

Profil du porteur du projet (non développeur) et comptes à créer : section finale de `docs/vision.md`.

## Règles
- Ne considère comme acquis que ce qui est marqué **Acté** dans `docs/decisions.md`. Tout le reste est à confirmer avec le porteur du projet.
- Quand une décision est prise, mets à jour `docs/decisions.md` plutôt que de créer un nouveau fichier.
- Documentation en français, concise. Garde un nombre de fichiers minimal.
- Stack : voir `docs/decisions.md` (D8). Ne pas en introduire d'autre sans accord.
- Le porteur du projet n'est pas développeur : explique en langage simple, évite le jargon, fais les choix techniques toi-même (avec une courte justification) et ne pose que des questions de produit. Il lui faut des étapes claires et vérifiables (ex. « ouvre cette adresse, tu dois voir… »).
- Tests obligatoires (Vitest + Playwright, voir D14) : ne livre pas une fonctionnalité sans ses tests, et lance-les avant de dire que c'est terminé.
