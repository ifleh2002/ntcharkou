# Ntcharkou

**Place de marché du logement participatif au Maroc.**

La plateforme relie quatre éléments — terrains disponibles ↔ demandes des participants ↔
groupes de projet ↔ validation administrative — et, surtout, **effectue automatiquement le
rapprochement** entre les terrains publiés et les besoins réels exprimés par les participants.

---

## Sommaire

- [Ce qui est implémenté](#ce-qui-est-implémenté)
- [Démarrage rapide](#démarrage-rapide)
- [Architecture](#architecture)
- [Le moteur de matching](#le-moteur-de-matching)
- [Sécurité et confidentialité](#sécurité-et-confidentialité)
- [Tests](#tests)
- [Arborescence](#arborescence)
- [Ce qui reste à faire](#ce-qui-reste-à-faire)

---

## Ce qui est implémenté

Les six modules du MVP :

| Module | État | Où |
| --- | --- | --- |
| **1. Authentification** | Inscription participant / propriétaire, connexion, profil, rôles, suspension | `src/app/(site)/connexion`, `inscription`, `profil` |
| **2. Terrains** | Formulaire en 6 étapes, photos, documents privés, workflow de validation | `src/components/land-form.tsx`, `src/app/(site)/(espace)/mes-terrains` |
| **3. Demandes participants** | Typologies multiples, budget total *et* par unité, unités, groupe professionnel | `src/components/request-form.tsx`, `src/app/(site)/(espace)/mes-demandes` |
| **4. Matching automatique** | Score pondéré à 7 critères, dans les deux sens, notifications | `supabase/migrations/*_matching.sql` |
| **5. Projets participatifs** | Création de groupe, candidatures, constitution automatique, workflow | `src/app/(site)/projets`, `mes-projets` |
| **6. Administration + KPI** | Back-office séparé, validations, KPI, graphiques, signalements | `src/app/admin` |

Le reste de l'espace public (accueil, recherche filtrée, fiche terrain, fiche projet,
« Comment ça marche ? », FAQ, à propos, contact) et de l'espace utilisateur (tableau de bord,
favoris, notifications, paramètres) est également en place.

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

### 3. Appliquer les migrations

Avec la CLI Supabase :

```bash
npx supabase link --project-ref <votre-ref>
npx supabase db push
```

Ou en collant les fichiers de `supabase/migrations/` **dans l'ordre alphabétique** dans
l'éditeur SQL du tableau de bord. Ils créent le schéma, le moteur de matching, les règles RLS,
les KPI, le référentiel géographique et les buckets de stockage.

**Référentiel géographique** : les 12 régions administratives du Royaume et 283 communes
urbaines, chaque région étant pourvue.

| Région | Villes | Région | Villes |
| --- | ---: | --- | ---: |
| Tanger-Tétouan-Al Hoceïma | 22 | Marrakech-Safi | 26 |
| L'Oriental | 29 | Drâa-Tafilalet | 26 |
| Fès-Meknès | 34 | Souss-Massa | 28 |
| Rabat-Salé-Kénitra | 32 | Guelmim-Oued Noun | 12 |
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
    (site)/                    espace public + espace utilisateur
      (espace)/                pages protégées (tableau de bord, demandes, terrains…)
      terrains/  projets/      recherche et fiches publiques
    admin/                     back-office, totalement séparé
    actions/                   Server Actions (auth, terrains, demandes, projets, admin)
  components/                  UI, formulaires, cartes, graphiques SVG
  lib/                         types, libellés FR, formatage, requêtes, clients Supabase
supabase/
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
