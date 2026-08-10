// =============================================================================
// Edge Function « notify » — envoi par email des notifications en attente.
//
// Le matching et les notifications applicatives vivent dans la base (voir
// supabase/migrations/*_matching.sql) : elles sont écrites dans la même
// transaction que la donnée qui les déclenche, donc jamais perdues. Cette
// fonction ne fait qu'une chose : dépiler `notifications` et envoyer les
// emails correspondants.
//
// Déploiement :
//   supabase functions deploy notify --no-verify-jwt
//   supabase secrets set RESEND_API_KEY=... NOTIFICATIONS_FROM_EMAIL=...
//
// Déclenchement recommandé : une planification (pg_cron / Scheduled Function)
// toutes les 5 minutes.
// =============================================================================

import { createClient } from 'jsr:@supabase/supabase-js@2'

interface PendingNotification {
  id: string
  profile_id: string
  kind: string
  title: string
  body: string | null
  url: string | null
  profiles: { email: string | null; first_name: string } | null
}

const BATCH_SIZE = 50

Deno.serve(async (request: Request) => {
  if (request.method !== 'POST' && request.method !== 'GET') {
    return json({ error: 'Méthode non autorisée' }, 405)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceKey) {
    return json({ error: 'Configuration Supabase incomplète' }, 500)
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  })

  const { data, error } = await supabase
    .from('notifications')
    .select('id, profile_id, kind, title, body, url, profiles(email, first_name)')
    .is('email_sent_at', null)
    .order('created_at', { ascending: true })
    .limit(BATCH_SIZE)

  if (error) {
    return json({ error: error.message }, 500)
  }

  const pending = (data ?? []) as unknown as PendingNotification[]
  if (pending.length === 0) {
    return json({ sent: 0, skipped: 0 })
  }

  const apiKey = Deno.env.get('RESEND_API_KEY')
  const from = Deno.env.get('NOTIFICATIONS_FROM_EMAIL') ?? 'notifications@ntcharkou.ma'
  const siteUrl = Deno.env.get('SITE_URL') ?? 'https://ntcharkou.ma'

  let sent = 0
  let skipped = 0
  const delivered: string[] = []

  for (const notification of pending) {
    const email = notification.profiles?.email
    if (!email) {
      // Pas d'adresse : on marque quand même pour ne pas repasser dessus.
      skipped += 1
      delivered.push(notification.id)
      continue
    }

    if (!apiKey) {
      // Sans clé d'envoi, la fonction reste inoffensive : on n'écrit rien.
      skipped += 1
      continue
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: email,
        subject: notification.title,
        html: renderEmail({
          firstName: notification.profiles?.first_name ?? '',
          title: notification.title,
          body: notification.body ?? '',
          url: notification.url ? `${siteUrl}${notification.url}` : siteUrl,
        }),
      }),
    })

    if (response.ok) {
      sent += 1
      delivered.push(notification.id)
    } else {
      console.error('Envoi impossible', notification.id, await response.text())
    }
  }

  if (delivered.length > 0) {
    await supabase
      .from('notifications')
      .update({ email_sent_at: new Date().toISOString() })
      .in('id', delivered)
  }

  return json({ sent, skipped, processed: pending.length })
})

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function renderEmail({
  firstName,
  title,
  body,
  url,
}: {
  firstName: string
  title: string
  body: string
  url: string
}) {
  return `<!doctype html>
<html lang="fr">
  <body style="margin:0;padding:24px;background:#faf6f0;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#23201d">
    <table role="presentation" style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e6dccb;border-radius:14px">
      <tr>
        <td style="padding:24px 28px">
          <p style="margin:0 0 20px;font-size:18px;font-weight:700;color:#c2603b">Ntcharkou</p>
          <p style="margin:0 0 12px;font-size:15px">Bonjour ${escapeHtml(firstName)},</p>
          <h1 style="margin:0 0 10px;font-size:20px;line-height:1.3">${escapeHtml(title)}</h1>
          <p style="margin:0 0 22px;font-size:15px;line-height:1.6;color:#5a534b">${escapeHtml(body)}</p>
          <a href="${escapeHtml(url)}"
             style="display:inline-block;padding:11px 20px;background:#c2603b;color:#ffffff;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">
            Consulter
          </a>
          <p style="margin:26px 0 0;font-size:12px;line-height:1.6;color:#7a736b">
            Vous recevez cet email parce que vous avez un compte sur Ntcharkou.
            Les coordonnées des propriétaires et des participants ne sont jamais publiées.
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
