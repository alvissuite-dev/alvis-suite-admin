import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title:       'Alvis Suite — Luxury Serviced Apartments',
  description: 'Handpicked luxury serviced apartments across Dubai, Lahore, and Karachi. Direct booking. No fees.',
  keywords:    'luxury apartments, serviced apartments, Dubai, Lahore, Karachi, short term rental',
  icons: {
    icon: '/images/Logo Transparent.png',
    shortcut: '/images/Logo Transparent.png',
    apple: '/images/Logo Transparent.png',
  },
  openGraph: {
    title:       'Alvis Suite',
    description: 'Luxury serviced apartments — direct booking',
    type:        'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-charcoal-900 text-charcoal-50 antialiased">
        {children}
      </body>
    </html>
  )
}