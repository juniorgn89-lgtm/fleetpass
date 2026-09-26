'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { PanelLeft, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MenuPerfil } from '@/components/layout/menu-perfil'

/**
 * Casca da sidebar — mesmos modos do menu lateral do Visor360.
 *
 * Os quatro papéis (empresa, posto, frentista, admin) desenhavam cada um a sua
 * sidebar inteira, com a mesma estrutura copiada quatro vezes. Aqui elas viram
 * só configuração: a casca cuida de largura, animação, tooltips, controle de
 * modo e rodapé.
 *
 * O Visor360 tem um quarto modo, "Opções ao passar o mouse", em que clicar no
 * ícone recolhido abre as abas daquele módulo. Ele não veio junto porque
 * depende de módulos com abas deep-linkáveis (`/estoques?tab=giro`), e no
 * FleetPass cada item de menu é uma rota só.
 */
export interface ItemNav {
  label: string
  href: string
  icon: React.ElementType
  /** Selo de pendências. 0 ou ausente não desenha nada. */
  badge?: number
}

export interface SecaoNav {
  titulo?: string
  itens: ItemNav[]
}

export type ModoSidebar = 'expandida' | 'recolhida' | 'hover'

const CHAVE_MODO = 'fleetpass-sidebar'

const MODOS: { valor: ModoSidebar; rotulo: string }[] = [
  { valor: 'expandida', rotulo: 'Expandida' },
  { valor: 'recolhida', rotulo: 'Recolhida' },
  { valor: 'hover',     rotulo: 'Expandir ao passar o mouse' },
]

function lerModo(): ModoSidebar {
  if (typeof window === 'undefined') return 'expandida'
  try {
    const v = localStorage.getItem(CHAVE_MODO)
    if (v === 'expandida' || v === 'recolhida' || v === 'hover') return v
  } catch { /* localStorage bloqueado */ }
  return 'expandida'
}

/**
 * O modo vive fora do React, no localStorage — então é lido por
 * `useSyncExternalStore`, e não por um `useEffect` que chama setState. Assim o
 * servidor renderiza 'expandida' (o padrão), o cliente corrige na hidratação e
 * não sobra estado derivado para sair de sincronia.
 */
let modoAtual: ModoSidebar = 'expandida'
let modoLido = false
const ouvintes = new Set<() => void>()

function instantaneoModo(): ModoSidebar {
  if (!modoLido && typeof window !== 'undefined') {
    modoLido = true
    modoAtual = lerModo()
  }
  return modoAtual
}

function inscreverModo(aoMudar: () => void) {
  ouvintes.add(aoMudar)
  return () => { ouvintes.delete(aoMudar) }
}

function gravarModo(m: ModoSidebar) {
  modoAtual = m
  modoLido = true
  try { localStorage.setItem(CHAVE_MODO, m) } catch { /* localStorage bloqueado */ }
  ouvintes.forEach((fn) => fn())
}

interface Props {
  secoes: SecaoNav[]
  /** Rota do painel do papel — só ela casa por igualdade; as demais por prefixo. */
  raiz: string
}

