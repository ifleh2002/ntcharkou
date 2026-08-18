-- =============================================================================
-- Blog : rédaction réservée, slugs uniques, durée de lecture, visibilité.
--   psql -d ntcharkou_test -f supabase/tests/04_blog.sql
-- =============================================================================

begin;
set local client_min_messages = warning;

insert into auth.users (id, email, raw_user_meta_data) values
  ('e1111111-1111-1111-1111-111111111111', 'blog-admin@test.ma',
   '{"first_name":"Latifa","last_name":"Bennis","role":"participant"}'),
  ('e2222222-2222-2222-2222-222222222222', 'blog-lecteur@test.ma',
   '{"first_name":"Youssef","last_name":"Kabbaj","role":"participant"}');

update public.profiles set role = 'admin' where id = 'e1111111-1111-1111-1111-111111111111';

-- --- Le slug se déduit du titre, accents retirés -----------------------------

do $$
begin
  if public.slugify('Réquisition d''immatriculation : le délai') <> 'requisition-d-immatriculation-le-delai' then
    raise exception 'Slug inattendu : %', public.slugify('Réquisition d''immatriculation : le délai');
  end if;

  -- Un titre sans caractère utilisable ne doit pas produire un slug vide : une
  -- adresse vide rendrait l'article inatteignable.
  if public.slugify('؟؟؟') <> 'article' then
    raise exception 'Un slug vide doit être remplacé par un repli, obtenu %', public.slugify('؟؟؟');
  end if;
end;
$$;

-- --- Rédaction réservée à l'administration -----------------------------------

select set_config('request.jwt.claim.sub', 'e2222222-2222-2222-2222-222222222222', true);

do $$
begin
  begin
    perform public.admin_save_post(
      null, null, 'Article d''un lecteur', 'Un corps de texte.',
      'conseils'::public.blog_category, 'publie');
    raise exception 'Un participant ne doit pas pouvoir rédiger un article';
  exception
    when insufficient_privilege then null;  -- comportement attendu
  end;
end;
$$;

-- --- Création par l'administration -------------------------------------------

select set_config('request.jwt.claim.sub', 'e1111111-1111-1111-1111-111111111111', true);

do $$
declare
  post_id uuid;
  ligne public.blog_posts%rowtype;
begin
  post_id := public.admin_save_post(
    null, null,
    'Le zonage urbain au Maroc',
    -- 300 mots : la durée de lecture doit s'en déduire, pas être saisie.
    repeat('mot ', 300),
    'reglementation'::public.blog_category, 'publie',
    'التخصيص العمراني');

  select * into ligne from public.blog_posts where id = post_id;

  if ligne.slug <> 'le-zonage-urbain-au-maroc' then
    raise exception 'Slug attendu « le-zonage-urbain-au-maroc », obtenu %', ligne.slug;
  end if;
  -- 300 mots à 200 mots/minute, arrondi au supérieur.
  if ligne.reading_minutes <> 2 then
    raise exception 'Durée de lecture attendue 2 min, obtenue %', ligne.reading_minutes;
  end if;
  -- La date de publication se pose au passage en « publie ».
  if ligne.published_at is null then
    raise exception 'Un article publié doit porter une date de publication';
  end if;
  if ligne.author_id <> 'e1111111-1111-1111-1111-111111111111' then
    raise exception 'L''auteur doit être l''administrateur qui a rédigé';
  end if;
end;
$$;

-- --- Deux articles au même titre ne se masquent pas --------------------------
-- Sans suffixe, le second prendrait le slug du premier et l'un des deux
-- deviendrait inatteignable, sans qu'aucune erreur ne le signale.

do $$
declare
  second_id uuid;
  second_slug text;
begin
  second_id := public.admin_save_post(
    null, null, 'Le zonage urbain au Maroc', 'Un autre texte, même titre.',
    'reglementation'::public.blog_category, 'brouillon');

  select slug into second_slug from public.blog_posts where id = second_id;

  if second_slug = 'le-zonage-urbain-au-maroc' then
    raise exception 'Le second article doit recevoir un slug distinct';
  end if;
  if second_slug not like 'le-zonage-urbain-au-maroc-%' then
    raise exception 'Le slug suffixé doit rester lisible, obtenu %', second_slug;
  end if;
