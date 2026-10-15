import type { User } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase/client';

export interface UserProfileData {
  user: User | null;
  planType: string | null;
  proValidUntil: string | null;
  hourlyRate: number | null;
}

export const EMPTY_USER_PROFILE: UserProfileData = {
  user: null,
  planType: null,
  proValidUntil: null,
  hourlyRate: null,
};

export async function fetchCurrentUserProfile(): Promise<UserProfileData> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return EMPTY_USER_PROFILE;

  const { data: profile } = await supabase
    .from('profiles')
    .select('plan_type, pro_valid_until, hourly_rate')
    .eq('id', user.id)
    .maybeSingle();

  return {
    user,
    planType: profile?.plan_type ?? null,
    proValidUntil: profile?.pro_valid_until ?? null,
    hourlyRate: profile?.hourly_rate ?? null,
  };
}
