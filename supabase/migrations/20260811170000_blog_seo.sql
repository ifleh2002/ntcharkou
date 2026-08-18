-- =============================================================================
-- Ntcharkou — Migration 18 : referencement des articles
-- =============================================================================
-- Deux ajouts, et une seule idee derriere :
--
--   1. `seo_title` / `seo_description`, distincts du titre et du chapo. Le titre
--      d'un article s'adresse au lecteur qui est deja sur la page ; le titre
--      affiche dans un resultat de recherche s'adresse a quelqu'un qui hesite
--      entre dix liens. Les confondre oblige a sacrifier l'un des deux.
--
--   2. `updated_at` publie dans la vue. Sans lui, un article revu depuis un an
--      passe pour n'avoir jamais ete relu : `dateModified` est justement ce que
--      Google et les moteurs de reponse regardent pour juger de la fraicheur.
--
-- Les questions frequentes, elles, n'ont PAS de colonne : elles sont deduites du
-- corps de l'article (tout sous-titre termine par « ? » ou « ؟ »). Une donnee
-- structuree decrivant une question absente de la page est un mensonge — Google
-- la sanctionne, et le lecteur venu la lire ne la trouve pas.
--
-- Rejouable.

-- -----------------------------------------------------------------------------
-- 1. Colonnes
-- -----------------------------------------------------------------------------

alter table public.blog_posts
  add column if not exists seo_title          text,
  add column if not exists seo_title_ar       text,
  add column if not exists seo_description    text,
  add column if not exists seo_description_ar text;

-- -----------------------------------------------------------------------------
-- 2. Vue publique
-- -----------------------------------------------------------------------------

drop view if exists public.blog_posts_public;

create view public.blog_posts_public
with (security_invoker = on) as
  select
    p.id,
    p.slug,
    p.title,
    nullif(btrim(coalesce(p.title_ar, '')), '')            as title_ar,
    p.excerpt,
    nullif(btrim(coalesce(p.excerpt_ar, '')), '')          as excerpt_ar,
    p.body,
    nullif(btrim(coalesce(p.body_ar, '')), '')             as body_ar,
    nullif(btrim(coalesce(p.seo_title, '')), '')           as seo_title,
    nullif(btrim(coalesce(p.seo_title_ar, '')), '')        as seo_title_ar,
    nullif(btrim(coalesce(p.seo_description, '')), '')     as seo_description,
    nullif(btrim(coalesce(p.seo_description_ar, '')), '')  as seo_description_ar,
    p.category,
    p.cover_image_path,
    p.status,
    p.reading_minutes,
    p.view_count,
    p.published_at,
    p.created_at,
    p.updated_at,
    concat_ws(' ', a.first_name, a.last_name) as author_name
  from public.blog_posts p
  left join public.profiles a on a.id = p.author_id;

grant select on public.blog_posts_public to anon, authenticated;

-- -----------------------------------------------------------------------------
-- 3. Enregistrement
-- -----------------------------------------------------------------------------
-- La signature change : `create or replace` en creerait une SECONDE, et tout
-- appel repondrait alors « function is not unique ». On supprime donc l'ancienne
-- explicitement avant de creer la nouvelle.

drop function if exists public.admin_save_post(
  uuid, text, text, text, public.blog_category, text,
  text, text, text, text, text);

create or replace function public.admin_save_post(
  p_id                 uuid,
  p_slug               text,
  p_title              text,
  p_body               text,
  p_category           public.blog_category,
  p_status             text,
  p_title_ar           text default null,
  p_excerpt            text default null,
  p_excerpt_ar         text default null,
  p_body_ar            text default null,
  p_cover              text default null,
  p_seo_title          text default null,
  p_seo_title_ar       text default null,
  p_seo_description    text default null,
  p_seo_description_ar text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  -- Prefixe `v_` : une variable nommee `slug` serait ambigue face a la colonne
  -- du meme nom, et PL/pgSQL refuse la requete plutot que de choisir.
  v_slug text;
  new_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Reserve a l''administration.' using errcode = '42501';
  end if;

  if p_title is null or btrim(p_title) = '' then
    raise exception 'Le titre est obligatoire.' using errcode = '22023';
  end if;
  if p_body is null or btrim(p_body) = '' then
    raise exception 'Le contenu est obligatoire.' using errcode = '22023';
  end if;
  if p_status not in ('brouillon', 'publie') then
    raise exception 'Statut inconnu.' using errcode = '22023';
  end if;

  v_slug := public.slugify(coalesce(nullif(btrim(p_slug), ''), p_title));

  -- Unicite : on suffixe tant que le slug est pris par un AUTRE article.
  while exists (
    select 1 from public.blog_posts b
    where b.slug = v_slug and (p_id is null or b.id <> p_id)
  ) loop
    v_slug := v_slug || '-' || substr(md5(random()::text), 1, 4);
  end loop;

  if p_id is null then
    insert into public.blog_posts (
      slug, title, title_ar, excerpt, excerpt_ar, body, body_ar,
      seo_title, seo_title_ar, seo_description, seo_description_ar,
      category, cover_image_path, author_id, status
    )
    values (
      v_slug, p_title, p_title_ar, p_excerpt, p_excerpt_ar, p_body, p_body_ar,
      p_seo_title, p_seo_title_ar, p_seo_description, p_seo_description_ar,
      p_category, p_cover, auth.uid(), p_status
    )
    returning id into new_id;
  else
    update public.blog_posts
       set slug               = v_slug,
           title              = p_title,
           title_ar           = nullif(btrim(coalesce(p_title_ar, '')), ''),
           excerpt            = p_excerpt,
           excerpt_ar         = nullif(btrim(coalesce(p_excerpt_ar, '')), ''),
           body               = p_body,
           body_ar            = nullif(btrim(coalesce(p_body_ar, '')), ''),
           seo_title          = nullif(btrim(coalesce(p_seo_title, '')), ''),
           seo_title_ar       = nullif(btrim(coalesce(p_seo_title_ar, '')), ''),
           seo_description    = nullif(btrim(coalesce(p_seo_description, '')), ''),
           seo_description_ar = nullif(btrim(coalesce(p_seo_description_ar, '')), ''),
           category           = p_category,
           cover_image_path   = p_cover,
           status             = p_status
     where id = p_id
     returning id into new_id;

    if new_id is null then
      raise exception 'Article introuvable.' using errcode = 'P0002';
    end if;
  end if;

  return new_id;
end;
$$;

revoke execute on function public.admin_save_post(
  uuid, text, text, text, public.blog_category, text,
  text, text, text, text, text, text, text, text, text) from public;
grant execute on function public.admin_save_post(
  uuid, text, text, text, public.blog_category, text,
  text, text, text, text, text, text, text, text, text) to authenticated;

-- -----------------------------------------------------------------------------
-- 4. Cache de schema
-- -----------------------------------------------------------------------------

notify pgrst, 'reload schema';
