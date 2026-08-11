'use client'

import { useState } from 'react'
import { landImageUrl } from '@/lib/storage'
import { Cover } from './cover'
import { cx } from './ui'

export interface GalleryImage {
  id: string
  storage_path: string
  caption: string | null
}

/**
 * Galerie d'un terrain. Sans photo, la couverture generee prend le relais :
 * une fiche n'est jamais visuellement vide.
 */
export function Gallery({
  images,
  title,
  seed,
  noPhotoLabel,
}: {
  images: GalleryImage[]
  title: string
  seed: string
  noPhotoLabel: string
}) {
  const [current, setCurrent] = useState(0)
  const active = images[current] ?? images[0] ?? null

  return (
    <div className="surface overflow-hidden p-0">
      <div className="aspect-16/9 bg-sable-200">
        <Cover
          src={active ? landImageUrl(active.storage_path) : null}
          alt={active?.caption ?? title}
          seed={seed}
          eager
        />
      </div>

      {images.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto p-3">
          {images.map((image, index) => (
            <button
              key={image.id}
              type="button"
              onClick={() => setCurrent(index)}
              aria-label={image.caption ?? `${title} ${index + 1}`}
              aria-current={index === current}
              className={cx(
                'size-20 shrink-0 overflow-hidden rounded-lg border-2 transition-colors',
                index === current ? 'border-argile-500' : 'border-transparent hover:border-sable-400',
              )}
            >
              <Cover
                src={landImageUrl(image.storage_path)}
                alt={image.caption ?? title}
                seed={`${seed}-${image.id}`}
              />
            </button>
          ))}
        </div>
      ) : null}

      {images.length === 0 ? (
        <p className="px-4 py-2.5 text-center text-xs text-encre-400">{noPhotoLabel}</p>
      ) : null}
    </div>
  )
}
