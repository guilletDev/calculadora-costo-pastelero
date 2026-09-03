export const FREE_TIER_RECIPES_LIMIT = 2;
export const FREE_TIER_INGREDIENTS_LIMIT = 10;
export const FREE_TIER_PRODUCTS_LIMIT = 1;

export type UpgradeResourceType = 'recipes' | 'ingredients' | 'products';

export const FREE_TIER_LIMITS: Record<UpgradeResourceType, number> = {
  recipes: FREE_TIER_RECIPES_LIMIT,
  ingredients: FREE_TIER_INGREDIENTS_LIMIT,
  products: FREE_TIER_PRODUCTS_LIMIT,
};

export const PRO_EMAILS = [
  'guilletdev@gmail.com',
  'guilletrobiani30@gmail.com',
  'maryalamasa@gmail.com',
];

export function isProEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = email.toLowerCase().trim();
  return PRO_EMAILS.includes(normalized);
}

export function isProUser(
  email: string | null | undefined,
  planType: string | null | undefined,
  proValidUntil: string | null | undefined
): boolean {
  if (isProEmail(email)) return true;
  if (planType !== 'pro') return false;
  if (!proValidUntil) return false;
  return new Date(proValidUntil).getTime() > Date.now();
}