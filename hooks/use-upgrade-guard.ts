'use client';

import { useState, useCallback, useEffect } from 'react';
import { UpgradeResourceType, FREE_TIER_LIMITS, isProEmail } from '@/lib/limits';
import { createClient } from '@/utils/supabase/client';

export function useUpgradeGuard() {
  const [resourceType, setResourceType] = useState<UpgradeResourceType | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUserEmail(data.user?.email ?? null));
  }, []);

  const closeUpgrade = useCallback(() => setResourceType(null), []);

  const guardUpgrade = useCallback((type: UpgradeResourceType, current: number): boolean => {
    if (isProEmail(userEmail)) return true;
    if (current >= FREE_TIER_LIMITS[type]) {
      setResourceType(type);
      return false;
    }
    return true;
  }, [userEmail]);

  return { upgradeType: resourceType, closeUpgrade, guardUpgrade };
}