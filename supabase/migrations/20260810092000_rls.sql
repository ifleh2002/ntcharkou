-- =============================================================================
-- Ntcharkou — Migration 3/5 : Row Level Security, vues publiques, stockage
--
-- Principe : les coordonnees personnelles (telephone, email, CIN, documents
-- juridiques) ne sortent jamais de la base pour un visiteur ou un autre
-- utilisateur. Le public ne voit que des projections explicites.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Fonctions d'aide (security definer : evitent la recursion dans les regles)
-- -----------------------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and not is_suspended
  );
$$;

create or replace function public.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and not is_suspended
  );
$$;

-- Empeche l'auto-promotion : seul un administrateur peut changer un role
-- ou lever une suspension.
--
-- `auth.uid() is null` signale un contexte serveur (service_role, console SQL,
-- migration) : aucune requete d'utilisateur final ne peut l'atteindre, la
-- politique de mise a jour de `profiles` exigeant deja `id = auth.uid()`.
-- C'est ce chemin qui permet de designer le tout premier administrateur.
create or replace function public.guard_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() or auth.uid() is null then
    return new;
  end if;
  new.role         := old.role;
  new.is_suspended := old.is_suspended;
  return new;
end;
$$;

create trigger profiles_guard_privileges
  before update on public.profiles
  for each row execute function public.guard_profile_privileges();

-- Le passage a "valide" / "publie" / "refuse" reste une decision administrative.
create or replace function public.guard_listing_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() or auth.uid() is null then
    if new.status is distinct from old.status then
      new.reviewed_at := now();
      new.reviewed_by := auth.uid();
      if new.status = 'publie' and new.published_at is null then
        new.published_at := now();
      end if;
    end if;
    return new;
  end if;

  -- Le proprietaire ne peut que soumettre (brouillon -> soumis) ou revenir au
  -- brouillon tant que le dossier n'est pas en cours de verification.
  if new.status is distinct from old.status then
    if old.status in ('brouillon', 'refuse') and new.status = 'soumis' then
      new.submitted_at := now();
    elsif old.status = 'soumis' and new.status = 'brouillon' then
      new.submitted_at := null;
    elsif new.status = 'archive' and old.status in ('brouillon', 'refuse', 'publie') then
      null;   -- le proprietaire peut retirer son annonce
    else
      raise exception 'Changement de statut non autorise : % -> %', old.status, new.status
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

create trigger land_listings_guard_status
  before update on public.land_listings
  for each row execute function public.guard_listing_status();

create or replace function public.guard_project_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() or auth.uid() is null then
    if new.status is distinct from old.status then
      new.reviewed_at := now();
      new.reviewed_by := auth.uid();
      if new.status = 'ouvert' and new.opened_at is null then
        new.opened_at := now();
      end if;
    end if;
    return new;
  end if;

  if new.status is distinct from old.status then
    if old.status = 'proposition' and new.status = 'analyse' then
      null;   -- le porteur soumet son groupe a l'analyse
    elsif new.status = 'annule' and old.status in ('proposition', 'analyse') then
      null;
    else
      raise exception 'Changement de statut non autorise : % -> %', old.status, new.status
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

create trigger projects_guard_status
  before update on public.projects
  for each row execute function public.guard_project_status();

-- -----------------------------------------------------------------------------
-- 2. Activation de RLS
-- -----------------------------------------------------------------------------

alter table public.regions              enable row level security;
alter table public.cities               enable row level security;
alter table public.profiles             enable row level security;
alter table public.owner_profiles       enable row level security;
alter table public.participant_profiles enable row level security;
alter table public.land_listings        enable row level security;
alter table public.land_images          enable row level security;
alter table public.land_documents       enable row level security;
alter table public.participant_requests enable row level security;
alter table public.projects             enable row level security;
alter table public.project_participants enable row level security;
alter table public.project_documents    enable row level security;
alter table public.matches              enable row level security;
alter table public.favorites            enable row level security;
alter table public.notifications        enable row level security;
alter table public.admin_actions        enable row level security;
alter table public.reports              enable row level security;

-- -----------------------------------------------------------------------------
-- 3. Referentiel : lecture publique
-- -----------------------------------------------------------------------------

create policy "regions lisibles par tous" on public.regions
  for select using (true);

create policy "villes lisibles par tous" on public.cities
  for select using (true);

create policy "regions administrables" on public.regions
  for all using (public.is_admin()) with check (public.is_admin());

create policy "villes administrables" on public.cities
  for all using (public.is_admin()) with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- 4. Profils
