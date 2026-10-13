'use client';

import { Children, type ReactNode } from 'react';
import { motion, MotionConfig } from 'framer-motion';

const REVEAL_EASE = [0.21, 0.47, 0.32, 0.98] as const;

interface RevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

// Fade-up elegante al entrar en pantalla (se ejecuta una sola vez).
export function Reveal({ children, className, delay = 0 }: RevealProps) {
  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        className={className}
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.7, ease: REVEAL_EASE, delay }}
      >
        {children}
      </motion.div>
    </MotionConfig>
  );
}

interface StaggerProps {
  children: ReactNode;
  className?: string;
  itemClassName?: string;
  step?: number;
}

// Envuelve cada hijo en un fade-up con delay escalonado (card 1 -> 2 -> 3 -> ...).
export function Stagger({ children, className, itemClassName, step = 0.1 }: StaggerProps) {
  const items = Children.toArray(children);
  return (
    <MotionConfig reducedMotion="user">
      <div className={className}>
        {items.map((child, i) => (
          <motion.div
            key={i}
            className={'h-full flex flex-col min-w-0' + (itemClassName ? ` ${itemClassName}` : '')}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6, ease: REVEAL_EASE, delay: i * step }}
          >
            {child}
          </motion.div>
        ))}
      </div>
    </MotionConfig>
  );
}