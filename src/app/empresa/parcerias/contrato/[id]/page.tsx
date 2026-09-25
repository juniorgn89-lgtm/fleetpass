'use client'

import type forge from 'node-forge'
import { Logo } from '@/components/ui/logo'
import { use, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  AlertCircle, ArrowLeft, Shield, Printer, Clock, Send, CheckCircle2, Circle,
  Upload, Eye, EyeOff, X, Check, FileKey, MessageSquare,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Combustivel {
  tipo: string
  ativo: boolean
  modal_preco: string
  valor?: number
  unidade?: string
}

interface ApiParceria {
  id: string
  status: string
  iniciada_em: string
  combustiveis: Combustivel[]
  ciclo_tipo: string
  ciclo_prazo_recebimento: number
  limite_credito: number | null
  empresas: { nome_empresa: string; cnpj: string; cidade: string; estado: string }
  postos:   { nome: string; cnpj: string; endereco: string; numero: string; bairro: string; cidade: string; estado: string }
  contratos?: {
    id?: string
    exige_certificado?: boolean
    auth_hash?:          string
    auth_ip?:            string
    auth_dispositivo?:   string
    auth_navegador?:     string
    auth_data?:          string
    auth_method?:        string
    auth_cert_subject?:  string
    auth_cert_issuer?:   string
    auth_cert_serial?:   string
    auth_cert_validade?: string
    auth_hash_posto?:          string
    auth_ip_posto?:            string
    auth_dispositivo_posto?:   string
    auth_navegador_posto?:     string
    auth_data_posto?:          string
    assinado_empresa_em?: string | null
    assinado_posto_em?:   string | null
  }
}

interface ContratoView {
  empresa: string; cnpj: string; cidade: string
  posto: string; postoCnpj: string; postoEndereco: string
  desde: string; vigenciaFim: string
  combustiveis: string[]
  precos: { combustivel: string; modalidade: 'bomba' | 'desconto' | 'acrescimo'; valor?: string }[]
  limite: string
  ciclo: { tipo: string; prazoRecebimento: number }
  // Auth empresa
  authNum: string; authData: string; authIp: string
  authDispositivo: string; authNavegador: string; authHash: string
  authMethod: string
  authCertSubject?: string; authCertIssuer?: string; authCertSerial?: string; authCertValidade?: string
  // Auth posto
  authDataPosto: string; authIpPosto: string
  authDispositivoPosto: string; authNavegadorPosto: string; authHashPosto: string
  assinadoEmpresaEm: string | null
  assinadoPostoEm:   string | null
  contratoId: string | null
  exigeCertificado: boolean
}

interface TokenEvento {
  id: string
  role: string
  created_at: string
  used_at: string | null
  expires_at: string
}

interface CertInfo {
  subject: string
  issuer:  string
  serial:  string
  validade: string
  validadeFmt: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
function formatDateTime(iso: string) {
  const d = new Date(iso)
  return `${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
}
function addOneYear(iso: string) {
  const d = new Date(iso)
  d.setFullYear(d.getFullYear() + 1)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
function formatMoney(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function capitalizeFirst(s: string) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s }

function mapToContratoView(p: ApiParceria): ContratoView {
  return {
    empresa: p.empresas.nome_empresa, cnpj: p.empresas.cnpj,
    cidade:  `${p.empresas.cidade}, ${p.empresas.estado}`,
    posto:   p.postos.nome, postoCnpj: p.postos.cnpj,
    postoEndereco: [p.postos.endereco, p.postos.numero, p.postos.cidade, p.postos.estado].filter(Boolean).join(', '),
    desde:      formatDate(p.iniciada_em),
    vigenciaFim: addOneYear(p.iniciada_em),
    combustiveis: p.combustiveis.map(c => c.tipo),
    precos: p.combustiveis.map(c => ({
      combustivel: c.tipo,
      modalidade:  c.modal_preco as 'bomba' | 'desconto' | 'acrescimo',
      valor: c.valor != null ? `R$ ${c.valor.toFixed(2).replace('.', ',')}/L` : undefined,
    })),
    limite: p.limite_credito != null ? `R$ ${formatMoney(Number(p.limite_credito))}/mês` : 'Sem limite definido',
    ciclo:  { tipo: capitalizeFirst(p.ciclo_tipo), prazoRecebimento: p.ciclo_prazo_recebimento },
    authNum:         `AUTH-${p.id.slice(0, 8).toUpperCase()}`,
    authData:        p.contratos?.auth_data     ? formatDateTime(p.contratos.auth_data) : '—',
    authIp:          p.contratos?.auth_ip        ?? '—',
    authDispositivo: p.contratos?.auth_dispositivo ?? '—',
    authNavegador:   p.contratos?.auth_navegador   ?? '—',
    authHash:        p.contratos?.auth_hash        ?? '—',
    authMethod:      p.contratos?.auth_method      ?? 'sistema',
    authCertSubject: p.contratos?.auth_cert_subject,
    authCertIssuer:  p.contratos?.auth_cert_issuer,
    authCertSerial:  p.contratos?.auth_cert_serial,
    authCertValidade:p.contratos?.auth_cert_validade,
    // Auth posto
    authDataPosto:        p.contratos?.auth_data_posto ? formatDateTime(p.contratos.auth_data_posto) : '—',
    authIpPosto:          p.contratos?.auth_ip_posto ?? '—',
    authDispositivoPosto: p.contratos?.auth_dispositivo_posto ?? '—',
    authNavegadorPosto:   p.contratos?.auth_navegador_posto ?? '—',
    authHashPosto:        p.contratos?.auth_hash_posto ?? '—',
    assinadoEmpresaEm: p.contratos?.assinado_empresa_em ?? null,
    assinadoPostoEm:   p.contratos?.assinado_posto_em   ?? null,
    contratoId:        (p.contratos as any)?.id ?? null,
    exigeCertificado:  (p.contratos as any)?.exige_certificado ?? false,
  }
}

function descCiclo(tipo: string, prazo: number): string {
  switch (tipo.toLowerCase()) {
    case 'quinzenal': return `2 ciclos/mês: dias 01–15 (fatura dia 16, vence dia ${15 + prazo}) · dias 16–último (fatura dia 01, vence dia ${String(prazo).padStart(2, '0')})`
    case 'semanal':   return `Fatura toda semana · vence ${prazo} dia${prazo !== 1 ? 's' : ''} após o faturamento`
    case 'mensal':    return `Vende o mês inteiro → fatura no dia 01 → vence no dia ${String(prazo).padStart(2, '0')}`
    case 'diario': case 'diário': return `Fatura diariamente · vence ${prazo} dia${prazo !== 1 ? 's' : ''} após o faturamento`
    default: return tipo
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ContratoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)

  const [contrato, setContrato]                   = useState<ContratoView | null>(null)
  const [loading, setLoading]                     = useState(true)
  const [error, setError]                         = useState<string | null>(null)
  const [assinadoEmpresaEm, setAssinadoEmpresaEm] = useState<string | null>(null)
  const [assinadoPostoEm,   setAssinadoPostoEm]   = useState<string | null>(null)
  const [tokens, setTokens]                       = useState<TokenEvento[]>([])
  const [iniciadaEm, setIniciadaEm]               = useState<string | null>(null)

  // ── Estado: Certificado A1 ────────────────────────────────────────────────
  const fileRef            = useRef<HTMLInputElement>(null)
  const [certFile,         setCertFile]        = useState<File | null>(null)
  const [certPassword,     setCertPassword]    = useState('')
  const [showPass,         setShowPass]        = useState(false)
  const [certInfo,         setCertInfo]        = useState<CertInfo | null>(null)
  const [certLoading,      setCertLoading]     = useState(false)
  const [certError,        setCertError]       = useState<string | null>(null)
  const [certSigning,      setCertSigning]     = useState(false)
  const [certSignError,    setCertSignError]   = useState<string | null>(null)
  const [agreed,           setAgreed]          = useState(false)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/empresa/parcerias/contrato/${id}`)
      .then(async res => {
        if (!res.ok) throw new Error(`Erro ao carregar contrato (${res.status})`)
        const json = await res.json()
        const p: ApiParceria = json.parceria
        setContrato(mapToContratoView(p))
        setAssinadoEmpresaEm(p.contratos?.assinado_empresa_em ?? null)
        setAssinadoPostoEm(p.contratos?.assinado_posto_em   ?? null)
        setTokens(json.tokens ?? [])
        setIniciadaEm(p.iniciada_em ?? null)
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [id])

  // ── Certificado A1: carregar ──────────────────────────────────────────────
  async function loadCertificate() {
    if (!certFile || !certPassword) return
    setCertLoading(true)
    setCertError(null)
    setCertInfo(null)
    try {
      const forgeLib = (await import('node-forge')).default
      const buf      = await certFile.arrayBuffer()
      const b64      = btoa(String.fromCharCode(...new Uint8Array(buf)))
      const binary   = forgeLib.util.decode64(b64)

      let p12: ReturnType<typeof forgeLib.pkcs12.pkcs12FromAsn1>
      try {
        p12 = forgeLib.pkcs12.pkcs12FromAsn1(forgeLib.asn1.fromDer(binary), certPassword)
      } catch {
        throw new Error('Senha incorreta ou arquivo inválido.')
      }

      const certBags = p12.getBags({ bagType: forgeLib.pki.oids.certBag })
      const certItem = certBags[forgeLib.pki.oids.certBag]?.[0]?.cert
      if (!certItem) throw new Error('Nenhum certificado encontrado no arquivo.')

      const subject  = certItem.subject.getField('CN')?.value as string ?? 'N/A'
      const issuer   = certItem.issuer.getField('CN')?.value  as string ?? 'N/A'
      const serial   = certItem.serialNumber as string
      const notAfter = certItem.validity.notAfter

      if (notAfter < new Date()) throw new Error('Certificado expirado.')

      // Verifica se o CNPJ do certificado confere com o da empresa
      if (contrato) {
        const cnpjEmpresa = contrato.cnpj.replace(/\D/g, '')
        if (cnpjEmpresa.length === 14) {
          // Extrai todos os dígitos do CN e busca sequências de 14 dígitos (CNPJ)
          const todosDigitos = subject.replace(/\D/g, '')
          const cnpjsNoCert: string[] = []
          // Busca CNPJ no CN com regex em sequência de 14 dígitos
          const matches = subject.replace(/[.\-/]/g, '').match(/\d{14}/g)
          if (matches) cnpjsNoCert.push(...matches)
          // Se o CN inteiro tem 14+ dígitos, tenta o bloco completo
          if (todosDigitos.length >= 14 && !cnpjsNoCert.includes(todosDigitos.slice(0, 14))) {
            cnpjsNoCert.push(todosDigitos.slice(0, 14))
          }

          if (!cnpjsNoCert.some(c => c === cnpjEmpresa)) {
            throw new Error(`O certificado digital não pertence à empresa cadastrada (CNPJ ${contrato.cnpj}). Selecione o certificado emitido para este CNPJ.`)
          }
        }
      }

      setCertInfo({
        subject, issuer, serial,
        validade:    notAfter.toISOString(),
        validadeFmt: notAfter.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      })
    } catch (err) {
      setCertError(err instanceof Error ? err.message : 'Erro ao carregar certificado.')
    } finally {
      setCertLoading(false)
    }
  }

  // ── Certificado A1: assinar ───────────────────────────────────────────────
  async function handleAssinarCert() {
    if (!certFile || !certPassword || !certInfo) return
    setCertSigning(true)
    setCertSignError(null)
    try {
      const forgeLib  = (await import('node-forge')).default
      const buf       = await certFile.arrayBuffer()
      const b64       = btoa(String.fromCharCode(...new Uint8Array(buf)))
      const binary    = forgeLib.util.decode64(b64)
      const p12       = forgeLib.pkcs12.pkcs12FromAsn1(forgeLib.asn1.fromDer(binary), certPassword)

      const keyBags    = p12.getBags({ bagType: forgeLib.pki.oids.pkcs8ShroudedKeyBag })
      const privateKey = keyBags[forgeLib.pki.oids.pkcs8ShroudedKeyBag]?.[0]?.key
      if (!privateKey) throw new Error('Chave privada não encontrada no certificado.')

      const certBags  = p12.getBags({ bagType: forgeLib.pki.oids.certBag })
      const certItem  = certBags[forgeLib.pki.oids.certBag]?.[0]?.cert
      if (!certItem) throw new Error('Certificado não encontrado.')

      const payload = JSON.stringify({
        parceria_id: id, role: 'empresa', method: 'certificado_a1',
        timestamp: new Date().toISOString(),
      })

      const md = forgeLib.md.sha256.create()
      md.update(payload, 'utf8')
      const sigBytes  = (privateKey as forge.pki.rsa.PrivateKey).sign(md)
      const signature = forgeLib.util.encode64(sigBytes)
      const certPem   = forgeLib.pki.certificateToPem(certItem)

      const res  = await fetch(`/api/empresa/parcerias/contrato/${id}/assinar-cert`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signature, certificate: certPem, payload }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro ao assinar contrato.')

      setAssinadoEmpresaEm(data.assinado_em)
      setContrato(prev => prev ? {
        ...prev,
        authMethod:       'certificado_a1',
        authCertSubject:  data.cert_subject,
        authCertIssuer:   data.cert_issuer,
        authCertSerial:   data.cert_serial,
        authCertValidade: data.cert_validade,
        authIp:           data.auth_ip,
        authHash:         data.auth_hash,
        authData:         formatDateTime(data.assinado_em),
      } : prev)
      setAgreed(false)
    } catch (err) {
      setCertSignError(err instanceof Error ? err.message : 'Erro ao assinar.')
    } finally {
      setCertSigning(false)
    }
  }

  // ── Assinatura simples (consentimento) ────────────────────────────────────
  const [simplesSigning, setSimplesSigning] = useState(false)
  const [simplesError, setSimplesError] = useState<string | null>(null)

  async function handleAssinarSimples() {
    if (!contrato?.contratoId || !agreed) return
    setSimplesSigning(true)
    setSimplesError(null)
    try {
      const res = await fetch(`/api/empresa/parcerias/contrato/${contrato.contratoId}/assinar-simples`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro ao assinar contrato.')
      setAssinadoEmpresaEm(data.assinado_em)
      setContrato(prev => prev ? {
        ...prev,
        authMethod:      'sistema',
        authIp:          data.ip ?? prev.authIp,
        authDispositivo: data.dispositivo ?? prev.authDispositivo,
        authNavegador:   data.navegador ?? prev.authNavegador,
        authHash:        data.authHash ?? prev.authHash,
        authData:        formatDateTime(data.assinado_em),
      } : prev)
      setAgreed(false)
    } catch (err) {
      setSimplesError(err instanceof Error ? err.message : 'Erro ao assinar.')
    } finally {
      setSimplesSigning(false)
    }
  }


  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center shadow-sm">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm text-gray-500">Carregando contrato…</p>
      </div>
    </div>
  )

  if (error || !contrato) return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center shadow-sm">
        <p className="text-sm text-red-500 mb-4">{error ?? 'Contrato não encontrado.'}</p>
        <Link href="/empresa/parcerias"><Button variant="secondary">Voltar às parcerias</Button></Link>
      </div>
    </div>
  )

  const year        = contrato.desde.slice(6)
  const contratoNum = `FLINK-${year}-${id.slice(0, 8).toUpperCase()}`

  return (
    <div className="max-w-2xl mx-auto space-y-4 print:max-w-none print:mx-0 print:space-y-0">
      <div className="flex items-center justify-between print:hidden">
        <Link href="/empresa/parcerias" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft size={16} /> Voltar às parcerias
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
                {contrato.precos.map(pr => {
                  const label = pr.modalidade === 'bomba' ? 'Preço de bomba' : pr.modalidade === 'desconto' ? `Desconto de ${pr.valor}` : `Acréscimo de ${pr.valor}`
                  const cls   = pr.modalidade === 'bomba' ? 'text-gray-700' : pr.modalidade === 'desconto' ? 'text-emerald-700 font-semibold' : 'text-red-600 font-semibold'
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

        {/* 6. Das Penalidades e Rescisão */}
        <div className="px-8 py-6 border-b border-gray-100">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">6. Das Penalidades e Rescisão</h2>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-3 text-sm">
            <p className="text-gray-700 leading-relaxed">
              <strong>6.1 Multa e juros por atraso —</strong> Em caso de atraso no pagamento, incidirá multa de <strong>2% (dois por cento)</strong> sobre o valor da fatura, acrescida de juros moratórios de <strong>1% (um por cento) ao mês</strong>, calculados pro rata die.
            </p>
            <p className="text-gray-700 leading-relaxed">
              <strong>6.2 Cancelamento automático —</strong> Decorridos <strong>15 (quinze) dias corridos</strong> após o vencimento sem quitação, a parceria será <strong>cancelada automaticamente</strong>, ficando suspensas todas as operações de abastecimento.
            </p>
            <p className="text-gray-700 leading-relaxed">
              <strong>6.3 Cobrança judicial —</strong> O cancelamento não exime a Contratante do pagamento das obrigações já constituídas, podendo a Contratada utilizar os registros digitais deste contrato como meio de prova em eventual cobrança extrajudicial ou judicial.
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
                <>
                  {contrato.authMethod === 'certificado_a1' ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <FileKey size={14} className="text-blue-600" />
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
                  ) : contrato.authMethod === 'token' ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <MessageSquare size={14} className="text-violet-600" />
                        <span className="text-xs font-semibold text-violet-700">Token OTP — E-mail + WhatsApp</span>
                      </div>
                      <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
                        <div><p className="text-xs text-gray-400">Data e hora</p><p className="font-medium text-gray-900 text-xs mt-0.5">{contrato.authData}</p></div>
                        <div><p className="text-xs text-gray-400">Endereço IP</p><p className="font-mono font-medium text-gray-900 text-xs mt-0.5">{contrato.authIp}</p></div>
                        <div><p className="text-xs text-gray-400">Dispositivo</p><p className="font-medium text-gray-900 text-xs mt-0.5">{contrato.authDispositivo}</p></div>
                        <div><p className="text-xs text-gray-400">Navegador / SO</p><p className="font-medium text-gray-900 text-xs mt-0.5">{contrato.authNavegador}</p></div>
                        <div className="col-span-2"><p className="text-xs text-gray-400">Hash (SHA-256)</p><p className="font-mono text-xs text-gray-600 break-all mt-0.5">{contrato.authHash}</p></div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
                      <div><p className="text-xs text-gray-400">Data e hora</p><p className="font-medium text-gray-900 text-xs mt-0.5">{contrato.authData}</p></div>
                      <div><p className="text-xs text-gray-400">Endereço IP</p><p className="font-mono font-medium text-gray-900 text-xs mt-0.5">{contrato.authIp}</p></div>
                      <div><p className="text-xs text-gray-400">Dispositivo</p><p className="font-medium text-gray-900 text-xs mt-0.5">{contrato.authDispositivo}</p></div>
                      <div><p className="text-xs text-gray-400">Navegador / SO</p><p className="font-medium text-gray-900 text-xs mt-0.5">{contrato.authNavegador}</p></div>
                      <div className="col-span-2"><p className="text-xs text-gray-400">Hash (SHA-256)</p><p className="font-mono text-xs text-gray-600 break-all mt-0.5">{contrato.authHash}</p></div>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-xs text-amber-600 italic">Aguardando assinatura da empresa.</p>
              )}
            </div>
            {/* Auth Posto */}
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs font-semibold text-emerald-600 uppercase mb-3">Contratada (Posto)</p>
              {assinadoPostoEm ? (
                <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
                  <div><p className="text-xs text-gray-400">Data e hora</p><p className="font-medium text-gray-900 text-xs mt-0.5">{contrato.authDataPosto}</p></div>
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
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Contratante (Empresa)</p>
              {assinadoEmpresaEm ? (
                <div className="flex items-center gap-1.5 mb-2"><Shield size={12} className="text-emerald-500" /><span className="text-xs text-emerald-600 font-medium">Assinatura digital verificada</span></div>
              ) : (
                <div className="flex items-center gap-1.5 mb-2"><div className="w-3 h-3 rounded-full border-2 border-amber-400" /><span className="text-xs text-amber-600 font-medium">Aguardando assinatura</span></div>
              )}
              <p className="font-semibold text-gray-900 text-sm">{contrato.empresa}</p>
              <p className="text-gray-500 text-xs">CNPJ: {contrato.cnpj}</p>
              <p className="text-gray-400 text-xs mt-1">{assinadoEmpresaEm ? formatDateTime(assinadoEmpresaEm) : '—'}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Contratada (Posto)</p>
              {assinadoPostoEm ? (
                <div className="flex items-center gap-1.5 mb-2"><Shield size={12} className="text-emerald-500" /><span className="text-xs text-emerald-600 font-medium">Assinatura digital verificada</span></div>
              ) : (
                <div className="flex items-center gap-1.5 mb-2"><div className="w-3 h-3 rounded-full border-2 border-amber-400" /><span className="text-xs text-amber-600 font-medium">Aguardando assinatura</span></div>
              )}
              <p className="font-semibold text-gray-900 text-sm">{contrato.posto}</p>
              <p className="text-gray-500 text-xs">CNPJ: {contrato.postoCnpj}</p>
              <p className="text-gray-400 text-xs mt-1">{assinadoPostoEm ? formatDateTime(assinadoPostoEm) : '—'}</p>
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
                  desc: `Token de verificação enviado por e-mail e WhatsApp.`,
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
                const metodo = contrato.authMethod === 'certificado_a1'
                  ? 'Certificado Digital A1 (ICP-Brasil)'
                  : contrato.authMethod === 'token'
                    ? 'Token OTP (E-mail + WhatsApp)'
                    : 'Assinatura digital do sistema'
                eventos.push({
                  data: assinadoEmpresaEm,
                  titulo: 'Empresa assinou o contrato',
                  desc: `Método: ${metodo} · IP: ${contrato.authIp}`,
                  cor: 'text-blue-600',
                  icone: 'shield',
                })
              }

              // 4. Assinatura posto
              if (assinadoPostoEm) {
                eventos.push({
                  data: assinadoPostoEm,
                  titulo: 'Posto assinou o contrato',
                  desc: `Assinatura digital do sistema · IP: ${contrato.authIpPosto}`,
                  cor: 'text-emerald-600',
                  icone: 'shield',
                })
              }

              // 5. Parceria ativa (ambos assinaram)
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
                    <p className="text-xs text-gray-400 mt-0.5">{formatDateTime(ev.data)}</p>
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

        {/* Footer */}
        <div className="px-8 py-3 bg-gray-50 border-b border-gray-100 text-center print:border-t print:border-gray-300 print:mt-6 print:pt-4">
          <p className="text-xs text-gray-400">
            Documento gerado e autenticado pela plataforma FleetPass · {contrato.authNum} · {contrato.authData}
          </p>
          <p className="text-xs text-gray-300 mt-1 hidden print:block">
            Este documento possui validade jurídica nos termos da Lei n° 14.063/2020 e MP 2.200-2/2001.
            A autenticidade pode ser verificada pelo hash SHA-256 registrado acima.
          </p>
        </div>

        {/* ── Seção de assinatura ────────────────────────────────────────────── */}
        <div className="px-8 py-6 print:hidden">
          {assinadoEmpresaEm ? (
            <div className="flex items-center justify-center gap-2 py-3 px-4 bg-emerald-50 border border-emerald-200 rounded-xl">
              <Check size={16} className="text-emerald-600" />
              <span className="text-sm font-medium text-emerald-700">
                Contrato assinado em {formatDateTime(assinadoEmpresaEm)}
              </span>
            </div>
          ) : !contrato.exigeCertificado ? (
            // ── Assinatura simples (consentimento) ──
            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-gray-800 mb-1">Assinar contrato</p>
                <p className="text-xs text-gray-500 leading-relaxed">
                  O posto não exigiu certificado digital para esta parceria. Sua assinatura será registrada com IP, dispositivo, navegador e hash SHA-256 do documento, com validade probatória nos termos do art. 10 §2º da MP 2.200-2/2001.
                </p>
              </div>

              <label className="flex items-start gap-3 cursor-pointer p-3 bg-gray-50 border border-gray-100 rounded-xl">
                <button type="button" onClick={() => setAgreed(v => !v)}>
                  {agreed
                    ? <div className="w-5 h-5 bg-blue-600 rounded flex items-center justify-center shrink-0"><Check size={12} className="text-white" /></div>
                    : <div className="w-5 h-5 border-2 border-gray-300 rounded shrink-0" />}
                </button>
                <span className="text-sm text-gray-600 leading-relaxed">
                  Declaro que li e concordo com todos os termos do presente contrato, e que minha assinatura tem validade legal.
                </span>
              </label>

              {simplesError && (
                <div className="flex items-start gap-2.5 p-3 bg-red-50 border border-red-200 rounded-xl">
                  <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
                  <p className="text-sm font-medium text-red-700">{simplesError}</p>
                </div>
              )}

              <div className="flex gap-3">
                <Button variant="danger" className="flex-1" onClick={() => window.history.back()}>
                  <X size={15} /> Recusar
                </Button>
                <Button className="flex-1" disabled={!agreed || simplesSigning} onClick={handleAssinarSimples}>
                  {simplesSigning
                    ? <><span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" /> Assinando...</>
                    : <><Check size={14} /> Confirmar e assinar</>}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-gray-800 mb-1">Assinar contrato com Certificado Digital</p>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Assinatura Qualificada com validade jurídica nos termos da Lei 14.063/2020 e MP 2.200-2/2001.
                </p>
              </div>

              {/* ── Certificado A1 ── */}
              <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-xs text-blue-700 leading-relaxed">
                    <strong>Assinatura Qualificada (ICP-Brasil A1)</strong> — Use o arquivo <code>.pfx</code> ou <code>.p12</code> do seu certificado digital emitido por uma AC credenciada (Serasa, Certisign, Soluti, Valid etc.). A chave privada nunca sai do seu navegador.
                  </div>

                  <div>
                    <input
                      ref={fileRef}
                      type="file"
                      accept=".pfx,.p12"
                      className="hidden"
                      onChange={e => { setCertFile(e.target.files?.[0] ?? null); setCertInfo(null); setCertError(null) }}
                    />
                    <button
                      onClick={() => fileRef.current?.click()}
                      className="flex items-center gap-2 w-full border-2 border-dashed border-gray-200 rounded-xl p-4 text-sm text-gray-500 hover:border-blue-300 hover:text-blue-600 transition-colors"
                    >
                      <Upload size={16} />
                      {certFile ? certFile.name : 'Selecionar arquivo .pfx / .p12'}
                    </button>
                  </div>

                  {certFile && !certInfo && (
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          type={showPass ? 'text' : 'password'}
                          placeholder="Senha do certificado"
                          value={certPassword}
                          onChange={e => setCertPassword(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && loadCertificate()}
                          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 pr-10 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPass(v => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                      <Button onClick={loadCertificate} disabled={certLoading || !certPassword}>
                        {certLoading ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Carregar'}
                      </Button>
                    </div>
                  )}

                  {certError && (
                    <div className="flex items-start gap-2.5 p-3 bg-red-50 border border-red-200 rounded-xl">
                      <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-red-700">{certError}</p>
                        {certError.includes('CNPJ') && (
                          <p className="text-xs text-red-500 mt-1">Verifique se está usando o certificado digital emitido para esta empresa. Caso tenha mais de um certificado, selecione o correto.</p>
                        )}
                      </div>
                    </div>
                  )}

                  {certInfo && (
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Shield size={13} className="text-emerald-500" />
                          <span className="text-xs font-semibold text-emerald-700">Certificado válido</span>
                        </div>
                        <button onClick={() => { setCertInfo(null); setCertFile(null); setCertPassword(''); setAgreed(false) }} className="text-gray-300 hover:text-gray-500"><X size={14} /></button>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div><p className="text-gray-400">Titular</p><p className="font-medium text-gray-800 truncate">{certInfo.subject}</p></div>
                        <div><p className="text-gray-400">Emitido por</p><p className="font-medium text-gray-800 truncate">{certInfo.issuer}</p></div>
                        <div><p className="text-gray-400">Válido até</p><p className="font-medium text-gray-800">{certInfo.validadeFmt}</p></div>
                        <div><p className="text-gray-400">Série</p><p className="font-mono font-medium text-gray-800 truncate">{certInfo.serial}</p></div>
                      </div>
                    </div>
                  )}

                  {certInfo && (
                    <>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <button type="button" onClick={() => setAgreed(v => !v)}>
                          {agreed
                            ? <div className="w-5 h-5 bg-blue-600 rounded flex items-center justify-center"><Check size={12} className="text-white" /></div>
                            : <div className="w-5 h-5 border-2 border-gray-300 rounded" />}
                        </button>
                        <span className="text-sm text-gray-600">Li e concordo com todos os termos do presente contrato.</span>
                      </label>
                      {certSignError && <p className="text-xs text-red-600">{certSignError}</p>}
                      <div className="flex gap-3">
                        <Button variant="danger" className="flex-1" onClick={() => window.history.back()}>
                          <X size={15} /> Recusar
                        </Button>
                        <Button className="flex-1" disabled={!agreed || certSigning} onClick={handleAssinarCert}>
                          {certSigning
                            ? <><span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" /> Assinando...</>
                            : <><FileKey size={14} /> Assinar com Certificado A1</>}
                        </Button>
                      </div>
                    </>
                  )}
                </div>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
