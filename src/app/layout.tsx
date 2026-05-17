import type { Metadata, Viewport } from 'next'
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
    icon: '/icons/icon.svg',
    apple: '/icons/icon.svg',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#fbf6ec',
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja" className={`${inter.variable} ${mPlusRounded.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <head>
        {/* テーマ復元: ペイント前にlocalStorageからダーク設定を適用（FOUC回避）。静的文字列・ユーザー入力なし */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{if(localStorage.getItem('unyamo-theme')==='dark')document.documentElement.classList.add('dark')}catch(e){}",
          }}
        />
      </head>
      <body className="font-sans bg-background text-foreground min-h-screen antialiased" suppressHydrationWarning>
        <SessionProviderWrapper>
          {children}
        </SessionProviderWrapper>
      </body>
    </html>
  )
}
