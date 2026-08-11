-- =============================================================================
-- Le projet participatif est un acte administratif.
--   psql -d ntcharkou_test -f supabase/tests/02_projects_admin.sql
-- Le script échoue (exception) au premier écart constaté.
-- =============================================================================

begin;

set local client_min_messages = warning;

-- --- Comptes -----------------------------------------------------------------
insert into auth.users (id, email, raw_user_meta_data) values
  ('a1111111-1111-1111-1111-111111111111', 'p2@test.ma',
   '{"first_name":"Karim","last_name":"Ziani","role":"owner"}'),
  ('a2222222-2222-2222-2222-222222222222', 'part2@test.ma',
   '{"first_name":"Leila","last_name":"Amrani","role":"participant"}'),
  ('a3333333-3333-3333-3333-333333333333', 'part3@test.ma',
   '{"first_name":"Omar","last_name":"Tazi","role":"participant"}'),
  ('a4444444-4444-4444-4444-444444444444', 'admin2@test.ma',
   '{"first_name":"Fatima","last_name":"Bennis","role":"participant"}');

update public.profiles set role = 'admin' where id = 'a4444444-4444-4444-4444-444444444444';

-- --- Un terrain encore en brouillon -----------------------------------------
insert into public.land_listings
  (id, owner_id, title, region_code, city_id, zoning, surface_m2, price_per_m2, status)
values
  ('b1111111-1111-1111-1111-111111111111',
   'a1111111-1111-1111-1111-111111111111',
   'Terrain test projet', 'casablanca-settat',
   (select id from public.cities where region_code = 'casablanca-settat' limit 1),
   'r4', 6000, 600, 'brouillon');

-- --- Un terrain ne devient pas projet tant qu'il n'est pas validé -----------
select set_config('request.jwt.claim.sub', 'a4444444-4444-4444-4444-444444444444', true);

do $$
begin
  begin
    perform public.admin_create_project_from_land(
      'b1111111-1111-1111-1111-111111111111', 'Projet premature', 10, 'appartement_immeuble');
    raise exception 'Un terrain non validé ne doit pas pouvoir devenir un projet';
  exception when others then
    if sqlstate <> '22023' then raise; end if;
  end;
end;
$$;

-- --- Validation du terrain, puis création du projet --------------------------
update public.land_listings
   set status = 'valide', reviewed_at = now(), reviewed_by = 'a4444444-4444-4444-4444-444444444444'
 where id = 'b1111111-1111-1111-1111-111111111111';

do $$
declare
  proj uuid;
  row  public.projects;
begin
  proj := public.admin_create_project_from_land(
    p_land                => 'b1111111-1111-1111-1111-111111111111',
    p_title               => 'Résidence test',
    p_units_planned       => 12,
    p_property_need       => 'appartement_immeuble',
    p_unit_surface_m2     => 80,
    p_unit_price_per_m2   => 5000,
    p_market_price_per_m2 => 8000);

  select * into row from public.projects where id = proj;

  -- La localisation et le zonage sont hérités du terrain, sans re-saisie.
  if row.region_code <> 'casablanca-settat' or row.zoning <> 'r4' then
    raise exception 'Le projet doit hériter de la localisation et du zonage du terrain';
  end if;
  if row.units_planned <> 12 or row.participants_target <> 12 then
    raise exception 'La cible d''adhérents doit suivre le nombre d''unités';
  end if;
  if row.status <> 'ouvert' then
    raise exception 'Le projet doit s''ouvrir immédiatement (statut = %)', row.status;
  end if;

  -- Colonnes générées : 80 m² × 5 000 DH = 400 000 DH ; marché 640 000 DH.
  if row.unit_price <> 400000 then
    raise exception 'Prix participatif de l''unité erroné : %', row.unit_price;
  end if;
  if row.market_unit_price <> 640000 then
    raise exception 'Prix de marché de l''unité erroné : %', row.market_unit_price;
  end if;

  -- L'économie affichée découle des deux grilles, elle n'est jamais saisie.
  if (select savings_amount from public.projects_public where id = proj) <> 240000 then
    raise exception 'Économie par unité erronée';
  end if;
  if (select savings_percent from public.projects_public where id = proj) <> 37.5 then
    raise exception 'Pourcentage d''économie erroné';
  end if;
