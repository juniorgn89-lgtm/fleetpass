/**
 * Notas de versão — a fonte ÚNICA do "o que há de novo".
 *
 * Aparecem em três lugares: (1) na tela de atualização, enquanto a versão nova
 * é instalada, (2) no aviso "FleetPass atualizado" depois do reinício e (3) na
 * linha "Novidades" das configurações e do menu de conta.
 *
 * A rota `/api/versao` também devolve este arquivo: é por ela que o app ANTIGO,
 * na hora de atualizar, lê as novidades da versão NOVA — o bundle velho não as
 * conhece.
 *
 * Regras: linguagem de posto e de transportadora (o que muda no dia a dia
 * deles, não o commit); versão mais nova primeiro; cada release usa a versão do
 * package.json daquele deploy. Este arquivo fica SEM imports — os ícones são
 * chaves, resolvidas em `components/feedback/novidades.tsx`.
 */
export type NovidadeIcone =
  | 'parcerias'
  | 'requisicoes'
  | 'faturamento'
  | 'frota'
  | 'frentista'
  | 'apps'
  | 'atualizacao'
  | 'ajuste'

export interface Novidade {
  icone: NovidadeIcone
  titulo: string
  descricao: string
}

export interface ReleaseNote {
  /** Igual ao `version` do package.json daquele deploy. */
  versao: string
  /** aaaa-mm-dd */
  data: string
  /** Uma frase que resume a versão. */
  resumo: string
  itens: Novidade[]
}

export const RELEASE_NOTES: ReleaseNote[] = [
  {
    versao: '0.2.0',
    data: '2026-09-28',
    resumo: 'Cadastro de posto pelo CNPJ, tela do parceiro com mapa, tema escuro e telas mais rápidas.',
    itens: [
      {
        icone: 'ajuste',
        titulo: 'Cadastre seu posto digitando só o CNPJ',
        descricao:
          'Razão social, endereço e telefone vêm prontos da Receita Federal. Quando o endereço não consta lá, completamos pelo CEP. Sobra você informar bandeira, combustíveis e WhatsApp.',
      },
      {
        icone: 'parcerias',
        titulo: 'Veja os dados do posto parceiro sem sair da tela',
        descricao:
          'Em Parcerias, o botão "Ver posto" abre CNPJ, endereço, combustíveis, o mapa da localização e um atalho para falar no WhatsApp ou traçar a rota.',
      },
      {
        icone: 'frota',
        titulo: 'Central da frota em Veículos',
        descricao:
          'Indicadores por combustível e em manutenção, busca por placa, modelo ou motorista, filtro por situação e paginação. Cada veículo abre um detalhe com o uso dos últimos 90 dias.',
      },
      {
        icone: 'faturamento',
        titulo: 'Painel do posto com evolução no tempo',
        descricao:
          'Faturamento e volume por dia, tabela de desempenho por posto com colunas comparáveis, e o período escolhido agora vale para os cartões, a tabela e os gráficos ao mesmo tempo.',
      },
      {
        icone: 'requisicoes',
        titulo: 'Histórico que abre rápido mesmo com muito abastecimento',
        descricao:
          'A lista passou a carregar por página em vez de baixar o mês inteiro. A exportação em CSV continua trazendo o período completo.',
      },
      {
        icone: 'ajuste',
        titulo: 'Tema claro e escuro',
        descricao:
          'Escolha no topo entre Claro, Escuro ou seguir o sistema do aparelho. Útil para o frentista no balcão à noite.',
      },
      {
        icone: 'apps',
        titulo: 'Os apps da CCI num só botão',
        descricao:
          'O botão de grade no topo abre o Visor360, o Prospecção360 e os portais da CCI, sem precisar guardar endereço.',
      },
      {
        icone: 'atualizacao',
        titulo: 'Esta tela de atualização',
        descricao:
          'A cada versão nova você vê o que mudou enquanto ela é instalada, e de novo pela linha "Novidades".',
      },
    ],
  },
]

/** Compara versões "1.2.0" numericamente (positivo se a > b). */
export const compararVersao = (a: string, b: string): number => {
  const pa = a.split('.').map((n) => parseInt(n, 10) || 0)
  const pb = b.split('.').map((n) => parseInt(n, 10) || 0)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0)
    if (d !== 0) return d
  }
  return 0
}
