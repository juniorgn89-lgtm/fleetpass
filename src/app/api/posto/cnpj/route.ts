import { NextResponse, type NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { getAuthUser } from '@/lib/api-auth'
import { isCnpjValid, limparDoc, maskCpfCnpj } from '@/lib/documento'

/**
 * GET /api/posto/cnpj?cnpj=... — dados públicos do CNPJ na Receita Federal.
 *
 * Existe para o cadastro de posto se preencher sozinho: o usuário digita o
 * CNPJ e razão social, nome fantasia, endereço completo e telefone já vêm
 * prontos. Sobram só bandeira, combustíveis e WhatsApp.
 *
 * A consulta é feita NO SERVIDOR (BrasilAPI, pública e sem chave) porque:
 *  • evita CORS e expor a origem da chamada no bundle;
 *  • permite cruzar o resultado com a nossa base antes de devolver.
 * Mesmo padrão do geocoding por Nominatim, já usado em meus-postos.
 *
 * Checklist de segurança (CLAUDE.md §Cibersegurança):
 *  1. Autenticação  — getAuthUser() → 401.
 *  2. Autorização   — exige perfis.role = 'posto' → 403.
 *  3. Anti-IDOR     — não há recurso por id; o CNPJ é dado de registro público.
 *  4. Tenant        — a checagem de duplicidade devolve apenas um booleano; não
 *                     revela de quem é o posto já cadastrado.
 *  5. Service client— createServiceClient() só depois de 1–2.
 *  6. Erros         — mensagem genérica ao cliente, detalhe no log do servidor.
 *  7. Mass-assign   — GET sem body; nada é escrito.
 */

/** CNAEs de comércio varejista de combustíveis. */
const CNAE_COMBUSTIVEL = [4731800, 4732600]

const TEMPO_LIMITE_MS = 8000
/** A consulta de CEP é um complemento; não pode segurar a resposta principal. */
const TEMPO_LIMITE_CEP_MS = 4000

/** Cabeçalhos obrigatórios: sem User-Agent a BrasilAPI responde 403. */
const CABECALHOS = {
  Accept: 'application/json',
  'User-Agent': 'FleetPass/1.0 (+https://fleetpass.com.br)',
}

interface RespostaBrasilAPI {
  razao_social?: string
  nome_fantasia?: string
  descricao_tipo_de_logradouro?: string
  logradouro?: string
  numero?: string
  complemento?: string
  bairro?: string
  municipio?: string
  uf?: string
  cep?: string
  ddd_telefone_1?: string
  cnae_fiscal?: number
  cnae_fiscal_descricao?: string
  cnaes_secundarios?: { codigo: number; descricao: string }[]
  descricao_situacao_cadastral?: string
  message?: string
}

/**
 * Busca rua e bairro pelo CEP.
 *
 * Existe porque a Receita não traz logradouro para uma fatia grande dos CNPJs
 * — MEI e inscrições recentes costumam vir só com bairro, município, UF e CEP.
 * Sem isto o usuário teria de digitar a rua na mão logo depois de o sistema
 * prometer que preencheria tudo.
 *
 * É melhor-esforço: qualquer falha devolve null e o cadastro segue com o que a
 * Receita deu.
 */
async function enderecoPeloCep(cep: string): Promise<{ rua: string; bairro: string } | null> {
  const limpo = cep.replace(/\D/g, '')
  if (limpo.length !== 8) return null

  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), TEMPO_LIMITE_CEP_MS)
  try {
    const r = await fetch(`https://brasilapi.com.br/api/cep/v1/${limpo}`, {
      signal: ctrl.signal,
      headers: CABECALHOS,
    })
    if (!r.ok) return null
    const d = await r.json()
    return { rua: (d.street ?? '').trim(), bairro: (d.neighborhood ?? '').trim() }
  } catch (err) {
    console.warn('[posto/cnpj CEP]', err)
    return null
  } finally {
    clearTimeout(t)
  }
}

/** Conectivos que ficam em minúscula no meio do nome ("Rua do Comércio"). */
const MINUSCULAS = new Set(['da', 'das', 'de', 'do', 'dos', 'e', 'em'])