end;
$$;

-- --- Une demande d'adhésion remonte à l'administration -----------------------
select set_config('request.jwt.claim.sub', 'a2222222-2222-2222-2222-222222222222', true);

insert into public.project_participants (project_id, participant_id, units_wanted)
select id, 'a2222222-2222-2222-2222-222222222222', 1
from public.projects where title = 'Résidence test';

do $$
begin
  if not exists (
    select 1 from public.notifications
    where profile_id = 'a4444444-4444-4444-4444-444444444444'
      and kind = 'candidature_recue'
  ) then
    raise exception 'L''administration doit être notifiée de chaque demande d''adhésion';
  end if;
end;
$$;

-- --- L'administration tranche, le candidat est notifié -----------------------
select set_config('request.jwt.claim.sub', 'a4444444-4444-4444-4444-444444444444', true);

do $$
declare
  part uuid;
begin
  select pp.id into part
  from public.project_participants pp
  join public.projects p on p.id = pp.project_id
  where p.title = 'Résidence test';

  -- La demande doit apparaître dans la file d'attente du back-office.
  if not exists (select 1 from public.admin_pending_participations() where id = part) then
    raise exception 'La demande doit figurer dans la file d''attente administrative';
  end if;

  perform public.admin_decide_participation(part, true);

  if (select status from public.project_participants where id = part) <> 'accepte' then
    raise exception 'La décision n''a pas été enregistrée';
  end if;

  -- Notification automatique de validation : dans la même transaction que la
  -- décision, donc jamais de validation silencieuse.
  if not exists (
    select 1 from public.notifications
    where profile_id = 'a2222222-2222-2222-2222-222222222222'
      and kind = 'candidature_acceptee'
  ) then
    raise exception 'Le candidat doit être notifié de la validation de son adhésion';
  end if;

  if exists (select 1 from public.admin_pending_participations() where id = part) then
    raise exception 'Une demande tranchée doit quitter la file d''attente';
  end if;
end;
$$;

-- --- Grille tarifaire révisée après étude ------------------------------------
do $$
declare
  proj uuid;
begin
  select id into proj from public.projects where title = 'Résidence test';
  perform public.admin_set_project_pricing(proj, 16, 90, 5500, 9000);

  if (select units_planned from public.projects where id = proj) <> 16
     or (select participants_target from public.projects where id = proj) <> 16 then
    raise exception 'La révision doit porter sur les unités et sur la cible';
  end if;
  if (select unit_price from public.projects where id = proj) <> 495000 then
    raise exception 'Le prix de l''unité doit suivre la nouvelle grille';
  end if;
end;
$$;

-- --- Régions couvertes : celles qui portent un projet, pas le référentiel ----
do $$
declare
  covered bigint;
  total   bigint;
begin
  select regions_covered into covered from public.public_stats();
  select count(*) into total from public.regions;

  if total < 12 then
    raise exception 'Le référentiel doit contenir les 12 régions';
  end if;
  if covered >= total then
    raise exception
      'Les régions couvertes (%) ne doivent pas compter le référentiel entier (%)', covered, total;
  end if;
  if covered < 1 then
    raise exception 'Au moins une région porte un projet ouvert';
  end if;
end;
$$;

select set_config('request.jwt.claim.sub', '', true);

commit;

-- =============================================================================
-- Contrôles RLS — hors transaction pour pouvoir changer de rôle.
-- =============================================================================

set role authenticated;

-- Un participant ne crée pas de projet : la création est un acte administratif.
select set_config('request.jwt.claim.sub', 'a3333333-3333-3333-3333-333333333333', true);

do $$
begin
  begin
    insert into public.projects
      (title, created_by, region_code, property_need, units_planned, participants_target)
    values ('Projet interdit', 'a3333333-3333-3333-3333-333333333333',
            'casablanca-settat', 'appartement_immeuble', 5, 5);
    raise exception 'Un participant ne doit pas pouvoir créer un projet participatif';
  exception when insufficient_privilege then null;
  end;
end;
$$;

