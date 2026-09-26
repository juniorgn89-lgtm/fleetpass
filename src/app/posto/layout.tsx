'use client'

import { SidebarPosto } from '@/components/layout/sidebar-posto'
import { AppShell } from '@/components/layout/app-shell'
import { usePathname } from 'next/navigation'

function useBreadcrumb() {
  const pathname = usePathname()
  const segments = pathname.split('/').filter(Boolean)

  const labels: Record<string, string> = {
    posto: 'Posto',
    parcerias: 'Parcerias',
    solicitacoes: 'Solicitações',
    ativos: 'Parceiros ativos',
    frentistas: 'Frentistas',
    requisicoes: 'Requisições',
    faturamento: 'Faturamento',
    financeiro: 'Financeiro',
    historico: 'Histórico',
    relatorios: 'Relatórios',
    empresas: 'Por Empresa',
    combustiveis: 'Por Combustível',
    periodo: 'Por Período',
    configuracoes: 'Configurações',
  }

  return segments.map((seg, i) => ({
    label: labels[seg] || decodeURIComponent(seg).replace(/-/g, ' '),
    href: '/' + segments.slice(0, i + 1).join('/'),
  }))
}

export default function PostoLayout({ children }: { children: React.ReactNode }) {
  const breadcrumb = useBreadcrumb()

  return (
    <AppShell sidebar={<SidebarPosto />} breadcrumb={breadcrumb}>
      {children}
    </AppShell>
  )
}
