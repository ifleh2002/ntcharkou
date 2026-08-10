'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { signIn, signUp, type ActionState } from '@/app/actions/auth'
import { Alert, Button, Checkbox, Field } from './ui'

function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? 'Veuillez patienter…' : children}
    </Button>
  )
}

export function LoginForm({ next }: { next: string }) {
  const [state, formAction] = useActionState<ActionState, FormData>(signIn, {})

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="suivant" value={next} />

      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}

      <Field label="Adresse email" htmlFor="email" required>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="champ"
          placeholder="vous@exemple.ma"
        />
      </Field>

      <Field label="Mot de passe" htmlFor="password" required>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="champ"
        />
      </Field>

      <SubmitButton>Se connecter</SubmitButton>
    </form>
  )
}

export function SignupForm({ defaultRole }: { defaultRole: 'participant' | 'owner' }) {
  const [state, formAction] = useActionState<ActionState, FormData>(signUp, {})

  return (
    <form action={formAction} className="space-y-4">
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
      {state.success ? <Alert tone="succes">{state.success}</Alert> : null}

      <fieldset>
        <legend className="etiquette">Je m’inscris en tant que</legend>
        <div className="grid grid-cols-2 gap-2">
          {[
            { value: 'participant', label: '👥 Participant', hint: 'Je cherche un logement' },
            { value: 'owner', label: '🏞️ Propriétaire', hint: 'Je propose un terrain' },
          ].map((option) => (
            <label
              key={option.value}
              className="cursor-pointer rounded-lg border border-sable-300 bg-white p-3 text-sm transition-colors has-checked:border-argile-400 has-checked:bg-argile-50"
            >
              <input
                type="radio"
                name="role"
                value={option.value}
                defaultChecked={defaultRole === option.value}
                className="sr-only"
              />
              <span className="block font-semibold text-encre-900">{option.label}</span>
              <span className="mt-0.5 block text-xs text-encre-500">{option.hint}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Prénom" htmlFor="first_name" required>
          <input id="first_name" name="first_name" required className="champ" />
        </Field>
        <Field label="Nom" htmlFor="last_name" required>
          <input id="last_name" name="last_name" required className="champ" />
        </Field>
      </div>

      <Field label="Adresse email" htmlFor="signup-email" required>
        <input
          id="signup-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="champ"
        />
      </Field>

      <Field label="Téléphone" htmlFor="phone" hint="Utilisé uniquement par l’administration, jamais publié.">
        <input id="phone" name="phone" type="tel" className="champ" placeholder="06 00 00 00 00" />
      </Field>

      <Field label="Mot de passe" htmlFor="signup-password" hint="8 caractères minimum." required>
        <input
          id="signup-password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          className="champ"
        />
      </Field>

      <Checkbox
        name="terms"
        value="1"
        label={
          <>
            J’accepte les conditions d’utilisation et la politique de confidentialité de la
            plateforme.
          </>
        }
      />

      <SubmitButton>Créer mon compte</SubmitButton>
    </form>
  )
}
