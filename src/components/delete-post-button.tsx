'use client'

import { Button } from './ui'

/**
 * Suppression d'un article, avec confirmation.
 *
 * La suppression est définitive et l'article n'a pas de corbeille : un clic mal
 * placé dans une liste effacerait un texte long sans retour possible. La
 * confirmation est donc obligatoire, et le bouton reste isolé du reste des
 * actions par sa couleur.
 */
export function DeletePostButton({ label, confirm }: { label: string; confirm: string }) {
  return (
    <Button
      type="submit"
      variant="ghost"
      size="sm"
      className="text-red-700 hover:bg-red-50"
      onClick={(event) => {
        if (!window.confirm(confirm)) event.preventDefault()
      }}
    >
      {label}
    </Button>
  )
}
