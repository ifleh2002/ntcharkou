'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { savePost } from '@/app/actions/blog'
import type { Dictionary } from '@/lib/i18n'
import { localePath, type Locale } from '@/lib/i18n/config'
import { BLOG_CATEGORY_ORDER } from '@/lib/labels'
import { renderMarkdown } from '@/lib/markdown'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { BLOG_IMAGES_BUCKET, postImageUrl } from '@/lib/storage'
import type { BlogPost } from '@/lib/types'
import { Alert, Button, Field } from './ui'

/** Ce que le stockage accepte pour une couverture d'article. */
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_IMAGE_BYTES = 2 * 1024 * 1024

/** Un nom de fichier sert de chemin : on ne garde que ce qui est sûr. */
function sanitize(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .slice(-60)
}

/**
 * Rédaction d'un article.
 *
 * Deux points méritent l'explication :
 *
 * 1. L'image part du navigateur vers Storage, comme les photos de terrain — un
 *    fichier de 2 Mo n'a pas à transiter par une action serveur.
 * 2. L'envoi de l'image précède l'enregistrement. Si l'envoi échoue, rien n'est
 *    écrit : mieux vaut un article non enregistré qu'un article enregistré avec
 *    une couverture manquante, que rien ne signalerait ensuite.
 */
