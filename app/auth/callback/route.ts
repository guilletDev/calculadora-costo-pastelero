import { NextResponse } from 'next/server'
import type { User } from '@supabase/supabase-js'
// The client you created from the Server-Side Auth instructions
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { isEmailConfigured, sendWelcomeEmail } from '@/lib/email'

// Envía el email de bienvenida una sola vez por usuario (idempotente via
// profiles.welcome_email_sent). Nunca rompe el login: cualquier fallo se
// loguea y el flujo continúa.
async function maybeSendWelcomeEmail(user: User) {
  try {
    if (!isEmailConfigured() || !user.email) return

    const admin = createAdminClient()
    const { data: profile } = await admin
      .from('profiles')
      .select('welcome_email_sent')
      .eq('id', user.id)
      .maybeSingle()

    if (!profile || profile.welcome_email_sent) return

    const meta = user.user_metadata ?? {}
    const name = (meta.full_name || meta.name || user.email.split('@')[0] || 'pastelero') as string

    await sendWelcomeEmail({ to: user.email, name })
    console.log('[auth/callback] Email de bienvenida enviado a', user.email)

    await admin
      .from('profiles')
      .update({ welcome_email_sent: true })
      .eq('id', user.id)
  } catch (error) {
    console.error('[auth/callback] Error enviando email de bienvenida:', error)
  }
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      if (data.user) {
        await maybeSendWelcomeEmail(data.user)
      }

      const forwardedHost = request.headers.get('x-forwarded-host') // original origin before load balancer
      const isLocalEnv = process.env.NODE_ENV === 'development'
      if (isLocalEnv) {
        // we can be sure that there is no load balancer in between, so no need to watch for X-Forwarded-Host
        return NextResponse.redirect(`${origin}${next}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      } else {
        return NextResponse.redirect(`${origin}${next}`)
      }
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}