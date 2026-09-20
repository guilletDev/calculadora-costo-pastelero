// Cliente de Supabase con service_role (solo server-side).
// Bypasea RLS: úsalo únicamente en endpoints de confianza (webhook).

import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    console.error('[supabase-admin] Faltan variables de entorno de Supabase (service_role). ' +
      'Verificá que NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY estén configuradas en Vercel.');
    throw new Error('Faltan variables de entorno de Supabase (service_role)');
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}