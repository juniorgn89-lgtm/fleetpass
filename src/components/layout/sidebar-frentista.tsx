'use client'

import { cn } from '@/lib/utils'
import { QrCode, ClipboardList, ClipboardCheck } from 'lucide-react'
import Link from 'next/link'
import { Logo } from '@/components/ui/logo'
import { usePathname } from 'next/navigation'
import { usePerfilAtual } from '@/hooks/use-perfil-atual'

const navItems = [
  { label: 'Validar abastecimento',   href: '/frentista/validar',   icon: QrCode },
  { label: 'Registrar abastecimento', href: '/frentista/registrar', icon: ClipboardCheck },
  { label: 'Minhas validações',       href: '/frentista/historico', icon: ClipboardList },
]

export function SidebarFrentista() {
  const pathname = usePathname()
  const { perfil } = usePerfilAtual()

  const isActive = (href: string) => pathname.startsWith(href)

  return (
    <aside className="w-64 h-full bg-white border-r border-gray-100 flex flex-col shrink-0">
      <div className="px-6 h-16 border-b border-gray-100 flex items-center">
        <Link href="/" className="flex items-center gap-2">
          <Logo tamanho={30} />
        </Link>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => (
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
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="px-4 py-4 border-t border-gray-100">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-xs font-bold text-blue-700 uppercase">{perfil?.iniciais ?? '·'}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{perfil?.nome ?? '…'}</p>
            <p className="text-xs text-gray-400">Frentista</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
