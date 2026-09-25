'use client'

import { QrCode, ClipboardList, ClipboardCheck } from 'lucide-react'
import { SidebarShell, type SecaoNav } from '@/components/layout/sidebar-shell'

const secoes: SecaoNav[] = [
  {
    itens: [
      { label: 'Validar abastecimento',   href: '/frentista/validar',   icon: QrCode },
      { label: 'Registrar abastecimento', href: '/frentista/registrar', icon: ClipboardCheck },
      { label: 'Histórico',               href: '/frentista/historico', icon: ClipboardList },
    ],
  },
]

export function SidebarFrentista() {
  return <SidebarShell secoes={secoes} raiz="/frentista" />
}
