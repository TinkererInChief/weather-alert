import React from 'react'
import './globals.css'
import type { Metadata } from 'next'
import { SessionWrapper } from '@/components/providers/SessionWrapper'

export const metadata: Metadata = {
  title: 'Emergency Alert System',
  description: 'Earthquake and tsunami alert system with SMS notifications',
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
