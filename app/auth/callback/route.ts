import { NextResponse } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'
// The client you created from the Server-Side Auth instructions
import { createClient } from '@/utils/supabase/server'
import { maybeSendWelcomeEmail } from '@/lib/welcome-email'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const errorParam = searchParams.get('error') ?? searchParams.get('error_code')
  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get('next') ?? '/dashboard'

  // Redirect absoluto respetando el proxy/host (misma lógica del flujo OAuth)
  const redirectToPath = (path: string) => {
    const forwardedHost = request.headers.get('x-forwarded-host') // original origin before load balancer
    const isLocalEnv = process.env.NODE_ENV === 'development'
    if (isLocalEnv) {
      // we can be sure that there is no load balancer in between, so no need to watch for X-Forwarded-Host
      return NextResponse.redirect(`${origin}${path}`)
    } else if (forwardedHost) {
      return NextResponse.redirect(`https://${forwardedHost}${path}`)
    } else {
      return NextResponse.redirect(`${origin}${path}`)
    }
  }

  // Link vencido/inválido notificado por Supabase: mensaje claro en /login
  if (errorParam) {
    console.warn(
      '[auth/callback] Error en link de autenticación:',
      errorParam,
      searchParams.get('error_description') ?? ''
    )
    return redirectToPath('/login?error=link_expired')
  }

  const supabase = await createClient()

  // 1) Verificación de email con token_hash (patrón SSR de Supabase: signup,
  //    recovery, email_change, magiclink, etc.)
  if (tokenHash && type) {
    const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })

    if (error || !data.user) {
      console.error('[auth/callback] verifyOtp falló:', error?.message ?? 'sin usuario')
      return redirectToPath('/login?error=link_expired')
    }

    await maybeSendWelcomeEmail(data.user)

    // recovery → el usuario debe definir su nueva contraseña; el resto → onboarding
    return redirectToPath(type === 'recovery' ? '/auth/update-password' : '/inventario')
  }

  // 2) Flujo OAuth / PKCE con code
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      if (data.user) {
        await maybeSendWelcomeEmail(data.user)
      }
      return redirectToPath(next)
    }
  }

  // Sin parámetros válidos o verificación fallida
  return redirectToPath('/login?error=link_expired')
}