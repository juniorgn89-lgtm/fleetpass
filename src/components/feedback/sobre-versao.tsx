'use client'

import { useState } from 'react'
import { Sparkles, ChevronRight } from 'lucide-react'
import { NovidadesModal } from '@/components/feedback/novidades'
import { RELEASE_NOTES } from '@/lib/release-notes'

const VERSAO_ATUAL = process.env.NEXT_PUBLIC_APP_VERSION ?? '0.0.0'

/**
 * Linha "Novidades" com a versão instalada.
 *
 * Existe para quem perdeu a tela de atualização — ou quer reler o que mudou.
 * Mostra o histórico inteiro, não só a última: é o registro de que o sistema
 * evolui, que é o ponto de ter isto.
 *
 * `variante` só muda a moldura: 'cartao' nas configurações, 'menu' no rodapé
 * de conta da sidebar, onde o espaço é de um item de lista.
 */
export function SobreVersao({ variante = 'cartao' }: { variante?: 'cartao' | 'menu' }) {
  const [aberto, setAberto] = useState(false)

  const gatilho = variante === 'menu' ? (
    <button
      type="button"
      role="menuitem"
      onClick={() => setAberto(true)}
      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
    >
      <Sparkles className="h-4 w-4 text-gray-500" />
      <span className="flex-1 text-left">Novidades</span>
      <span className="text-[11px] text-gray-400">{VERSAO_ATUAL}</span>
    </button>
  ) : (
    <div className="rounded-xl border border-gray-100 bg-white">
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="flex w-full items-center gap-3 px-5 py-4 text-left hover:bg-gray-50 transition-colors rounded-xl"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50">
          <Sparkles className="h-4 w-4 text-blue-600" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-gray-900">Novidades</span>
          <span className="block text-xs text-gray-500">Veja o que mudou nas últimas versões</span>
        </span>
        <span className="text-xs text-gray-400 tabular-nums">Versão {VERSAO_ATUAL}</span>
        <ChevronRight className="h-4 w-4 shrink-0 text-gray-300" />
      </button>
    </div>
  )

  return (
    <>
      {gatilho}
      <NovidadesModal
        open={aberto}
        onClose={() => setAberto(false)}
        releases={RELEASE_NOTES}
        titulo="Novidades do FleetPass"
      />
    </>
  )
}
