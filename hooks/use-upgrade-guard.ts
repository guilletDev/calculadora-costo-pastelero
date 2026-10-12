'use client';

import { useState, useCallback, useEffect } from 'react';
import { UpgradeResourceType, FREE_TIER_LIMITS, isProUser } from '@/lib/limits';
import { createClient } from '@/utils/supabase/client';

export function useUpgradeGuard() {
  const [resourceType, setResourceType] = useState<UpgradeResourceType | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [proStatus, setProStatus] = useState<{ planType: string | null; proValidUntil: string | null }>({
    planType: null,
    proValidUntil: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (cancelled) return;
      setUserEmail(data.user?.email ?? null);
      if (!data.user) {
        setLoading(false);
        return;
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('plan_type, pro_valid_until')
        .eq('id', data.user.id)
        .maybeSingle();
      if (cancelled) return;
      setProStatus({
        planType: profile?.plan_type ?? null,
        proValidUntil: profile?.pro_valid_until ?? null,
      });
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const closeUpgrade = useCallback(() => setResourceType(null), []);

  const guardUpgrade = useCallback((type: UpgradeResourceType, current: number): boolean => {
    // Mientras la sesión/perfil no terminó de cargar, no evaluamos límites:
    // devolvemos true (pasamos el clic) para que el guard al guardar haga la
    // validación real. Evita abrir el modal de Upgrade de forma prematura.
    if (loading) return true;
    if (isProUser(userEmail, proStatus.planType, proStatus.proValidUntil)) return true;
    if (current >= FREE_TIER_LIMITS[type]) {
      setResourceType(type);
      return false;
    }
    return true;
  }, [userEmail, proStatus, loading]);

  return { upgradeType: resourceType, closeUpgrade, guardUpgrade, loading };
}