import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase-server'
import { syncQuantidadeCnpj } from '@/lib/stripe-cnpj'
import { normalizarWhatsapp } from '@/lib/utils'

import { geocode } from '@/lib/geocode'


// ── helpers ────────────────────────────────────────────────────────────────

async function getOrCreateContaPostoId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return { contaPostoId: null, userId: null, error: 'Não autenticado.' }

  const svc = createServiceClient()

  // Tenta buscar conta existente
  const { data: conta } = await svc
    .from('contas_posto')
    .select('id')
    .eq('perfil_id', user.id)
    .single()

  if (conta) return { contaPostoId: conta.id as string, userId: user.id, error: null }

  // Cria conta com plano starter (situação comum em dev ou antes do webhook Stripe chegar)
  const { data: nova, error: insertError } = await svc
    .from('contas_posto')
    .insert({ perfil_id: user.id, plano_id: 'padrao' })
    .select('id')
    .single()

  if (insertError || !nova) {
    return { contaPostoId: null, userId: user.id, error: 'Erro ao inicializar conta de posto.' }
  }
  return { contaPostoId: nova.id as string, userId: user.id, error: null }
}

// ── GET — lista os postos da conta ─────────────────────────────────────────

export async function GET() {
  try {
    const supabase = await createClient()
    const { contaPostoId, error } = await getOrCreateContaPostoId(supabase)
    if (error) return NextResponse.json({ error }, { status: 401 })

    const { data: postos, error: dbError } = await supabase
      .from('postos')
      .select('id, nome, cnpj, bandeira, endereco, numero, bairro, cidade, estado, cep, combustiveis, capacidade, whatsapp, status, lat, lng')
      .eq('conta_posto_id', contaPostoId!)
      .order('created_at', { ascending: true })

    if (dbError) throw dbError

    // Aqui existia um `forEach(async …)` que geocodificava os postos sem
    // coordenada. As promises não eram aguardadas: em serverless a função
    // podia encerrar antes delas, o `update` não acontecia, e a listagem
    // seguinte disparava tudo de novo — N chamadas ao Nominatim por GET, para
    // sempre. O preenchimento passou para `./geocodificar`, chamado sob
    // demanda e um de cada vez.
    return NextResponse.json({ postos: postos ?? [] })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// ── POST — cria um novo posto ───────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { contaPostoId, error } = await getOrCreateContaPostoId(supabase)
    if (error) return NextResponse.json({ error }, { status: 401 })

    const body = await req.json()
    const { nome, cnpj, bandeira, endereco, numero, complemento, bairro, cidade, estado, cep, combustiveis, capacidade } = body

    // O número entra na lista: sem ele o geocoding cai no meio da rua e o
    // motorista não acha a bomba. A Receita costuma trazê-lo, mas vem vazio em
    // MEI e inscrições recentes — aí quem informa é o dono do posto.
    if (!nome || !cnpj || !endereco || !numero || !cidade || !estado) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: nome, cnpj, endereço, número, cidade e estado.' },
        { status: 400 },
      )
    }

    // WhatsApp é o canal pelo qual a transportadora fala com o posto na Vitrine,
    // por isso é obrigatório para concluir o cadastro. Validado aqui, e não só
    // no formulário, porque a rota é a fronteira de verdade.
    const whatsapp = normalizarWhatsapp(String(body.whatsapp ?? ''))
    if (!whatsapp) {
      return NextResponse.json(
        { error: 'Informe um WhatsApp válido com DDD (celular de 9 dígitos).' },
        { status: 400 },
      )
    }

    // Usa coordenadas do mapa se fornecidas; caso contrário, tenta geocoding
    let lat: number | null = null
    let lng: number | null = null
    if (typeof body.lat === 'number' && typeof body.lng === 'number') {
      lat = body.lat; lng = body.lng
    } else {
      const coords = await geocode(endereco, numero ?? '', bairro ?? '', cidade, estado, cep ?? '')
      lat = coords?.lat ?? null; lng = coords?.lng ?? null
    }

    const svc = createServiceClient()
    const { data: posto, error: insertError } = await svc
      .from('postos')
      .insert({
        conta_posto_id:  contaPostoId!,
        nome,
        cnpj: cnpj.replace(/\D/g, '').replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5'),
        bandeira:        bandeira || 'Independente',
        endereco:        endereco || '',
        numero:          numero   || '',
        complemento:     complemento || null,
        bairro:          bairro   || '',
        cidade,
        estado,
        cep:             (cep || '').replace(/\D/g, '').replace(/^(\d{5})(\d{3})$/, '$1-$2'),
        combustiveis:    combustiveis || [],
        capacidade:      capacidade   || null,
        whatsapp,
        lat,
        lng,
        status:          'ativo',
      })
      .select()
      .single()

    if (insertError) {
      if (insertError.message?.toLowerCase().includes('limite')) {
        return NextResponse.json({ error: insertError.message }, { status: 422 })
      }
      throw insertError
    }

    // Cobrança por CNPJ: ajusta a quantidade da assinatura ao novo total de postos.
    await syncQuantidadeCnpj(contaPostoId!)

    return NextResponse.json({ posto }, { status: 201 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// ── PATCH — edita um posto existente ───────────────────────────────────────

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { contaPostoId, error } = await getOrCreateContaPostoId(supabase)
    if (error) return NextResponse.json({ error }, { status: 401 })

    const body = await req.json()
    const { id, ...fields } = body

    if (!id) return NextResponse.json({ error: 'id obrigatório.' }, { status: 400 })

    // Mesmas exigências do POST: editar um posto não pode deixá-lo sem número
    // nem sem WhatsApp.
    if (fields.numero !== undefined && !String(fields.numero).trim()) {
      return NextResponse.json({ error: 'Informe o número do endereço.' }, { status: 400 })
    }

    const whatsapp = normalizarWhatsapp(String(fields.whatsapp ?? ''))
    if (!whatsapp) {
      return NextResponse.json(
        { error: 'Informe um WhatsApp válido com DDD (celular de 9 dígitos).' },
        { status: 400 },
      )
    }

    // Usa coordenadas do mapa se fornecidas; caso contrário, tenta geocoding
    let patchLat: number | null | undefined = undefined
    let patchLng: number | null | undefined = undefined
    if (typeof fields.lat === 'number' && typeof fields.lng === 'number') {
      patchLat = fields.lat
      patchLng = fields.lng
    } else if (fields.cidade && fields.estado) {
      const coords = await geocode(
        fields.endereco ?? '', fields.numero ?? '', fields.bairro ?? '',
        fields.cidade, fields.estado, fields.cep ?? ''
      )
      if (coords) { patchLat = coords.lat; patchLng = coords.lng }
    }

    // Garante que o posto pertence à conta do usuário
    const svc = createServiceClient()
    const updatePayload: Record<string, unknown> = {
      nome:         fields.nome,
      bandeira:     fields.bandeira,
      endereco:     fields.endereco,
      numero:       fields.numero,
      complemento:  fields.complemento ?? null,
      bairro:       fields.bairro,
      cidade:       fields.cidade,
      estado:       fields.estado,
      cep:          fields.cep,
      combustiveis: fields.combustiveis,
      capacidade:   fields.capacidade ?? null,
      whatsapp,
    }
    if (patchLat !== undefined) { updatePayload.lat = patchLat; updatePayload.lng = patchLng }

    const { data: posto, error: updateError } = await svc
      .from('postos')
      .update(updatePayload)
      .eq('id', id)
      .eq('conta_posto_id', contaPostoId!)
      .select()
      .single()

    if (updateError) throw updateError
    if (!posto) return NextResponse.json({ error: 'Posto não encontrado.' }, { status: 404 })

    return NextResponse.json({ posto })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
