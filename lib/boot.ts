export const MIN_BOOT_MS = 700;
export const SPLASH_FADE_MS = 500;

export function minDelay<T>(promise: Promise<T>, ms: number): Promise<T> {
  const startedAt = Date.now();
  return promise.then(async (value) => {
    const elapsed = Date.now() - startedAt;
    if (elapsed < ms) await new Promise(r => setTimeout(r, ms - elapsed));
    return value;
  });
}