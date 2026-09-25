'use client'

import {
  LayoutDashboard, Store, Building2, ArrowLeftRight,
  FileText, Settings, Layers,
} from 'lucide-react'
import { SidebarShell, type SecaoNav } from '@/components/layout/sidebar-shell'

const secoes: SecaoNav[] = [
  {
    itens: [
      { label: 'Dashboard',     href: '/admin',               icon: LayoutDashboard },
      { label: 'Postos',        href: '/admin/postos',        icon: Store },
      { label: 'Empresas',      href: '/admin/empresas',      icon: Building2 },
      { label: 'Transações',    href: '/admin/transacoes',    icon: ArrowLeftRight },
      { label: 'Notas Fiscais', href: '/admin/notas',         icon: FileText },
      { label: 'Planos Stripe', href: '/admin/planos',        icon: Layers },
      { label: 'Configurações', href: '/admin/configuracoes', icon: Settings },
    ],
  },
]

export function SidebarAdmin() {
  return <SidebarShell secoes={secoes} raiz="/admin" />
}
