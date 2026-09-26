import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase-server'

// GET /api/empresa/historico?ano=2025&mes=3&postoId=…&veiculoId=…&motoristaId=…&pagina=1
//
// A tela já paginava — mas no cliente: a rota devolvia o mês inteiro com
// joins e o React fatiava 15 em 15. Uma frota com milhares de abastecimentos
// baixava tudo para mostrar quinze. O corte passou para o banco.
//
// Os números continuam os mesmos porque os agregados não saem da página:
//  • `registros` vem do count exato da consulta paginada;
//  • `valor` e `postos` saem de uma leitura enxuta (duas colunas, sem join)
//    sobre o MESMO conjunto filtrado;
//  • as opções dos filtros continuam cobrindo o mês inteiro SEM filtro, que é
//    o que a rota já fazia.
export async function GET(req: NextRequest) {
  try {
    const authClient = await createClient()
    const { data: { user }, error: userError } = await authClient.auth.getUser()
    if (userError || !user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

    const svc = createServiceClient()
    const { data: empresa } = await svc.from('empresas').select('id').eq('perfil_id', user.id).single()
    if (!empresa) return NextResponse.json({ error: 'Empresa não encontrada.' }, { status: 404 })

    const sp        = req.nextUrl.searchParams
    const ano       = parseInt(sp.get('ano')  ?? String(new Date().getFullYear()))
    const mes       = parseInt(sp.get('mes')  ?? String(new Date().getMonth() + 1))
    const postoId   = sp.get('postoId')   ?? null
    const veiculoId = sp.get('veiculoId') ?? null
    const motoristaId = sp.get('motoristaId') ?? null
    const pagina    = Math.max(1, parseInt(sp.get('pagina') ?? '1') || 1)
    // A exportação é um pedido explícito de "tudo" — é o único caso em que
    // varrer o período inteiro é o comportamento correto, e não um descuido.
    const tudo      = sp.get('tudo') === '1'
    // Teto para o cliente não conseguir pedir o mês inteiro de volta.
    const porPagina = Math.min(100, Math.max(1, parseInt(sp.get('porPagina') ?? '15') || 15))

    const inicio = new Date(ano, mes - 1, 1).toISOString()
    const fim    = new Date(ano, mes, 1).toISOString()         // início do mês seguinte

    const svcAny = svc as any

    // Mesmos filtros nas duas leituras do conjunto filtrado.
    const aplicarFiltros = (q: any) => {
      let r = q.eq('empresa_id', empresa.id).gte('data', inicio).lt('data', fim)
      if (postoId)     r = r.eq('posto_id',     postoId)
      if (veiculoId)   r = r.eq('veiculo_id',   veiculoId)
      if (motoristaId) r = r.eq('motorista_id', motoristaId)
      return r
    }

    const de  = (pagina - 1) * porPagina
    const ate = de + porPagina - 1

    // As três leituras só dependem de empresa.id e dos parâmetros — nenhuma usa
    // o resultado da outra, então partem juntas.
    const [pagResp, agregResp, opcoesResp] = await Promise.all([
      // 1. A página em si, com os joins que a tabela mostra.
      aplicarFiltros(
        svcAny.from('abastecimentos').select(
          'id, codigo, data, combustivel, litros, valor, veiculos(id, placa, modelo), motoristas(id, nome), postos(id, nome)',
          { count: 'exact' },
        ),
      )
        // `data` é TIMESTAMPTZ e não é único. Sem um segundo critério, a ordem
        // entre linhas do mesmo instante fica indefinida — e com paginação isso
        // permite a mesma linha cair em duas páginas, ou em nenhuma. O `id`
        // desempata e torna a ordenação total.
        .order('data', { ascending: false })
        .order('id', { ascending: false })
        .range(tudo ? 0 : de, tudo ? 99999 : ate),

      // 2. Agregados do conjunto filtrado INTEIRO. Duas colunas, sem join —
      //    é o que mantém "total do período" correto com a lista paginada.
      aplicarFiltros(svcAny.from('abastecimentos').select('valor, posto_id')),

      // 3. Opções dos filtros: mês inteiro, SEM os filtros de linha, só as
      //    colunas das relações. Antes isto reaproveitava a lista quando não
      //    havia filtro; com a lista paginada, deixou de cobrir o mês.
      svcAny.from('abastecimentos')
        .select('veiculos(id, placa, modelo), motoristas(id, nome), postos(id, nome)')
        .eq('empresa_id', empresa.id).gte('data', inicio).lt('data', fim),
    ])

    if (pagResp.error) throw pagResp.error
    const data = pagResp.data
    const totalRegistros = pagResp.count ?? 0

    const abastecimentos = (data ?? []).map((a: any) => {
      const v = a.veiculos   as { id: string; placa: string; modelo: string } | null
      const m = a.motoristas as { id: string; nome: string } | null
      const p = a.postos     as { id: string; nome: string } | null
      return {
        id:          a.id,
        codigo:      a.codigo,
        data:        new Date(a.data).toLocaleDateString('pt-BR'),
        veiculo:     v ? `${v.placa} · ${v.modelo}` : '—',
        veiculoId:   v?.id ?? null,
        veiculoPlaca: v?.placa ?? '—',
        motorista:   m?.nome ?? '—',
        motoristaId: m?.id ?? null,
        posto:       p?.nome ?? '—',
        postoId:     p?.id ?? null,
        combustivel: a.combustivel,
        litros:      Number(a.litros),
        valor:       Number(a.valor),
      }
    })

    // Totais do período: do conjunto filtrado inteiro, não da página.
    const agreg = (agregResp.data ?? []) as { valor: number; posto_id: string | null }[]
    const totalValor          = agreg.reduce((s, a) => s + Number(a.valor), 0)
    const totalAbastecimentos = totalRegistros
    const postosUnicos        = new Set(agreg.map((a) => a.posto_id).filter(Boolean)).size

    const fonteOpcoes: any[] = opcoesResp.data ?? []

    const postoMap    = new Map<string, string>()
    const veiculoMap  = new Map<string, string>()
    const motoristaMap = new Map<string, string>()

    for (const a of fonteOpcoes) {
      const v = a.veiculos   as { id: string; placa: string; modelo: string } | null
      const m = a.motoristas as { id: string; nome: string } | null
      const p = a.postos     as { id: string; nome: string } | null
      if (p) postoMap.set(p.id, p.nome)
      if (v) veiculoMap.set(v.id, `${v.placa} · ${v.modelo}`)
      if (m) motoristaMap.set(m.id, m.nome)
    }

    const opcoes = {
      postos:    [...postoMap.entries()].map(([id, nome]) => ({ id, nome })),
      veiculos:  [...veiculoMap.entries()].map(([id, nome]) => ({ id, nome })),
      motoristas: [...motoristaMap.entries()].map(([id, nome]) => ({ id, nome })),
    }

    return NextResponse.json({
      abastecimentos,
      totais: { valor: totalValor, registros: totalAbastecimentos, postos: postosUnicos },
      opcoes,
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
