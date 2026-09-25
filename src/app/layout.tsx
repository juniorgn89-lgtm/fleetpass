import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'

// Inter: mesma família do Visor360, para os dois produtos terem a mesma voz tipográfica.
const inter = Inter({ subsets: ['latin'], weight: ['400','500','600','700'], variable: '--font-inter' })
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains' })

export const metadata: Metadata = {
  title: 'FleetPass — Marketplace de Abastecimento B2B',
  description: 'Conecte sua frota aos melhores postos',
  icons: {
    icon: [
      { url: '/brand/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/brand/favicon-16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: '/brand/simbolo-192.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.variable} ${mono.variable} font-sans`}>{children}</body>
    </html>
  )
}
