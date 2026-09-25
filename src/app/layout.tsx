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

/**
 * Pinta o tema ANTES do primeiro paint.
 *
 * Sem isto a página nasce clara e escurece quando o React monta — o "flash"
 * branco que denuncia tema mal implementado. O script é minúsculo, síncrono e
 * roda antes do body; a chave é a mesma de `src/lib/tema.ts`.
 */
const SCRIPT_TEMA = `
(function(){try{
  var m = localStorage.getItem('fleetpass-tema') || 'sistema';
  var escuro = m === 'escuro' || (m === 'sistema' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches);
  if (escuro) document.documentElement.classList.add('dark');
}catch(e){}})();
`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} />
      </head>
      <body className={`${inter.variable} ${mono.variable} font-sans`}>{children}</body>
    </html>
  )
}