/** "AVENIDA REPUBLICA DO CHILE" → "Avenida Republica do Chile". */
function titulo(v: string): string {
  return v
    .toLowerCase()
    .replace(/(^|\s|')([a-zà-ú])/g, (_m, p, c) => p + c.toUpperCase())
    .replace(/\s([A-ZÀ-Ú][a-zà-ú]*)/g, (m, palavra: string) =>
      MINUSCULAS.has(palavra.toLowerCase()) ? ` ${palavra.toLowerCase()}` : m,
    )
}

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

    const svc = createServiceClient()

    const { data: perfil } = await svc.from('perfis').select('role').eq('id', user.id).single()
    if ((perfil?.role as string) !== 'posto') {
      return NextResponse.json({ error: 'Acesso restrito a postos.' }, { status: 403 })
    }

    const bruto = limparDoc(req.nextUrl.searchParams.get('cnpj') ?? '')
    if (!isCnpjValid(bruto)) {
      return NextResponse.json({ error: 'CNPJ inválido. Confira os números.' }, { status: 422 })
    }

    // Já existe na plataforma? `postos.cnpj` é UNIQUE — avisar agora evita o
    // usuário preencher o formulário inteiro para falhar no envio.
    const formatado = maskCpfCnpj(bruto)
    const { data: jaExiste } = await svc
      .from('postos')
      .select('id')
      .eq('cnpj', formatado)
      .maybeSingle()

    if (jaExiste) {
      return NextResponse.json(
        { error: 'Este CNPJ já está cadastrado como posto na plataforma.' },
        { status: 409 },
      )
    }

    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), TEMPO_LIMITE_MS)
    let dados: RespostaBrasilAPI
    try {
      const r = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${bruto}`, {
        signal: ctrl.signal,
        headers: CABECALHOS,
      })
      dados = await r.json()
      if (!r.ok) {
        // 404 = não encontrado na Receita; demais = indisponibilidade
        const msg = r.status === 404
          ? 'CNPJ não encontrado na Receita Federal.'
          : 'Não foi possível consultar o CNPJ agora. Tente de novo em instantes.'
        return NextResponse.json({ error: msg }, { status: r.status === 404 ? 404 : 502 })
      }
    } finally {
      clearTimeout(t)
    }

    let logradouro = titulo([dados.descricao_tipo_de_logradouro, dados.logradouro]
      .filter(Boolean).join(' ').trim())
    let bairro = titulo(dados.bairro ?? '')
    const cep = (dados.cep ?? '').replace(/^(\d{5})(\d{3})$/, '$1-$2')

    // Sem logradouro na Receita, tenta pelo CEP. O número continua em branco —
    // esse a Receita não tem e o CEP não sabe; só o dono do posto informa.
    let origemEndereco: 'receita' | 'cep' | 'incompleto' = logradouro ? 'receita' : 'incompleto'
    if (!logradouro && cep) {
      const viaCep = await enderecoPeloCep(cep)
      if (viaCep?.rua) {
        logradouro = viaCep.rua
        bairro = bairro || viaCep.bairro
        origemEndereco = 'cep'
      }
    }

    const cnaes = [dados.cnae_fiscal ?? 0, ...(dados.cnaes_secundarios ?? []).map((c) => c.codigo)]
    const ehPosto = cnaes.some((c) => CNAE_COMBUSTIVEL.includes(c))
    const ativa = (dados.descricao_situacao_cadastral ?? '').toUpperCase() === 'ATIVA'

    return NextResponse.json({
      cnpj:          formatado,
      razaoSocial:   dados.razao_social ?? '',
      nomeFantasia:  dados.nome_fantasia?.trim() || '',
      // Sugestão para o campo "Nome do posto": fantasia é o que aparece na rua.
      nomeSugerido:  titulo(dados.nome_fantasia?.trim() || dados.razao_social || ''),
      endereco:      logradouro,
      numero:        dados.numero ?? '',
      complemento:   dados.complemento?.trim() || '',
      bairro,
      cidade:        titulo(dados.municipio ?? ''),
      estado:        (dados.uf ?? '').toUpperCase(),
      cep,
      // De onde saiu a rua — a tela rotula o campo de acordo, em vez de
      // creditar à Receita um dado que veio do CEP.
      origemEndereco,
      telefone:      dados.ddd_telefone_1 ?? '',
      atividade:     dados.cnae_fiscal_descricao ?? '',
      situacao:      dados.descricao_situacao_cadastral ?? '',
      // Avisos, não bloqueios: a Receita atrasa atualização e há posto operando
      // sob CNAE de conveniência. Quem decide é o usuário.
      alertas: [
        ...(ativa ? [] : [`Situação cadastral: ${dados.descricao_situacao_cadastral || 'desconhecida'}.`]),
        ...(ehPosto ? [] : ['O CNAE principal não é de comércio de combustíveis.']),
      ],
    })
  } catch (err) {
    console.error('[posto/cnpj GET]', err)
    return NextResponse.json(
      { error: 'Não foi possível consultar o CNPJ agora. Tente de novo em instantes.' },
      { status: 500 },
    )
  }
}
