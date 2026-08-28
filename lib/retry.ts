export function isClockSkewError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.toLowerCase().includes('jwt issued at future');
}

export async function withClockSkewRetry<T>(
  fn: () => Promise<T>,
  options?: { delayMs?: number; retries?: number }
): Promise<T> {
  const { delayMs = 1200, retries = 1 } = options ?? {};
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (!isClockSkewError(err) || attempt >= retries) throw err;
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
}