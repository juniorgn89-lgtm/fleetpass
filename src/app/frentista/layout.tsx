'use client'

import { SidebarFrentista } from '@/components/layout/sidebar-frentista'
import { AppShell } from '@/components/layout/app-shell'
import { usePathname } from 'next/navigation'

function useBreadcrumb() {
  const pathname = usePathname()
  const segments = pathname.split('/').filter(Boolean)

  const labels: Record<string, string> = {
    frentista: 'Frentista',
    validar:   'Validar abastecimento',
    registrar: 'Registrar abastecimento',
    historico: 'Minhas validações',
  }

  return segments.map((seg, i) => ({
    label: labels[seg] || decodeURIComponent(seg),
    href: '/' + segments.slice(0, i + 1).join('/'),
  }))
}

export default function FreentistaLayout({ children }: { children: React.ReactNode }) {
  const breadcrumb = useBreadcrumb()

  return (
    <AppShell sidebar={<SidebarFrentista />} breadcrumb={breadcrumb}>
      {children}
    </AppShell>
  )
}
