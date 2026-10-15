'use client';

import { useState, useCallback } from 'react';
import { UpgradeResourceType, FREE_TIER_LIMITS } from '@/lib/limits';
import { useAppBoot } from '@/components/boot/app-boot-context';

export function useUpgradeGuard() {
  const [resourceType, setResourceType] = useState<UpgradeResourceType | null>(null);
  const { ready, isPro } = useAppBoot();

  // Mientras el boot no terminó de cargar sesión + perfil, no evaluamos
  // límites (loading = true hace que guardUpgrade devuelva true).
  const loading = !ready;

  const closeUpgrade = useCallback(() => setResourceType(null), []);

  const guardUpgrade = useCallback((type: UpgradeResourceType, current: number): boolean => {
    if (loading) return true;
    if (isPro) return true;
    if (current >= FREE_TIER_LIMITS[type]) {
      setResourceType(type);
      return false;
    }
    return true;
  }, [loading, isPro]);

  return { upgradeType: resourceType, closeUpgrade, guardUpgrade, loading };
}
