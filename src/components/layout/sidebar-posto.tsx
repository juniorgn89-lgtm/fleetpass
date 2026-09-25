'use client'

import {
  Home, FileText, BarChart2, Settings, Users, Handshake,
  ClipboardList, Building2, Droplets, CalendarDays, Store, Receipt, Clock, UserPlus,
} from 'lucide-react'
import { SidebarShell, type SecaoNav } from '@/components/layout/sidebar-shell'
import { useParceriasPendencias } from '@/hooks/use-parcerias-pendencias'

const secoes: SecaoNav[] = [
  { itens: [{ label: 'Visão geral', href: '/posto', icon: Home }] },
  {
    titulo: 'Parcerias',
    itens: [
      { label: 'Clientes',     href: '/posto/clientes',              icon: UserPlus },
      { label: 'Solicitações', href: '/posto/parcerias/solicitacoes', icon: ClipboardList },
      { label: 'Parceiros',    href: '/posto/parcerias/ativos',       icon: Handshake },
    ],
  },
  {
    titulo: 'Cadastros',
    itens: [
      { label: 'Meus Postos', href: '/posto/meus-postos', icon: Store },
      { label: 'Frentistas',  href: '/posto/frentistas',  icon: Users },
    ],
  },
  {
    titulo: 'Operações',
    itens: [
      { label: 'Requisições', href: '/posto/requisicoes', icon: FileText },
      { label: 'Faturamento', href: '/posto/faturamento', icon: Receipt },
      { label: 'Histórico',   href: '/posto/historico',   icon: BarChart2 },
    ],
  },
  {
    titulo: 'Relatórios',
    itens: [
      { label: 'Por Empresa',     href: '/posto/relatorios/empresas',     icon: Building2 },
      { label: 'Por Combustível', href: '/posto/relatorios/combustiveis', icon: Droplets },
      { label: 'Por Período',     href: '/posto/relatorios/periodo',      icon: CalendarDays },
      { label: 'Por Frentista',   href: '/posto/relatorios/frentistas',   icon: Users },
      { label: 'Linha do Tempo',  href: '/posto/relatorios/cliente',      icon: Clock },
    ],
  },
  {
    titulo: 'Configurações',
    itens: [{ label: 'Configurações', href: '/posto/configuracoes', icon: Settings }],
  },
]

export function SidebarPosto() {
  const pendencias = useParceriasPendencias()

  // O selo de pendências vive na config, não no shell: cada papel tem a sua
  // fonte de contagem.
  const comBadge = secoes.map((s) => ({
    ...s,
    itens: s.itens.map((i) =>
      i.href === '/posto/parcerias/solicitacoes' ? { ...i, badge: pendencias.total } : i,
    ),
  }))

  return <SidebarShell secoes={comBadge} raiz="/posto" />
}
