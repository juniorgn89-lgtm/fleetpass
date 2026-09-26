'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { Grip, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePerfilAtual } from '@/hooks/use-perfil-atual'
import { CCI_APPS, APP_ATUAL_ID } from '@/lib/appsCci'

/**
 * Launcher da suíte CCI — o botão de grade (⋮⋮⋮) estilo Google, igual ao do
 * Visor360. Painel arredondado com cabeçalho e ícones grandes "soltos" com o
 * nome embaixo; o primeiro tile é o site da CCI (como a "Conta" do Google), o
 * app atual fica marcado e os demais abrem em nova aba. A lista vive em
 * `src/lib/appsCci.ts`. Sem SSO nesta fase (ver o comentário lá).
 *
 * O Visor360 monta isto sobre o DropdownMenu do Radix. O FleetPass não tem
 * Radix — nenhuma dependência de shadcn — e os menus daqui (conta, tema,
 * notificações) são popovers próprios com fechamento por clique fora e Esc.
 * Este segue o mesmo padrão, para não trazer uma biblioteca inteira por um
 * componente.
 */
export function AppLauncher() {
  const [aberto, setAberto] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { perfil } = usePerfilAtual()

  // Tiles marcados `visivelPara: 'master'` (ex.: portal interno) só para quem
  // administra. No Visor360 é o papel `diretor`; aqui o equivalente é `admin`.
  const ehMaster = perfil?.role === 'admin'
  const apps = CCI_APPS.filter((a) => a.visivelPara !== 'master' || ehMaster)

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

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={aberto}
        title="Apps da CCI"
        aria-label="Abrir apps da CCI"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
      >
        <Grip size={16} />
      </button>

      {aberto && (
        <div
          role="menu"
          className="absolute right-0 top-11 z-30 w-[324px] rounded-3xl border border-gray-200 bg-white p-2 shadow-2xl dark:border-white/10 dark:bg-[#1f1f22]"
        >
          {/* Cabeçalho (como o "Faça login para organizar os apps" do Google) */}
          <p className="px-3 pb-2.5 pt-2.5 text-center text-[13px] text-gray-500">
            <span className="font-semibold text-[#0F766E] dark:text-[#14b8a6]">CCI Consultoria</span> · seus apps
          </p>

          {/* Bandeja interna com os ícones */}
          <div className="rounded-2xl bg-gray-50 p-1.5 dark:bg-white/[0.05]">
            <div className="grid grid-cols-3">
              {apps.map((app) => {
                const atual = app.id === APP_ATUAL_ID
                const Icon = app.Icon
                const icone = app.img ? (
                  <Image src={app.img} alt="" width={48} height={48} className="h-12 w-12 object-contain drop-shadow-sm" />
                ) : (
                  <span className={cn('flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-sm', app.tile)}>
                    {Icon && <Icon className="h-6 w-6" />}
                  </span>
                )
                const conteudo = (
                  <>
                    {icone}
                    <span className="mt-2 block w-full truncate text-[12.5px] font-medium text-gray-800 dark:text-gray-100">
                      {app.nome}
                    </span>
                    {atual && (
                      <span className="mt-0.5 inline-flex items-center gap-0.5 text-[9.5px] font-medium text-emerald-600">
                        <Check className="h-2.5 w-2.5" /> aqui
                      </span>
                    )}
                    {app.badge && <span className="mt-0.5 block text-[9.5px] text-gray-400">{app.badge}</span>}
                  </>
                )
                const base = 'flex flex-col items-center rounded-2xl px-1 pb-3 pt-3.5 text-center transition-colors'

                // App atual e tile com `badge` não são link: um porque já se
                // está nele, o outro porque ainda não existe.
                if (atual || app.badge) {
                  return (
                    <div
                      key={app.id}
                      title={atual ? 'Você está aqui' : app.badge}
                      className={cn(base, atual ? 'bg-black/[0.04] dark:bg-white/[0.08]' : 'opacity-50')}
                    >
                      {conteudo}
                    </div>
                  )
                }
                return (
                  <a
                    key={app.id}
                    href={app.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={app.descricao}
                    onClick={() => setAberto(false)}
                    className={cn(base, 'hover:bg-black/[0.05] dark:hover:bg-white/10')}
                  >
                    {conteudo}
                  </a>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
