# Ntcharkou

**Place de marché du logement participatif au Maroc — interface bilingue français / arabe.**

La plateforme relie quatre éléments — terrains disponibles ↔ demandes des participants ↔
groupes de projet ↔ validation administrative — et, surtout, **effectue automatiquement le
rapprochement** entre les terrains publiés et les besoins réels exprimés par les participants.

---

## Sommaire

- [Ce qui est implémenté](#ce-qui-est-implémenté)
- [Démarrage rapide](#démarrage-rapide)
- [Architecture](#architecture)
- [Le moteur de matching](#le-moteur-de-matching)
- [Bilingue français / arabe](#bilingue-français--arabe)
- [Sécurité et confidentialité](#sécurité-et-confidentialité)
- [Tests](#tests)
- [Arborescence](#arborescence)
- [Ce qui reste à faire](#ce-qui-reste-à-faire)

---

## Ce qui est implémenté

Les six modules du MVP :

| Module | État | Où |
| --- | --- | --- |
| **1. Authentification** | Inscription participant / propriétaire, connexion, profil, rôles, suspension | `src/app/[locale]/(site)/connexion`, `inscription`, `profil` |
| **2. Terrains** | Formulaire en 6 étapes, photos, documents privés, workflow de validation | `src/components/land-form.tsx`, `src/app/[locale]/(site)/(espace)/mes-terrains` |
| **3. Demandes participants** | Typologies multiples, budget total *et* par unité, unités, groupe professionnel | `src/components/request-form.tsx`, `src/app/[locale]/(site)/(espace)/mes-demandes` |
| **4. Matching automatique** | Score pondéré à 7 critères, dans les deux sens, notifications | `supabase/migrations/*_matching.sql` |
| **5. Projets participatifs** | Création **par l'administration** depuis un terrain validé, grille tarifaire, demandes d'adhésion, constitution automatique | `src/app/[locale]/admin/projets`, `admin/adhesions`, `(site)/projets` |
| **6. Administration + KPI** | Back-office séparé, validations, KPI, graphiques, signalements | `src/app/[locale]/admin` |

Le reste de l'espace public (accueil, recherche filtrée, fiche terrain, fiche projet,
« Comment ça marche ? », FAQ, à propos, contact) et de l'espace utilisateur (tableau de bord,
favoris, notifications, paramètres) est également en place.

**L'ensemble est bilingue français / arabe**, y compris le back-office — voir la section dédiée.

Volontairement **hors périmètre du MVP**, comme prévu : messagerie interne, SMS/WhatsApp,
paiements, gestion documentaire avancée, cartographie.

---

## Démarrage rapide

### 1. Créer le projet Supabase

Créez un projet sur [supabase.com](https://supabase.com), puis relevez dans
*Project Settings → API* l'URL et les clés.

### 2. Configurer l'application

```bash
cp .env.example .env.local
# Renseignez NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
# et SUPABASE_SERVICE_ROLE_KEY.
```

### 3. Créer les tables

**Le plus simple — un seul fichier à coller.** Ouvrez *SQL Editor* dans le tableau de bord
Supabase, collez le contenu de [`supabase/schema.sql`](supabase/schema.sql) et exécutez.

```bash
# ou en ligne de commande
psql "$DATABASE_URL" -f supabase/schema.sql
```

**Ou, si vous utilisez la CLI Supabase** — à préférer dès que la base est en service, car
seules les migrations manquantes sont appliquées :

```bash
npx supabase link --project-ref <votre-ref>
npx supabase db push
```

Les deux chemins produisent exactement la même base : `schema.sql` est la concaténation
ordonnée de `supabase/migrations/`, régénérée par `npm run build:schema`. **La source de
vérité reste `supabase/migrations/`** — c'est là que se font les corrections.

Ce que l'installation crée :

| | |
| --- | ---: |
| Tables | 17 |
| Vues publiques | 3 |
| Énumérations métier | 14 |
| Fonctions (matching, KPI, garde-fous) | 80 |
| Politiques Row Level Security | 44 |
| Déclencheurs | 19 |
| Buckets de stockage | 4 |
| Régions / communes | 12 / 282 |

Les 17 tables :

```
profiles ── owner_profiles          land_listings ── land_images
         └─ participant_profiles                  └─ land_documents

participant_requests                projects ── project_participants
                                             └─ project_documents

matches        favorites        notifications
admin_actions  reports          regions          cities
```

Aucun compte ni aucune donnée de démonstration n'est créé à cette étape — voir le point 6.

**Référentiel géographique** : les 12 régions administratives du Royaume et 282 communes
urbaines, chaque région étant pourvue.

| Région | Villes | Région | Villes |
| --- | ---: | --- | ---: |
| Tanger-Tétouan-Al Hoceïma | 22 | Marrakech-Safi | 26 |
| L'Oriental | 29 | Drâa-Tafilalet | 26 |
| Fès-Meknès | 34 | Souss-Massa | 28 |
| Rabat-Salé-Kénitra | 32 | Guelmim-Oued Noun | 11 |
| Béni Mellal-Khénifra | 24 | Laâyoune-Sakia El Hamra | 9 |
| Casablanca-Settat | 33 | Dakhla-Oued Ed-Dahab | 8 |

La liste couvre les communes urbaines (municipalités) ; les communes rurales et centres
délégués n'y figurent pas — le formulaire propriétaire prévoit pour cela le champ libre
« Autre ville / commune ». Ajouter une localité ne demande qu'une ligne dans
`supabase/migrations/20260810098000_cities_complete.sql`.

### 4. Lancer l'application

```bash
npm install
npm run dev
```

### 5. Désigner le premier administrateur

Inscrivez-vous via l'interface, puis, dans l'éditeur SQL du tableau de bord Supabase :

```sql
update public.profiles set role = 'admin' where email = 'vous@exemple.ma';
```

> Le déclencheur `guard_profile_privileges` empêche tout utilisateur de modifier son propre
> rôle. Il laisse passer les requêtes sans session (`auth.uid() is null`) : c'est précisément
> ce chemin — console SQL, `service_role` — qui permet ce premier amorçage.

### 6. Projets pilotes et jeu de démonstration (facultatif)

```bash
psql "$DATABASE_URL" -f supabase/seed.sql
```

Le script installe **3 propriétaires, 66 participants, 12 terrains publiés dans 8 régions,
10 demandes et 7 projets pilotes**. Les correspondances ne sont pas écrites en dur : elles sont
calculées par le moteur au fil des insertions (89 correspondances, score moyen ≈ 61 %).

Les sept projets couvrent volontairement tout le workflow de la section 14, de l'analyse au
projet livré — de quoi voir chaque état de l'interface et rendre les KPI du back-office
significatifs :

| Projet pilote | Ville | Typologie | Groupe | État |
| --- | --- | --- | ---: | --- |
| Résidence des Médecins | Casablanca | Immeuble R+4, 20 logements | 14 / 20 | Ouvert |
| Village des Ingénieurs | Marrakech | Lotissement, 18 villas | 8 / 18 | Ouvert |
| Mini-fermes du Souss | Agadir | 10 parcelles agricoles | 6 / 10 | Ouvert |
| Résidence des Enseignants | Rabat | Immeuble R+3, 12 logements | 12 / 12 | Groupe constitué |
| Résidence Al Amal | Tanger | Immeuble vue mer, 14 logements | 14 / 14 | En préparation |
| Résidence Bahia | Meknès | R+2, 8 logements | 8 / 8 | Réalisé |
| Coopérative des Pharmaciens | Fès | Immeuble R+3, 10 logements | 1 / 10 | En analyse |

Trois d'entre eux sont réservés à un corps professionnel (médecins, enseignants, pharmaciens),
les autres sont ouverts à tous. Le passage en « groupe constitué » n'est pas écrit dans le
script : c'est le déclencheur `project_participants_lifecycle` qui le décide dès que la cible
est atteinte.

Le script est ré-exécutable sans effet de bord (toutes les insertions sont idempotentes).

### 7. Emails de notification (facultatif)

```bash
npx supabase functions deploy notify --no-verify-jwt
npx supabase secrets set RESEND_API_KEY=... NOTIFICATIONS_FROM_EMAIL=notifications@votre-domaine.ma
```

Puis planifiez un appel toutes les 5 minutes. Les notifications applicatives fonctionnent sans
cette étape : la fonction ne fait que les envoyer aussi par email.

---

## Architecture

```
                    ┌───────────────────┐
                    │    SITE PUBLIC    │   Next.js 16 · App Router · Tailwind 4
                    └─────────┬─────────┘
                              │
              ┌───────────────┴───────────────┐
       PROPRIÉTAIRES                     PARTICIPANTS
        Déposer terrain                 Créer demande
              └───────────────┬───────────────┘
                              ↓
                     ┌─────────────────┐
                     │     SUPABASE    │  Auth · PostgreSQL · Storage · RLS
                     └────────┬────────┘
                              ↓
                     MOTEUR DE MATCHING          ← fonctions PL/pgSQL + déclencheurs
                              ↓
                    ┌─────────┴─────────┐
              NOTIFICATIONS         PROJETS
                    ↓                   ↓
               Participants          Groupes
```

**Choix structurant : le matching vit dans la base, pas dans le frontend.**

Les deux sens du rapprochement — *nouveau terrain publié → demandes compatibles* et
*nouvelle demande → terrains disponibles* — partagent ainsi exactement la même formule
(`public.match_score`), et le résultat est écrit dans la même transaction que la donnée qui
l'a déclenché. Une correspondance ne peut donc pas être « oubliée » parce qu'une requête HTTP
a échoué. Une Edge Function reste utilisée pour ce qui sort réellement du système : l'envoi
des emails.

### Modèle de données

```
profiles ── owner_profiles
         └─ participant_profiles

land_listings ── land_images        (bucket public)
              └─ land_documents     (bucket privé — administration uniquement)

participant_requests

projects ── project_participants
         └─ project_documents

matches (request_id, land_id, score, breakdown)
favorites · notifications · admin_actions · reports
regions · cities
```

Localisation, caractéristiques, prix et réseaux sont portés par `land_listings` plutôt que par
des tables 1-1 séparées : le moteur les interroge *ensemble* à chaque calcul, et des jointures
supplémentaires n'apporteraient rien. Les collections (images, documents) restent dans leurs
propres tables.

---

## Le moteur de matching

### Pondération

| Critère | Poids |
| --- | ---: |
| Région | 20 % |
| Ville | 15 % |
| Type de projet | 20 % |
| Zonage | 15 % |
| Budget | 15 % |
| Nombre d'unités | 10 % |
| Réseaux | 5 % |

### Lecture du score

| Score | Qualification |
| --- | --- |
| 🟢 90 – 100 % | Excellent match |
| 🟢 75 – 89 % | Très bon match |
| 🟠 60 – 74 % | Match intéressant |
| ⚪ < 60 % | Faible correspondance |

Seuils : une correspondance est **enregistrée** à partir de 40 %, une **notification** est
envoyée à partir de 60 %.

### Exemple vérifié par les tests

Terrain de 1 500 m² à Casablanca, zoné R+4, à 7 000 DH/m² (10 500 000 DH), desservi par
l'eau, l'électricité et l'assainissement — face à une demande « appartement en immeuble,
Casablanca, 20 unités, 500 000 à 700 000 DH par unité » :

```
Région   20/20   Ville  15/15   Type    20/20   Zonage  15/15
Budget   15/15   Unités  8/10   Réseaux  5/5
                                              → 98 % — Excellent match
```

Les unités valent 8/10 et non 10/10 : la capacité estimée du terrain (52 logements) dépasse
largement les 20 unités demandées. Le détail complet est stocké dans `matches.breakdown` et
affiché tel quel à l'utilisateur — le score n'est jamais une boîte noire.

### Capacité estimée

`estimate_units(surface, zonage, déclaré)` retient une emprise au sol de 60 %, 85 m² par
logement, et un nombre d'étages déduit du zonage (R+2 → 3 niveaux, R+4 → 5…). Les typologies
parcellaires (villa, lotissement, agricole) comptent une unité par tranche de surface. **La
valeur déclarée par le propriétaire prime toujours sur l'estimation.**

### Faire évoluer la formule

Toute la logique tient dans `public.match_score` (fichier
`supabase/migrations/20260810091000_matching.sql`). Remplacer cette fonction par un moteur de
recommandation plus sophistiqué ne demande de toucher ni au schéma, ni à l'application :
`refresh_matches_for_land` / `refresh_matches_for_request` continuent d'écrire dans `matches`,
et l'interface continue d'afficher le `breakdown`.

Après un changement de formule, recalculez l'existant depuis le back-office
(*Matching → Recalculer toutes les correspondances*) ou via `select public.rebuild_all_matches();`.

---

## Bilingue français / arabe

Toute l'interface existe dans les deux langues : espace public, espace utilisateur **et**
back-office. L'arabe s'affiche de droite à gauche, avec sa propre pile de polices.

### URL

Chaque page porte son préfixe de langue — `/fr/terrains`, `/ar/terrains` — donc chaque version
est partageable et indexable séparément. Une URL sans préfixe est redirigée vers la langue
retenue : le cookie de l'utilisateur d'abord, sinon l'en-tête `Accept-Language`, sinon le
français. Le chemin, lui, reste écrit en français dans le code et dans l'URL : une seule
arborescence de routes à maintenir.

Le sélecteur de langue de l'en-tête reste sur la page courante, paramètres de recherche
compris.

### Où vivent les textes

```
src/lib/i18n/
  config.ts               langues, préfixage des chemins, négociation Accept-Language
  index.ts                accès au dictionnaire
  server.ts               `translation(locale)` → { t, path, f }
  dictionaries/fr.ts      référence de structure
  dictionaries/ar.ts      miroir arabe, typé sur la précédente
```

`ar.ts` est typé `Dictionary`, c'est-à-dire la forme exacte de `fr.ts` : **une clé oubliée ou
en trop casse la compilation**. Il n'y a pas de traduction manquante silencieuse.

Chaque page reçoit `params.locale` et appelle `translation(locale)`, qui renvoie trois choses :

| | rôle |
| --- | --- |
| `t` | les textes |
| `path('/terrains')` | le chemin préfixé par la langue |
| `f` | les formats (montants, surfaces, dates, pourcentages) accordés à la langue |

### Ce que la langue change vraiment

- **Sens de lecture** : `dir="rtl"` et propriétés CSS logiques (`ms-`, `me-`, `start-`, `end-`,
  `border-s`) partout — aucune marge ni bordure codée en dur à gauche ou à droite.
- **Typographie** : pile de polices arabes système et interligne plus généreux ; le crénage
  négatif des titres, pensé pour le latin, est désactivé car il abîme les ligatures arabes.
- **Dates** : `10 août 2026` devient `10 غشت 2026` (mois marocains).
- **Montants** : le suffixe passe de `DH` à `درهم`, `m²` à `م²`.
- **Chiffres** : ils restent en chiffres arabes occidentaux (1, 2, 3) dans les deux langues,
  usage courant au Maroc jusque dans les documents en arabe.
- **Tri des villes** : alphabétique dans la langue affichée (`Intl.Collator`).
- **Toponymie** : les 12 régions et les 282 communes portent leur nom arabe en base ; les vues
  publiques exposent les deux graphies et l'application choisit, avec repli sur le français.
- **Éléments toujours lus de gauche à droite** : références (`TER-2026-000128`), emails,
  téléphones, et l'axe temporel des graphiques.

### Ajouter une langue

Ajoutez le code dans `LOCALES`, son sens de lecture dans `LOCALE_META`, et un dictionnaire
dans `dictionaries/`. Le compilateur signalera alors chaque clé manquante. Côté base, une
colonne `name_xx` sur `regions` et `cities` suffit.

---

## Sécurité et confidentialité

**Aucune coordonnée personnelle n'apparaît sur les pages publiques** : ni téléphone, ni email,
ni CIN, ni titre foncier. Cette règle n'est pas seulement appliquée par l'interface, elle est
portée par la base de données.

- **RLS activée sur les 17 tables.** Un participant ne voit que ses demandes, ses favoris,
  ses notifications et les correspondances de ses propres demandes. Un propriétaire ne voit
  jamais qui est derrière une demande — seulement un récapitulatif anonymisé
  (`owner_land_demand_summary`).
- **Vues publiques explicites.** `public_profiles` n'expose que le prénom et l'initiale du
  nom. `land_listings_public` et `projects_public` ne contiennent aucune donnée de contact.
- **Documents sensibles** (titre foncier, note de renseignement urbanistique, plan cadastral)
  dans un bucket privé, lisibles par le seul propriétaire et l'administration.
- **Privilèges explicites.** Les `GRANT` sont posés table par table plutôt que laissés aux
  privilèges par défaut de Supabase : une politique sans `GRANT` (ou l'inverse) est une source
  de bugs silencieux.
- **Fonctions `SECURITY DEFINER` verrouillées.** `EXECUTE` est retiré à `PUBLIC` sur toutes
  celles qui écrivent hors du périmètre de l'appelant ; les fonctions d'administration
  vérifient `is_admin()` et lèvent une erreur sinon.
- **Escalade de privilèges impossible.** Un utilisateur ne peut ni changer son rôle, ni lever
  sa suspension, ni publier son propre terrain : ces transitions passent par
  `admin_review_land` / `admin_review_project`.

Ces garanties sont **vérifiées par la suite de tests**, pas seulement affirmées.

---

## Tests

```bash
npm run test:db     # nécessite un PostgreSQL accessible en local
npm run typecheck
npm run build
```

`npm run test:db` recrée une base jetable, y rejoue les stubs Supabase
(`supabase/tests/00_supabase_stubs.sql` : `auth.users`, `auth.uid()`, `storage`, rôles), puis
toutes les migrations, puis `supabase/tests/01_matching.sql`. Le script s'arrête à la première
divergence.

Ce que la suite couvre :

- calcul de capacité (`estimate_units`) et prix total calculé ;
- score de matching **exact** sur le cas de référence (98 %) et détail par critère ;
- déclenchement dans les deux sens, non-déclenchement sur une demande incompatible ;
- disparition des correspondances quand une demande est mise en pause ou un terrain dépublié ;
- notifications (participant, propriétaire, groupe complet) ;
- constitution automatique du groupe quand la cible est atteinte ;
- RLS : cloisonnement anonyme, participant, administrateur ;
- impossibilité pour un propriétaire de publier son terrain, et pour un utilisateur de
  s'auto-promouvoir administrateur.

---

## Arborescence

```
src/
  app/
    [locale]/                  segment de langue : /fr/… et /ar/…
      (site)/                  espace public + espace utilisateur
        (espace)/              pages protégées (tableau de bord, demandes, terrains…)
        terrains/  projets/    recherche et fiches publiques
      admin/                   back-office, totalement séparé
    actions/                   Server Actions (auth, terrains, demandes, projets, admin)
  components/                  UI, formulaires, cartes, graphiques SVG
  lib/
    i18n/                      langues, dictionnaires FR/AR, helpers serveur
    …                          types, formatage, requêtes, clients Supabase
supabase/
  schema.sql                   installation en un seul fichier (généré)
  migrations/                  schéma, matching, RLS, KPI, référentiel, privilèges
  functions/notify/            Edge Function d'envoi des emails
  tests/                       stubs Supabase + suite de tests SQL
  seed.sql                     jeu de démonstration
```

---

## Ce qui reste à faire

Par ordre de valeur, une fois le MVP en service :

1. **Messagerie interne** entre participants d'un même groupe constitué.
2. **SMS / WhatsApp** en complément des notifications email.
3. **Cartographie** (Mapbox) sur la recherche et la fiche terrain — les colonnes
   `latitude` / `longitude` sont déjà présentes.
4. **Gestion documentaire avancée** : versions, expiration, contrôle de complétude du dossier.
5. **Moteur de recommandation** en remplacement de la formule pondérée, une fois assez de
   données de conversion accumulées (les KPI nécessaires sont déjà collectés :
   notifications envoyées, clics, intérêts exprimés, conversions).
6. **Paiements** et suivi financier des projets.
7. **Relecture de la toponymie arabe** par un locuteur natif : les noms des grandes villes
   sont sûrs, ceux de certaines petites communes d'origine amazighe gagneraient à être
   confirmés. La colonne `name_ar` est facultative — l'application retombe sur le français.
8. **Contenus saisis par les utilisateurs** (titres d'annonces, descriptions) : ils restent
   dans la langue de saisie. Un affichage bilingue demanderait soit une double saisie, soit
   une traduction automatique — c'est un choix produit, pas une limite technique.

## Le projet participatif est un acte administratif

Un projet ne naît pas d'une initiative individuelle : **seule l'administration transforme un
terrain validé en projet participatif**. La règle est posée à trois niveaux, de sorte qu'aucun
chemin détourné ne subsiste :

- la politique RLS d'insertion sur `projects` exige `is_admin()` ;
- `admin_create_project_from_land()` revérifie le rôle et refuse un terrain qui n'est pas
  `valide` ou `publie` ;
- l'interface de création vit dans le back-office (`/admin/projets/nouveau`) et ne propose que
  les terrains éligibles.

La localisation, le zonage et la surface sont repris du terrain : rien n'est re-saisi, donc rien
ne peut diverger.

### Prix participatif et prix du marché

L'administration saisit, « après étude », le nombre d'unités et deux grilles au m² : le prix
participatif et le prix du marché du secteur. Le prix d'une unité et l'économie réalisée sont des
**colonnes générées** (`unit_price`, `market_unit_price`) et des expressions de vue
(`savings_amount`, `savings_percent`) : le comparatif affiché au participant ne peut pas diverger
de la grille saisie, puisqu'il n'est jamais stocké séparément.

L'avancement d'un projet se lit sur le nombre total d'unités — « 14 / 20 unités réservées » — et
non sur une cible d'adhérents distincte.

### Demandes d'adhésion

Une candidature notifie **tous les administrateurs actifs**, et non le seul créateur. La décision
passe par `admin_decide_participation()`, qui écrit le statut et déclenche la notification du
candidat *dans la même transaction* : une adhésion ne peut pas être validée sans que l'intéressé
en soit averti.

### Régions couvertes

Le chiffre affiché en page d'accueil compte les régions **où un projet existe réellement**
(`public_stats()`), pas les 12 régions du référentiel.

## Visuels

`Cover` affiche la photo déposée ; si le fichier est introuvable, il bascule sur une couverture
générée plutôt que de laisser une icône cassée. Sans photo, la couverture générée — un motif
zellige en SVG dérivé de l'identifiant — prend le relais : deux annonces n'ont jamais le même
visuel, et la même annonce garde le sien d'une page à l'autre. Aucune dépendance externe.

`publicStorageUrl` accepte une URL absolue telle quelle, et encode les chemins segment par
segment (`encodeURI` laissait passer `#` et `?`, qui tronquaient l'URL).

## Filtres

Les filtres s'appliquent à la frappe, sans bouton « Filtrer » : liste déroulante et case à cocher
immédiatement, champs texte après une pause de saisie. Les formulaires restent des
`<form method="get">`, donc l'URL demeure partageable et la recherche fonctionne sans JavaScript.
