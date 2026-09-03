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

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      setUserEmail(data.user?.email ?? null);
      if (!data.user) return;
      const { data: profile } = await supabase
        .from('profiles')
        .select('plan_type, pro_valid_until')
        .eq('id', data.user.id)
        .maybeSingle();
      setProStatus({
        planType: profile?.plan_type ?? null,
        proValidUntil: profile?.pro_valid_until ?? null,
      });
    });
  }, []);

  const closeUpgrade = useCallback(() => setResourceType(null), []);

  const guardUpgrade = useCallback((type: UpgradeResourceType, current: number): boolean => {
    if (isProUser(userEmail, proStatus.planType, proStatus.proValidUntil)) return true;
    if (current >= FREE_TIER_LIMITS[type]) {
      setResourceType(type);
      return false;
    }
    return true;
  }, [userEmail, proStatus]);

  return { upgradeType: resourceType, closeUpgrade, guardUpgrade };
}