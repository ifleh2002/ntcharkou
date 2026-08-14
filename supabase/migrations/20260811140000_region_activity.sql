-- =============================================================================
-- Ntcharkou — Migration 15 : activite par region sur la carte d'accueil
-- =============================================================================
-- La carte d'accueil resume l'activite region par region : combien de terrains
-- proposes, combien de projets ouverts. Il lui faut donc un point ou poser
-- chaque region.
--
-- Ces coordonnees sont des reperes d'affichage, pas des frontieres : un point
-- representatif de chaque region, choisi pres de son chef-lieu. La geometrie
-- exacte des parcelles reste portee par `land_listings.parcel`.
--
-- ⚠ Rejouable, dans l'ordre uniquement.

-- -----------------------------------------------------------------------------
-- 1. Un point par region
-- -----------------------------------------------------------------------------

alter table public.regions
  add column if not exists latitude  numeric(9, 6),
  add column if not exists longitude numeric(9, 6);

comment on column public.regions.latitude is
  'Repere d''affichage sur la carte d''accueil, proche du chef-lieu. Pas une frontiere.';

update public.regions r
   set latitude = v.lat, longitude = v.lng
  from (values
    ('tanger-tetouan-al-hoceima',  35.5889, -5.3626),  -- Tanger / Tetouan
    ('oriental',                   34.6867, -1.9114),  -- Oujda
    ('fes-meknes',                 34.0331, -5.0003),  -- Fes
    ('rabat-sale-kenitra',         34.0209, -6.8416),  -- Rabat
    ('beni-mellal-khenifra',       32.3373, -6.3498),  -- Beni Mellal
    ('casablanca-settat',          33.5731, -7.5898),  -- Casablanca
    ('marrakech-safi',             31.6295, -7.9811),  -- Marrakech
    ('draa-tafilalet',             31.9314, -4.4283),  -- Errachidia
    ('souss-massa',                30.4278, -9.5981),  -- Agadir
    ('guelmim-oued-noun',          28.9870, -10.0574), -- Guelmim
    ('laayoune-sakia-el-hamra',    27.1536, -13.2033), -- Laayoune
    ('dakhla-oued-ed-dahab',       23.6848, -15.9580)  -- Dakhla
  ) as v(code, lat, lng)
 where r.code = v.code;

-- -----------------------------------------------------------------------------
-- 2. Activite par region
-- -----------------------------------------------------------------------------
-- Deux comptes distincts, car ils ne disent pas la meme chose : ce qui est
-- offert (terrains publies) et ce qui est deja constitue (projets ouverts).
--
-- Le decompte se fait sur les tables et non sur les vues publiques : la
-- fonction est SECURITY DEFINER pour que le total reste juste pour un visiteur
-- anonyme, qui ne « voit » pas toutes les lignes a travers la RLS. Elle
-- n'expose que des nombres agreges, jamais une ligne identifiable.

create or replace function public.region_activity()
returns table (
  code       text,
  name_fr    text,
  name_ar    text,
  latitude   numeric,
  longitude  numeric,
  lands      bigint,
  projects   bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select r.code,
         r.name_fr,
         coalesce(r.name_ar, r.name_fr),
         r.latitude,
         r.longitude,
         (select count(*) from public.land_listings l
           where l.region_code = r.code
             and l.status = 'publie'
             and l.market_status <> 'masque'),
         (select count(*) from public.projects p
           where p.region_code = r.code
             and p.status in ('ouvert', 'groupe_constitue', 'en_preparation', 'realise'))
  from public.regions r
  where r.latitude is not null
    and r.longitude is not null
  order by r.sort_order;
$$;

revoke execute on function public.region_activity() from public;
grant execute on function public.region_activity() to anon, authenticated;
