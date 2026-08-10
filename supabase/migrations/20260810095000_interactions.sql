-- =============================================================================
-- Ntcharkou — Interactions utilisateur necessitant d'ecrire hors de son
-- perimetre RLS (notifier un proprietaire, marquer un match).
-- =============================================================================

-- « Je suis interesse » depuis la fiche terrain.
-- Le proprietaire est prevenu sans jamais recevoir l'identite du participant :
-- il consulte ensuite le recapitulatif anonymise de son annonce.
create or replace function public.express_interest(p_land uuid, p_message text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  land       public.land_listings;
  interested uuid := auth.uid();
begin
  if interested is null then
    raise exception 'Connexion requise' using errcode = '42501';
  end if;

  if not public.is_active_user() then
    raise exception 'Compte suspendu' using errcode = '42501';
  end if;

  select * into land from public.land_listings where id = p_land and status = 'publie';
  if not found then
    raise exception 'Terrain introuvable ou non publie';
  end if;

  if land.owner_id = interested then
    return;   -- pas de notification a soi-meme
  end if;

  -- Les correspondances existantes du participant sur ce terrain passent a
  -- "interesse" : le KPI de conversion du back-office s'appuie dessus.
  update public.matches m
     set status = 'interesse', viewed_at = coalesce(m.viewed_at, now())
    from public.participant_requests r
   where m.request_id = r.id
     and m.land_id = p_land
     and r.participant_id = interested;

  insert into public.notifications (profile_id, kind, title, body, url, payload)
  values (
    land.owner_id,
    'nouveau_match_demande',
    'Un participant est interesse par votre terrain',
    coalesce(
      nullif(trim(p_message), ''),
      format('Une marque d''interet vient d''etre enregistree sur « %s ».', land.title)
    ),
    '/mes-terrains/' || land.id,
    jsonb_build_object('land_id', land.id)
  );
end;
$$;

grant execute on function public.express_interest(uuid, text) to authenticated;

-- Marque une correspondance comme vue (ouverture depuis une notification) :
-- alimente le KPI "nombre de clics apres notification".
create or replace function public.mark_match_viewed(p_match uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.matches m
     set viewed_at = coalesce(m.viewed_at, now()),
         status = case when m.status = 'nouveau' then 'vu'::public.match_status else m.status end
    from public.participant_requests r
   where m.id = p_match
     and m.request_id = r.id
     and r.participant_id = auth.uid();
end;
$$;

grant execute on function public.mark_match_viewed(uuid) to authenticated;

-- Marque toutes les notifications comme lues.
create or replace function public.mark_all_notifications_read()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  affected integer;
begin
  update public.notifications
     set read_at = now()
   where profile_id = auth.uid() and read_at is null;
  get diagnostics affected = row_count;
  return affected;
end;
$$;

grant execute on function public.mark_all_notifications_read() to authenticated;
