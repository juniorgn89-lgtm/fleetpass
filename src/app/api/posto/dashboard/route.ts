import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

    const svc = createServiceClient()

    // Conta e postos do usuário
    const { data: conta } = await svc
      .from('contas_posto')
      .select('id')
      .eq('perfil_id', user.id)
      .single()

    if (!conta) return NextResponse.json({ error: 'Conta não encontrada.' }, { status: 404 })

    const { data: postos } = await svc
      .from('postos')
      .select('id, nome')
      .eq('conta_posto_id', conta.id)
      .eq('status', 'ativo')

    if (!postos?.length) {
      return NextResponse.json({
        metrics: { abastecimentosPeriodo: 0, receitaB2B: 0, litrosPeriodo: 0, ticketMedio: 0, solicitacoesPendentes: 0, empresasParceiras: 0 },
        solicitacoes: [],
        recentActivity: [],
        periodos: buildPeriodos(),
        postosDesempenho: [],
      })
    }

    const postoIds = postos.map((p) => p.id)

    // ── Período selecionado ────────────────────────────────────────
    const { searchParams } = new URL(req.url)
    const periodoParam = searchParams.get('periodo') // "2026-03-01"
    const periodos = buildPeriodos()
    const periodoSel = periodos.find((p) => p.inicio === periodoParam) ?? periodos[0]

    // ── Métricas do mês atual (periodos[0]) ───────────────────────
    // Tudo na tela fala do MESMO período: cartões, tabela e gráficos. Antes
    // estes dois saíam de periodos[0] (mês corrente, fixo), então trocar para
    // "Ago/26" mudava a tabela e os gráficos e deixava os cartões em setembro.

    // Métricas + solicitações pendentes em paralelo (antes: 4 round-trips seriais)
    const [
      { data: abastMes },
      { count: solPendentes },
      { count: parceiros },
      { data: solicitacoesRaw },
    ] = await Promise.all([
      svc.from('abastecimentos').select('valor')
        .in('posto_id', postoIds).gte('data', periodoSel.inicio).lte('data', periodoSel.fim + 'T23:59:59'),
      svc.from('solicitacoes').select('id', { count: 'exact', head: true })
        .in('posto_id', postoIds).eq('status', 'aguardando'),
      svc.from('parcerias').select('id', { count: 'exact', head: true })
        .in('posto_id', postoIds).eq('status', 'ativa'),
      svc.from('solicitacoes').select(`
        id, combustiveis, volume_estimado, valor_estimado, mensagem, posto_id,
        empresas ( nome_empresa, cnpj, cidade, estado )
      `).in('posto_id', postoIds).eq('status', 'aguardando').order('created_at', { ascending: false }).limit(10),
    ])

    const abastecimentosPeriodo = abastMes?.length ?? 0
    const receitaB2B = (abastMes ?? []).reduce((s, a) => s + Number(a.valor), 0)

    const postoNomeMap = Object.fromEntries(postos.map((p) => [p.id, p.nome]))

    const solicitacoes = (solicitacoesRaw ?? []).map((s) => {
      const emp = s.empresas as { nome_empresa: string; cnpj: string; cidade: string; estado: string } | null
      return {
        id: s.id,
        posto: postoNomeMap[s.posto_id] ?? '',
        empresa: emp?.nome_empresa ?? '',
        cnpj: emp?.cnpj ?? '',
        cidade: emp ? `${emp.cidade}, ${emp.estado}` : '',
        combustiveis: Array.isArray(s.combustiveis) ? s.combustiveis as string[] : [],
        volume: s.volume_estimado ?? '',
        valorEstimado: s.valor_estimado
          ? Number(s.valor_estimado).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) + '/mês'
          : '',
        mensagem: s.mensagem ?? '',
      }
    })

    // ── Atividade recente ─────────────────────────────────────────
    const [abastRecentes, solRecentes, parcRecentes] = await Promise.all([
      svc.from('abastecimentos')
        .select('id, posto_id, data, combustivel, litros, valor, motoristas(nome), veiculos(placa), requisicoes(codigo)')
        .in('posto_id', postoIds)
        .order('data', { ascending: false })
        .limit(3),

      svc.from('solicitacoes')
        .select('id, posto_id, created_at, empresas(nome_empresa)')
        .in('posto_id', postoIds)
        .eq('status', 'aguardando')
        .order('created_at', { ascending: false })
        .limit(3),

      svc.from('parcerias')
        .select('id, posto_id, iniciada_em, empresas(nome_empresa)')
        .in('posto_id', postoIds)
        .eq('status', 'ativa')
        .order('iniciada_em', { ascending: false })
        .limit(3),
    ])

    type ActivityItem = {
      tipo: 'concluido' | 'pendente' | 'ativo'
      desc: string
      sub: string
      time: string
      posto: string
      ts: string
    }

    const activityItems: ActivityItem[] = []

    ;(abastRecentes.data ?? []).forEach((a) => {
      const motorista = (a.motoristas as { nome?: string } | null)?.nome ?? ''
      const empresa = ''
      const req = (a.requisicoes as { codigo?: string } | null)?.codigo ?? ''
      const veiculo = (a.veiculos as { placa?: string } | null)?.placa ?? ''
      activityItems.push({
        tipo: 'concluido',
        desc: `${req} validada${motorista ? ` por ${motorista}` : ''}${empresa ? ` — ${empresa}` : ''}`,
        sub: `${veiculo} · ${a.combustivel} · ${Number(a.litros).toFixed(0)} L`,
        time: new Date(a.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        posto: postoNomeMap[a.posto_id] ?? '',
        ts: a.data,
      })
    })

    ;(solRecentes.data ?? []).forEach((s) => {
      const emp = (s.empresas as { nome_empresa?: string } | null)?.nome_empresa ?? ''
      activityItems.push({
        tipo: 'pendente',
        desc: `Nova solicitação de ${emp}`,
        sub: '',
        time: new Date(s.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        posto: postoNomeMap[s.posto_id] ?? '',
        ts: s.created_at,
      })
    })

    ;(parcRecentes.data ?? []).forEach((p) => {
      const emp = (p.empresas as { nome_empresa?: string } | null)?.nome_empresa ?? ''
      activityItems.push({
        tipo: 'ativo',
        desc: `Parceria com ${emp} aprovada`,
        sub: 'Contrato ativo',
        time: new Date(p.iniciada_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        posto: postoNomeMap[p.posto_id] ?? '',
        ts: p.iniciada_em,
      })
    })

    activityItems.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())

    // ── Desempenho por posto no período selecionado ───────────────
    const { data: abastPeriodo } = await svc
      .from('abastecimentos')
      .select('posto_id, valor, litros, combustivel, data')
      .in('posto_id', postoIds)
      .gte('data', periodoSel.inicio)
      .lte('data', periodoSel.fim + 'T23:59:59')

    const postosDesempenho = postos.map((p) => {
      const linhas = (abastPeriodo ?? []).filter((a) => a.posto_id === p.id)
      const receita = linhas.reduce((s, a) => s + Number(a.valor), 0)
      const litros  = linhas.reduce((s, a) => s + Number(a.litros), 0)
      const count   = linhas.length
      const combMap: Record<string, { litros: number; valor: number }> = {}
      linhas.forEach((a) => {
        if (!combMap[a.combustivel]) combMap[a.combustivel] = { litros: 0, valor: 0 }
        combMap[a.combustivel].litros += Number(a.litros)
        combMap[a.combustivel].valor  += Number(a.valor)
      })
      const combustiveis = Object.entries(combMap)
        .map(([nome, d]) => ({ nome, ...d }))
        .sort((a, b) => b.litros - a.litros)
      return { id: p.id, label: p.nome, receita, litros, count, combustiveis }
    })

    // ── Série diária do período ───────────────────────────────────
    // Alimenta os dois gráficos e os minigráficos dos cartões. Vem da MESMA
    // consulta do desempenho — só reagrupada por dia, sem ida extra ao banco.
    // Os dias sem movimento entram zerados: sem eles a linha "pula" buracos e
    // sugere um período mais curto do que o real.
    const porDia = new Map<string, { receita: number; litros: number; abastecimentos: number }>()
    for (
      let d = new Date(periodoSel.inicio + 'T00:00:00');
      d <= new Date(periodoSel.fim + 'T00:00:00');
      d.setDate(d.getDate() + 1)
    ) {
      porDia.set(d.toISOString().slice(0, 10), { receita: 0, litros: 0, abastecimentos: 0 })
    }
    ;(abastPeriodo ?? []).forEach((a) => {
      const dia = String(a.data).slice(0, 10)
      const acc = porDia.get(dia)
      if (!acc) return
      acc.receita += Number(a.valor)
      acc.litros  += Number(a.litros)
      acc.abastecimentos += 1
    })
    const serie = [...porDia.entries()].map(([dia, v]) => ({ dia, ...v }))

    const litrosPeriodo = (abastPeriodo ?? []).reduce((t, a) => t + Number(a.litros), 0)
    const ticketMedio = abastecimentosPeriodo > 0 ? receitaB2B / abastecimentosPeriodo : 0

    return NextResponse.json({
      serie,
      metrics: {
        abastecimentosPeriodo,
        receitaB2B,
        litrosPeriodo,
        ticketMedio,
        solicitacoesPendentes: solPendentes ?? 0,
        empresasParceiras: parceiros ?? 0,
      },
      solicitacoes,
      recentActivity: activityItems.slice(0, 5),
      periodos,
      periodoSelecionado: periodoSel.inicio,
      postosDesempenho,
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// Gera os últimos 3 meses completos + mês atual parcial
function buildPeriodos() {
  const now = new Date()
  const result: { label: string; inicio: string; fim: string }[] = []
  for (let i = 0; i < 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const inicio = d.toISOString().slice(0, 10)
    const fim = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10)
    const label = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
      .replace('. ', '/')
      .replace('.', '')
      .replace(/^\w/, (c) => c.toUpperCase())
    result.push({ label, inicio, fim })
  }
  return result
}
