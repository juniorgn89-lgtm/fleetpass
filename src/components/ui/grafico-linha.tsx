'use client'

import { useId } from 'react'
import { cn } from '@/lib/utils'

/**
 * Gráfico de linha em SVG puro — e um minigráfico para os cartões.
 *
 * Feito à mão em vez de trazer uma biblioteca: são dois gráficos e quatro
 * minigráficos, todos de série única, e o recharts custaria ~100 KB no bundle
 * para isso. O desenho é uma polilinha com área embaixo; nada de eixos
 * rotacionados, legendas ou tooltip.
 *
 * O estado vazio é explícito, não uma linha no zero: uma linha reta rente ao
 * eixo com marcadores em cada dia parece um dado real que por acaso deu zero,
 * quando o caso é "ainda não houve movimento".
 */
export interface PontoSerie {
  /** ISO curto, AAAA-MM-DD. */
  dia: string
  valor: number
}

/** Caminho da polilinha e da área, em coordenadas de viewBox 0..L × 0..A. */
function caminhos(pontos: PontoSerie[], L: number, A: number, pad: number) {
  const max = Math.max(...pontos.map((p) => p.valor), 0)
  const passo = pontos.length > 1 ? (L - pad * 2) / (pontos.length - 1) : 0
  const y = (v: number) => (max === 0 ? A - pad : A - pad - (v / max) * (A - pad * 2))

  const xy = pontos.map((p, i) => [pad + i * passo, y(p.valor)] as const)
  const linha = xy.map(([x, yy], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${yy.toFixed(1)}`).join(' ')
  const area = `${linha} L${(pad + (pontos.length - 1) * passo).toFixed(1)},${A - pad} L${pad},${A - pad} Z`
  return { linha, area, max }
}

/** Rótulos do eixo X: primeiro, meio e último dia — mais que isso embola. */
function rotulosX(pontos: PontoSerie[]): { i: number; texto: string }[] {
  if (pontos.length === 0) return []
  const dm = (iso: string) => iso.slice(8, 10) + '/' + iso.slice(5, 7)
  const idx = [...new Set([0, Math.floor((pontos.length - 1) / 2), pontos.length - 1])]
  return idx.map((i) => ({ i, texto: dm(pontos[i].dia) }))
}

interface Props {
  titulo: string
  pontos: PontoSerie[]
  /** Formata o valor do eixo Y e do topo. */
  formatar: (v: number) => string
  /** Mensagem do estado vazio. */
  vazio: string
  icone?: React.ReactNode
  className?: string
}

export function GraficoLinha({ titulo, pontos, formatar, vazio, icone, className }: Props) {
  const id = useId()
  const L = 560
  const A = 180
  const pad = 8

  const temDados = pontos.some((p) => p.valor > 0)
  const { linha, area, max } = caminhos(pontos, L, A, pad)

  return (
    <div className={cn('rounded-2xl border border-gray-100 bg-white p-5', className)}>
      <div className="flex items-center gap-2 mb-4">
        {icone}
        <h3 className="text-sm font-semibold text-gray-900">{titulo}</h3>
      </div>

      {!temDados ? (
        <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
          <div className="w-11 h-11 rounded-2xl bg-gray-50 flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M4 19h16M7 16V9m5 7V5m5 11v-4" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" className="text-gray-300" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-500">{vazio}</p>
          <p className="text-xs text-gray-400">Os dados aparecem aqui assim que houver movimento no período.</p>
        </div>
      ) : (
        <>
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-xs text-gray-400">Pico no período</span>
            <span className="text-sm font-semibold text-gray-900">{formatar(max)}</span>
          </div>
          <svg viewBox={`0 0 ${L} ${A}`} className="w-full h-40" preserveAspectRatio="none" role="img"
            aria-label={`${titulo}: ${pontos.length} dias`}>
            <defs>
              <linearGradient id={`g-${id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="currentColor" stopOpacity="0.18" />
                <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={area} fill={`url(#g-${id})`} className="text-blue-600" />
            <path d={linha} fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinejoin="round" strokeLinecap="round" className="text-blue-600"
              vectorEffect="non-scaling-stroke" />
          </svg>
          <div className="mt-2 flex justify-between text-[11px] text-gray-400">
            {rotulosX(pontos).map((r) => <span key={r.i}>{r.texto}</span>)}
          </div>
        </>
      )}
    </div>
  )
}

/**
 * Minigráfico dos cartões — mesma série, sem eixo, rótulo nem estado vazio.
 * Sem movimento no período ele não desenha nada: uma reta no zero ocuparia
 * espaço dizendo o que o número grande ao lado já diz.
 */
export function MiniGrafico({ pontos, cor = 'text-blue-500' }: { pontos: PontoSerie[]; cor?: string }) {
  const id = useId()
  const L = 120
  const A = 32

  if (!pontos.some((p) => p.valor > 0)) return null
  const { linha, area } = caminhos(pontos, L, A, 2)

  return (
    <svg viewBox={`0 0 ${L} ${A}`} className={cn('w-full h-8', cor)} preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id={`m-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.22" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#m-${id})`} />
      <path d={linha} fill="none" stroke="currentColor" strokeWidth="1.75"
        strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}
