'use client'

import { SidebarEmpresa } from '@/components/layout/sidebar-empresa'
import { AppShell } from '@/components/layout/app-shell'
import { usePathname } from 'next/navigation'

function useBreadcrumb() {
  const pathname = usePathname()
  const segments = pathname.split('/').filter(Boolean)

  const labels: Record<string, string> = {
    empresa: 'Empresa',
    vitrine: 'Vitrine',
    parcerias: 'Parcerias',
    frota: 'Frota',
    veiculos: 'Veículos',
    motoristas: 'Motoristas',
    requisicoes: 'Requisições',
    nova: 'Nova requisição',
    historico: 'Histórico',
    configuracoes: 'Configurações',
    contrato: 'Contrato',
  }

  return segments.map((seg, i) => ({
    label: labels[seg] || seg,
    href: '/' + segments.slice(0, i + 1).join('/'),
  }))
}

export default function EmpresaLayout({ children }: { children: React.ReactNode }) {
  const breadcrumb = useBreadcrumb()

  return (
    <AppShell sidebar={<SidebarEmpresa />} breadcrumb={breadcrumb}>
      {children}
    </AppShell>
  )
}
