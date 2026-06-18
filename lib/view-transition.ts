import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

export function navigateWithTransition(router: AppRouterInstance, href: string) {
  if (document.startViewTransition) {
    document.startViewTransition(() => router.push(href));
  } else {
    router.push(href);
  }
}
