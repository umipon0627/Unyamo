import type { Metadata, Viewport } from 'next'
import Script from 'next/script'
import { Inter, M_PLUS_Rounded_1c, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import SessionProviderWrapper from '@/components/providers/SessionProviderWrapper'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })
const mPlusRounded = M_PLUS_Rounded_1c({
  weight: ['500', '700', '800'],
  subsets: ['latin'],
  variable: '--font-heading',
})
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' })

export const metadata: Metadata = {
  title: 'Unyamo',
  description: 'オリジナルトランプゲーム Unyamo のオンライン対戦',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Unyamo',
  },
  icons: {
    icon: [
      { url: '/icons/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/icons/apple-touch-icon.png',
    shortcut: '/icons/favicon-32.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#1e6b4d',
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja" className={`${inter.variable} ${mPlusRounded.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <body className="font-sans bg-background text-foreground min-h-screen antialiased" suppressHydrationWarning>
        {/* テーマ復元: ハイドレーション前にlocalStorageのダーク設定を適用（FOUC回避）。静的文字列・ユーザー入力なし */}
        <Script id="unyamo-theme-init" strategy="beforeInteractive">
          {"try{if(localStorage.getItem('unyamo-theme')==='dark')document.documentElement.classList.add('dark')}catch(e){}"}
        </Script>
        <SessionProviderWrapper>
          {children}
        </SessionProviderWrapper>
      </body>
    </html>
  )
}
