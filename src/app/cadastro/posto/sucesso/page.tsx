'use client'

import { useSearchParams } from 'next/navigation'
import { Logo } from '@/components/ui/logo'
import { Suspense } from 'react'
import Link from 'next/link'
import { CheckCircle, Store, ArrowRight, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'

function SucessoContent() {
  const params = useSearchParams()
  const sessionId = params.get('session_id')

  return (
    <div className="w-full max-w-md">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
        <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-5">
          <CheckCircle size={32} className="text-emerald-500" />
        </div>

        <h1 className="text-xl font-bold text-gray-900 mb-2">Assinatura confirmada!</h1>
        <p className="text-gray-500 text-sm mb-6">
          Seu plano está ativo. Agora cadastre seus postos para começar a receber empresas parceiras.
        </p>

        {/* Destaques */}
        <div className="space-y-2.5 mb-8 text-left">
          {[
            'Convide frentistas para cada posto',
            'Aceite requisições de abastecimento',
            'Feche faturas e acompanhe pagamentos',
            'Acompanhe relatórios em tempo real',
          ].map((item) => (
            <div key={item} className="flex items-center gap-2.5">
              <div className="w-5 h-5 bg-emerald-100 rounded-full flex items-center justify-center shrink-0">
                <ShieldCheck size={11} className="text-emerald-600" />
              </div>
              <p className="text-sm text-gray-600">{item}</p>
            </div>
          ))}
        </div>

        <div className="space-y-2.5">
          <Link href="/posto/meus-postos">
            <Button className="w-full" size="lg">
              <Store size={16} /> Cadastrar meu primeiro posto
            </Button>
          </Link>
          <Link href="/posto" className="flex items-center justify-center gap-1 text-sm text-gray-400 hover:text-gray-600 transition-colors py-2">
            Ir para o painel <ArrowRight size={13} />
          </Link>
        </div>

        {sessionId && (
          <p className="mt-6 text-[11px] text-gray-300 font-mono break-all">
            ref: {sessionId}
          </p>
        )}
      </div>
    </div>
  )
}

export default function PostoSucessoPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <Link href="/" className="flex items-center gap-2 mb-8">
        <Logo tamanho={32} />
      </Link>

      <Suspense fallback={<div className="w-full max-w-md bg-white rounded-2xl border border-gray-100 shadow-sm p-8 h-64 animate-pulse" />}>
        <SucessoContent />
      </Suspense>
    </div>
  )
}
