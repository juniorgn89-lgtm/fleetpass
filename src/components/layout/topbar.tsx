'use client'

import { cn } from '@/lib/utils'
import { ChevronRight } from 'lucide-react'
import Link from 'next/link'

/**
 * Faixa de contexto do painel de conteúdo — só o breadcrumb.
 *
 * O cluster de tema e notificações saiu daqui para a barra de topo de largura
 * total (`AcoesTopo`), que é onde o Header do Visor360 os coloca. Aqui ficou o
 * equivalente ao slot de título que cada página do Visor preenche — no
 * FleetPass o caminho continua sendo breadcrumb, por decisão do usuário.
 */
interface TopbarProps {
  breadcrumb?: { label: string; href?: string }[]
}

export function Topbar({ breadcrumb = [] }: TopbarProps) {
  return (
    <header className="h-12 shrink-0 border-b border-gray-100 flex items-center px-6">
      <nav className="flex items-center gap-1.5 text-sm" aria-label="Caminho">
        {breadcrumb.map((crumb, i) => (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight size={14} className="text-gray-300" />}
            {crumb.href && i < breadcrumb.length - 1 ? (
              <Link href={crumb.href} className="text-gray-500 hover:text-gray-700">
                {crumb.label}
              </Link>
            ) : (
              <span className={cn(i === breadcrumb.length - 1 ? 'text-gray-900 font-medium' : 'text-gray-500')}>
                {crumb.label}
              </span>
            )}
          </span>
        ))}
      </nav>
    </header>
  )
}
