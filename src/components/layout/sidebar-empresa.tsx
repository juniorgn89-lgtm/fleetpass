'use client'

import { Home, FileText, BarChart2, Settings, Truck, Users, Handshake, Zap, Receipt, Store } from 'lucide-react'
import { SidebarShell, type SecaoNav } from '@/components/layout/sidebar-shell'
import { useParceriasPendencias } from '@/hooks/use-parcerias-pendencias'

// "Frota" era um cabeçalho com dois filhos recuados; virou seção com título,
// que é como o shell (e o Visor360) agrupam. Mesmo resultado visual, e recolhida
// os filhos continuam alcançáveis pelo ícone — recuo não sobreviveria a 64px.
const secoes: SecaoNav[] = [
  {
    itens: [
      { label: 'Visão geral', href: '/empresa',          icon: Home },
      { label: 'Vitrine',     href: '/empresa/vitrine',  icon: Store },
      { label: 'Parcerias',   href: '/empresa/parcerias', icon: Handshake },
    ],
  },
  {
    titulo: 'Frota',
    itens: [
      { label: 'Veículos',   href: '/empresa/frota/veiculos',   icon: Truck },
      { label: 'Motoristas', href: '/empresa/frota/motoristas', icon: Users },
    ],
  },
  {
    titulo: 'Operações',
    itens: [
      { label: 'Requisições',  href: '/empresa/requisicoes', icon: FileText },
      { label: 'Abast. Livre', href: '/empresa/liberacoes',  icon: Zap },
      { label: 'Faturamento',  href: '/empresa/faturamento', icon: Receipt },
      { label: 'Histórico',    href: '/empresa/historico',   icon: BarChart2 },
    ],
  },
  {
    titulo: 'Configurações',
    itens: [{ label: 'Configurações', href: '/empresa/configuracoes', icon: Settings }],
  },
]

export function SidebarEmpresa() {
  const pendencias = useParceriasPendencias()

  const comBadge = secoes.map((s) => ({
    ...s,
    itens: s.itens.map((i) =>
      i.href === '/empresa/parcerias' ? { ...i, badge: pendencias.total } : i,
    ),
  }))

  return <SidebarShell secoes={comBadge} raiz="/empresa" />
}
