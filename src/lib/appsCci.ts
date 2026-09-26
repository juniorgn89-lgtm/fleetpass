import { LayoutDashboard, Target, ShieldCheck, Building2, Fuel, type LucideIcon } from 'lucide-react'

/**
 * Registro dos apps da suíte CCI — alimenta o launcher (botão de grade no
 * topo, estilo Google). Para acrescentar um app, basta uma entrada aqui.
 *
 * Espelha `src/lib/appsCci.ts` do Visor360, com uma diferença: lá o FleetPass
 * ainda não constava na lista. Ele entra aqui como o app atual.
 *
 * Fase atual = SÓ launcher (sem SSO): cada app mantém o próprio login. Como o
 * Supabase guarda a sessão no navegador, o usuário digita a senha uma vez por
 * app/aparelho e depois o clique já abre logado. SSO de verdade (identidade
 * única + cookie em cci.app.br) fica para outra fase, sem mexer neste registro.
 */
export interface CciApp {
  id: string
  nome: string
  descricao: string
  url: string
  /** Ícone Lucide dentro de um quadrado com gradiente (`tile`)… */
  Icon?: LucideIcon
  /** …ou uma imagem de marca (tem prioridade sobre `Icon`). */
  img?: string
  /** Gradiente do tile (classes Tailwind) — usado com `Icon`. */
  tile?: string
  /** Rótulo opcional ("Em breve") — desabilita o tile. */
  badge?: string
  /**
   * 'master' = só quem administra vê o tile (ex.: portal interno).
   * No Visor360 isso é o papel `diretor`; aqui o equivalente é
   * `perfis.role = 'admin'`, já que o FleetPass não tem `diretor`.
   */
  visivelPara?: 'master' | 'todos'
}

/** Id do app onde este código roda — o tile fica marcado como "você está aqui". */
export const APP_ATUAL_ID = 'fleetpass'

export const CCI_APPS: CciApp[] = [
  {
    // Primeiro, como a "Conta" do Google: o site/seletor de portais da CCI.
    id: 'cci',
    nome: 'CCI',
    descricao: 'CCI Consultoria — selecione o portal',
    url: 'https://www.cci.app.br/',
    img: '/brand/cci-simbolo.png',
  },
  {
    id: 'visor360',
    nome: 'Visor360',
    descricao: 'Gestão da rede de postos',
    url: 'https://visor360.cci.app.br/',
    Icon: LayoutDashboard,
    tile: 'from-[#1e3a5f] to-[#2563eb]',
  },
  {
    id: 'prospeccao360',
    nome: 'Prospecção360',
    descricao: 'Funil e carteira de prospecção',
    url: 'https://prospeccao360.cci.app.br/login',
    Icon: Target,
    tile: 'from-[#0F766E] to-[#14b8a6]',
  },
  {
    // App atual: sem link, marcado com "aqui". As duas cores do tile são as
    // do símbolo da marca — teal e âmbar.
    id: 'fleetpass',
    nome: 'FleetPass',
    descricao: 'Abastecimento B2B entre postos e transportadoras',
    url: 'https://fleetpass.cci.app.br/',
    Icon: Fuel,
    tile: 'from-[#0f766e] to-[#fcb619]',
  },
  {
    id: 'portal-cliente',
    nome: 'Portal do Cliente',
    descricao: 'Relatórios, DRE, fluxo de caixa, serviços BPO, documentos e financeiro',
    url: 'https://www.cci.app.br/cliente/login',
    Icon: Building2,
    tile: 'from-[#f59e0b] to-[#FCB619]',
  },
  {
    id: 'portal-admin',
    nome: 'Portal Admin',
    descricao: 'Financeiro, clientes, notas fiscais, boletos e parametrizações do escritório',
    url: 'https://www.cci.app.br/admin/dashboard',
    Icon: ShieldCheck,
    tile: 'from-[#0b5c55] to-[#0F766E]',
    visivelPara: 'master',
  },
]