-- Il ne peut pas davantage détourner la fonction administrative.
do $$
begin
  begin
    perform public.admin_create_project_from_land(
      'b1111111-1111-1111-1111-111111111111', 'Contournement', 4, 'appartement_immeuble');
    raise exception 'La fonction de création doit rester réservée à l''administration';
  exception when insufficient_privilege then null;
  end;
end;
$$;

-- Ni trancher une demande d'adhésion à la place de l'administration.
do $$
declare
  part uuid;
begin
  select pp.id into part
  from public.project_participants pp
  join public.projects p on p.id = pp.project_id
  where p.title = 'Résidence test';

  begin
    perform public.admin_decide_participation(part, false);
    raise exception 'Trancher une adhésion doit rester réservé à l''administration';
  exception when insufficient_privilege then null;
  end;
end;
$$;

reset role;
select set_config('request.jwt.claim.sub', '', true);

\echo '=== Projets administratifs : contrôles passés ==='

-- =============================================================================
-- Un adhérent peut réserver plusieurs unités : c'est l'unité qui remplit le
-- projet, pas la personne.
-- =============================================================================

begin;
set local client_min_messages = warning;

select set_config('request.jwt.claim.sub', 'a4444444-4444-4444-4444-444444444444', true);

do $$
declare
  proj uuid;
  part uuid;
begin
  select id into proj from public.projects where title = 'Résidence test';
  -- Grille de départ : 16 unités, 1 déjà accordée au premier adhérent.
  perform public.admin_set_project_pricing(proj, 16, 90, 5500, 9000);

  -- Un second participant demande 2 unités.
  insert into public.project_participants (project_id, participant_id, units_wanted)
  values (proj, 'a3333333-3333-3333-3333-333333333333', 2)
  returning id into part;

  -- En attente : 2 unités pour 1 personne. Les deux grandeurs sont distinctes.
  if (select units_pending from public.projects_public where id = proj) <> 2 then
    raise exception 'Les unités en attente doivent sommer units_wanted, pas compter les personnes';
  end if;
  if (select participants_pending from public.projects_public where id = proj) <> 1 then
    raise exception 'Les candidatures en attente comptent des personnes';
  end if;

  perform public.admin_decide_participation(part, true);

  -- Réservé : 1 (premier adhérent) + 2 = 3 unités, pour 2 personnes.
  if (select units_reserved from public.projects_public where id = proj) <> 3 then
    raise exception 'Unités réservées erronées : % (attendu 3)',
      (select units_reserved from public.projects_public where id = proj);
  end if;
  if (select participants_confirmed from public.projects_public where id = proj) <> 2 then
    raise exception 'Adhérents confirmés erronés';
  end if;
end;
$$;

-- --- Le groupe se ferme sur les unités, pas sur le nombre d'adhérents -------
do $$
declare
  proj uuid;
begin
  select id into proj from public.projects where title = 'Résidence test';
  -- On ramène le projet à 5 unités : 3 sont déjà réservées.
  perform public.admin_set_project_pricing(proj, 5, 90, 5500, 9000);
  update public.projects set status = 'ouvert' where id = proj;

  -- Le premier adhérent porte sa réservation de 1 à 3 unités : 3 + 2 = 5.
  update public.project_participants
     set units_wanted = 3
   where project_id = proj
     and participant_id = 'a2222222-2222-2222-2222-222222222222';

  if (select units_reserved from public.projects_public where id = proj) <> 5 then
    raise exception 'Les 5 unités doivent être réservées, obtenu %',
      (select units_reserved from public.projects_public where id = proj);
  end if;
  -- Deux personnes seulement, mais 5 unités : le projet est bel et bien complet.
  if (select participants_confirmed from public.projects_public where id = proj) <> 2 then
    raise exception 'Le groupe compte 2 adhérents pour 5 unités';
  end if;
  if (select status from public.projects where id = proj) <> 'groupe_constitue' then
    raise exception 'Le groupe doit se constituer dès que toutes les unités sont prises';
  end if;
end;
$$;

select set_config('request.jwt.claim.sub', '', true);
commit;

\echo '=== Unités réservées : contrôles passés ==='
