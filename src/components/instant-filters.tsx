'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useTransition } from 'react'

/**
 * Applique un formulaire de filtres a l'URL des que l'utilisateur agit, sans
 * bouton « Filtrer ».
 *
 * Le formulaire reste un vrai `<form method="get">` : sans JavaScript, la
 * soumission classique continue de fonctionner. Ce composant se contente
 * d'ecouter les changements et de reecrire l'URL.
 *
 * Deux rythmes, parce qu'ils ne se valent pas :
 *   - liste deroulante ou case a cocher : un clic = une intention, on applique
 *     immediatement ;
 *   - champ texte ou nombre : on attend une pause de frappe, sinon chaque
 *     caractere declencherait un aller-retour serveur.
 */
export function useInstantFilters({ delay = 350 }: { delay?: number } = {}) {
  const router = useRouter()
  const pathname = usePathname()
  const [pending, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current)
  }, [])

  const apply = useCallback(() => {
    const form = formRef.current
    if (!form) return

    const params = new URLSearchParams()
    for (const [key, value] of new FormData(form).entries()) {
      // Les champs vides ne doivent pas encombrer l'URL partagee.
      if (typeof value === 'string' && value.trim() !== '') params.append(key, value)
    }

    const query = params.toString()
    startTransition(() => {
      // `replace` plutot que `push` : filtrer ne doit pas empiler une entree
      // d'historique par frappe — le bouton « retour » resterait inutilisable.
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
    })
  }, [pathname, router])

  const onChange = useCallback(
    (event: React.ChangeEvent<HTMLFormElement>) => {
      // L'evenement `change` remonte depuis le champ modifie : c'est lui qui
      // determine le rythme, pas le formulaire.
      const target = event.target as unknown as HTMLInputElement | HTMLSelectElement
      const isTyped =
        target.tagName === 'INPUT' &&
        ['text', 'search', 'number', 'date'].includes((target as HTMLInputElement).type)

      if (timer.current) clearTimeout(timer.current)
      if (isTyped) {
        timer.current = setTimeout(apply, delay)
      } else {
        apply()
      }
    },
    [apply, delay],
  )

  const onSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      // Entree dans un champ : on applique sans recharger la page.
      event.preventDefault()
      if (timer.current) clearTimeout(timer.current)
      apply()
    },
    [apply],
  )

  return { formRef, onChange, onSubmit, pending }
}

/** Bandeau discret indiquant que les resultats se rafraichissent. */
export function FilterPending({ pending, label }: { pending: boolean; label: string }) {
  return (
    <p
      aria-live="polite"
      className={`text-xs text-encre-400 transition-opacity ${pending ? 'opacity-100' : 'opacity-0'}`}
    >
      {label}
    </p>
  )
}
