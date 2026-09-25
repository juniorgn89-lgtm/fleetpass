'use client'

import { cn } from '@/lib/utils'
import {
  Home, FileText, BarChart2, Settings, Users, Handshake,
  ClipboardList, Building2, Droplets, CalendarDays, Store, Receipt, Clock, UserPlus,
} from 'lucide-react'
import Link from 'next/link'
import { Logo } from '@/components/ui/logo'
import { usePathname } from 'next/navigation'
import { useParceriasPendencias } from '@/hooks/use-parcerias-pendencias'
import { usePerfilAtual } from '@/hooks/use-perfil-atual'

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
}

interface NavSection {
  title?: string
  items: NavItem[]
}

const navSections: NavSection[] = [
  {
    items: [
      { label: 'Visão geral', href: '/posto', icon: Home },
    ],
  },
  {
    title: 'Parcerias',
    items: [
      { label: 'Clientes',     href: '/posto/clientes',              icon: UserPlus },
      { label: 'Solicitações', href: '/posto/parcerias/solicitacoes', icon: ClipboardList },
      { label: 'Parceiros',    href: '/posto/parcerias/ativos',       icon: Handshake },
    ],
  },
  {
    title: 'Cadastros',
    items: [
      { label: 'Meus Postos', href: '/posto/meus-postos', icon: Store },
      { label: 'Frentistas',  href: '/posto/frentistas', icon: Users },
    ],
  },
  {
    title: 'Operações',
    items: [
      { label: 'Requisições', href: '/posto/requisicoes', icon: FileText },
      { label: 'Faturamento', href: '/posto/faturamento', icon: Receipt },
      { label: 'Histórico',   href: '/posto/historico',   icon: BarChart2 },
    ],
  },
  {
    title: 'Relatórios',
    items: [
      { label: 'Por Empresa',     href: '/posto/relatorios/empresas',     icon: Building2 },
      { label: 'Por Combustível', href: '/posto/relatorios/combustiveis', icon: Droplets },
      { label: 'Por Período',     href: '/posto/relatorios/periodo',      icon: CalendarDays },
      { label: 'Por Frentista',   href: '/posto/relatorios/frentistas',   icon: Users },
      { label: 'Linha do Tempo',  href: '/posto/relatorios/cliente',      icon: Clock },
    ],
  },
  {
    title: 'Configurações',
    items: [
      { label: 'Configurações', href: '/posto/configuracoes', icon: Settings },
    ],
  },
]

export function SidebarPosto() {
  const pathname = usePathname()
  const pendencias = useParceriasPendencias()
  const { perfil } = usePerfilAtual()

  const isActive = (href: string) => {
    if (href === '/posto') return pathname === '/posto'
    return pathname.startsWith(href)
  }

  return (
    <aside className="w-64 h-full bg-white border-r border-gray-100 flex flex-col shrink-0">
      <div className="px-6 h-16 border-b border-gray-100 flex items-center">
        <Link href="/" className="flex items-center gap-2">
          <Logo tamanho={30} />
        </Link>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto scrollbar-thin scrollbar-thumb-transparent hover:scrollbar-thumb-gray-200 scrollbar-track-transparent" style={{ scrollbarWidth: 'thin', scrollbarColor: 'transparent transparent' }} onMouseEnter={e => (e.currentTarget.style.scrollbarColor = '#e5e7eb transparent')} onMouseLeave={e => (e.currentTarget.style.scrollbarColor = 'transparent transparent')} >
        {navSections.map((section, idx) => (
          <div key={section.title ?? `section-${idx}`} className={idx > 0 ? 'mt-4' : ''}>
            {section.title && (
              <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                {section.title}
              </div>
            )}
            {section.items.map((item) => {
              let badge = 0
              if (item.href === '/posto/parcerias/solicitacoes') {
                badge = (pendencias.novasSolicitacoes ?? 0)
                      + (pendencias.negociandoCount ?? 0)
                      + (pendencias.msgsNaoLidas ?? 0)
              } else if (item.href === '/posto/parcerias/ativos') {
                badge = pendencias.contratosPendentes ?? 0
              }
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                    isActive(item.href)
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  )}
                >
                  <item.icon size={16} />
                  <span className="flex-1">{item.label}</span>
                  {badge > 0 && (
                    <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 text-[10px] font-bold text-white bg-red-500 rounded-full">
                      {badge > 9 ? '9+' : badge}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      <div className="px-3 py-3 border-t border-gray-100">
        <Link
          href="/posto/perfil"
          className={cn(
            'flex items-center gap-3 px-3 py-2 rounded-xl transition-colors group',
            pathname.startsWith('/posto/perfil') ? 'bg-blue-50' : 'hover:bg-gray-50'
          )}
        >
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-white uppercase">{perfil?.iniciais ?? '·'}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className={cn('text-sm font-medium truncate', pathname.startsWith('/posto/perfil') ? 'text-blue-700' : 'text-gray-700')}>{perfil?.nome ?? '…'}</p>
            <p className="text-[11px] text-gray-400 truncate">Ver perfil</p>
          </div>
        </Link>
      </div>

    </aside>
  )
}
