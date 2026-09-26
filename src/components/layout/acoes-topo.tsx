'use client'

import { cn } from '@/lib/utils'
import { Bell, Check } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useNotificacoes } from '@/hooks/use-notificacoes'
import { SeletorTema } from '@/components/ui/seletor-tema'
import { AppLauncher } from '@/components/layout/app-launcher'

/**
 * Cluster de ações do topo — tema e notificações.
 *
 * Vive na BARRA DE TOPO de largura total, como no Header do Visor360, e não na
 * faixa do breadcrumb. Estava dentro da Topbar; saiu de lá quando a casca
 * passou a ter uma barra de topo própria, para não ficar preso ao painel de
 * conteúdo.
 */
function tempoRelativo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'agora'
  if (min < 60) return `${min}m`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h}h`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d`
  return new Date(iso).toLocaleDateString('pt-BR')
}

export function AcoesTopo() {
  const router = useRouter()
  const [notifOpen, setNotifOpen] = useState(false)
  const { items, naoLidas, marcarLida, marcarTodasLidas } = useNotificacoes()

  return (
    <div className="flex items-center gap-2">

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <Bell size={16} />
            {naoLidas > 0 && (
              <span className="absolute top-0.5 right-0.5 min-w-[15px] h-[15px] px-1 text-[9px] font-bold text-white bg-red-500 rounded-full flex items-center justify-center">
                {naoLidas > 9 ? '9+' : naoLidas}
              </span>
            )}
          </button>

          {notifOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setNotifOpen(false)} />
              <div className="absolute right-0 top-12 w-96 bg-white rounded-xl shadow-lg border border-gray-100 z-20 max-h-[70vh] flex flex-col">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">
                    Notificações {naoLidas > 0 && <span className="text-xs text-gray-400 font-normal">· {naoLidas} não {naoLidas === 1 ? 'lida' : 'lidas'}</span>}
                  </h3>
                  {naoLidas > 0 && (
                    <button
                      onClick={marcarTodasLidas}
                      className="text-[11px] text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                      <Check size={11} /> Marcar todas
                    </button>
                  )}
                </div>
                <div className="overflow-y-auto divide-y divide-gray-50">
                  {items.length === 0 && (
                    <p className="text-sm text-gray-400 text-center py-8">Nenhuma notificação.</p>
                  )}
                  {items.map((n) => {
                    const naoLida = !n.lida_em
                    const Conteudo = (
                      <div className={cn('px-4 py-3 cursor-pointer transition-colors relative', naoLida ? 'bg-blue-50/50 hover:bg-blue-50' : 'hover:bg-gray-50')}>
                        {naoLida && <span className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-blue-600 rounded-full" />}
                        <p className={cn('text-sm', naoLida ? 'font-semibold text-gray-900' : 'font-medium text-gray-700')}>{n.titulo}</p>
                        {n.descricao && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.descricao}</p>}
                        <p className="text-[10px] text-gray-400 mt-1">{tempoRelativo(n.created_at)} atrás</p>
                      </div>
                    )
                    const handleClick = () => {
                      if (naoLida) marcarLida(n.id)
                      setNotifOpen(false)
                      if (n.link) router.push(n.link)
                    }
                    return (
                      <div key={n.id} onClick={handleClick}>
                        {Conteudo}
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Tema e launcher fecham o cluster, nesta ordem — é como o Header
            do Visor360 termina. Os extras de cada app (lá: demonstração,
            potencial, atualizar, instalar; aqui: o sino) vêm antes. */}
        <SeletorTema />
        <AppLauncher />
    </div>
  )
}
