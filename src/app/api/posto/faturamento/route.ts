import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase-server'

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  if (err && typeof err === 'object') {
    const e = err as { message?: string; details?: string; hint?: string }
    return [e.message, e.details, e.hint].filter(Boolean).join(' · ') || 'Erro no banco.'
  }
  return String(err)
}

const CICLO_LABEL: Record<string, string> = {
  diario: 'Diário', semanal: 'Semanal', quinzenal: 'Quinzenal', mensal: 'Mensal',
}
const dataBR = (d: string | null) => (d ? new Date(d).toLocaleDateString('pt-BR') : '—')
const ymd    = (d: Date) => d.toISOString().slice(0, 10)

async function contaEPostos(svc: any, userId: string) {
  const { data: conta } = await svc.from('contas_posto').select('id').eq('perfil_id', userId).single()
  if (!conta) return { postoIds: [] as string[], postoNome: {} as Record<string, string> }
  const { data: postos } = await svc.from('postos').select('id, nome').eq('conta_posto_id', conta.id)
  return {
    postoIds: (postos ?? []).map((p: any) => p.id) as string[],
    postoNome: Object.fromEntries((postos ?? []).map((p: any) => [p.id, p.nome])) as Record<string, string>,
  }
}

// ── GET — faturas fechadas (reais) + faturas pendentes (calculadas) ──────────
export async function GET() {
  try {
    const authClient = await createClient()
    const { data: { user }, error: userError } = await authClient.auth.getUser()
    if (userError || !user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

    const svc = createServiceClient() as any
    const { postoIds, postoNome } = await contaEPostos(svc, user.id)
    if (postoIds.length === 0) return NextResponse.json({ faturamentos: [] })

    // As duas leituras abaixo só dependem de `postoIds` — nenhuma usa o
    // resultado da outra. Estavam em sequência, somando os dois tempos de ida
    // e volta; agora partem juntas. A cadeia acima (auth → contas_posto →
    // postos) continua sequencial porque cada passo alimenta o próximo, e a
    // consulta de parcerias mais abaixo continua depois dos pendentes porque
    // usa os ids que saem deles.
    const [{ data: fechadasRaw }, { data: pend }] = await Promise.all([
      // 1. Faturas já fechadas (tabela faturamentos)
      svc
      .from('faturamentos')
      .select(`
        id, numero, posto_id, periodo_inicio, periodo_fim, ciclo, desc_ciclo,
        data_faturamento, data_vencimento, total_abastecimentos, total_litros, total_valor, status,
        empresas ( nome_empresa, cnpj ),
        faturamento_abastecimentos ( abastecimentos ( codigo, data, combustivel, litros, valor, veiculos ( placa ), motoristas ( nome ) ) )
      `)
      .in('posto_id', postoIds)
      .order('data_faturamento', { ascending: false }),

      // 2. Faturas pendentes — abastecimentos ainda não faturados
      svc
        .from('abastecimentos')
        .select(`
          id, parceria_id, posto_id, codigo, data, combustivel, litros, valor,
          empresas ( nome_empresa, cnpj ), veiculos ( placa ), motoristas ( nome )
        `)
        .in('posto_id', postoIds)
        .eq('status', 'pendente')
        .not('parceria_id', 'is', null)
        .order('data', { ascending: true }),
    ])

    const mapDetalhe = (items: any[]) => (items ?? []).map((fa: any) => {
      const a = fa.abastecimentos
      return {
        codigo: a?.codigo ?? '—', data: a?.data ? dataBR(a.data) : '—',
        veiculo: (a?.veiculos as { placa: string } | null)?.placa ?? '—',
        motorista: (a?.motoristas as { nome: string } | null)?.nome ?? '—',
        combustivel: a?.combustivel ?? '—', litros: Number(a?.litros ?? 0), valor: Number(a?.valor ?? 0),
      }
    })

    const fechadas = (fechadasRaw ?? []).map((f: any) => {
      const emp = f.empresas as { nome_empresa: string; cnpj: string } | null
      return {
        id: f.numero || f.id, empresa: emp?.nome_empresa ?? '—', cnpj: emp?.cnpj ?? '—',
        posto: postoNome[f.posto_id] ?? '—', ciclo: f.ciclo || '—', descCiclo: f.desc_ciclo || '',
        periodo: { inicio: dataBR(f.periodo_inicio), fim: dataBR(f.periodo_fim) },
        dataFaturamento: dataBR(f.data_faturamento), dataPagamento: dataBR(f.data_vencimento),
        abastecimentos: f.total_abastecimentos, litros: Number(f.total_litros), valor: Number(f.total_valor),
        status: 'enviado' as const, detalhe: mapDetalhe(f.faturamento_abastecimentos),
      }
    })

    // Agrupa os pendentes por parceria.
    const grupos: Record<string, any[]> = {}
    for (const a of pend ?? []) {
      ;(grupos[a.parceria_id] ??= []).push(a)
    }

    const parceriaIds = Object.keys(grupos)
    const parceriasMap: Record<string, any> = {}
    if (parceriaIds.length) {
      const { data: parcs } = await svc
        .from('parcerias').select('id, ciclo_tipo, ciclo_prazo_recebimento').in('id', parceriaIds)
      for (const p of parcs ?? []) parceriasMap[p.id] = p
    }

    const pendentes = parceriaIds.map((pid) => {
      const itens = grupos[pid]
      const parc = parceriasMap[pid] ?? { ciclo_tipo: 'mensal', ciclo_prazo_recebimento: 5 }
      const emp = itens[0].empresas as { nome_empresa: string; cnpj: string } | null
      const datas = itens.map((a) => new Date(a.data).getTime())
      const ini = new Date(Math.min(...datas)); const fim = new Date(Math.max(...datas))
      const prazo = parc.ciclo_prazo_recebimento ?? 5
      return {
        id: `pend-${pid}`, parceriaId: pid,
        empresa: emp?.nome_empresa ?? '—', cnpj: emp?.cnpj ?? '—',
        posto: postoNome[itens[0].posto_id] ?? '—',
        ciclo: `${CICLO_LABEL[parc.ciclo_tipo] ?? 'Mensal'} + ${prazo} dias`,
        descCiclo: `Vencimento ${prazo} dias após o fechamento`,
        periodo: { inicio: dataBR(ymd(ini)), fim: dataBR(ymd(fim)) },
        dataFaturamento: dataBR(ymd(new Date())),
        dataPagamento: dataBR(ymd(new Date(Date.now() + prazo * 86400000))),
        abastecimentos: itens.length,
        litros: itens.reduce((s, a) => s + Number(a.litros), 0),
        valor: itens.reduce((s, a) => s + Number(a.valor), 0),
        status: 'pendente' as const,
        detalhe: itens.map((a) => ({
          codigo: a.codigo, data: dataBR(a.data),
          veiculo: (a.veiculos as { placa: string } | null)?.placa ?? '—',
          motorista: (a.motoristas as { nome: string } | null)?.nome ?? '—',
          combustivel: a.combustivel, litros: Number(a.litros), valor: Number(a.valor),
        })),
      }
    })

    return NextResponse.json({ faturamentos: [...pendentes, ...fechadas] })
  } catch (err) {
    console.error('[posto/faturamento GET]', err)
    return NextResponse.json({ error: errorMessage(err) }, { status: 500 })
  }
}

// ── POST — fecha a fatura de uma parceria (cria faturamento + itens) ─────────
export async function POST(req: NextRequest) {
  try {
    const authClient = await createClient()
    const { data: { user }, error: userError } = await authClient.auth.getUser()
    if (userError || !user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

    const svc = createServiceClient() as any
    const { postoIds } = await contaEPostos(svc, user.id)
    if (postoIds.length === 0) return NextResponse.json({ error: 'Conta de posto não encontrada.' }, { status: 404 })

    const body = await req.json().catch(() => ({}))
    const parceriaId = String(body?.parceriaId ?? '')
    if (!parceriaId) return NextResponse.json({ error: 'parceriaId obrigatório.' }, { status: 400 })

    // Parceria precisa pertencer a um posto da conta (anti-IDOR)
    const { data: parc } = await svc
      .from('parcerias')
      .select('id, empresa_id, posto_id, ciclo_tipo, ciclo_prazo_recebimento')
      .eq('id', parceriaId)
      .in('posto_id', postoIds)
      .maybeSingle()
    if (!parc) return NextResponse.json({ error: 'Parceria não encontrada neste posto.' }, { status: 404 })

    // Abastecimentos pendentes da parceria
    const { data: itens } = await svc
      .from('abastecimentos')
      .select('id, data, litros, valor')
      .eq('parceria_id', parceriaId)
      .eq('posto_id', parc.posto_id)
      .eq('status', 'pendente')
    if (!itens?.length) return NextResponse.json({ error: 'Não há abastecimentos pendentes para faturar.' }, { status: 422 })

    const datas = itens.map((a: any) => new Date(a.data).getTime())
    const prazo = parc.ciclo_prazo_recebimento ?? 5
    const hoje = new Date()
    const venc = new Date(Date.now() + prazo * 86400000)

    // 1. Cria o faturamento (numero gerado por trigger)
    const { data: fat, error: fatErr } = await svc
      .from('faturamentos')
      .insert({
        posto_id:             parc.posto_id,
        empresa_id:           parc.empresa_id,
        parceria_id:          parceriaId,
        periodo_inicio:       ymd(new Date(Math.min(...datas))),
        periodo_fim:          ymd(new Date(Math.max(...datas))),
        ciclo:                `${CICLO_LABEL[parc.ciclo_tipo] ?? 'Mensal'} + ${prazo} dias`,
        desc_ciclo:           `Vencimento ${prazo} dias após o fechamento`,
        data_faturamento:     ymd(hoje),
        data_vencimento:      ymd(venc),
        total_abastecimentos: itens.length,
        total_litros:         itens.reduce((s: number, a: any) => s + Number(a.litros), 0),
        total_valor:          itens.reduce((s: number, a: any) => s + Number(a.valor), 0),
        status:               'enviado',
      })
      .select('id, numero')
      .single()
    if (fatErr) throw fatErr

    // 2. Itens da fatura
    const { error: itErr } = await svc.from('faturamento_abastecimentos').insert(
      itens.map((a: any) => ({ faturamento_id: fat.id, abastecimento_id: a.id })),
    )
    if (itErr) throw itErr

    // 3. Marca os abastecimentos como faturados
    const { error: updErr } = await svc
      .from('abastecimentos').update({ status: 'faturado' }).in('id', itens.map((a: any) => a.id))
    if (updErr) throw updErr

    return NextResponse.json({ fechado: true, numero: fat.numero })
  } catch (err) {
    console.error('[posto/faturamento POST]', err)
    return NextResponse.json({ error: errorMessage(err) }, { status: 500 })
  }
}
