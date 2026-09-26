import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { getAuthUser } from '@/lib/api-auth'

/**
 * GET /api/empresa/parcerias/[id]/posto — dados do posto de UMA parceria.
 *
 * O `[id]` é da PARCERIA, não do posto. Essa escolha é a própria proteção:
 * não existe caminho para pedir um posto arbitrário. A empresa só chega ao
 * posto através de uma parceria que é dela, e o filtro por `empresa_id` vai
 * dentro da query — é o que substitui o RLS quando se usa o service client.
 *
 * Checklist de segurança (CLAUDE.md §Cibersegurança):
 *  1. Autenticação  — getAuthUser() → 401.
 *  2. Autorização   — a parceria precisa ser da empresa do usuário.
 *  3. Anti-IDOR     — `.eq('empresa_id', empresa.id)` na query, não em memória.
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
      .from('empresas')
      .select('id, nome_empresa, cidade, estado')
      .eq('perfil_id', user.id)
      .single()
    if (!empresa) return NextResponse.json({ error: 'Empresa não encontrada.' }, { status: 403 })

    const { data: parceria, error } = await svc
      .from('parcerias')
      .select(`
        id, status, iniciada_em,
        postos ( id, nome, cnpj, bandeira, endereco, numero, complemento, bairro,
                 cidade, estado, cep, lat, lng, telefone, whatsapp, combustiveis, status )
      `)
      .eq('id', id)
      .eq('empresa_id', empresa.id)
      .maybeSingle()

    // Separar falha de query de "não existe" importa: sem isso um erro de
    // schema chegaria ao usuário como 404.
    if (error) throw error
    if (!parceria || !parceria.postos) {
      return NextResponse.json({ error: 'Parceria não encontrada.' }, { status: 404 })
    }

    const p = parceria.postos as unknown as {
      id: string; nome: string; cnpj: string; bandeira: string
      endereco: string; numero: string; complemento: string | null; bairro: string
      cidade: string; estado: string; cep: string
      lat: number | null; lng: number | null
      telefone: string | null; whatsapp: string | null
      combustiveis: string[]; status: string
    }

    return NextResponse.json({
      posto: {
        id: p.id,
        nome: p.nome,
        cnpj: p.cnpj,
        bandeira: p.bandeira,
        endereco: p.endereco,
        numero: p.numero,
        complemento: p.complemento,
        bairro: p.bairro,
        cidade: p.cidade,
        estado: p.estado,
        cep: p.cep,
        // `lat`/`lng` são NUMERIC no Postgres e chegam como string pelo
        // PostgREST; o mapa precisa de número.
        lat: p.lat != null ? Number(p.lat) : null,
        lng: p.lng != null ? Number(p.lng) : null,
        telefone: p.telefone,
        whatsapp: p.whatsapp,
        combustiveis: p.combustiveis ?? [],
        status: p.status,
      },
      parceria: {
        status: parceria.status,
        iniciadaEm: parceria.iniciada_em,
      },
      // A empresa só tem cidade/UF no cadastro — sem endereço nem coordenadas.
      // Vai assim mesmo para a tela poder explicar por que não traça a rota.
      empresa: {
        nome: empresa.nome_empresa,
        cidade: empresa.cidade,
        estado: empresa.estado,
      },
    })
  } catch (err) {
    console.error('[empresa/parcerias/[id]/posto GET]', err)
    return NextResponse.json(
      { error: 'Não foi possível carregar os dados do posto.' },
      { status: 500 },
    )
  }
}
