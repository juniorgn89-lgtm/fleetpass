'use client'

import { cn } from '@/lib/utils'
import { Home, FileText, BarChart2, Settings, Truck, Users, Handshake, Zap, Receipt, Store } from 'lucide-react'
import Link from 'next/link'
import { Logo } from '@/components/ui/logo'
import { usePathname } from 'next/navigation'
import { useParceriasPendencias } from '@/hooks/use-parcerias-pendencias'
import { usePerfilAtual } from '@/hooks/use-perfil-atual'

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  children?: { label: string; href: string; icon: React.ElementType }[]
}

const navItems: NavItem[] = [
  { label: 'Visão geral', href: '/empresa', icon: Home },
  { label: 'Vitrine', href: '/empresa/vitrine', icon: Store },
  { label: 'Parcerias', href: '/empresa/parcerias', icon: Handshake },
  {
    label: 'Frota',
    href: '/empresa/frota',
    icon: Truck,
    children: [
      { label: 'Veículos', href: '/empresa/frota/veiculos', icon: Truck },
      { label: 'Motoristas', href: '/empresa/frota/motoristas', icon: Users },
    ],
  },
  { label: 'Requisições', href: '/empresa/requisicoes', icon: FileText },
  { label: 'Abast. Livre', href: '/empresa/liberacoes', icon: Zap },
  { label: 'Faturamento', href: '/empresa/faturamento', icon: Receipt },
  { label: 'Histórico', href: '/empresa/historico', icon: BarChart2 },
  { label: 'Configurações', href: '/empresa/configuracoes', icon: Settings },
]

export function SidebarEmpresa() {
  const pathname = usePathname()
  const pendencias = useParceriasPendencias()
  const { perfil } = usePerfilAtual()

  const isActive = (href: string) => {
    if (href === '/empresa') return pathname === '/empresa'
    return pathname.startsWith(href)
  }

  return (
    <aside className="w-64 h-full bg-white border-r border-gray-100 flex flex-col shrink-0">
      <div className="px-6 h-16 border-b border-gray-100 flex items-center">
        <Link href="/" className="flex items-center gap-2">
          <Logo tamanho={30} />
        </Link>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => (
          <div key={item.href}>
            {item.children ? (
              <div>
                <div className="flex items-center gap-3 px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mt-2">
                  <item.icon size={14} />
                  {item.label}
                </div>
                {item.children.map((child) => (
                  <Link
                    key={child.href}
                    href={child.href}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 ml-2 rounded-lg text-sm transition-colors',
                      isActive(child.href)
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    )}
                  >
                    <child.icon size={16} />
                    {child.label}
                  </Link>
                ))}
              </div>
            ) : (() => {
              const isParceria = item.href === '/empresa/parcerias'
              const badge = isParceria ? pendencias.total : 0
              return (
                <Link
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
            })()}
          </div>
        ))}
      </nav>

      <div className="px-4 py-4 border-t border-gray-100">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-xs font-bold text-blue-700 uppercase">{perfil?.iniciais ?? '·'}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{perfil?.nome ?? '…'}</p>
            <p className="text-xs text-gray-400 truncate">{perfil?.email ?? ''}</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
