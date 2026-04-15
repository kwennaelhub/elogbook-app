import type { Metadata, Viewport } from 'next'
import { Figtree, Noto_Sans } from 'next/font/google'
import './globals.css'
import { cn } from "@/lib/utils"

const figtree = Figtree({
  subsets: ['latin'],
  variable: '--font-figtree',
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
})

const notoSans = Noto_Sans({
  subsets: ['latin'],
  variable: '--font-noto-sans',
  weight: ['300', '400', '500', '700'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'InternLog — Logbook Médical DES',
  description: 'Logbook électronique pour le suivi des compétences médicales des étudiants DES',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '48x48' },
      { url: '/icons/icon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    title: 'InternLog — Logbook Médical DES',
    description: 'Logbook électronique pour le suivi des compétences médicales des étudiants DES',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'InternLog',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0f1535',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" className={cn("h-full dark", figtree.variable, notoSans.variable)}>
      <body className="min-h-full bg-background font-sans text-foreground antialiased">
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js').catch(() => {});
                });
              }
            `,
          }}
        />
      </body>
    </html>
  )
}
