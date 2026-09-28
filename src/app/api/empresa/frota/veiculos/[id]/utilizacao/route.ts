import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { getAuthUser } from '@/lib/api-auth'

/** Janela da seção "Utilização recente". */
const DIAS = 90

/**
 * GET /api/empresa/frota/veiculos/[id]/utilizacao — uso recente de UM veículo.
 *
 * Existe porque a listagem não carrega abastecimento nenhum, e nem deveria:
 * puxar o uso de cada veículo para montar a tabela seria um N+1 clássico.
 * Esta rota é chamada só quando o detalhe de um veículo abre — um veículo,
 * uma consulta.
 *
 * É uma leitura só, de três colunas, sobre `abastecimentos` filtrada por
 * `veiculo_id` (indexado) e por data. A soma acontece aqui, sobre poucas
 * linhas, em vez de virar uma agregação no banco.
 *
 * Checklist de segurança (CLAUDE.md §Cibersegurança):
 *  1. Autenticação  — getAuthUser() → 401.
 *  2. Autorização   — o veículo precisa ser da empresa do usuário.
 *  3. Anti-IDOR     — `.eq('empresa_id', empresa.id)` confirma a posse ANTES
 *                     de ler os abastecimentos, e a leitura repete o filtro.
 *  4. Service client— só depois de 1–3.
 *  5. Erros         — mensagem genérica ao cliente, detalhe no log.
 *  6. Mass-assign   — GET sem body; nada é escrito.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

    const svc = createServiceClient()

    const { data: empresa } = await svc
      .from('empresas').select('id').eq('perfil_id', user.id).single()
    if (!empresa) return NextResponse.json({ error: 'Empresa não encontrada.' }, { status: 403 })

    const { data: veiculo } = await svc
      .from('veiculos')
      .select('id')
      .eq('id', id)
      .eq('empresa_id', empresa.id)
      .maybeSingle()
    if (!veiculo) return NextResponse.json({ error: 'Veículo não encontrado.' }, { status: 404 })

    const desde = new Date(Date.now() - DIAS * 24 * 60 * 60 * 1000).toISOString()

    const { data: linhas, error } = await svc
      .from('abastecimentos')
      .select('data, litros, valor')
      .eq('veiculo_id', id)
      .eq('empresa_id', empresa.id)
      .gte('data', desde)
      .order('data', { ascending: false })
    if (error) throw error

    const itens = linhas ?? []

    return NextResponse.json({
      dias: DIAS,
      abastecimentos: itens.length,
      litros: itens.reduce((s, a) => s + Number(a.litros), 0),
      valor:  itens.reduce((s, a) => s + Number(a.valor), 0),
      // A lista vem ordenada por data desc, então o primeiro é o mais recente.
      ultimoUso: itens[0]?.data ?? null,
    })
  } catch (err) {
    console.error('[empresa/frota/veiculos/[id]/utilizacao GET]', err)
    return NextResponse.json(
      { error: 'Não foi possível carregar a utilização do veículo.' },
      { status: 500 },
    )
  }
}
