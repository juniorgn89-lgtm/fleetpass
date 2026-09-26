'use client'

import Link from 'next/link'
import { Logo } from '@/components/ui/logo'
import { Topbar } from '@/components/layout/topbar'
import { AcoesTopo } from '@/components/layout/acoes-topo'

/**
 * Casca da aplicação — mesma arquitetura do AppLayout do Visor360.
 *
 * Lá o arranjo é: uma BARRA DE TOPO de largura total, com a logo na ponta
 * esquerda (fora do menu que recolhe, estilo Gmail), e abaixo dela o par
 * [sidebar | painel de conteúdo]. O painel é um cartão de cantos arredondados
 * flutuando sobre o cinza do shell.
 *
 * O FleetPass fazia o oposto: a sidebar ocupava a altura toda, com a logo
 * dentro dela, e a topbar começava só depois. Isso inverte a hierarquia — a
 * logo passava a pertencer ao menu em vez de à aplicação, e o topo ficava
 * partido ao meio.
 *
 * Os quatro papéis repetiam essa casca palavra por palavra. Agora é uma só.
 *
 * O breadcrumb ficou, por decisão do usuário: o Visor360 usa um slot de título
 * preenchido por cada página, que é outro mecanismo, não outra aparência.
 */
export function AppShell({
  sidebar,
  breadcrumb,
  children,
}: {
  sidebar: React.ReactNode
  breadcrumb?: { label: string; href?: string }[]
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-gray-100 print:block print:h-auto print:overflow-visible print:bg-white">
      {/* Barra de topo de largura total. A logo vive aqui, não na sidebar. */}
      <header className="shrink-0 h-14 flex items-center gap-4 px-4 border-b border-gray-200 bg-white print:hidden">
        <Link href="/" className="shrink-0" aria-label="FleetPass — início">
          <Logo tamanho={28} />
        </Link>
        {/* Cluster de ações na ponta direita da barra de topo, e não na faixa
            do breadcrumb — é onde o Visor360 os coloca. */}
        <div className="ml-auto"><AcoesTopo /></div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div className="print:hidden">{sidebar}</div>

        {/* Painel de conteúdo — cartão arredondado sobre o cinza do shell.
            A topbar interna e o <main> que rola vivem dentro dele. */}
        <div className="relative flex flex-1 flex-col overflow-hidden bg-gray-50 m-2 rounded-2xl border border-gray-200 print:m-0 print:rounded-none print:border-0">
          <div className="print:hidden"><Topbar breadcrumb={breadcrumb} /></div>
          <main className="flex-1 overflow-y-auto p-6 print:overflow-visible print:p-0">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}
