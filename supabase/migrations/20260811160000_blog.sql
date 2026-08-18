-- =============================================================================
-- Ntcharkou — Migration 17 : le blog
-- =============================================================================
-- Articles rediges par l'administration : reglementation, financement, marche,
-- conseils pratiques. Meme logique bilingue que le reste du site — chaque champ
-- redactionnel a son pendant `_ar`, et le francais sert de repli.
--
-- Rejouable.

-- -----------------------------------------------------------------------------
-- 1. Rubriques
-- -----------------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_type where typname = 'blog_category') then
    create type public.blog_category as enum (
      'reglementation',   -- statut foncier, urbanisme, autorisations
      'financement',      -- credit, apport, frais
      'marche',           -- prix, tendances, regions
      'conseils',         -- guides pratiques a l'achat
      'participatif'      -- le logement participatif lui-meme
    );
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- 2. Les articles
-- -----------------------------------------------------------------------------
-- Le corps est en Markdown restreint, rendu par l'application. Stocker du HTML
-- obligerait a faire confiance a ce qui entre en base ; du Markdown se rend
-- avec echappement, donc sans risque d'injection.

create table if not exists public.blog_posts (
  id             uuid primary key default gen_random_uuid(),
  -- Le slug est l'adresse publique : stable, il ne suit pas les corrections de
  -- titre, sans quoi chaque relecture casserait les liens partages.
  slug           text not null unique,

  title          text not null,
  title_ar       text,
  excerpt        text,
  excerpt_ar     text,
  body           text not null,
  body_ar        text,

  category       public.blog_category not null default 'conseils',
  cover_image_path text,

  author_id      uuid references public.profiles(id) on delete set null,
  status         text not null default 'brouillon'
                   check (status in ('brouillon', 'publie')),

  reading_minutes integer,
  view_count     integer not null default 0,

  published_at   timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists blog_posts_status_idx
  on public.blog_posts (status, published_at desc);
create index if not exists blog_posts_category_idx
  on public.blog_posts (category);

-- Durée de lecture estimée : elle découle du texte, elle n'est pas saisie —
-- sinon elle finirait par mentir après une réécriture.
create or replace function public.trg_blog_reading_time()
returns trigger
language plpgsql
as $$
declare
  mots integer;
begin
  mots := array_length(regexp_split_to_array(btrim(coalesce(new.body, '')), '\s+'), 1);
  -- 200 mots par minute, minimum une minute.
  new.reading_minutes := greatest(1, ceil(coalesce(mots, 0) / 200.0)::integer);

  -- La date de publication se pose au passage en « publie », et ne bouge plus.
  if new.status = 'publie' and new.published_at is null then
    new.published_at := now();
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists blog_posts_prepare on public.blog_posts;
create trigger blog_posts_prepare
  before insert or update on public.blog_posts
  for each row execute function public.trg_blog_reading_time();

-- -----------------------------------------------------------------------------
-- 3. Accès
-- -----------------------------------------------------------------------------
-- Lecture publique des seuls articles publiés ; écriture réservée à
-- l'administration, comme tout contenu éditorial du site.

alter table public.blog_posts enable row level security;

drop policy if exists "blog : lecture publique" on public.blog_posts;
create policy "blog : lecture publique" on public.blog_posts
  for select using (status = 'publie' or public.is_admin());

drop policy if exists "blog : redaction par l'administration" on public.blog_posts;
create policy "blog : redaction par l'administration" on public.blog_posts
  for all using (public.is_admin()) with check (public.is_admin());

grant select on public.blog_posts to anon, authenticated;
grant insert, update, delete on public.blog_posts to authenticated;

-- -----------------------------------------------------------------------------
-- 4. Vue publique
-- -----------------------------------------------------------------------------

drop view if exists public.blog_posts_public;

create view public.blog_posts_public
with (security_invoker = on) as
  select
    p.id,
    p.slug,
    p.title,
    nullif(btrim(coalesce(p.title_ar, '')), '')   as title_ar,
    p.excerpt,
    nullif(btrim(coalesce(p.excerpt_ar, '')), '') as excerpt_ar,
    p.body,
    nullif(btrim(coalesce(p.body_ar, '')), '')    as body_ar,
    p.category,
    p.cover_image_path,
    p.status,
    p.reading_minutes,
    p.view_count,
    p.published_at,
    p.created_at,
    concat_ws(' ', a.first_name, a.last_name) as author_name
  from public.blog_posts p
  left join public.profiles a on a.id = p.author_id;

grant select on public.blog_posts_public to anon, authenticated;

-- -----------------------------------------------------------------------------
-- 5. Compteur de lectures
-- -----------------------------------------------------------------------------
-- SECURITY DEFINER : un visiteur anonyme n'a pas le droit d'écrire dans la
-- table, mais doit pouvoir incrémenter ce compteur. La fonction n'expose rien
-- d'autre et ne touche qu'un article publié.

create or replace function public.increment_post_views(p_slug text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.blog_posts
     set view_count = view_count + 1
   where slug = p_slug and status = 'publie';
$$;

revoke execute on function public.increment_post_views(text) from public;
grant execute on function public.increment_post_views(text) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- 6. Images des articles
-- -----------------------------------------------------------------------------
-- Bucket dédié : les visuels d'articles n'ont rien à faire au milieu des photos
-- de terrains, et leurs droits d'écriture ne sont pas les mêmes.

insert into storage.buckets (id, name, public)
values ('blog-images', 'blog-images', true)
on conflict (id) do nothing;

drop policy if exists "blog : images publiques" on storage.objects;
create policy "blog : images publiques" on storage.objects
  for select using (bucket_id = 'blog-images');

drop policy if exists "blog : depot par l'administration" on storage.objects;
create policy "blog : depot par l'administration" on storage.objects
  for insert with check (bucket_id = 'blog-images' and public.is_admin());

drop policy if exists "blog : suppression par l'administration" on storage.objects;
create policy "blog : suppression par l'administration" on storage.objects
  for delete using (bucket_id = 'blog-images' and public.is_admin());

-- -----------------------------------------------------------------------------
-- 7. Rédaction, depuis le back-office
-- -----------------------------------------------------------------------------
-- Un point d'entrée unique : la fonction crée ou met à jour selon que `p_id`
-- est fourni, et garantit l'unicité du slug — deux articles au même slug se
-- masqueraient l'un l'autre sans erreur visible.

-- `unaccent` est une extension qui n'est pas toujours disponible : on remplace
-- explicitement les caracteres accentues du francais.
create or replace function public.unaccent_fallback(p_text text)
returns text
language sql
immutable
as $$
  select translate(
    coalesce(p_text, ''),
    'àâäáãåçèéêëìíîïñòóôöõùúûüýÿÀÂÄÁÃÅÇÈÉÊËÌÍÎÏÑÒÓÔÖÕÙÚÛÜÝ',
    'aaaaaaceeeeiiiinooooouuuuyyAAAAAACEEEEIIIINOOOOOUUUUY'
  );
$$;

-- Slug lisible : accents retires, tout ce qui n'est pas alphanumerique devient
-- un tiret. Sans cela, une adresse d'article serait illisible et fragile.
create or replace function public.slugify(p_text text)
returns text
language sql
immutable
as $$
  select coalesce(
    nullif(
      btrim(
        regexp_replace(
          regexp_replace(
            lower(unaccent_fallback(p_text)),
            '[^a-z0-9]+', '-', 'g'
          ),
          '(^-+|-+$)', '', 'g'
        ),
        '-'
      ),
      ''
    ),
    'article'
  );
$$;

create or replace function public.admin_save_post(
  p_id           uuid,
  p_slug         text,
  p_title        text,
  p_body         text,
  p_category     public.blog_category,
  p_status       text,
  p_title_ar     text default null,
  p_excerpt      text default null,
  p_excerpt_ar   text default null,
  p_body_ar      text default null,
  p_cover        text default null
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
      category, cover_image_path, author_id, status
    )
    values (
      v_slug, p_title, p_title_ar, p_excerpt, p_excerpt_ar, p_body, p_body_ar,
      p_category, p_cover, auth.uid(), p_status
    )
    returning id into new_id;
  else
    update public.blog_posts
       set slug             = v_slug,
           title            = p_title,
           title_ar         = nullif(btrim(coalesce(p_title_ar, '')), ''),
           excerpt          = p_excerpt,
           excerpt_ar       = nullif(btrim(coalesce(p_excerpt_ar, '')), ''),
           body             = p_body,
           body_ar          = nullif(btrim(coalesce(p_body_ar, '')), ''),
           category         = p_category,
           cover_image_path = p_cover,
           status           = p_status
     where id = p_id
     returning id into new_id;

    if new_id is null then
      raise exception 'Article introuvable.' using errcode = 'P0002';
    end if;
  end if;

  return new_id;
end;
$$;

create or replace function public.admin_delete_post(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Reserve a l''administration.' using errcode = '42501';
  end if;

  delete from public.blog_posts where id = p_id;
  if not found then
    raise exception 'Article introuvable.' using errcode = 'P0002';
  end if;
end;
$$;

revoke execute on function public.admin_save_post(
  uuid, text, text, text, public.blog_category, text,
  text, text, text, text, text) from public;
revoke execute on function public.admin_delete_post(uuid) from public;
grant execute on function public.admin_save_post(
  uuid, text, text, text, public.blog_category, text,
  text, text, text, text, text) to authenticated;
grant execute on function public.admin_delete_post(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- 8. Cache de schema
-- -----------------------------------------------------------------------------
-- PostgREST garde en memoire la liste des tables et des fonctions. Sans ce
-- rechargement, la premiere sauvegarde d'article repondrait « Could not find
-- the function public.admin_save_post in the schema cache » alors que la
-- migration vient d'etre appliquee.

notify pgrst, 'reload schema';
