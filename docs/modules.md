# Modules

Détail fonctionnel de chaque module. Les décisions techniques restent dans `docs/decisions.md`.

## Module Profil (anciennement « CV »)

Vitrine de MyWork : c'est la première chose que voit un visiteur (recruteur, client, partenaire) sur `mywork.website/<pseudo>`. Objectif : un profil professionnel complet, sur le modèle de LinkedIn.

- **Côté privé** (`/dashboard/profil`, « Mon profil ») : une carte par section, avec des formulaires simples. Dans les sections à plusieurs éléments : ajouter, modifier, masquer au public sans supprimer, changer l'ordre, supprimer.
- **Côté public** (`/<pseudo>`) : mise en page soignée du résultat. Une section vide ou un élément masqué n'apparaît pas. Profil hors ligne (interrupteur « Profil en ligne ») : page introuvable pour les visiteurs.

### Version 1 (2026-10-21)

| Section | Contenu |
|---|---|
| En-tête | Photo, nom affiché, titre, localisation (ville, pays), disponibilité (« Ouvert aux opportunités » + précision libre, ex. « freelance, CDI »), e-mail de contact, liens (site web, LinkedIn, GitHub, autre) |
| À propos | Texte de présentation (2 600 caractères max), 5 compétences clés au plus |
| Expérience | Poste, entreprise, type de contrat (CDI, CDD, freelance, stage, alternance, intérim, bénévole, autre), lieu, mode de travail (sur site, hybride, télétravail), début, fin ou « poste actuel », description, compétences |
| Formation | École, diplôme, domaine, années de début et de fin, mention, description |
| Compétences | Liste libre |
| Langues | Langue et niveau (notions, intermédiaire, professionnel, courant, bilingue, langue maternelle) |
| Certifications | Nom, organisme, date d'obtention, date d'expiration, lien de vérification |
| Projets | Nom, début, fin, description, lien, compétences |

- **E-mail de contact** : choisi par l'utilisateur, pas forcément l'adresse Google. Côté public, il n'est pas écrit dans la page : le bouton « Afficher l'e-mail » le demande au serveur, puis un bouton « Copier » apparaît. Cela gêne les robots qui collectent les adresses.
- **Poste actuel en haut** : sur la page publique, le premier poste coché « Poste actuel » (dans l'ordre choisi) s'affiche sous le nom, au-dessus du titre, comme sur LinkedIn.
- **Nom et prénom** : on garde pour l'instant le « nom affiché » existant ; la séparation prénom / nom viendra avec les paramètres du compte.
- **Photo** : JPEG, PNG ou WebP, 2 Mo maximum, stockée dans Supabase Storage (D7).

### Version 2

Bénévolat, distinctions et prix, publications, centres d'intérêt, « Mis en avant » (liens ou documents épinglés, lié au module Fichiers), image de couverture, téléphone (avec choix de visibilité), export PDF (D5).

### Plus tard

Recommandations (témoignages d'autres utilisateurs : nécessite l'ouverture aux autres comptes).
