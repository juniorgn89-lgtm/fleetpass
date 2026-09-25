import type { Metadata } from 'next'
import { Header } from '@/components/landing/Header'
import { Hero } from '@/components/landing/Hero'
import { ComoFunciona } from '@/components/landing/ComoFunciona'
import { DoisCaminhos } from '@/components/landing/DoisCaminhos'
import { CTAFinal } from '@/components/landing/CTAFinal'
import { Footer } from '@/components/landing/Footer'

export const metadata: Metadata = {
  title: 'FleetPass — Abastecimento de frota pré-aprovado, sem calote nem contestação',
  description:
    'Todo abastecimento é pré-aprovado pela transportadora antes de acontecer: o posto recebe com prova registrada e a frota paga só o que autorizou. Fim do abastecimento não reconhecido e do abastecimento fantasma.',
  keywords: [
    'abastecimento de frotas', 'abastecimento pré-aprovado', 'calote em posto',
    'contestação de abastecimento', 'gestão de frotas', 'postos de combustível',
    'transportadoras', 'requisição de abastecimento', 'contratos digitais', 'FleetPass',
  ],
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    siteName: 'FleetPass',
    title: 'O posto recebe o que abasteceu. A frota paga só o que autorizou.',
    description:
      'Abastecimento pré-aprovado pela transportadora: prova registrada para o posto, zero abastecimento fantasma para a frota.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FleetPass — Abastecimento de frota pré-aprovado',
    description:
      'O posto recebe com prova; a frota paga só o que autorizou. Fim do calote e do abastecimento fantasma.',
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'FleetPass',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  description:
    'Plataforma B2B em que todo abastecimento de frota é pré-aprovado pela transportadora antes de acontecer: o posto recebe com prova registrada e a frota paga só o que autorizou.',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'BRL' },
  audience: { '@type': 'Audience', audienceType: 'Transportadoras e postos de combustível' },
}

export default function LandingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Header />
      {/* Cinco seções, não oito. A página tinha CINCO grades de três cards
          seguidas (Problema, Como funciona, Efeito rede, Benefícios, Dois
          caminhos) dizendo coisas sobrepostas — é isso que dá a sensação de
          página gerada automaticamente. Ficou o essencial: o que é, como
          funciona, para quem, e a chamada. */}
      <main>
        <Hero />
        <ComoFunciona />
        <DoisCaminhos />
        <CTAFinal />
      </main>
      <Footer />
    </>
  )
}