-- -----------------------------------------------------------------------------

create policy "profil : lecture de son propre profil" on public.profiles
  for select using (id = auth.uid() or public.is_admin());

create policy "profil : creation a l'inscription" on public.profiles
  for insert with check (id = auth.uid());

create policy "profil : mise a jour de son propre profil" on public.profiles
  for update using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

create policy "profil proprietaire : lecture" on public.owner_profiles
  for select using (profile_id = auth.uid() or public.is_admin());

create policy "profil proprietaire : ecriture" on public.owner_profiles
  for all using (profile_id = auth.uid() or public.is_admin())
  with check (profile_id = auth.uid() or public.is_admin());

create policy "profil participant : lecture" on public.participant_profiles
  for select using (profile_id = auth.uid() or public.is_admin());

create policy "profil participant : ecriture" on public.participant_profiles
  for all using (profile_id = auth.uid() or public.is_admin())
  with check (profile_id = auth.uid() or public.is_admin());

-- -----------------------------------------------------------------------------
-- 5. Terrains
-- -----------------------------------------------------------------------------

create policy "terrains publies visibles par tous" on public.land_listings
  for select using (
    status = 'publie'
    or owner_id = auth.uid()
    or public.is_admin()
  );

create policy "terrain : depot par un utilisateur actif" on public.land_listings
  for insert with check (
    owner_id = auth.uid()
    and public.is_active_user()
    and status in ('brouillon', 'soumis')
  );

create policy "terrain : modification par le proprietaire" on public.land_listings
  for update using (
    (owner_id = auth.uid() and status <> 'en_verification')
    or public.is_admin()
  )
  with check (owner_id = auth.uid() or public.is_admin());

create policy "terrain : suppression d'un brouillon" on public.land_listings
  for delete using (
    (owner_id = auth.uid() and status in ('brouillon', 'refuse'))
    or public.is_admin()
  );

-- Photos : visibles des lors que le terrain l'est
create policy "photos : lecture" on public.land_images
  for select using (
    exists (
      select 1 from public.land_listings l
      where l.id = land_images.land_id
        and (l.status = 'publie' or l.owner_id = auth.uid() or public.is_admin())
    )
  );

create policy "photos : gestion par le proprietaire" on public.land_images
  for all using (
    exists (
      select 1 from public.land_listings l
      where l.id = land_images.land_id
        and (l.owner_id = auth.uid() or public.is_admin())
    )
  )
  with check (
    exists (
      select 1 from public.land_listings l
      where l.id = land_images.land_id
        and (l.owner_id = auth.uid() or public.is_admin())
    )
  );

-- Documents sensibles : proprietaire + administration uniquement
create policy "documents terrain : lecture restreinte" on public.land_documents
  for select using (
    exists (
      select 1 from public.land_listings l
      where l.id = land_documents.land_id
        and (l.owner_id = auth.uid() or public.is_admin())
    )
  );

create policy "documents terrain : gestion" on public.land_documents
  for all using (
    exists (
      select 1 from public.land_listings l
      where l.id = land_documents.land_id
        and (l.owner_id = auth.uid() or public.is_admin())
    )
  )
  with check (
    exists (
      select 1 from public.land_listings l
      where l.id = land_documents.land_id
        and (l.owner_id = auth.uid() or public.is_admin())
    )
  );

-- -----------------------------------------------------------------------------
-- 6. Demandes : strictement privees (participant + administration)
-- -----------------------------------------------------------------------------

create policy "demande : lecture par son auteur" on public.participant_requests
  for select using (participant_id = auth.uid() or public.is_admin());

create policy "demande : creation" on public.participant_requests
  for insert with check (participant_id = auth.uid() and public.is_active_user());

create policy "demande : mise a jour" on public.participant_requests
  for update using (participant_id = auth.uid() or public.is_admin())
  with check (participant_id = auth.uid() or public.is_admin());

create policy "demande : suppression" on public.participant_requests
  for delete using (participant_id = auth.uid() or public.is_admin());

-- -----------------------------------------------------------------------------
-- 7. Projets participatifs
-- -----------------------------------------------------------------------------

create policy "projet : lecture" on public.projects
  for select using (
    status in ('ouvert', 'groupe_constitue', 'en_preparation', 'realise')
    or created_by = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.project_participants pp
      where pp.project_id = projects.id and pp.participant_id = auth.uid()
    )
  );

create policy "projet : creation d'un groupe" on public.projects
  for insert with check (
    created_by = auth.uid()
    and public.is_active_user()
    and status in ('proposition', 'analyse')
  );

