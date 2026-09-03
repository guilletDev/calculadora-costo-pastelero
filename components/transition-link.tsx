'use client';

import { useRouter } from 'next/navigation';
import type { ReactNode, MouseEvent } from 'react';

interface TransitionLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
  onClick?: (e: MouseEvent) => void;
  ref?: React.Ref<HTMLAnchorElement>;
}

export function TransitionLink({ href, children, className, onClick, ref, ...rest }: TransitionLinkProps) {
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

  return (
    <a href={href} onClick={handleClick} className={className} ref={ref} {...rest}>
      {children}
    </a>
  );
}