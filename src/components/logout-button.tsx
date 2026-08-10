import { signOut } from '@/app/actions/auth'
import { Button } from './ui'

export function LogoutButton() {
  return (
    <form action={signOut}>
      <Button type="submit" variant="ghost" size="sm" title="Se déconnecter">
        Déconnexion
      </Button>
    </form>
  )
}