export function PostForm({
  post,
  t,
  locale,
}: {
  post?: BlogPost | null
  t: Dictionary
  locale: Locale
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  // Couverture : le chemin déjà enregistré, ou celui qui vient d'être déposé.
  const [cover, setCover] = useState<string | null>(post?.cover_image_path ?? null)

  // Aperçu du rendu : le Markdown ne se lit pas comme il s'affiche.
  const [body, setBody] = useState(post?.body ?? '')
  const [showPreview, setShowPreview] = useState(false)

  async function uploadCover(file: File): Promise<string> {
    if (!IMAGE_TYPES.includes(file.type)) throw new Error(t.adminBlog.errImageType)
    if (file.size > MAX_IMAGE_BYTES) throw new Error(t.adminBlog.errImageSize)

    const supabase = createSupabaseBrowserClient()
    const path = `${Date.now()}-${sanitize(file.name)}`
    const { error: upErr } = await supabase.storage
      .from(BLOG_IMAGES_BUCKET)
      .upload(path, file, { upsert: false })
    if (upErr) throw upErr
    return path
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    setBusy(true)
    setError(null)
    setDone(false)

    const formData = new FormData(form)
    const intent = (
      (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null
    )?.value
    formData.set('status', intent === 'publie' ? 'publie' : 'brouillon')

    // L'image d'abord : un échec ici doit laisser l'article inchangé.
    let coverPath = cover
    const file = (form.querySelector('#cover') as HTMLInputElement | null)?.files?.[0]
    if (file) {
      setProgress(t.adminBlog.uploading)
      try {
        coverPath = await uploadCover(file)
      } catch (uploadError) {
        console.error(uploadError)
        setProgress(null)
        setBusy(false)
        setError(
          uploadError instanceof Error && uploadError.message
            ? uploadError.message
            : t.adminBlog.errUpload,
        )
        return
      }
      setProgress(null)
    }

    formData.set('cover_image_path', coverPath ?? '')
    // `File` n'a rien à faire dans la charge envoyée à l'action.
    formData.delete('cover_file')

    const result = await savePost(formData)
    setBusy(false)

    if (result.error) {
      setError(result.error)
      return
    }

    setCover(coverPath)
    setDone(true)
    router.push(localePath(locale, '/admin/blog'))
    router.refresh()
  }

  const coverUrl = postImageUrl(cover)

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {post ? <input type="hidden" name="post_id" value={post.id} /> : null}

      {error ? (
        <Alert tone="danger">
          <span className="whitespace-pre-line">{error}</span>
        </Alert>
      ) : null}
      {done ? <Alert tone="succes">{t.adminBlog.saved}</Alert> : null}

      {/* --- Titres ---------------------------------------------------- */}
      <section className="surface p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t.adminBlog.postTitle} htmlFor="title" required>
            <input
              id="title"
              name="title"
              required
              className="champ"
              defaultValue={post?.title ?? ''}
            />
          </Field>

          <Field label={t.adminBlog.postTitleAr} htmlFor="title_ar">
            <input
              id="title_ar"
              name="title_ar"
              dir="rtl"
              lang="ar"
              className="champ"
              defaultValue={post?.title_ar ?? ''}
            />
          </Field>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label={t.adminBlog.category} htmlFor="category">
            <select
              id="category"
              name="category"
              className="champ"
              defaultValue={post?.category ?? 'conseils'}
            >
              {BLOG_CATEGORY_ORDER.map((item) => (
                <option key={item} value={item}>
                  {t.blog.categories[item]}
                </option>
              ))}
            </select>
          </Field>

          <Field label={t.adminBlog.slug} htmlFor="slug" hint={t.adminBlog.slugHint}>
            <input
              id="slug"
              name="slug"
              dir="ltr"
              className="champ"
              placeholder="titre-de-l-article"
              defaultValue={post?.slug ?? ''}
            />
          </Field>
        </div>
      </section>

      {/* --- Chapô ----------------------------------------------------- */}
      <section className="surface p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t.adminBlog.excerpt} htmlFor="excerpt" hint={t.adminBlog.excerptHint}>
            <textarea
              id="excerpt"
              name="excerpt"
              rows={3}
              className="champ"
              defaultValue={post?.excerpt ?? ''}
            />
          </Field>

          <Field label={t.adminBlog.excerptAr} htmlFor="excerpt_ar">
            <textarea
              id="excerpt_ar"
              name="excerpt_ar"
              rows={3}
              dir="rtl"
              lang="ar"
              className="champ"
              defaultValue={post?.excerpt_ar ?? ''}
            />
          </Field>
        </div>
      </section>

      {/* --- Couverture ------------------------------------------------ */}
      <section className="surface p-5">
        <Field label={t.adminBlog.cover} htmlFor="cover" hint={t.adminBlog.coverHint}>
          <input
            id="cover"
            name="cover_file"
            type="file"
            accept={IMAGE_TYPES.join(',')}
            className="champ"
          />
        </Field>

        {coverUrl ? (
          <div className="mt-4 flex flex-wrap items-start gap-4">
            <div className="w-48 overflow-hidden rounded-lg border border-sable-300">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={coverUrl} alt={t.adminBlog.coverCurrent} className="w-full" />
            </div>
            <div>
              <p className="text-sm text-encre-500">{t.adminBlog.coverCurrent}</p>
              <button
                type="button"
                onClick={() => setCover(null)}
                className="mt-1 text-sm font-semibold text-red-700 hover:underline"
              >
                {t.adminBlog.coverRemove}
              </button>
            </div>
          </div>
        ) : null}
      </section>

      {/* --- Contenu --------------------------------------------------- */}
      <section className="surface p-5">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <span className="etiquette mb-0">{t.adminBlog.body}</span>
          <button
            type="button"
            onClick={() => setShowPreview((value) => !value)}
            className="text-sm font-semibold text-argile-600 hover:underline"
          >
            {showPreview ? t.common.cancel : t.adminBlog.preview}
          </button>
        </div>
        <p className="mb-2 text-xs text-encre-400">{t.adminBlog.bodyHint}</p>

        <textarea
          id="body"
          name="body"
          rows={18}
          required
          className="champ font-mono text-sm"
          value={body}
          onChange={(event) => setBody(event.target.value)}
        />

        {showPreview ? (
          <div className="mt-4 rounded-lg border border-sable-300 bg-sable-50 p-4">
            <p className="mb-2 text-xs font-semibold text-encre-500">{t.adminBlog.previewHint}</p>
            {/* Rendu par notre propre module : tout est échappé avant
                reconstruction (`src/lib/markdown.ts`). */}
            <div className="article" dangerouslySetInnerHTML={{ __html: renderMarkdown(body) }} />
          </div>
        ) : null}

        <div className="mt-5">
          <Field label={t.adminBlog.bodyAr} htmlFor="body_ar">
            <textarea
              id="body_ar"
              name="body_ar"
              rows={12}
              dir="rtl"
              lang="ar"
              className="champ text-sm"
              defaultValue={post?.body_ar ?? ''}
            />
          </Field>
        </div>
      </section>

      {progress ? <p className="text-sm text-encre-500">{progress}</p> : null}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" name="intent" value="publie" disabled={busy}>
          {busy ? t.common.loading : t.adminBlog.statusPublished}
        </Button>
        <Button type="submit" name="intent" value="brouillon" variant="secondary" disabled={busy}>
          {t.adminBlog.statusDraft}
        </Button>
      </div>
    </form>
  )
}
