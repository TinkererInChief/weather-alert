import React from 'react'
import './globals.css'
import type { Metadata } from 'next'
import { SessionWrapper } from '@/components/providers/SessionWrapper'

export const metadata: Metadata = {
  title: 'Emergency Alert Command Center',
  description: 'Real-time earthquake and tsunami monitoring with multi-channel emergency notifications',
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
