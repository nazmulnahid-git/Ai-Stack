import '@__NAME__/ui/globals.css'

import { cn } from '@__NAME__/ui/lib/utils'
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'

import { Providers } from '@/components/providers'

const fontSans = Geist({
  subsets: ['latin'],
  variable: '--font-sans',
})

const fontMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
})

export const metadata: Metadata = {
  title: '__TITLE__',
  description:
    '__DESCRIPTION__',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn('font-sans antialiased', fontSans.variable, fontMono.variable)}
    >
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
