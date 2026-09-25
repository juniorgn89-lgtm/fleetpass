'use client'

import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Store, Building2, ArrowLeftRight,
  FileText, Settings, Layers,
} from 'lucide-react'
import Link from 'next/link'
import { Logo } from '@/components/ui/logo'
import { usePathname } from 'next/navigation'
import { usePerfilAtual } from '@/hooks/use-perfil-atual'

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { label: 'Postos', href: '/admin/postos', icon: Store },
  { label: 'Empresas', href: '/admin/empresas', icon: Building2 },
  { label: 'Transações', href: '/admin/transacoes', icon: ArrowLeftRight },
  { label: 'Notas Fiscais', href: '/admin/notas', icon: FileText },
  { label: 'Planos Stripe', href: '/admin/planos', icon: Layers },
  { label: 'Configurações', href: '/admin/configuracoes', icon: Settings },
]

export function SidebarAdmin() {
  const pathname = usePathname()
  const { perfil } = usePerfilAtual()

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin'
    return pathname.startsWith(href)
  }

  return (
    <aside className="w-64 h-full bg-white border-r border-gray-100 flex flex-col shrink-0">
      <div className="px-6 h-16 border-b border-gray-100 flex items-center">
        <Link href="/admin" className="flex items-center gap-2">
          <Logo tamanho={30} texto={false} />
          <span className="text-lg font-bold text-gray-900">FleetPass <span className="text-petrol-600">Admin</span></span>
        </Link>
      </div>

      <nav
        className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto"
        style={{ scrollbarWidth: 'thin', scrollbarColor: 'transparent transparent' }}
        onMouseEnter={e => (e.currentTarget.style.scrollbarColor = '#e5e7eb transparent')}
        onMouseLeave={e => (e.currentTarget.style.scrollbarColor = 'transparent transparent')}
      >
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
              isActive(item.href)
                ? 'bg-indigo-50 text-indigo-700 font-medium'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            )}
          >
            <item.icon size={16} />
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="px-3 py-3 border-t border-gray-100">
        <Link
          href="/admin/perfil"
          className={cn(
            'flex items-center gap-3 px-3 py-2 rounded-xl transition-colors group',
            pathname.startsWith('/admin/perfil') ? 'bg-indigo-50' : 'hover:bg-gray-50'
          )}
        >
          <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-white uppercase">{perfil?.iniciais ?? '·'}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className={cn(
              'text-sm font-medium truncate',
              pathname.startsWith('/admin/perfil') ? 'text-indigo-700' : 'text-gray-700'
            )}>
              {perfil?.nome ?? '…'}
            </p>
            <p className="text-[11px] text-gray-400 truncate">Ver perfil</p>
          </div>
        </Link>
      </div>
    </aside>
  )
}
