'use client'

import { useTheme } from 'next-themes'
import { Toaster as Sonner, ToasterProps } from 'sonner'

const Toaster = ({ ...props }: ToasterProps) => {
  const { resolvedTheme } = useTheme()

  return (
    <Sonner
      theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
      className="toaster group"
      style={
        {
          '--normal-bg': 'var(--color-stitch-surface-container-lowest)',
          '--normal-bg-hover': 'var(--color-stitch-surface-container-low)',
          '--normal-text': 'var(--color-stitch-on-surface)',
          '--normal-border': 'var(--color-stitch-outline-variant)',
          '--normal-border-hover': 'var(--color-stitch-outline-variant)',
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
