'use client';

import { useRouter } from 'next/navigation';
import type { ReactNode, MouseEvent } from 'react';

interface TransitionLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
  onClick?: (e: MouseEvent) => void;
}

export function TransitionLink({ href, children, className, onClick }: TransitionLinkProps) {
  const router = useRouter();

  const handleClick = (e: MouseEvent) => {
    e.preventDefault();
    onClick?.(e);
    if (document.startViewTransition) {
      document.startViewTransition(() => router.push(href));
    } else {
      router.push(href);
    }
  };

  return <a href={href} onClick={handleClick} className={className}>{children}</a>;
}
