'use client'

import { useState } from 'react'
import { cx } from './ui'

/**
 * Visuel d'un terrain ou d'un projet.
 *
 * Trois cas, dans cet ordre :
 *   1. une photo a ete deposee -> on l'affiche ;
 *   2. la photo est introuvable (fichier supprime, chemin obsolete) -> on
 *      bascule sur la couverture generee plutot que de laisser le navigateur
 *      afficher une icone cassee ;
 *   3. aucune photo -> couverture generee.
 *
 * La couverture est un motif zellige dessine en SVG, derive de l'identifiant :
 * deux annonces differentes n'ont jamais la meme, et la meme annonce garde la
 * sienne d'une page a l'autre. Aucune dependance externe, donc rien qui puisse
 * ne pas se charger.
 */
export function Cover({
  src,
  alt,
  seed,
  icon = '🏞️',
  className,
  eager = false,
}: {
  src?: string | null
  alt: string
  seed: string
  icon?: string
  className?: string
  eager?: boolean
}) {
  const [broken, setBroken] = useState(false)

  if (src && !broken) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        className={cx('size-full object-cover', className)}
        loading={eager ? 'eager' : 'lazy'}
        onError={() => setBroken(true)}
      />
    )
  }

  return <GeneratedCover seed={seed} icon={icon} label={alt} className={className} />
}

/** Palettes inspirees des zelliges : argile, zellige (vert), safran, encre. */
const PALETTES = [
  ['#f9e7dd', '#e7ab8e', '#c2603b'],
  ['#d3ece4', '#74bda9', '#1f6b5a'],
  ['#fdf1d8', '#e0ae4e', '#c9902b'],
  ['#f2ece1', '#d3c4ab', '#883c24'],
  ['#eff8f5', '#a8d8ca', '#185849'],
] as const

function hash(seed: string) {
  let value = 0
  for (let index = 0; index < seed.length; index += 1) {
    value = (value * 31 + seed.charCodeAt(index)) >>> 0
  }
  return value
}

export function GeneratedCover({
  seed,
  icon,
  label,
  className,
}: {
  seed: string
  icon: string
  label?: string
  className?: string
}) {
  const h = hash(seed)
  const [light, mid, dark] = PALETTES[h % PALETTES.length]
  const rotation = h % 45
  const density = 3 + (h % 3)

  return (
    <div
      className={cx('relative size-full overflow-hidden', className)}
      role="img"
      aria-label={label}
    >
      <svg
        viewBox="0 0 160 100"
        preserveAspectRatio="xMidYMid slice"
        className="size-full"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={`g-${h}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={light} />
            <stop offset="100%" stopColor={mid} />
          </linearGradient>
          <pattern
            id={`p-${h}`}
            width={20 / density}
            height={20 / density}
            patternUnits="userSpaceOnUse"
            patternTransform={`rotate(${rotation})`}
          >
            {/* Etoile a huit branches : deux carres superposes, motif zellige. */}
            <rect
              x={4 / density}
              y={4 / density}
              width={12 / density}
              height={12 / density}
              fill="none"
              stroke={dark}
              strokeWidth="0.6"
              opacity="0.35"
            />
            <rect
              x={4 / density}
              y={4 / density}
              width={12 / density}
              height={12 / density}
              fill="none"
              stroke={dark}
              strokeWidth="0.6"
              opacity="0.35"
              transform={`rotate(45 ${10 / density} ${10 / density})`}
            />
          </pattern>
        </defs>
        <rect width="160" height="100" fill={`url(#g-${h})`} />
        <rect width="160" height="100" fill={`url(#p-${h})`} />
      </svg>
      <span
        className="absolute inset-0 grid place-items-center text-4xl drop-shadow-sm"
        aria-hidden="true"
      >
        {icon}
      </span>
    </div>
  )
}
