import { signOut } from '@/app/actions/auth'
import { Button } from './ui'

export function LogoutButton({ label }: { label: string }) {
  return (
    <form action={signOut}>
      <Button type="submit" variant="ghost" size="sm" title={label}>
        {label}
      </Button>
    </form>
  )
}