create policy "projet : mise a jour" on public.projects
  for update using (
    (created_by = auth.uid() and status in ('proposition', 'analyse'))
    or public.is_admin()
  )
  with check (created_by = auth.uid() or public.is_admin());

create policy "projet : suppression d'une proposition" on public.projects
  for delete using (
    (created_by = auth.uid() and status = 'proposition') or public.is_admin()
  );

create policy "participation : lecture" on public.project_participants
  for select using (
    participant_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.projects p
      where p.id = project_participants.project_id and p.created_by = auth.uid()
    )
  );

create policy "participation : candidature" on public.project_participants
  for insert with check (
    participant_id = auth.uid()
    and public.is_active_user()
    and status = 'candidature'
    and exists (
      select 1 from public.projects p
      where p.id = project_participants.project_id and p.status = 'ouvert'
    )
  );

create policy "participation : mise a jour" on public.project_participants
  for update using (
    participant_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.projects p
      where p.id = project_participants.project_id and p.created_by = auth.uid()
    )
  )
  with check (
    participant_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.projects p
      where p.id = project_participants.project_id and p.created_by = auth.uid()
    )
  );

create policy "participation : retrait" on public.project_participants
  for delete using (participant_id = auth.uid() or public.is_admin());

create policy "documents projet : lecture" on public.project_documents
  for select using (
    (is_public and exists (
      select 1 from public.projects p
      where p.id = project_documents.project_id
        and p.status in ('ouvert', 'groupe_constitue', 'en_preparation', 'realise')
    ))
    or public.is_admin()
    or exists (
      select 1 from public.projects p
      where p.id = project_documents.project_id and p.created_by = auth.uid()
    )
  );

create policy "documents projet : gestion" on public.project_documents
  for all using (
    public.is_admin()
    or exists (
      select 1 from public.projects p
      where p.id = project_documents.project_id and p.created_by = auth.uid()
    )
  )
  with check (
    public.is_admin()
    or exists (
      select 1 from public.projects p
      where p.id = project_documents.project_id and p.created_by = auth.uid()
    )
  );

-- -----------------------------------------------------------------------------
-- 8. Matching, favoris, notifications
-- -----------------------------------------------------------------------------

-- Un participant voit les correspondances de ses propres demandes.
-- Un proprietaire ne voit jamais la demande : il passe par la vue anonymisee.
create policy "match : lecture par le demandeur" on public.matches
  for select using (
    public.is_admin()
    or exists (
      select 1 from public.participant_requests r
      where r.id = matches.request_id and r.participant_id = auth.uid()
    )
  );

create policy "match : mise a jour du statut par le demandeur" on public.matches
  for update using (
    public.is_admin()
    or exists (
      select 1 from public.participant_requests r
      where r.id = matches.request_id and r.participant_id = auth.uid()
    )
  )
  with check (
    public.is_admin()
    or exists (
      select 1 from public.participant_requests r
      where r.id = matches.request_id and r.participant_id = auth.uid()
    )
  );

create policy "favoris : gestion personnelle" on public.favorites
  for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());

create policy "notifications : lecture personnelle" on public.notifications
  for select using (profile_id = auth.uid() or public.is_admin());

create policy "notifications : marquage comme lue" on public.notifications
  for update using (profile_id = auth.uid()) with check (profile_id = auth.uid());

create policy "notifications : creation par l'administration" on public.notifications
  for insert with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- 9. Moderation
-- -----------------------------------------------------------------------------

create policy "journal admin : reserve" on public.admin_actions
  for select using (public.is_admin());

create policy "journal admin : ecriture" on public.admin_actions
  for insert with check (public.is_admin());

create policy "signalement : depot" on public.reports
  for insert with check (reporter_id = auth.uid() and public.is_active_user());

create policy "signalement : lecture" on public.reports
  for select using (reporter_id = auth.uid() or public.is_admin());

create policy "signalement : traitement" on public.reports
  for update using (public.is_admin()) with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- 10. Projections publiques
-- -----------------------------------------------------------------------------

-- Identite reduite : ni email, ni telephone, ni CIN.
create view public.public_profiles as
  select
    p.id,
    p.first_name,
    left(coalesce(nullif(p.last_name, ''), ' '), 1) || '.' as last_initial,
    p.role,
    p.region_code,
    p.city_id,
    p.avatar_url,
    pp.professional_body
  from public.profiles p
  left join public.participant_profiles pp on pp.profile_id = p.id
  where not p.is_suspended;

