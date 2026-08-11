// Régénère `supabase/schema.sql` — la concaténation ordonnée des migrations,
// destinée à une installation en une seule fois depuis l'éditeur SQL Supabase.
// La source de vérité reste `supabase/migrations/` : ce fichier n'est qu'une vue.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const MIGRATIONS = 'supabase/migrations'
const TARGET = 'supabase/schema.sql'

const header = `-- =============================================================================
-- Ntcharkou — Schéma complet de la base
--
-- Ce fichier regroupe, dans l'ordre, les migrations de \`supabase/migrations/\`.
-- Il est destiné à une installation en une seule fois :
--
--   Tableau de bord Supabase → SQL Editor → coller ce fichier → Run
--
-- ou, en ligne de commande :
--
--   psql "$DATABASE_URL" -f supabase/schema.sql
--
-- Il crée :
--   · 17 tables, 14 énumérations métier et 3 vues publiques
--   · le moteur de matching (fonctions PL/pgSQL + déclencheurs)
--   · les règles Row Level Security et les privilèges de chaque rôle
--   · les fonctions de KPI du back-office
--   · le référentiel : 12 régions et 282 communes, en français et en arabe
--   · les 4 buckets de stockage et leurs politiques d'accès
--
-- Il ne crée AUCUN compte et AUCUNE donnée de démonstration : pour cela, voir
-- \`supabase/seed.sql\` (à réserver à un environnement de test).
--
-- ⚠ Ce fichier s'adresse à une base VIERGE. Sur une base déjà installée, il
--   s'arrête de lui-même avec un message : appliquez alors uniquement les
--   migrations manquantes de \`supabase/migrations/\` (ou \`supabase db push\`).
--
-- ⚠ Ne modifiez pas ce fichier à la main : il est régénéré depuis les
--   migrations par \`npm run build:schema\`. Toute correction se fait dans
--   \`supabase/migrations/\`, qui reste la source de vérité.
-- =============================================================================

begin;

-- --- Garde-fou ---------------------------------------------------------------
-- Rejouer ce fichier sur une base déjà installée échouait sur un message peu
-- parlant (« type "user_role" already exists ») après avoir déjà rejoué une
-- partie du schéma. On s'arrête donc franchement, avec la marche à suivre.
do $$
begin
  if exists (select 1 from pg_class where relname = 'land_listings' and relnamespace = 'public'::regnamespace) then
    raise exception using
      errcode = '42P07',
      message = 'La base Ntcharkou est déjà installée.',
      hint    = 'N''exécutez pas schema.sql, qui s''adresse à une base vierge. '
                'Appliquez uniquement les migrations manquantes de supabase/migrations/ '
                '(la plus récente d''abord), ou lancez « supabase db push ».';
  end if;
end;
$$;

`

const footer = `
commit;

-- =============================================================================
-- Étape suivante : désigner le premier administrateur.
--
-- Inscrivez-vous via l'interface, puis exécutez ici :
--
--   update public.profiles set role = 'admin' where email = 'vous@exemple.ma';
--
-- Le déclencheur \`guard_profile_privileges\` empêche un utilisateur de changer
-- son propre rôle, mais laisse passer les requêtes sans session (console SQL,
-- \`service_role\`) : c'est ce chemin qui permet ce premier amorçage.
-- =============================================================================
`

const files = readdirSync(MIGRATIONS)
  .filter((name) => name.endsWith('.sql'))
  .sort()

const body = files
  .map((name) => {
    const rule = '-- ###########################################################################'
    const sql = readFileSync(join(MIGRATIONS, name), 'utf8').trimEnd()
    return `\n${rule}\n-- # ${name}\n${rule}\n\n${sql}\n`
  })
  .join('')

writeFileSync(TARGET, header + body + footer, 'utf8')
console.log(`${TARGET} régénéré depuis ${files.length} migrations`)
