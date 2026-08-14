-- =============================================================================
-- Ntcharkou — Suppression du jeu de demonstration
-- =============================================================================
-- Ne supprime que ce qui porte le marqueur pose par `seed_demo.sql` :
-- une adresse en @demo.ntcharkou.local. Aucune donnee reelle ne l'utilise.
--
-- La cascade des cles etrangeres emporte profils, terrains, projets, photos,
-- adhesions, notifications et correspondances.
-- =============================================================================

begin;

-- Verification avant suppression : on regarde ce qui va partir.
select 'a supprimer' as etat, count(*) as comptes
from auth.users where email like '%@demo.ntcharkou.local';

delete from auth.users where email like '%@demo.ntcharkou.local';

-- Filet de securite : les projets de demonstration dont le porteur aurait ete
-- dissocie (`on delete set null`) plutot que supprime.
delete from public.projects      where id::text like 'f2000000%';
delete from public.land_listings where id::text like 'f1000000%';

commit;

-- Controle : les trois comptes doivent etre a zero.
select 'comptes'  as reste, count(*) from auth.users where email like '%@demo.ntcharkou.local'
union all
select 'terrains', count(*) from public.land_listings where id::text like 'f1000000%'
union all
select 'projets',  count(*) from public.projects where id::text like 'f2000000%';