export function SidebarShell({ secoes, raiz }: Props) {
  const pathname = usePathname()

  const modo = useSyncExternalStore(inscreverModo, instantaneoModo, () => 'expandida' as ModoSidebar)

  const [sobre, setSobre] = useState(false)
  const expandida = modo === 'expandida' || (modo === 'hover' && sobre)

  /**
   * Duas sombras do `expandida`, atrasadas para acompanhar a animação de
   * largura (o mesmo truque do Visor360):
   *  - `larga`  liga 200ms DEPOIS de abrir  → só então os rótulos aparecem;
   *  - `estreita` liga 220ms DEPOIS de fechar → só então valem os tooltips.
   * No meio do caminho não há rótulo nem tooltip: sobra o ícone. Sem isso os
   * rótulos apareciam antes de haver espaço e os tooltips piscavam ao sair.
   */
  const [larga, setLarga] = useState(true)
  const [estreita, setEstreita] = useState(false)
  /* eslint-disable react-hooks/set-state-in-effect --
     Não é estado derivado: é sincronia com uma animação CSS de 220ms. O valor
     precisa mudar DEPOIS de um atraso, e o único jeito é o temporizador. */
  useEffect(() => {
    if (expandida) {
      setEstreita(false)
      const t = setTimeout(() => setLarga(true), 200)
      return () => clearTimeout(t)
    }
    setLarga(false)
    const t = setTimeout(() => setEstreita(true), 220)
    return () => clearTimeout(t)
  }, [expandida])
  /* eslint-enable react-hooks/set-state-in-effect */

  // Atraso ao sair para a sidebar não fechar se o cursor raspar a borda ou
  // cruzar para um popover que abre fora dela.
  const saidaRef = useRef<number | null>(null)
  const aoEntrar = () => {
    if (modo !== 'hover') return
    if (saidaRef.current !== null) { clearTimeout(saidaRef.current); saidaRef.current = null }
    setSobre(true)
  }
  const aoSair = () => {
    if (modo !== 'hover') return
    if (saidaRef.current !== null) clearTimeout(saidaRef.current)
    saidaRef.current = window.setTimeout(() => { setSobre(false); saidaRef.current = null }, 180)
  }
  useEffect(() => () => { if (saidaRef.current !== null) clearTimeout(saidaRef.current) }, [])

  /**
   * Tooltip do modo recolhido.
   *
   * Ele não pode ser um filho posicionado do item: o `nav` rola
   * verticalmente, e pelo CSS `overflow-y: auto` obriga o eixo X a recortar
   * junto — `overflow-x: visible` é ignorado. O balão morria dentro da trilha
   * de 64px. Então é um só, `fixed`, posicionado pela altura do item sob o
   * cursor.
   */
  const [dica, setDica] = useState<{ texto: string; topo: number } | null>(null)
  const mostrarDica = (e: React.MouseEvent<HTMLElement>, texto: string) => {
    if (!estreita) return
    const r = e.currentTarget.getBoundingClientRect()
    setDica({ texto, topo: r.top + r.height / 2 })
  }
  const esconderDica = () => setDica(null)

  const [controleAberto, setControleAberto] = useState(false)
  const controleRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!controleAberto) return
    const onDown = (e: MouseEvent) => {
      if (controleRef.current && !controleRef.current.contains(e.target as Node)) setControleAberto(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setControleAberto(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [controleAberto])

  const escolherModo = (m: ModoSidebar) => {
    gravarModo(m)
    setControleAberto(false)
  }

  const ativo = (href: string) =>
    href === raiz ? pathname === raiz : pathname.startsWith(href)

  return (
    <aside
      onMouseEnter={aoEntrar}
      onMouseLeave={aoSair}
      className={cn(
        'h-full bg-white dark:bg-[#0c1214] border-r border-gray-200 flex flex-col shrink-0 overflow-visible',
        '[transition:width_220ms_cubic-bezier(0.4,0,0.2,1)]',
        expandida ? 'w-52' : 'w-14',
      )}
    >
      {/* Sem cabeçalho de logo: ela vive na barra de topo, fora do menu que
          recolhe — é o arranjo do Visor360. */}
      <nav className="flex-1 px-2 py-3 overflow-y-auto overflow-x-visible">
        {secoes.map((secao, i) => (
          <div key={secao.titulo ?? `secao-${i}`} className={cn(i > 0 && 'mt-4')}>
            {/* Recolhida, o título da seção não cabe: vira um filete divisor. */}
            {secao.titulo && (larga
              ? <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-gray-400">{secao.titulo}</p>
              : i > 0 && <div className="mx-2 my-2 border-t border-gray-100" />
            )}

            <div className="space-y-0.5">
              {secao.itens.map((item) => {
                const estaAtivo = ativo(item.href)
                const badge = item.badge ?? 0
                return (
                  <div
                    key={item.href}
                    className="group relative"
                    onMouseEnter={(e) => mostrarDica(e, item.label)}
                    onMouseLeave={esconderDica}
                  >
                    <Link
                      href={item.href}
                      aria-label={item.label}
                      aria-current={estaAtivo ? 'page' : undefined}
                      className={cn(
                        'relative flex h-9 w-full items-center rounded-lg transition-colors',
                        estaAtivo
                          ? 'bg-blue-50 text-blue-800 font-medium dark:bg-white/10'
                          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-white/5',
                      )}
                    >
                      {/* Barra do item ativo — encosta na borda esquerda do
                          botão e alinha com o início do rótulo. */}
                      {estaAtivo && (
                        <span aria-hidden className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r bg-blue-600" />
                      )}
                      {/* Coluna fixa do ícone: ele fica na MESMA posição
                          recolhida ou expandida, então a animação de largura
                          não faz os ícones dançarem. */}
                      <span className="flex h-9 w-10 shrink-0 items-center justify-center">
                        <item.icon size={17} />
                      </span>
                      {larga && <span className="flex-1 text-sm">{item.label}</span>}
                      {badge > 0 && (larga ? (
                        <span className="mr-3 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 text-[10px] font-bold text-white bg-red-500 rounded-full">
                          {badge > 9 ? '9+' : badge}
                        </span>
                      ) : (
                        // Recolhida não há espaço para o número: vira um ponto
                        // sobre o ícone, que é o que o usuário precisa ver.
                        <span className="absolute right-2 top-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
                      ))}
                    </Link>

                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Controle do menu — logo acima do perfil, como no Visor360 */}
      <div ref={controleRef} className={cn('relative shrink-0 px-2 pb-1 pt-2', larga ? '' : 'flex justify-center')}>
        <button
          onClick={() => setControleAberto((v) => !v)}
          onMouseEnter={(e) => mostrarDica(e, 'Controle do menu')}
          onMouseLeave={esconderDica}
          aria-haspopup="menu"
          aria-expanded={controleAberto}
          aria-label="Controle do menu lateral"
          title="Controle do menu lateral"
          className={cn(
            'group relative flex h-8 items-center rounded-lg text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors',
            larga ? 'w-full justify-start gap-2 px-3 text-xs' : 'w-9 justify-center',
          )}
        >
          <PanelLeft size={15} className="shrink-0" />
          {larga && <span>Menu lateral</span>}
        </button>

        {controleAberto && (
          <div
            role="menu"
            className="absolute bottom-0 left-full z-50 ml-2 w-60 rounded-xl border border-gray-200 bg-white py-2 shadow-lg"
          >
            <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              Controle do menu
            </p>
            {MODOS.map((opt) => (
              <button
                key={opt.valor}
                role="menuitemradio"
                aria-checked={modo === opt.valor}
                onClick={() => escolherModo(opt.valor)}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                  {modo === opt.valor && <Check size={14} className="text-blue-600" />}
                </span>
                {opt.rotulo}
              </button>
            ))}
          </div>
        )}
      </div>

      <MenuPerfil compacto={!larga} />

      {estreita && dica && (
        <span
          role="tooltip"
          style={{ top: dica.topo }}
          className="pointer-events-none fixed left-14 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded-md bg-gray-900 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg dark:bg-gray-200 dark:text-gray-900"
        >
          {dica.texto}
        </span>
      )}
    </aside>
  )
}
