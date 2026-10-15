'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ReactNode, MouseEvent } from 'react';

interface TransitionLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
  prefetch?: boolean;
  onClick?: (e: MouseEvent<HTMLAnchorElement>) => void;
  ref?: React.Ref<HTMLAnchorElement>;
}

export function TransitionLink({
  href,
  children,
  className,
  prefetch = true,
  onClick,
  ref,
  ...rest
}: TransitionLinkProps) {
  const router = useRouter();

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    // Si el consumidor bloqueó el clic (ej: límite FREE alcanzado o guard
    // cargando), respetamos el preventDefault y no navegamos.
    if (e.defaultPrevented) return;
    e.preventDefault();
    if (document.startViewTransition) {
      document.startViewTransition(() => router.push(href));
    } else {
      router.push(href);
    }
  };

  return (
    <Link href={href} prefetch={prefetch} onClick={handleClick} className={className} ref={ref} {...rest}>
      {children}
    </Link>
  );
}
