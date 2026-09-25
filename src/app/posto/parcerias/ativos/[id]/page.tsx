'use client'

import { useState, useEffect } from 'react'
import { Logo } from '@/components/ui/logo'
import Link from 'next/link'
import { ArrowLeft, Shield, Printer, Mail, MessageCircle, Plus, X, Pencil, Check, CheckSquare, Square, Clock, Send, CheckCircle2, Circle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { use } from 'react'

type Preco = { combustivel: string; modalidade: 'bomba' | 'desconto' | 'acrescimo'; valor?: string }

type TokenEvento = {
  id: string
  role: string
  created_at: string
  used_at: string | null
  expires_at: string
}

type Contrato = {
  empresa: string
  cnpj: string
  cidade: string
  posto: string
  postoCnpj: string
  postoEndereco: string
  desde: string
  vigenciaFim: string
  combustiveis: string[]
  precos: Preco[]
  limite: string
  ciclo: { tipo: string; prazoRecebimento: number }
  // Auth empresa
  authNum: string
  authData: string
  authIp: string
  authDispositivo: string
  authNavegador: string
  authHash: string
  authMethod: string
  authCertSubject?: string
  authCertIssuer?: string
  authCertSerial?: string
  authCertValidade?: string
  // Auth posto
  authDataPosto: string
  authIpPosto: string
  authDispositivoPosto: string
  authNavegadorPosto: string
  authHashPosto: string
  assinadoEmpresaEm: string | null
  assinadoPostoEm: string | null
}

function descCiclo(tipo: string, prazo: number): string {
  switch (tipo.toLowerCase()) {
    case 'quinzenal': return `2 ciclos/mês: dias 01–15 (fatura dia 16, vence dia ${15 + prazo}) · dias 16–último (fatura dia 01, vence dia ${String(prazo).padStart(2, '0')})`
    case 'semanal':   return `Fatura toda semana · vence ${prazo} dia${prazo !== 1 ? 's' : ''} após o faturamento`
    case 'mensal':    return `Vende o mês inteiro → fatura no dia 01 → vence no dia ${String(prazo).padStart(2, '0')}`
    default:          return tipo
  }
}

function formatDateBR(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatDateTimeBR(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  const date = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  return `${date} às ${time}`
}

function addOneYear(iso: string): string {
  const d = new Date(iso)
  d.setFullYear(d.getFullYear() + 1)
  return d.toISOString()
}

function formatBRL(value: number | null | undefined): string {
  if (value == null) return 'R$ 0,00'
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function capitalize(str: string): string {
  if (!str) return str
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

export default function ContratoPostoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)

  const [contrato, setContrato] = useState<Contrato | null>(null)
  const [contratoNum, setContratoNum] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tokens, setTokens] = useState<TokenEvento[]>([])
  const [iniciadaEm, setIniciadaEm] = useState<string | null>(null)

  const [emails, setEmails] = useState<string[]>([])
  const [whatsapps, setWhatsapps] = useState<string[]>([])
  const [novoEmail, setNovoEmail] = useState('')
  const [novoWhatsapp, setNovoWhatsapp] = useState('')
  const [editEmailIdx, setEditEmailIdx] = useState<number | null>(null)
  const [editEmailVal, setEditEmailVal] = useState('')
  const [editWaIdx, setEditWaIdx] = useState<number | null>(null)
  const [editWaVal, setEditWaVal] = useState('')

  const [assinadoEmpresaEm, setAssinadoEmpresaEm] = useState<string | null>(null)
  const [assinadoPostoEm,   setAssinadoPostoEm]   = useState<string | null>(null)
  const [signing, setSigning] = useState(false)
  const [signError, setSignError] = useState<string | null>(null)
  const [agreed, setAgreed]   = useState(false)

  useEffect(() => {
    async function fetchParceria() {
      try {
        setLoading(true)
        setError(null)
        const res = await fetch(`/api/posto/parcerias/${id}`)
        if (!res.ok) throw new Error(`Erro ao carregar parceria (${res.status})`)
        const data = await res.json()
        const p = data.parceria

        const iniciada = p.iniciada_em
        const year = new Date(iniciada).getFullYear()

        const mapped: Contrato = {
          empresa:       p.empresas.nome_empresa,
          cnpj:          p.empresas.cnpj,
          cidade:        `${p.empresas.cidade}, ${p.empresas.estado}`,
          posto:         p.postos.nome,
          postoCnpj:     p.postos.cnpj,
          postoEndereco: `${p.postos.endereco}, ${p.postos.numero} — ${p.postos.cidade}, ${p.postos.estado}`,
          desde:         formatDateBR(iniciada),
          vigenciaFim:   formatDateBR(addOneYear(iniciada)),
          combustiveis:  p.combustiveis.filter((c: { ativo: boolean }) => c.ativo).map((c: { tipo: string }) => c.tipo),
          precos:        p.combustiveis.map((c: { tipo: string; modal_preco: string; valor?: number }) => ({
            combustivel: c.tipo,
            modalidade:  c.modal_preco as 'bomba' | 'desconto' | 'acrescimo',
            valor:       c.valor != null ? `R$ ${c.valor.toFixed(2).replace('.', ',')}/L` : undefined,
          })),
          limite:        `${formatBRL(p.limite_credito)}/mês`,
          ciclo: {
            tipo:              capitalize(p.ciclo_tipo),
            prazoRecebimento:  p.ciclo_prazo_recebimento,
          },
          authNum:        p.contratos?.auth_hash
            ? p.contratos.auth_hash.slice(0, 20).toUpperCase()
            : `AUTH-${id.slice(0, 8).toUpperCase()}`,
          authData:       p.contratos?.auth_data ? formatDateTimeBR(p.contratos.auth_data) : '—',
          authIp:         p.contratos?.auth_ip ?? '—',
          authDispositivo: p.contratos?.auth_dispositivo ?? '—',
          authNavegador:  p.contratos?.auth_navegador ?? '—',
          authHash:       p.contratos?.auth_hash ?? '—',
          authMethod:     p.contratos?.auth_method ?? 'sistema',
          authCertSubject: p.contratos?.auth_cert_subject,
          authCertIssuer:  p.contratos?.auth_cert_issuer,
          authCertSerial:  p.contratos?.auth_cert_serial,
          authCertValidade: p.contratos?.auth_cert_validade,
          // Auth posto
          authDataPosto:       p.contratos?.auth_data_posto ? formatDateTimeBR(p.contratos.auth_data_posto) : '—',
          authIpPosto:         p.contratos?.auth_ip_posto ?? '—',
          authDispositivoPosto: p.contratos?.auth_dispositivo_posto ?? '—',
          authNavegadorPosto:  p.contratos?.auth_navegador_posto ?? '—',
          authHashPosto:       p.contratos?.auth_hash_posto ?? '—',
          assinadoEmpresaEm: p.contratos?.assinado_empresa_em ?? null,
          assinadoPostoEm:   p.contratos?.assinado_posto_em   ?? null,
        }

        setContrato(mapped)
        setAssinadoEmpresaEm(p.contratos?.assinado_empresa_em ?? null)
        setAssinadoPostoEm(p.contratos?.assinado_posto_em ?? null)
        setContratoNum(`FLINK-${year}-${id.slice(0, 8).toUpperCase()}`)
        setTokens(data.tokens ?? [])
        setIniciadaEm(iniciada)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro desconhecido')
      } finally {
        setLoading(false)
      }
    }

    fetchParceria()
  }, [id])

  const addEmail = () => {
    const v = novoEmail.trim()
    if (v && !emails.includes(v)) { setEmails((p) => [...p, v]); setNovoEmail('') }
  }
  const removeEmail = (i: number) => setEmails((p) => p.filter((_, idx) => idx !== i))
  const saveEmail = (i: number) => {
    const v = editEmailVal.trim()
    if (v) setEmails((p) => p.map((e, idx) => idx === i ? v : e))
    setEditEmailIdx(null)
  }

  const addWa = () => {
    const v = novoWhatsapp.trim()
    if (v && !whatsapps.includes(v)) { setWhatsapps((p) => [...p, v]); setNovoWhatsapp('') }
  }
  const removeWa = (i: number) => setWhatsapps((p) => p.filter((_, idx) => idx !== i))
  const saveWa = (i: number) => {
    const v = editWaVal.trim()
    if (v) setWhatsapps((p) => p.map((w, idx) => idx === i ? v : w))
    setEditWaIdx(null)
  }

  async function handleAssinar() {
    setSigning(true)
    setSignError(null)
    try {
      // Obtém IP público real do cliente
      let clientIp = ''
      try {
        const ipRes = await fetch('https://api.ipify.org?format=json')
        const ipData = await ipRes.json()
        clientIp = ipData.ip ?? ''
      } catch { /* fallback para header no servidor */ }

      const res = await fetch(`/api/posto/parcerias/${id}/assinar`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientIp }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro ao assinar contrato.')
      setAssinadoPostoEm(data.assinado_em)
      // Update auth fields do posto na view
      setContrato(prev => prev ? {
        ...prev,
        authDataPosto:        data.assinado_em ? formatDateTimeBR(data.assinado_em) : prev.authDataPosto,
        authIpPosto:          data.ip          ?? prev.authIpPosto,
        authDispositivoPosto: data.dispositivo ?? prev.authDispositivoPosto,
        authNavegadorPosto:   data.navegador   ?? prev.authNavegadorPosto,
        authHashPosto:        data.authHash    ?? prev.authHashPosto,
      } : prev)
      setAgreed(false)
    } catch (err) {
      setSignError(err instanceof Error ? err.message : 'Erro ao assinar.')
    } finally {
      setSigning(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center text-gray-400 text-sm">
        Carregando parceria...
      </div>
    )
  }

  if (error || !contrato) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <Link href="/posto/parcerias/ativos" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft size={16} /> Voltar aos parceiros ativos
        </Link>
        <div className="bg-red-50 border border-red-200 rounded-2xl px-8 py-10 text-center">
          <p className="text-sm font-medium text-red-600">{error ?? 'Parceria não encontrada.'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4 print:max-w-none print:mx-0 print:space-y-0">
      <div className="flex items-center justify-between print:hidden">
        <Link href="/posto/parcerias/ativos" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft size={16} /> Voltar aos parceiros ativos
        </Link>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
        >
          <Printer size={15} /> Imprimir
        </button>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden print:border-0 print:rounded-none print:shadow-none print:overflow-visible">

        {/* Header */}
        <div className="px-8 pt-8 pb-6 text-center border-b border-gray-100">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Logo tamanho={32} />
          </div>
          <h1 className="text-lg font-bold text-gray-900 tracking-wide uppercase">Contrato de Parceria Comercial</h1>
          <p className="text-sm text-gray-400 mt-1">N° {contratoNum} · Autenticação: {contrato.authNum}</p>
        </div>

        {/* 1. Das Partes */}
        <div className="px-8 py-6 border-b border-gray-100">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">1. Das Partes</h2>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Contratante (Empresa)</p>
              <p className="font-semibold text-gray-900">{contrato.empresa}</p>
              <p className="text-sm text-gray-500">CNPJ: {contrato.cnpj}</p>
              <p className="text-sm text-gray-500">{contrato.cidade}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Contratada (Posto)</p>
              <p className="font-semibold text-gray-900">{contrato.posto}</p>
              <p className="text-sm text-gray-500">CNPJ: {contrato.postoCnpj}</p>
              <p className="text-sm text-gray-500">{contrato.postoEndereco}</p>
            </div>
          </div>
        </div>

        {/* 2. Do Objeto */}
        <div className="px-8 py-6 border-b border-gray-100">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">2. Do Objeto</h2>
          <p className="text-sm text-gray-600 leading-relaxed mb-3">
            O presente contrato tem por objeto a prestação de serviços de abastecimento de combustível pela Contratada à Contratante, mediante requisições digitais geradas pela plataforma FleetPass, conforme condições acordadas entre as partes.
          </p>
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Combustíveis autorizados</span>
              <span className="font-medium text-gray-900">{contrato.combustiveis.join(', ')}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Limite de crédito</span>
              <span className="font-medium text-gray-900">{contrato.limite}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Validação de abastecimento</span>
              <span className="font-medium text-gray-900">QR Code + código manual</span>
            </div>
          </div>
        </div>

        {/* 3. Das Condições Comerciais */}
        <div className="px-8 py-6 border-b border-gray-100">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">3. Das Condições Comerciais</h2>
          <div className="space-y-3">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Tabela de preços</p>
              <div className="space-y-1.5">
                {contrato.precos.map((pr) => {
                  const label =
                    pr.modalidade === 'bomba'    ? 'Preço de bomba' :
                    pr.modalidade === 'desconto' ? `Desconto de ${pr.valor}` :
                                                   `Acréscimo de ${pr.valor}`
                  const cls =
                    pr.modalidade === 'bomba'    ? 'text-gray-700' :
                    pr.modalidade === 'desconto' ? 'text-emerald-700 font-semibold' :
                                                   'text-red-600 font-semibold'
                  return (
                    <div key={pr.combustivel} className="flex justify-between text-sm">
                      <span className="text-gray-600">{pr.combustivel}</span>
                      <span className={cls}>{label}</span>
                    </div>
                  )
                })}
              </div>
              <p className="text-xs text-gray-400 mt-2 pt-2 border-t border-gray-200">
                * Preço de bomba: tabela vigente no momento do abastecimento. Reajustes comunicados com 5 dias de antecedência.
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Ciclo de faturamento</p>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Modalidade</span>
                <span className="font-medium text-gray-900">{contrato.ciclo.tipo}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Prazo de pagamento</span>
                <span className="font-medium text-gray-900">+{contrato.ciclo.prazoRecebimento} dias corridos</span>
              </div>
              <p className="text-xs text-gray-500 mt-1 pt-2 border-t border-gray-200">
                {descCiclo(contrato.ciclo.tipo, contrato.ciclo.prazoRecebimento)}
              </p>
            </div>
          </div>
        </div>

        {/* 4. Da Vigência */}
        <div className="px-8 py-6 border-b border-gray-100">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">4. Da Vigência</h2>
          <div className="flex gap-8 text-sm">
            <div><p className="text-gray-500">Início</p><p className="font-semibold text-gray-900">{contrato.desde}</p></div>
            <div><p className="text-gray-500">Término</p><p className="font-semibold text-gray-900">{contrato.vigenciaFim}</p></div>
            <div><p className="text-gray-500">Renovação</p><p className="font-semibold text-gray-900">Automática por igual período</p></div>
          </div>
        </div>

        {/* 5. Das Obrigações */}
        <div className="px-8 py-6 border-b border-gray-100">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">5. Das Obrigações</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Contratada (Posto)</p>
              <ul className="space-y-1.5 text-gray-600 text-xs leading-relaxed">
                <li>· Disponibilizar os combustíveis acordados</li>
                <li>· Emitir faturas dentro do ciclo pactuado</li>
                <li>· Manter os sistemas de validação operacionais</li>
                <li>· Comunicar reajustes com 5 dias de antecedência</li>
              </ul>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Contratante (Empresa)</p>
              <ul className="space-y-1.5 text-gray-600 text-xs leading-relaxed">
                <li>· Efetuar pagamentos dentro do prazo acordado</li>
                <li>· Respeitar o limite de crédito estabelecido</li>
                <li>· Gerenciar motoristas e veículos autorizados</li>
                <li>· Manter cadastro atualizado na plataforma</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 6. Das Penalidades */}
        <div className="px-8 py-6 border-b border-gray-100">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">6. Das Penalidades e Rescisão</h2>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-3 text-sm">
            <p className="text-gray-700 leading-relaxed">
              <strong>6.1 Multa e juros por atraso —</strong> Em caso de atraso no pagamento, incidirá multa de <strong>2%</strong> sobre o valor da fatura, acrescida de juros moratórios de <strong>1% ao mês</strong>, calculados pro rata die.
            </p>
            <p className="text-gray-700 leading-relaxed">
              <strong>6.2 Cancelamento automático —</strong> Decorridos <strong>15 dias corridos</strong> após o vencimento sem quitação, a parceria será <strong>cancelada automaticamente</strong>, ficando suspensas todas as operações de abastecimento.
            </p>
            <p className="text-gray-700 leading-relaxed">
              <strong>6.3 Cobrança judicial —</strong> O cancelamento não exime a Contratante do pagamento das obrigações já constituídas.
            </p>
          </div>
        </div>

        {/* 7. Da Autenticação Digital */}
        <div className="px-8 py-6 border-b border-gray-100">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">7. Da Autenticação Digital</h2>
          <p className="text-xs text-gray-500 mb-4 leading-relaxed">
            Este contrato foi celebrado digitalmente pela plataforma FleetPass, com validade jurídica nos termos da Lei n° 14.063/2020 e MP 2.200-2/2001.
          </p>
          <div className="space-y-4">
            {/* Auth Empresa */}
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs font-semibold text-blue-600 uppercase mb-3">Contratante (Empresa)</p>
              {assinadoEmpresaEm ? (
                contrato.authMethod === 'certificado_a1' ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Shield size={14} className="text-blue-600" />
                      <span className="text-xs font-semibold text-blue-700">Certificado Digital A1 — ICP-Brasil</span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
                      <div><p className="text-xs text-gray-400">Titular</p><p className="font-medium text-gray-900 text-xs mt-0.5">{contrato.authCertSubject ?? '—'}</p></div>
                      <div><p className="text-xs text-gray-400">Autoridade Certificadora</p><p className="font-medium text-gray-900 text-xs mt-0.5">{contrato.authCertIssuer ?? '—'}</p></div>
                      <div><p className="text-xs text-gray-400">Número de série</p><p className="font-mono font-medium text-gray-900 text-xs mt-0.5">{contrato.authCertSerial ?? '—'}</p></div>
                      <div><p className="text-xs text-gray-400">Validade do certificado</p><p className="font-medium text-gray-900 text-xs mt-0.5">{contrato.authCertValidade ?? '—'}</p></div>
                      <div><p className="text-xs text-gray-400">Data e hora</p><p className="font-medium text-gray-900 text-xs mt-0.5">{contrato.authData}</p></div>
                      <div><p className="text-xs text-gray-400">Endereço IP</p><p className="font-mono font-medium text-gray-900 text-xs mt-0.5">{contrato.authIp}</p></div>
                      <div className="col-span-2"><p className="text-xs text-gray-400">Hash (SHA-256)</p><p className="font-mono text-xs text-gray-600 break-all mt-0.5">{contrato.authHash}</p></div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
                    <div><p className="text-xs text-gray-400">Data e hora da assinatura</p><p className="font-medium text-gray-900 text-xs mt-0.5">{contrato.authData}</p></div>
                    <div><p className="text-xs text-gray-400">Endereço IP</p><p className="font-mono font-medium text-gray-900 text-xs mt-0.5">{contrato.authIp}</p></div>
                    <div><p className="text-xs text-gray-400">Dispositivo</p><p className="font-medium text-gray-900 text-xs mt-0.5">{contrato.authDispositivo}</p></div>
                    <div><p className="text-xs text-gray-400">Navegador / SO</p><p className="font-medium text-gray-900 text-xs mt-0.5">{contrato.authNavegador}</p></div>
                    <div className="col-span-2"><p className="text-xs text-gray-400">Hash (SHA-256)</p><p className="font-mono text-xs text-gray-600 break-all mt-0.5">{contrato.authHash}</p></div>
                  </div>
                )
              ) : (
                <p className="text-xs text-amber-600 italic">Aguardando assinatura da empresa.</p>
              )}
            </div>
            {/* Auth Posto */}
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs font-semibold text-emerald-600 uppercase mb-3">Contratada (Posto)</p>
              {assinadoPostoEm ? (
                <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
                  <div><p className="text-xs text-gray-400">Data e hora da assinatura</p><p className="font-medium text-gray-900 text-xs mt-0.5">{contrato.authDataPosto}</p></div>
                  <div><p className="text-xs text-gray-400">Endereço IP</p><p className="font-mono font-medium text-gray-900 text-xs mt-0.5">{contrato.authIpPosto}</p></div>
                  <div><p className="text-xs text-gray-400">Dispositivo</p><p className="font-medium text-gray-900 text-xs mt-0.5">{contrato.authDispositivoPosto}</p></div>
                  <div><p className="text-xs text-gray-400">Navegador / SO</p><p className="font-medium text-gray-900 text-xs mt-0.5">{contrato.authNavegadorPosto}</p></div>
                  <div className="col-span-2"><p className="text-xs text-gray-400">Hash (SHA-256)</p><p className="font-mono text-xs text-gray-600 break-all mt-0.5">{contrato.authHashPosto}</p></div>
                </div>
              ) : (
                <p className="text-xs text-amber-600 italic">Aguardando assinatura do posto.</p>
              )}
            </div>
          </div>
        </div>

        {/* 8. Das Assinaturas Digitais */}
        <div className="px-8 py-6 border-b border-gray-100">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">8. Das Assinaturas Digitais</h2>
          <div className="grid grid-cols-2 gap-6">
            {/* Empresa */}
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Contratante (Empresa)</p>
              {assinadoEmpresaEm ? (
                <div className="flex items-center gap-1.5 mb-2">
                  <Shield size={12} className="text-emerald-500" />
                  <span className="text-xs text-emerald-600 font-medium">Assinatura digital verificada</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 mb-2">
                  <div className="w-3 h-3 rounded-full border-2 border-amber-400" />
                  <span className="text-xs text-amber-600 font-medium">Aguardando assinatura</span>
                </div>
              )}
              <p className="font-semibold text-gray-900 text-sm">{contrato.empresa}</p>
              <p className="text-gray-500 text-xs">CNPJ: {contrato.cnpj}</p>
              <p className="text-gray-400 text-xs mt-1">
                {assinadoEmpresaEm ? formatDateTimeBR(assinadoEmpresaEm) : '—'}
              </p>
            </div>
            {/* Posto */}
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Contratada (Posto)</p>
              {assinadoPostoEm ? (
                <div className="flex items-center gap-1.5 mb-2">
                  <Shield size={12} className="text-emerald-500" />
                  <span className="text-xs text-emerald-600 font-medium">Assinatura digital verificada</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 mb-2">
                  <div className="w-3 h-3 rounded-full border-2 border-amber-400" />
                  <span className="text-xs text-amber-600 font-medium">Aguardando assinatura</span>
                </div>
              )}
              <p className="font-semibold text-gray-900 text-sm">{contrato.posto}</p>
              <p className="text-gray-500 text-xs">CNPJ: {contrato.postoCnpj}</p>
              <p className="text-gray-400 text-xs mt-1">
                {assinadoPostoEm ? formatDateTimeBR(assinadoPostoEm) : '—'}
              </p>
            </div>
          </div>
        </div>

        {/* 9. Linha do Tempo */}
        <div className="px-8 py-6 border-b border-gray-100">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-5">9. Linha do Tempo</h2>
          <div className="relative pl-6">
            {/* Linha vertical */}
            <div className="absolute left-[9px] top-1 bottom-1 w-px bg-gray-200" />

            {(() => {
              const eventos: { data: string; titulo: string; desc?: string; cor: string; icone: 'clock' | 'send' | 'check' | 'shield' | 'circle' }[] = []

              // 1. Contrato criado
              if (iniciadaEm) {
                eventos.push({
                  data: iniciadaEm,
                  titulo: 'Contrato gerado',
                  desc: 'Parceria aceita e contrato criado automaticamente pela plataforma.',
                  cor: 'text-gray-400',
                  icone: 'circle',
                })
              }

              // 2. Tokens OTP enviados
              tokens.forEach((t) => {
                const role = t.role === 'empresa' ? 'empresa' : 'posto'
                eventos.push({
                  data: t.created_at,
                  titulo: `Código OTP enviado (${role})`,
                  desc: 'Token de verificação enviado por e-mail e WhatsApp.',
                  cor: 'text-violet-500',
                  icone: 'send',
                })
                if (t.used_at) {
                  eventos.push({
                    data: t.used_at,
                    titulo: `Código OTP verificado (${role})`,
                    desc: 'Token confirmado com sucesso.',
                    cor: 'text-emerald-500',
                    icone: 'check',
                  })
                }
              })

              // 3. Assinatura empresa
              if (assinadoEmpresaEm) {
                eventos.push({
                  data: assinadoEmpresaEm,
                  titulo: 'Empresa assinou o contrato',
                  desc: `IP: ${contrato.authIp}`,
                  cor: 'text-blue-600',
                  icone: 'shield',
                })
              }

              // 4. Assinatura posto
              if (assinadoPostoEm) {
                eventos.push({
                  data: assinadoPostoEm,
                  titulo: 'Posto assinou o contrato',
                  desc: `IP: ${contrato.authIpPosto}`,
                  cor: 'text-emerald-600',
                  icone: 'shield',
                })
              }

              // 5. Parceria ativa
              if (assinadoEmpresaEm && assinadoPostoEm) {
                const ultima = assinadoEmpresaEm > assinadoPostoEm ? assinadoEmpresaEm : assinadoPostoEm
                eventos.push({
                  data: ultima,
                  titulo: 'Parceria ativada',
                  desc: 'Ambas as partes assinaram. Contrato em vigor.',
                  cor: 'text-emerald-600',
                  icone: 'check',
                })
              }

              // Ordena por data
              eventos.sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime())

              const iconMap = {
                clock:  <Clock size={14} />,
                send:   <Send size={14} />,
                check:  <CheckCircle2 size={14} />,
                shield: <Shield size={14} />,
                circle: <Circle size={14} />,
              }

              return eventos.map((ev, i) => (
                <div key={i} className="relative flex gap-3 pb-5 last:pb-0">
                  <div className={`relative z-10 flex items-center justify-center w-5 h-5 rounded-full bg-white ${ev.cor}`}>
                    {iconMap[ev.icone]}
                  </div>
                  <div className="pt-0.5">
                    <p className="text-xs font-semibold text-gray-800">{ev.titulo}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatDateTimeBR(ev.data)}</p>
                    {ev.desc && <p className="text-xs text-gray-500 mt-0.5">{ev.desc}</p>}
                  </div>
                </div>
              ))
            })()}

            {/* Estado pendente */}
            {(!assinadoEmpresaEm || !assinadoPostoEm) && (
              <div className="relative flex gap-3 pb-0">
                <div className="relative z-10 flex items-center justify-center w-5 h-5 rounded-full bg-white text-amber-400">
                  <Clock size={14} />
                </div>
                <div className="pt-0.5">
                  <p className="text-xs font-semibold text-amber-600">
                    {!assinadoEmpresaEm && !assinadoPostoEm
                      ? 'Aguardando assinatura de ambas as partes'
                      : !assinadoEmpresaEm
                        ? 'Aguardando assinatura da empresa'
                        : 'Aguardando assinatura do posto'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer do contrato */}
        <div className="px-8 py-3 bg-gray-50 border-b border-gray-100 text-center print:border-t print:border-gray-300 print:mt-6 print:pt-4">
          <p className="text-xs text-gray-400">
            Documento gerado e autenticado pela plataforma FleetPass · {contrato.authNum} · {contrato.authData}
          </p>
          <p className="text-xs text-gray-300 mt-1 hidden print:block">
            Este documento possui validade jurídica nos termos da Lei n° 14.063/2020 e MP 2.200-2/2001.
            A autenticidade pode ser verificada pelo hash SHA-256 registrado acima.
          </p>
        </div>

        {/* ── 10. Contatos de Faturamento (operacional, não imprime) ── */}
        <div className="px-8 py-6 print:hidden">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">9. Contatos de Faturamento</h2>
          <p className="text-xs text-gray-400 mb-5">E-mails e WhatsApp para onde as faturas serão enviadas automaticamente.</p>

          <div className="grid grid-cols-2 gap-6">
            {/* E-mails */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Mail size={14} className="text-blue-500" />
                <span className="text-sm font-semibold text-gray-800">E-mails</span>
              </div>
              <div className="space-y-2 mb-3">
                {emails.length === 0 && <p className="text-xs text-gray-400 italic">Nenhum e-mail cadastrado.</p>}
                {emails.map((e, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-100">
                    {editEmailIdx === i ? (
                      <>
                        <input
                          className="flex-1 text-xs border border-blue-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
                          value={editEmailVal}
                          onChange={(ev) => setEditEmailVal(ev.target.value)}
                          onKeyDown={(ev) => ev.key === 'Enter' && saveEmail(i)}
                          autoFocus
                        />
                        <button onClick={() => saveEmail(i)} className="text-emerald-500 hover:text-emerald-700"><Check size={13} /></button>
                        <button onClick={() => setEditEmailIdx(null)} className="text-gray-300 hover:text-gray-500"><X size={13} /></button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 text-xs text-gray-700 truncate">{e}</span>
                        <button onClick={() => { setEditEmailIdx(i); setEditEmailVal(e) }} className="text-gray-300 hover:text-blue-500 transition-colors"><Pencil size={12} /></button>
                        <button onClick={() => removeEmail(i)} className="text-gray-300 hover:text-red-500 transition-colors"><X size={13} /></button>
                      </>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="novo@email.com.br"
                  value={novoEmail}
                  onChange={(e) => setNovoEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addEmail()}
                  className="flex-1 text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
                />
                <button
                  onClick={addEmail}
                  className="flex items-center gap-1 text-xs bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus size={12} /> Adicionar
                </button>
              </div>
            </div>

            {/* WhatsApp */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <MessageCircle size={14} className="text-emerald-500" />
                <span className="text-sm font-semibold text-gray-800">WhatsApp</span>
              </div>
              <div className="space-y-2 mb-3">
                {whatsapps.length === 0 && <p className="text-xs text-gray-400 italic">Nenhum número cadastrado.</p>}
                {whatsapps.map((w, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-100">
                    {editWaIdx === i ? (
                      <>
                        <input
                          className="flex-1 text-xs border border-blue-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
                          value={editWaVal}
                          onChange={(ev) => setEditWaVal(ev.target.value)}
                          onKeyDown={(ev) => ev.key === 'Enter' && saveWa(i)}
                          autoFocus
                        />
                        <button onClick={() => saveWa(i)} className="text-emerald-500 hover:text-emerald-700"><Check size={13} /></button>
                        <button onClick={() => setEditWaIdx(null)} className="text-gray-300 hover:text-gray-500"><X size={13} /></button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 text-xs text-gray-700">{w}</span>
                        <button onClick={() => { setEditWaIdx(i); setEditWaVal(w) }} className="text-gray-300 hover:text-blue-500 transition-colors"><Pencil size={12} /></button>
                        <button onClick={() => removeWa(i)} className="text-gray-300 hover:text-red-500 transition-colors"><X size={13} /></button>
                      </>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="tel"
                  placeholder="+55 11 99999-0000"
                  value={novoWhatsapp}
                  onChange={(e) => setNovoWhatsapp(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addWa()}
                  className="flex-1 text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-100"
                />
                <button
                  onClick={addWa}
                  className="flex items-center gap-1 text-xs bg-emerald-600 text-white px-3 py-2 rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  <Plus size={12} /> Adicionar
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Assinatura do Posto */}
        <div className="px-8 py-6 border-t border-gray-100 print:hidden">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Assinar contrato</h3>
          {assinadoPostoEm ? (
            <div className="flex items-center gap-2 py-3 px-4 bg-emerald-50 border border-emerald-200 rounded-xl">
              <Shield size={14} className="text-emerald-600" />
              <span className="text-sm font-medium text-emerald-700">
                Contrato assinado em {formatDateTimeBR(assinadoPostoEm)}
              </span>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-gray-500">
                Ao assinar, você confirma os termos da parceria e registra sua assinatura digital com validade jurídica conforme Lei nº 14.063/2020.
              </p>
              <label className="flex items-center gap-3 cursor-pointer">
                <button type="button" onClick={() => setAgreed(!agreed)} className="shrink-0">
                  {agreed
                    ? <CheckSquare size={18} className="text-blue-600" />
                    : <Square size={18} className="text-gray-300" />}
                </button>
                <span className="text-sm text-gray-600">Li e concordo com todos os termos deste contrato.</span>
              </label>
              {signError && <p className="text-xs text-red-600">{signError}</p>}
              <Button disabled={!agreed || signing} onClick={handleAssinar} className="w-full">
                {signing
                  ? <><span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" /> Assinando...</>
                  : <><Shield size={14} /> Assinar digitalmente</>}
              </Button>
            </div>
          )}
        </div>

        {/* Back button */}
        <div className="px-8 pb-6 flex justify-end print:hidden border-t border-gray-100 pt-4">
          <Link href="/posto/parcerias/ativos">
            <Button variant="secondary">Voltar</Button>
          </Link>
        </div>

      </div>
    </div>
  )
}