end;
$$;

-- --- Modifier un article ne change pas son adresse ---------------------------
-- Le slug est le lien partagé : le laisser suivre les corrections de titre
-- casserait tout ce qui a déjà été diffusé.

do $$
declare
  post_id uuid;
  avant text;
  apres text;
begin
  select id, slug into post_id, avant
    from public.blog_posts where slug = 'le-zonage-urbain-au-maroc';

  perform public.admin_save_post(
    post_id, avant,
    'Le zonage urbain au Maroc — édition revue',
    repeat('mot ', 300),
    'reglementation'::public.blog_category, 'publie');

  select slug into apres from public.blog_posts where id = post_id;
  if apres <> avant then
    raise exception 'Le slug ne doit pas suivre le titre : % -> %', avant, apres;
  end if;
end;
$$;

-- --- Un brouillon reste invisible du public ----------------------------------
-- La RLS ne s'applique qu'aux rôles ordinaires : le propriétaire des tables la
-- contourne. On endosse donc `authenticated`, faute de quoi le contrôle
-- passerait toujours sans rien vérifier.

select set_config('request.jwt.claim.sub', 'e2222222-2222-2222-2222-222222222222', true);
set role authenticated;

do $$
declare
  visibles integer;
begin
  select count(*) into visibles from public.blog_posts_public;
  if visibles <> 1 then
    raise exception 'Un lecteur ne doit voir que l''article publié, obtenu %', visibles;
  end if;
end;
$$;

-- Un lecteur ne doit pas non plus pouvoir écrire directement dans la table.
do $$
begin
  begin
    insert into public.blog_posts (slug, title, body)
    values ('article-en-fraude', 'Article en fraude', 'Un texte.');
    raise exception 'Un lecteur ne doit pas pouvoir insérer un article';
  exception
    when insufficient_privilege then null;  -- comportement attendu
  end;
end;
$$;

reset role;

-- --- Le compteur de lectures s'incrémente pour un anonyme --------------------
-- La table est en écriture réservée : sans la fonction SECURITY DEFINER, le
-- compteur resterait à zéro sans que rien ne l'indique.

do $$
declare
  avant integer;
  apres integer;
begin
  select view_count into avant from public.blog_posts where slug = 'le-zonage-urbain-au-maroc';
  perform public.increment_post_views('le-zonage-urbain-au-maroc');
  select view_count into apres from public.blog_posts where slug = 'le-zonage-urbain-au-maroc';

  if apres <> avant + 1 then
    raise exception 'Le compteur de lectures doit avancer : % -> %', avant, apres;
  end if;
end;
$$;

-- --- Suppression réservée, elle aussi ----------------------------------------

do $$
declare
  cible uuid;
begin
  select id into cible from public.blog_posts where slug = 'le-zonage-urbain-au-maroc';
  begin
    perform public.admin_delete_post(cible);
    raise exception 'Un participant ne doit pas pouvoir supprimer un article';
  exception
    when insufficient_privilege then null;  -- comportement attendu
  end;
end;
$$;

select set_config('request.jwt.claim.sub', 'e1111111-1111-1111-1111-111111111111', true);

do $$
declare
  cible uuid;
begin
  select id into cible from public.blog_posts where slug = 'le-zonage-urbain-au-maroc';
  perform public.admin_delete_post(cible);

  if exists (select 1 from public.blog_posts where id = cible) then
    raise exception 'L''article devait être supprimé';
  end if;

  -- Supprimer deux fois doit se voir, plutôt que de passer pour un succès.
  begin
    perform public.admin_delete_post(cible);
    raise exception 'La suppression d''un article absent doit lever une erreur';
  exception
    when no_data_found then null;  -- comportement attendu
  end;
end;
$$;

commit;

\echo '=== Blog : contrôles passés ==='
