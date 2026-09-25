'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { LogOut, Settings, User } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { usePerfilAtual, limparPerfilAtual } from '@/hooks/use-perfil-atual'

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

export function MenuPerfil() {
  const router = useRouter()
  const { perfil } = usePerfilAtual()
  const [aberto, setAberto] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const nome     = perfil?.nome ?? '…'
  const email    = perfil?.email ?? '—'
  const iniciais = perfil?.iniciais ?? '·'
  const rotas    = ROTAS[perfil?.role ?? ''] ?? {}
  const temItens = !!(rotas.perfil || rotas.config)

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
    <div className="border-t border-gray-100 px-2 py-3">
      <div ref={ref} className="relative flex items-center gap-2">
        <button
          onClick={() => setAberto((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={aberto}
          aria-label={`Conta de ${nome}`}
          title={nome}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold uppercase text-white transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-gray-400"
        >
          {iniciais}
        </button>
        <button
          onClick={() => setAberto((v) => !v)}
          className="min-w-0 flex-1 truncate text-left text-sm text-gray-700 hover:text-gray-900"
          title={nome}
        >
          {nome}
        </button>

        {aberto && (
          <div
            role="menu"
            className="absolute bottom-0 left-full z-50 ml-2 w-56 rounded-xl border border-gray-200 bg-white py-1 shadow-lg"
          >
            <p className="truncate px-3 py-2 text-xs text-gray-400" title={email}>{email}</p>

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

            {temItens && <div className="my-1 border-t border-gray-100" />}

            <button role="menuitem" onClick={sair} className={ITEM}>
              <LogOut className="h-4 w-4 text-gray-500" /> Sair
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
