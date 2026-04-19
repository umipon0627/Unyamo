import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import SessionProviderWrapper from '@/components/providers/SessionProviderWrapper'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Unyamo',
  description: 'オリジナルトランプゲーム Unyamo のオンライン対戦',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja" className="dark">
      <body className={`${inter.className} bg-slate-900 text-slate-100 min-h-screen`}>
        <SessionProviderWrapper>
          {children}
        </SessionProviderWrapper>
      </body>
    </html>
  )
}
