import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { Providers } from './providers'
import './globals.css'

export const metadata: Metadata = {
  title: 'TermSync',
  description: 'Stay in sync with what matters',
}

export default function RootLayout({ children }: { children: ReactNode }): React.JSX.Element {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
