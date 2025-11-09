import React from 'react'
import './globals.css'
import type { Metadata } from 'next'
import { SessionWrapper } from '@/components/providers/SessionWrapper'
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

export const metadata: Metadata = {
  title: 'Emergency Alert Command Center',
  description: 'Real-time earthquake and tsunami monitoring with multi-channel emergency notifications',
  metadataBase: new URL(siteUrl),
  openGraph: {
    title: 'Emergency Alert Command Center',
    description: 'Real-time earthquake and tsunami monitoring with multi-channel emergency notifications',
    url: '/',
    siteName: 'Emergency Alert Command Center',
    images: [
      { url: '/og-image.jpg', width: 1200, height: 630, alt: 'Emergency Alert Command Center' },
    ],
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Emergency Alert Command Center',
    description: 'Real-time earthquake and tsunami monitoring with multi-channel emergency notifications',
    images: ['/og-image.jpg'],
  },
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <SessionWrapper>
          {children}
        </SessionWrapper>
      </body>
    </html>
  )
}
