'use client'

import Image from 'next/image'
import {
  Handshake, FileText, Receipt, Truck, QrCode, Grip, RefreshCw, Wrench, X,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  RELEASE_NOTES, compararVersao,
  type Novidade, type NovidadeIcone, type ReleaseNote,
} from '@/lib/release-notes'

/**
 * Ícone de cada tipo de novidade. As chaves vivem em `lib/release-notes.ts`,
 * que fica sem imports para poder ser lido também pela rota `/api/versao`.
 */
const ICONES: Record<NovidadeIcone, LucideIcon> = {
  parcerias:   Handshake,
  requisicoes: FileText,
  faturamento: Receipt,
  frota:       Truck,
  frentista:   QrCode,
  apps:        Grip,
  atualizacao: RefreshCw,
  ajuste:      Wrench,
}

/**
 * Quais releases são novidade para quem está na versão `desde`: tudo que é
 * mais novo. Sem nada mais novo (por exemplo, um deploy que não mudou a
 * versão), devolve a release mais recente — sempre há algo honesto a mostrar,
 * sem inventar item.
 */
export function novidadesDesde(
  desde: string | null,
  notas: ReleaseNote[] = RELEASE_NOTES,
): ReleaseNote[] {
  const ordenadas = [...notas].sort((a, b) => compararVersao(b.versao, a.versao))
  if (!ordenadas.length) return []
  const novas = desde ? ordenadas.filter((n) => compararVersao(n.versao, desde) > 0) : []
  return novas.length ? novas : [ordenadas[0]]
}

export function NovidadesLista({
  itens, tom = 'claro', className,
}: {
  itens: Novidade[]
  /** 'escuro' = sobre o fundo da tela de atualização; 'claro' = card normal. */
  tom?: 'claro' | 'escuro'
  className?: string
}) {
  return (
    <ul className={cn('space-y-3', className)}>
      {itens.map((item) => {
        const Icone = ICONES[item.icone]
        return (
          <li key={item.titulo} className="flex items-start gap-3">
            <span className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
              tom === 'escuro' ? 'bg-white/10 text-fuel-400' : 'bg-blue-50 text-blue-700',
            )}>
              <Icone className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className={cn(
                'text-[13.5px] font-semibold leading-tight',
                tom === 'escuro' ? 'text-white' : 'text-gray-900',
              )}>
                {item.titulo}
              </p>
              <p className={cn(
                'mt-0.5 text-[12.5px] leading-snug',
                tom === 'escuro' ? 'text-white/70' : 'text-gray-500',
              )}>
                {item.descricao}
              </p>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

function formatarData(iso: string) {
  const [a, m, d] = iso.split('-')
  return `${d}/${m}/${a}`
}

/**
 * Modal "o que há de novo" — usado depois do reinício ("FleetPass atualizado")
 * e pela linha "Novidades". Uma seção por versão.
 *
 * Não usa o `Modal` compartilhado de propósito: aquele é do fluxo de formulário
 * (fecha no fundo, título simples) e aqui o cabeçalho é de marca, escuro.
 */
export function NovidadesModal({
  open, onClose, releases, titulo = 'Novidades',
}: {
  open: boolean
  onClose: () => void
  releases: ReleaseNote[]
  titulo?: string
}) {
  if (!open || !releases.length) return null
  return (
    <div onClick={onClose} className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 px-4">
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className="flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl"
      >
        <div className="relative bg-petrol-950 px-5 py-4 text-white">
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="absolute right-3 top-3 rounded-md p-1 text-white/70 hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-3">
            <Image src="/brand/simbolo-192.png" alt="" width={40} height={40} className="h-10 w-10 rounded-xl" />
            <div>
              <h2 className="text-base font-bold leading-tight">{titulo}</h2>
              <p className="text-[11px] text-white/70">
                Versão {releases[0].versao} · {formatarData(releases[0].data)}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-5 overflow-y-auto px-5 py-4">
          {releases.map((r, i) => (
            <section key={r.versao}>
              {(releases.length > 1 || i > 0) && (
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-gray-400">
                  Versão {r.versao} · {formatarData(r.data)}
                </p>
              )}
              <p className="mb-3 text-[13px] text-gray-600">{r.resumo}</p>
              <NovidadesLista itens={r.itens} />
            </section>
          ))}
        </div>

        <div className="border-t border-gray-100 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 dark:hover:bg-petrol-500"
          >
            Entendi
          </button>
        </div>
      </div>
    </div>
  )
}
