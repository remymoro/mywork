# Modules

Détail fonctionnel de chaque module. Les décisions techniques restent dans `docs/decisions.md`.

## Module Profil (anciennement « CV »)

Vitrine de MyWork : c'est la première chose que voit un visiteur (recruteur, client, partenaire) sur `mywork.website/<pseudo>`. Objectif : un profil professionnel complet, sur le modèle de LinkedIn.

- **Côté privé** (`/dashboard/profil`, « Mon profil ») : menu des sections à gauche (Éditer mon profil, Photo, En-tête, À propos, Expérience, Formation, Compétences, Langues, Certifications, Projets) ; toutes les sections s'enchaînent à droite ; un clic dans le menu fait défiler en douceur jusqu'à la section, et le menu suit la section visible. Dans les sections à plusieurs éléments : ajouter, modifier, masquer au public sans supprimer, changer l'ordre, supprimer. « Ordre des sections » : l'ordre des sections de la page publique se choisit par glisser-déposer (ou flèches), l'en-tête restant en haut.
- **Côté public** (`/<pseudo>`) : mise en page soignée du résultat. Une section vide ou un élément masqué n'apparaît pas. Profil hors ligne (interrupteur « Profil en ligne ») : page introuvable pour les visiteurs.

### Version 1 (2026-10-21)

| Section | Contenu |
|---|---|
| En-tête | Photo, nom affiché, titre, localisation (ville, pays), disponibilité (« Ouvert aux opportunités » + précision libre, ex. « freelance, CDI »), e-mail de contact, liens (site web, LinkedIn, GitHub, autre) |
| Freelance | Case « Je propose mes services en freelance » (décochée : rien d'affiché, données gardées) ; disponibilité (à partir de, jours par semaine), modes de travail (sur site, hybride, télétravail), TJM (€ HT / jour), zone de déplacement ; prestations (nom, description, prix « à partir de »), en liste comme les autres sections |
| À propos | Texte de présentation (2 600 caractères max), 5 compétences clés au plus |
| Expérience | Poste, entreprise, type de contrat (CDI, CDD, freelance, stage, alternance, intérim, bénévole, autre), lieu, mode de travail (sur site, hybride, télétravail), début, fin ou « poste actuel », description, compétences |
| Formation | École, diplôme, domaine, années de début et de fin, mention, description |
| Compétences | Liste libre |
| Langues | Langue et niveau (notions, intermédiaire, professionnel, courant, bilingue, langue maternelle) |
| Certifications | Nom, organisme, date d'obtention, date d'expiration, lien de vérification |
| Projets | Nom, début, fin, description, lien, compétences, image (affichée sur la page publique) |

- **E-mail de contact** : choisi par l'utilisateur, pas forcément l'adresse Google. Côté public, il n'est pas écrit dans la page : le bouton « Afficher l'e-mail » le demande au serveur, puis un bouton « Copier » apparaît. Cela gêne les robots qui collectent les adresses.
- **Poste actuel en haut** : sur la page publique, le premier poste coché « Poste actuel » (dans l'ordre choisi) s'affiche au-dessus du nom.
- **Nom et prénom** : on garde pour l'instant le « nom affiché » existant ; la séparation prénom / nom viendra avec les paramètres du compte.
- **Photo et images de projet** : JPEG, PNG ou WebP, 2 Mo maximum, stockées dans Supabase Storage (D7), dossiers publics `avatars` et `project-images`.

### Version 2

Bénévolat, distinctions et prix, publications, centres d'intérêt, « Mis en avant » (liens ou documents épinglés, lié au module Fichiers), image de couverture, téléphone (avec choix de visibilité), export PDF (D5).

### Plus tard

Recommandations (témoignages d'autres utilisateurs : nécessite l'ouverture aux autres comptes).
