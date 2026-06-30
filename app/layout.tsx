import type { Metadata } from 'next'
import './globals.css'
import { LayoutShell } from '@/components/layout-shell'
import { Toaster } from 'sonner'

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
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@200;300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block"
          rel="stylesheet"
        />
      </head>
      <body
        className="antialiased min-h-screen flex flex-col bg-[#f8f6f6] dark:bg-[#221016] text-slate-900 dark:text-slate-100"
        style={{ fontFamily: "'Manrope', sans-serif" }}
      >
        <LayoutShell>
          {children}
        </LayoutShell>
        <Toaster
          position="top-center"
          richColors
          toastOptions={{
            style: { fontFamily: "'Manrope', sans-serif" },
          }}
        />
      </body>
    </html>
  )
}
