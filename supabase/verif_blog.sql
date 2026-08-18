-- =============================================================================
-- Ntcharkou — Contrôle d'application de la migration 17 (le blog)
-- =============================================================================
-- À exécuter dans l'éditeur SQL Supabase APRÈS avoir appliqué
-- `20260811160000_blog.sql`.
--
-- Une migration collée partiellement laisse la base à moitié faite sans qu'aucun
-- message ne le dise : la table existe, mais la fonction d'enregistrement
-- manque, et l'erreur n'apparaît qu'au premier article rédigé. Cette requête
-- répond par oui ou par non, objet par objet.
--
-- Tout doit être « t ». Un seul « f » : rejouez la migration en entier.
-- =============================================================================

select 'table blog_posts'        as objet, to_regclass('public.blog_posts')        is not null as present
union all select 'vue blog_posts_public',   to_regclass('public.blog_posts_public') is not null
union all select 'type blog_category',      exists (select 1 from pg_type where typname = 'blog_category')
union all select 'fonction slugify',        exists (select 1 from pg_proc where proname = 'slugify')
union all select 'fonction unaccent_fallback', exists (select 1 from pg_proc where proname = 'unaccent_fallback')
union all select 'fonction admin_save_post', exists (select 1 from pg_proc where proname = 'admin_save_post')
union all select 'fonction admin_delete_post', exists (select 1 from pg_proc where proname = 'admin_delete_post')
union all select 'fonction increment_post_views', exists (select 1 from pg_proc where proname = 'increment_post_views')
union all select 'declencheur duree de lecture', exists (select 1 from pg_trigger where tgname = 'blog_posts_prepare')
union all select 'bucket blog-images',      exists (select 1 from storage.buckets where id = 'blog-images')
order by present, objet;