alter view public.public_profiles set (security_invoker = off);
grant select on public.public_profiles to anon, authenticated;

-- Fiche terrain enrichie (noms de region/ville, capacite, photo de couverture).
create view public.land_listings_public
with (security_invoker = on) as
  select
    l.id,
    l.reference,
    l.title,
    l.description,
    l.region_code,
    r.name_fr                       as region_name,
    l.city_id,
    coalesce(c.name_fr, l.city_other) as city_name,
    l.district,
    l.latitude,
    l.longitude,
    l.zoning,
    l.surface_m2,
    l.facade_m,
    l.depth_m,
    l.facade_count,
    l.road_width_m,
    l.legal_status,
    l.observations,
    l.price_per_m2,
    l.total_price,
    l.price_negotiable,
    l.has_water,
    l.has_electricity,
    l.has_sewage,
    l.has_telecom,
    l.has_gas,
    l.network_other,
    public.estimate_units(l.surface_m2, l.zoning, l.declared_units) as estimated_units,
    l.status,
    l.published_at,
    l.created_at,
    l.view_count,
    (
      select li.storage_path from public.land_images li
      where li.land_id = l.id
      order by li.sort_order, li.created_at
      limit 1
    ) as cover_image_path,
    (select count(*) from public.land_images li where li.land_id = l.id) as image_count
  from public.land_listings l
  join public.regions r on r.code = l.region_code
  left join public.cities c on c.id = l.city_id;

grant select on public.land_listings_public to anon, authenticated;

-- Avancement d'un projet participatif.
create view public.projects_public
with (security_invoker = on) as
  select
    p.id,
    p.reference,
    p.title,
    p.summary,
    p.description,
    p.region_code,
    r.name_fr                        as region_name,
    p.city_id,
    c.name_fr                        as city_name,
    p.district,
    p.property_need,
    p.zoning,
    p.units_planned,
    p.participants_target,
    p.budget_per_unit,
    p.restricted_to_body,
    p.status,
    p.land_id,
    p.cover_image_path,
    p.opened_at,
    p.created_at,
    (
      select count(*) from public.project_participants pp
      where pp.project_id = p.id and pp.status = 'accepte'
    ) as participants_confirmed,
    (
      select count(*) from public.project_participants pp
      where pp.project_id = p.id and pp.status = 'candidature'
    ) as participants_pending
  from public.projects p
  join public.regions r on r.code = p.region_code
  left join public.cities c on c.id = p.city_id;

grant select on public.projects_public to anon, authenticated;

-- Cote proprietaire : "votre terrain interesse 4 demandes", sans jamais
-- reveler qui est derriere la demande.
create or replace function public.owner_land_demand_summary(p_land uuid)
returns table (
  match_count       bigint,
  average_score     numeric,
  best_score        numeric,
  total_units_wanted bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    count(*)::bigint,
    round(avg(m.score), 1),
    max(m.score),
    coalesce(sum(r.units_wanted), 0)::bigint
  from public.matches m
  join public.participant_requests r on r.id = m.request_id
  join public.land_listings l on l.id = m.land_id
  where m.land_id = p_land
    and m.score >= public.match_notify_score()
    and r.status = 'active'
    and (l.owner_id = auth.uid() or public.is_admin());
$$;

-- -----------------------------------------------------------------------------
-- 11. Stockage
-- -----------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values
  ('land-images',       'land-images',       true),
  ('avatars',           'avatars',           true),
  ('land-documents',    'land-documents',    false),
  ('project-documents', 'project-documents', false)
on conflict (id) do nothing;

-- Photos de terrains : lecture publique, ecriture par l'utilisateur dans son
-- propre dossier (<uid>/<land_id>/<fichier>).
create policy "photos terrain : lecture publique" on storage.objects
  for select using (bucket_id in ('land-images', 'avatars'));

create policy "photos terrain : depot personnel" on storage.objects
  for insert with check (
    bucket_id in ('land-images', 'avatars')
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "photos terrain : suppression personnelle" on storage.objects
  for delete using (
    bucket_id in ('land-images', 'avatars')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Documents : jamais publics.
create policy "documents : lecture restreinte" on storage.objects
  for select using (
    bucket_id in ('land-documents', 'project-documents')
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_admin()
    )
  );

create policy "documents : depot personnel" on storage.objects
  for insert with check (
    bucket_id in ('land-documents', 'project-documents')
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "documents : suppression" on storage.objects
  for delete using (
    bucket_id in ('land-documents', 'project-documents')
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );
