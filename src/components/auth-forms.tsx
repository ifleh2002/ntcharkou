'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { signIn, signUp, type ActionState } from '@/app/actions/auth'
import type { Dictionary } from '@/lib/i18n'
import { Alert, Button, Checkbox, Field } from './ui'

function SubmitButton({ children, pendingLabel }: { children: React.ReactNode; pendingLabel: string }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? pendingLabel : children}
    </Button>
  )
}

export function LoginForm({ next, t }: { next: string; t: Dictionary }) {
  const [state, formAction] = useActionState<ActionState, FormData>(signIn, {})

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="suivant" value={next} />

      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}

      <Field label={t.auth.email} htmlFor="email" required>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="champ"
          placeholder="nom@example.ma"
        />
      </Field>

      <Field label={t.auth.password} htmlFor="password" required>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="champ"
        />
      </Field>

      <SubmitButton pendingLabel={t.common.loading}>{t.auth.loginSubmit}</SubmitButton>
    </form>
  )
}

export function SignupForm({
  defaultRole,
  t,
}: {
  defaultRole: 'participant' | 'owner'
  t: Dictionary
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(signUp, {})

  return (
    <form action={formAction} className="space-y-4">
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
      {state.success ? <Alert tone="succes">{state.success}</Alert> : null}

      <fieldset>
        <legend className="etiquette">{t.auth.roleLegend}</legend>
        <div className="grid grid-cols-2 gap-2">
          {[
            {
              value: 'participant',
              label: `👥 ${t.auth.roleParticipant}`,
              hint: t.auth.roleParticipantHint,
            },
            { value: 'owner', label: `🏞️ ${t.auth.roleOwner}`, hint: t.auth.roleOwnerHint },
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
        <Field label={t.auth.firstName} htmlFor="first_name" required>
          <input id="first_name" name="first_name" required className="champ" />
        </Field>
        <Field label={t.auth.lastName} htmlFor="last_name" required>
          <input id="last_name" name="last_name" required className="champ" />
        </Field>
      </div>

      <Field label={t.auth.email} htmlFor="signup-email" required>
        <input
          id="signup-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="champ"
        />
      </Field>

      <Field label={t.auth.phone} htmlFor="phone" hint={t.auth.phoneHint}>
        <input id="phone" name="phone" type="tel" className="champ" placeholder="06 00 00 00 00" />
      </Field>

      <Field label={t.auth.password} htmlFor="signup-password" hint={t.auth.passwordHint} required>
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
        label={t.auth.terms}
      />

      <SubmitButton pendingLabel={t.common.loading}>{t.auth.signupSubmit}</SubmitButton>
    </form>
  )
}
