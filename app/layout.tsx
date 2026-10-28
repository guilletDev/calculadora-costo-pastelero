import type { Metadata } from 'next'
import { Manrope, Inter } from 'next/font/google'
import './globals.css'
import { LayoutShell } from '@/components/layout-shell'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/sonner'

const manrope = Manrope({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-manrope',
});

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Costo Repostero',
  description: 'Calculadora de costos para emprendedores gastronómicos',
  generator: 'Costo Repostero',
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
  openGraph: {
    title: 'Costo Repostero',
    description: 'Calculadora de costos para emprendedores gastronómicos',
    url: 'https://costorepostero.app',
    siteName: 'Costo Repostero',
    images: [
      {
        url: '/icon.svg',
        width: 800,
        height: 800,
        alt: 'Logo de Costo Repostero',
      },
    ],
    locale: 'es_AR',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link rel="preload" as="image" href="/logo-120.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block"
          rel="stylesheet"
        />
      </head>
      <body
        className={`${manrope.variable} ${inter.variable} antialiased min-h-screen flex flex-col bg-[#f8f6f6] dark:bg-[#221016] text-slate-900 dark:text-slate-100`}
        style={{ fontFamily: 'var(--font-manrope), sans-serif' }}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <LayoutShell>
            {children}
          </LayoutShell>
          <Toaster
            position="top-center"
            richColors
            toastOptions={{
              style: { fontFamily: 'var(--font-manrope), sans-serif' },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  )
}
