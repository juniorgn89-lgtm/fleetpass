'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { LogOut, Settings, User, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { usePerfilAtual, limparPerfilAtual } from '@/hooks/use-perfil-atual'
import { SobreVersao } from '@/components/feedback/sobre-versao'

/**
 * Botão de conta no rodapé da sidebar — mesmo padrão do Visor360.
 *
 * Lá o perfil mora no pé do menu lateral, e não na topbar: avatar redondo com
 * as iniciais, nome ao lado, e um popover que abre **para a direita alinhado
 * pela base** (`bottom-0 left-full`) com o e-mail no topo, os itens no meio e
 * "Sair" depois de um divisor. O FleetPass tinha o arranjo partido ao meio —
 * um bloco decorativo no rodapé da sidebar e o menu de verdade na topbar.
 *
 * Um só componente para os quatro papéis: antes cada sidebar desenhava o
 * próprio rodapé, em três tratamentos diferentes (bloco estático na empresa e
 * no frentista, link para `/perfil` no posto e no admin).
 *
 * Só entram rotas que existem. `/admin/perfil` era link morto na sidebar do
 * admin e por isso ficou de fora.
 */
const ROTAS: Record<string, { perfil?: string; config?: string }> = {
  posto: { perfil: '/posto/perfil', config: '/posto/configuracoes' },
  admin: { config: '/admin/configuracoes' },
}

const ITEM = 'flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors'

export function MenuPerfil({ compacto = false }: { compacto?: boolean }) {
  const router = useRouter()
  const { perfil } = usePerfilAtual()
  const [aberto, setAberto] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const nome     = perfil?.nome ?? '…'
  const email    = perfil?.email ?? '—'
  const iniciais = perfil?.iniciais ?? '·'
  const rotas    = ROTAS[perfil?.role ?? ''] ?? {}

  // Fecha ao clicar fora
  useEffect(() => {
    if (!aberto) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [aberto])

  // Fecha no Esc
  useEffect(() => {
    if (!aberto) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setAberto(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [aberto])

  async function sair() {
    setAberto(false)
    await supabase.auth.signOut()
    limparPerfilAtual()
    router.push('/login')
  }

  return (
    <div className={cn('shrink-0 border-t border-gray-100 px-2 py-3', compacto && 'flex justify-center')}>
      <div ref={ref} className={cn('relative', compacto && 'flex justify-center')}>
        {/* Uma linha só, e não avatar e nome como dois botões soltos: o fundo
            no hover e o chevron dizem que ali se clica. Sem eles o rodapé
            parecia a mesma etiqueta decorativa de antes. */}
        <button
          onClick={() => setAberto((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={aberto}
          aria-label={`Conta de ${nome}`}
          title={nome}
          className={cn(
            'group flex items-center rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300',
            compacto ? 'p-1' : 'w-full gap-2 px-1.5 py-1.5 hover:bg-gray-50',
            aberto && !compacto && 'bg-gray-50',
          )}
        >
          <span
            className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold uppercase text-white transition-transform',
              compacto && 'group-hover:scale-105',
            )}
          >
            {iniciais}
          </span>
          {!compacto && (
            <>
              <span className="min-w-0 flex-1 truncate text-left text-sm text-gray-700 group-hover:text-gray-900">
                {nome}
              </span>
              <ChevronsUpDown
                size={14}
                className={cn(
                  'shrink-0 transition-colors',
                  aberto ? 'text-gray-600' : 'text-gray-400 group-hover:text-gray-600',
                )}
              />
            </>
          )}
        </button>

        {aberto && (
          <div
            role="menu"
            className="absolute bottom-0 left-full z-50 ml-2 w-56 rounded-xl border border-gray-200 bg-white py-1 shadow-lg"
          >
            {compacto && (
              <p className="truncate px-3 pt-2 text-sm font-medium text-gray-800" title={nome}>{nome}</p>
            )}
            <p className={cn('truncate px-3 text-xs text-gray-400', compacto ? 'pb-2' : 'py-2')} title={email}>{email}</p>

            <div className="my-1 border-t border-gray-100" />

            {rotas.perfil && (
              <Link role="menuitem" href={rotas.perfil} onClick={() => setAberto(false)} className={ITEM}>
                <User className="h-4 w-4 text-gray-500" /> Perfil
              </Link>
            )}
            {rotas.config && (
              <Link role="menuitem" href={rotas.config} onClick={() => setAberto(false)} className={ITEM}>
                <Settings className="h-4 w-4 text-gray-500" /> Configurações
              </Link>
            )}

            <SobreVersao variante="menu" />

            <div className="my-1 border-t border-gray-100" />

            <button role="menuitem" onClick={sair} className={ITEM}>
              <LogOut className="h-4 w-4 text-gray-500" /> Sair
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
