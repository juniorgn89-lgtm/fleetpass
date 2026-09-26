'use client'

import { useEffect, useRef, useState } from 'react'
import { Sun, Moon, Monitor, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTema, type ModoTema } from '@/lib/tema'

/**
 * Botão de tema na topbar — mesmo lugar e mesmas opções do Visor360
 * (Claro / Sistema / Escuro), com o ícone do gatilho refletindo a escolha.
 *
 * O Visor360 usa o DropdownMenu do Radix; aqui é um popover simples, porque o
 * FleetPass não tem Radix e o resto dos menus (conta, notificações) já segue
 * esse padrão manual de clicar fora / Esc.
 */
const OPCOES: { valor: ModoTema; rotulo: string; Icone: typeof Sun }[] = [
  { valor: 'claro',   rotulo: 'Claro',   Icone: Sun },
  { valor: 'sistema', rotulo: 'Sistema', Icone: Monitor },
  { valor: 'escuro',  rotulo: 'Escuro',  Icone: Moon },
]

export function SeletorTema() {
  const { modo, definirModo } = useTema()
  const [aberto, setAberto] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!aberto) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setAberto(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [aberto])

  const Atual = modo === 'escuro' ? Moon : modo === 'claro' ? Sun : Monitor

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={aberto}
        aria-label="Alterar tema"
        title="Alterar tema"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
      >
        <Atual size={16} />
      </button>

      {aberto && (
        <div
          role="menu"
          className="absolute right-0 top-11 z-30 w-44 rounded-xl border border-gray-100 bg-white py-1 shadow-lg"
        >
          <p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
            Tema
          </p>
          {OPCOES.map(({ valor, rotulo, Icone }) => {
            const ativo = modo === valor
            return (
              <button
                key={valor}
                role="menuitemradio"
                aria-checked={ativo}
                onClick={() => { definirModo(valor); setAberto(false) }}
                className={cn(
                  'flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-gray-100',
                  ativo ? 'font-semibold text-gray-900' : 'text-gray-700',
                )}
              >
                <Icone size={14} className="shrink-0 text-gray-500" />
                <span className="flex-1 text-left">{rotulo}</span>
                <Check size={14} className={cn('shrink-0 text-blue-600', !ativo && 'opacity-0')} />
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
