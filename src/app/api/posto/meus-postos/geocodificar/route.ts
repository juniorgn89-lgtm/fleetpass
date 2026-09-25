import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase-server'
import { geocode } from '@/lib/geocode'

/**
 * POST /api/posto/meus-postos/geocodificar — preenche lat/lng de UM posto.
 *
 * Substitui o `forEach(async …)` que rodava dentro do GET da listagem. Lá as
 * promises não eram aguardadas: em serverless a função podia encerrar antes
 * delas, a gravação não acontecia e a listagem seguinte repetia tudo — N
 * chamadas externas por GET, indefinidamente.
 *
 * Aqui a chamada é aguardada de verdade, e o cliente pede um posto por vez,
 * espaçando as chamadas: o Nominatim permite no máximo 1 por segundo.
 *
 * É idempotente: posto que já tem coordenada volta sem tocar no Nominatim.
 * Por isso o preenchimento converge — depois que todos têm coordenada,
 * nenhuma chamada externa acontece mais.
 *
 * Checklist de segurança (CLAUDE.md §Cibersegurança):
 *  1. Autenticação  — getUser() → 401.
 *  2. Autorização   — só postos da conta do usuário.
 *  3. Anti-IDOR     — o id do body é filtrado por conta_posto_id NA QUERY.
 *  4. Service client— usado só depois de 1–3.
 *  5. Erros         — mensagem genérica ao cliente, detalhe no log.
 *  6. Mass-assign   — só lat/lng são gravados; nada vem do body além do id.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

    const svc = createServiceClient()

    const { data: conta } = await svc
      .from('contas_posto')
      .select('id')
      .eq('perfil_id', user.id)
      .single()
    if (!conta) return NextResponse.json({ error: 'Conta de posto não encontrada.' }, { status: 403 })

    const { id } = await req.json()
    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'Informe o id do posto.' }, { status: 400 })
    }

    // O escopo por conta vai DENTRO da query — é o que substitui o RLS quando
    // se usa o service client.
    const { data: posto } = await svc
      .from('postos')
      .select('id, endereco, numero, bairro, cidade, estado, cep, lat, lng')
      .eq('id', id)
      .eq('conta_posto_id', conta.id)
      .maybeSingle()

    if (!posto) return NextResponse.json({ error: 'Posto não encontrado.' }, { status: 404 })

    // Já resolvido: devolve sem chamar o Nominatim. É o que impede a repetição.
    if (posto.lat != null && posto.lng != null) {
      return NextResponse.json({ lat: posto.lat, lng: posto.lng, geocodificado: false })
    }
    if (!posto.cidade) {
      return NextResponse.json({ error: 'Posto sem cidade para geocodificar.' }, { status: 422 })
    }

    const coords = await geocode(
      posto.endereco ?? '', posto.numero ?? '', posto.bairro ?? '',
      posto.cidade, posto.estado, posto.cep ?? '',
    )
    if (!coords) {
      return NextResponse.json({ error: 'Endereço não localizado.' }, { status: 404 })
    }

    const { error: upErr } = await svc
      .from('postos')
      .update({ lat: coords.lat, lng: coords.lng })
      .eq('id', posto.id)
      .eq('conta_posto_id', conta.id)
    if (upErr) throw upErr

    return NextResponse.json({ ...coords, geocodificado: true })
  } catch (err) {
    console.error('[posto/meus-postos/geocodificar POST]', err)
    return NextResponse.json(
      { error: 'Não foi possível obter a localização agora.' },
      { status: 500 },
    )
  }
}
