'use client'

import { useState, useEffect } from 'react'
import { FileText, Plus, X, MapPin, Check, AlertCircle, Store, Loader2, FileSignature, MessageCircle } from 'lucide-react'
import { ModalPostoParceiro } from '@/components/empresa/modal-posto-parceiro'
import { NegociacaoPainel } from '@/components/parcerias/negociacao-painel'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Tabs } from '@/components/ui/tabs'
import { Modal } from '@/components/ui/modal'
import Link from 'next/link'

type Ativa = {
  id: string
  posto: string
  cidade: string
  bandeira: string
  desde: string
  ate: string
  combustiveis: string[]
}

type PropostaCombustivel = {
  tipo: string
  ativo: boolean
  modal_preco: string
  valor?: string
  unidade?: string
}

type Proposta = {
  id: string
  combustiveis: { tipo: string; condicao: string }[]
  ciclo: { tipo: string; intervaloDias?: string; prazoRecebimento: string }
  limiteCredito?: string
  volumeMinimo?: string
  validade: string
  observacoes?: string
  enviadoEm: string
}

type Pendente = {
  id: string
  posto: string
  cidade: string
  bandeira: string
  enviadoEm: string
  combustiveis: string[]
  status: 'aguardando' | 'proposta_recebida' | 'em_negociacao'
  mensagensNaoLidas?: number
  emNegociacao?: boolean
  totalVersoes?: number
  proposta?: Proposta
}

type AguardandoAssinatura = {
  id: string
  posto: string
  cidade: string
  bandeira: string
  desde: string
  combustiveis: string[]
  assinadoEmpresaEm: string | null
  assinadoPostoEm: string | null
}

type Encerrada = {
  id: string
  posto: string
  cidade: string
  encerradoEm: string
  motivo: string
  combustiveis: string[]
}

type ParceriasResponse = {
  ativas: Ativa[]
  aguardandoAssinatura: AguardandoAssinatura[]
  pendentes: Array<Omit<Pendente, 'proposta'> & {
    proposta?: Omit<Proposta, 'combustiveis'> & {
      combustiveis: PropostaCombustivel[]
    }
  }>
  encerradas: Encerrada[]
}

function formatCondicaoDB(c: { tipo: string; modal_preco: string; valor?: string; unidade?: string }): string {
  if (c.modal_preco === 'bomba') return 'Preço de bomba'
  const sinal = c.modal_preco === 'acrescimo' ? '+' : '-'
  return c.unidade === '%' ? `${sinal} ${c.valor}% sobre bomba` : `${sinal} R$ ${c.valor}/L sobre bomba`
}

function normalizePendente(raw: ParceriasResponse['pendentes'][number]): Pendente {
  if (!raw.proposta) return raw as Pendente
  return {
    ...raw,
    proposta: {
      ...raw.proposta,
      combustiveis: raw.proposta.combustiveis.map((c) => ({
        tipo: c.tipo,
        condicao: formatCondicaoDB(c),
      })),
    },
  }
}

function PostoChip({ nome }: { nome: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
      <Store size={10} />
      {nome}
    </span>
  )
}

export default function ParceriasPage() {
  const [tab, setTab] = useState('ativas')
  // Guarda o id da PARCERIA, não o do posto: é por ela que a rota valida o
  // acesso. null = modal fechado, e com ele o mapa nem é baixado.
  const [postoModal, setPostoModal] = useState<string | null>(null)

  const [ativas, setAtivas] = useState<Ativa[]>([])
  const [aguardandoAssinatura, setAguardandoAssinatura] = useState<AguardandoAssinatura[]>([])
  const [pendentes, setPendentes] = useState<Pendente[]>([])
  const [encerradas, setEncerradas] = useState<Encerrada[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [propostaModal, setPropostaModal] = useState<string | null>(null)
  const [aceiteConfirm, setAceiteConfirm] = useState(false)
  const [recusaModal, setRecusaModal] = useState(false)
  const [sucesso, setSucesso] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [negociacaoModal, setNegociacaoModal] = useState<string | null>(null)

  const propostaSelecionada = pendentes.find((p) => p.id === propostaModal)
  const propostasRecebidas = pendentes.filter((p) => p.status === 'proposta_recebida' || p.status === 'em_negociacao').length
  const totalMsgsNaoLidas  = pendentes.reduce((s, p) => s + (p.mensagensNaoLidas ?? 0), 0)

  const tabs = [
    { id: 'ativas', label: 'Ativas', count: ativas.length },
    {
      id: 'pendentes',
      label: totalMsgsNaoLidas > 0 ? `Pendentes · ${totalMsgsNaoLidas} nova${totalMsgsNaoLidas > 1 ? 's' : ''}` : 'Pendentes',
      count: pendentes.length,
    },
    { id: 'encerradas', label: 'Encerradas', count: encerradas.length },
  ]

  async function fetchParcerias() {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/empresa/parcerias')
      if (!res.ok) throw new Error('Erro ao carregar parcerias.')
      const data: ParceriasResponse = await res.json()
      setAtivas(data.ativas ?? [])
      setAguardandoAssinatura(data.aguardandoAssinatura ?? [])
      setPendentes((data.pendentes ?? []).map(normalizePendente))
      setEncerradas(data.encerradas ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchParcerias()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function aceitarProposta() {
    if (!propostaSelecionada) return
    try {
      setActionLoading(true)
      setActionError(null)
      const res = await fetch('/api/empresa/parcerias/aceitar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propostaId: propostaSelecionada.proposta!.id }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data?.error ?? 'Erro ao aceitar proposta.')
      }
      const nomePosto = propostaSelecionada.posto
      setPropostaModal(null)
      setAceiteConfirm(false)
      setSucesso(
        data?.semContrato
          ? `Proposta aceita! A parceria com ${nomePosto} já está ativa. Você já pode emitir requisições.`
          : `Proposta aceita! O contrato com ${nomePosto} foi gerado e aguarda assinatura de ambas as partes.`
      )
      setTimeout(() => setSucesso(null), 5000)
      await fetchParcerias()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Erro ao aceitar proposta.')
    } finally {
      setActionLoading(false)
    }
  }

  async function recusarProposta() {
    if (!propostaSelecionada) return
    try {
      setActionLoading(true)
      setActionError(null)
      const res = await fetch('/api/empresa/parcerias/rejeitar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propostaId: propostaSelecionada.proposta!.id }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error ?? 'Erro ao recusar proposta.')
      }
      setPropostaModal(null)
      setRecusaModal(false)
      await fetchParcerias()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Erro ao recusar proposta.')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Parcerias</h1>
            <p className="text-gray-500 text-sm">Gerencie suas parcerias com postos de combustível.</p>
          </div>
        </div>
        <div className="flex flex-col items-center gap-3 py-16 text-gray-400">
          <Loader2 size={28} className="animate-spin" />
          <span className="text-sm">Carregando parcerias...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Parcerias</h1>
            <p className="text-gray-500 text-sm">Gerencie suas parcerias com postos de combustível.</p>
          </div>
        </div>
        <div className="text-center py-12 text-gray-400">
          <p className="text-sm">{error}</p>
          <button onClick={fetchParcerias} className="mt-3 text-sm text-blue-600 hover:underline">Tentar novamente</button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Parcerias</h1>
          <p className="text-gray-500 text-sm">Gerencie suas parcerias com postos de combustível.</p>
        </div>
      </div>

      {/* Banner de contratos aguardando assinatura */}
      {aguardandoAssinatura.length > 0 && (
        <div className="flex flex-col gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center shrink-0">
              <FileSignature size={15} className="text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-900">
                {aguardandoAssinatura.length === 1 ? '1 contrato aguardando sua assinatura' : `${aguardandoAssinatura.length} contratos aguardando sua assinatura`}
              </p>
              <p className="text-xs text-amber-700">Assine o contrato digital para ativar a parceria.</p>
            </div>
          </div>
          {aguardandoAssinatura.map((pa) => (
            <div key={pa.id} className="flex items-center justify-between ml-11 bg-white border border-amber-100 rounded-lg px-3 py-2">
              <div>
                <p className="text-sm font-medium text-gray-800">{pa.posto}</p>
                <p className="text-xs text-gray-400">{pa.cidade} · {pa.bandeira}</p>
                <div className="flex gap-1 mt-1">
                  {pa.assinadoEmpresaEm
                    ? <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded-full">Você assinou</span>
                    : <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded-full">Sua assinatura pendente</span>
                  }
                  {pa.assinadoPostoEm
                    ? <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded-full">Posto assinou</span>
                    : <span className="text-[10px] bg-gray-50 text-gray-500 border border-gray-200 px-1.5 py-0.5 rounded-full">Posto pendente</span>
                  }
                </div>
              </div>
              {!pa.assinadoEmpresaEm && (
                <Link href={`/empresa/parcerias/contrato/${pa.id}`}>
                  <Button size="sm"><FileSignature size={13} /> Assinar</Button>
                </Link>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Banner de propostas recebidas */}
      {propostasRecebidas > 0 && (
        <div
          className="flex items-center gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl cursor-pointer hover:bg-blue-100 transition-colors"
          onClick={() => setTab('pendentes')}
        >
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
            <AlertCircle size={15} className="text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-blue-900">
              {propostasRecebidas === 1 ? '1 proposta recebida' : `${propostasRecebidas} propostas recebidas`}
            </p>
            <p className="text-xs text-blue-600">Posto(s) responderam à sua solicitação de parceria. Clique para ver.</p>
          </div>
          <span className="text-xs font-medium text-blue-700">Ver agora →</span>
        </div>
      )}

      {/* Toast de sucesso */}
      {sucesso && (
        <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700 font-medium">
          <Check size={16} className="text-emerald-600 shrink-0" />
          {sucesso}
        </div>
      )}

      <Tabs tabs={tabs} activeTab={tab} onChange={setTab} />

      {/* Ativas */}
      {tab === 'ativas' && (
        <div className="grid grid-cols-1 gap-4">
          {ativas.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">Nenhuma parceria ativa.</div>
          ) : ativas.map((p) => (
            <Card key={p.id} padding="md">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900">{p.posto}</h3>
                    <Badge variant="ativo" />
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-3">
                    <MapPin size={11} />
                    {p.cidade} · {p.bandeira}
                  </div>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {p.combustiveis.map((c) => (
                      <span key={c} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{c}</span>
                    ))}
                  </div>
                  <div className="flex gap-4 text-xs text-gray-400">
                    <span>Desde: <strong className="text-gray-600">{p.desde}</strong></span>
                    <span>Até: <strong className="text-gray-600">{p.ate}</strong></span>
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <Link href={`/empresa/parcerias/contrato/${p.id}`}>
                    <Button variant="secondary" size="sm">
                      <FileText size={13} /> Ver contrato
                    </Button>
                  </Link>
                  <Button variant="secondary" size="sm" onClick={() => setPostoModal(p.id)}>
                    <MapPin size={13} /> Ver posto
                  </Button>
                  <Link href="/empresa/requisicoes/nova">
                    <Button size="sm">
                      <Plus size={13} /> Criar requisição
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Pendentes */}
      {tab === 'pendentes' && (
        <div className="grid grid-cols-1 gap-4">
          {pendentes.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">Nenhuma solicitação pendente.</div>
          ) : pendentes.map((p) => (
            <Card key={p.id} padding="md" className={p.mensagensNaoLidas ? 'ring-2 ring-indigo-200' : ''}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-semibold text-gray-900">{p.posto}</h3>
                    {p.emNegociacao ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-amber-400 text-amber-950 border border-amber-500 px-2 py-0.5 rounded-full shadow-sm">
                        <MessageCircle size={10} /> Em negociação
                      </span>
                    ) : p.status === 'proposta_recebida' ? (
                      <Badge variant="concluido">Proposta recebida</Badge>
                    ) : (
                      <Badge variant="pendente" />
                    )}
                    {(p.totalVersoes ?? 0) > 1 && (
                      <span className="text-[10px] font-bold bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                        {p.totalVersoes} versões
                      </span>
                    )}
                    {!!p.mensagensNaoLidas && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-indigo-600 text-white px-2 py-0.5 rounded-full animate-pulse">
                        {p.mensagensNaoLidas} nova{p.mensagensNaoLidas > 1 ? 's' : ''} resposta{p.mensagensNaoLidas > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-3">
                    <MapPin size={11} />
                    {p.cidade} · {p.bandeira}
                  </div>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {p.combustiveis.map((c) => (
                      <span key={c} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{c}</span>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400">
                    Solicitado em: <strong className="text-gray-600">{p.enviadoEm}</strong>
                    {(p.status === 'proposta_recebida' || p.status === 'em_negociacao') && p.proposta && (
                      <> · <span className="text-blue-600 font-medium">Proposta enviada em {p.proposta.enviadoEm}</span></>
                    )}
                  </p>

                  {/* Preview da proposta */}
                  {(p.status === 'proposta_recebida' || p.status === 'em_negociacao') && p.proposta && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-100 space-y-2">
                      <p className="text-xs font-semibold text-blue-800">O posto enviou uma proposta</p>
                      <div className="flex flex-wrap gap-1.5">
                        {p.proposta.combustiveis.map((c) => (
                          <span key={c.tipo} className="text-xs bg-white text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">
                            {c.tipo} — {c.condicao}
                          </span>
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-blue-600">
                        {p.proposta.ciclo && <span>Faturamento: <strong>{({ diario: 'Diário', semanal: 'Semanal', quinzenal: 'Quinzenal', mensal: 'Mensal' } as Record<string,string>)[p.proposta.ciclo.tipo]} + {p.proposta.ciclo.prazoRecebimento} dias</strong></span>}
                        {p.proposta.volumeMinimo && <span>Vol. mín.: <strong>{p.proposta.volumeMinimo} L/mês</strong></span>}
                        {p.proposta.limiteCredito && <span>Limite: <strong>R$ {p.proposta.limiteCredito}</strong></span>}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2 ml-4 shrink-0">
                  {(p.status === 'proposta_recebida' || p.status === 'em_negociacao') ? (
                    <>
                      <Button size="sm" onClick={() => setPropostaModal(p.id)}>
                        Ver proposta
                      </Button>
                      {(p.mensagensNaoLidas || p.emNegociacao) && (
                        <Button
                          size="sm"
                          variant={p.mensagensNaoLidas ? 'primary' : 'secondary'}
                          onClick={() => setNegociacaoModal(p.id)}
                        >
                          <MessageCircle size={13} />
                          {p.mensagensNaoLidas ? 'Ver resposta' : 'Negociação'}
                        </Button>
                      )}
                    </>
                  ) : (
                    <Button variant="danger" size="sm">
                      <X size={13} /> Cancelar pedido
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Encerradas */}
      {tab === 'encerradas' && (
        <div className="grid grid-cols-1 gap-4">
          {encerradas.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">Nenhuma parceria encerrada.</div>
          ) : encerradas.map((p) => (
            <Card key={p.id} padding="md">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900">{p.posto}</h3>
                    <Badge variant="expirado" />
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-3">
                    <MapPin size={11} />
                    {p.cidade}
                  </div>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {p.combustiveis.map((c) => (
                      <span key={c} className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{c}</span>
                    ))}
                  </div>
                  <div className="flex gap-4 text-xs text-gray-400">
                    <span>Encerrado em: <strong className="text-gray-600">{p.encerradoEm}</strong></span>
                    <span>{p.motivo}</span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ── Modal: Ver Proposta ─────────────────────────────────── */}
      <Modal
        isOpen={propostaModal !== null && !aceiteConfirm && !recusaModal}
        onClose={() => { setPropostaModal(null); setActionError(null) }}
        title="Proposta de parceria"
        size="md"
      >
        {propostaSelecionada?.proposta && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl">
              <PostoChip nome={propostaSelecionada.posto} />
              <span className="text-xs text-gray-400">→</span>
              <span className="text-sm font-semibold text-gray-800">Sua empresa</span>
            </div>

            <div className="p-4 bg-blue-50 rounded-xl space-y-3 border border-blue-100">
              <div>
                <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2">Combustíveis e preços</p>
                <div className="space-y-2">
                  {propostaSelecionada.proposta.combustiveis.map((c) => (
                    <div key={c.tipo} className="flex justify-between items-center">
                      <span className="text-sm text-gray-700">{c.tipo}</span>
                      <span className="text-sm font-bold text-gray-900">{c.condicao}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-blue-200 pt-3 space-y-2">
                {propostaSelecionada.proposta.ciclo && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Ciclo de faturamento</span>
                      <span className="font-medium text-gray-800">
                        {({ diario: 'Diário', semanal: 'Semanal', quinzenal: 'Quinzenal', mensal: 'Mensal' } as Record<string,string>)[propostaSelecionada.proposta.ciclo.tipo]}
                        {' '}+ {propostaSelecionada.proposta.ciclo.prazoRecebimento} dias
                      </span>
                    </div>
                    <div className="text-xs text-gray-400 text-right">
                      {(() => {
                        const c = propostaSelecionada.proposta!.ciclo
                        const p = parseInt(c.prazoRecebimento || '0')
                        if (c.tipo === 'diario') return `Vende por ${c.intervaloDias || 1} dias → fatura → vence em ${p} dias`
                        if (c.tipo === 'semanal') return `Vende seg–dom → fatura na seg → vence em ${p} dias`
                        if (c.tipo === 'quinzenal') return `2 ciclos/mês: dias 01–15 (fatura dia 16, vence dia ${15 + p}) · dias 16–último (fatura dia 01, vence dia ${String(p).padStart(2, '0')})`
                        return `Vende o mês inteiro → fatura no dia 01 → vence no dia ${String(p).padStart(2, '0')}`
                      })()}
                    </div>
                  </>
                )}
                {propostaSelecionada.proposta.volumeMinimo && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Volume mínimo mensal</span>
                    <span className="font-medium text-gray-800">{propostaSelecionada.proposta.volumeMinimo} L/mês</span>
                  </div>
                )}
                {propostaSelecionada.proposta.limiteCredito && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Limite de crédito mensal</span>
                    <span className="font-medium text-gray-800">R$ {propostaSelecionada.proposta.limiteCredito}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Validade da proposta</span>
                  <span className="font-medium text-amber-700">{propostaSelecionada.proposta.validade}</span>
                </div>
              </div>

              {propostaSelecionada.proposta.observacoes && (
                <div className="border-t border-blue-200 pt-3">
                  <p className="text-xs text-gray-400 mb-1">Observações do posto</p>
                  <p className="text-sm text-gray-600 italic">"{propostaSelecionada.proposta.observacoes}"</p>
                </div>
              )}
            </div>

            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-100 rounded-lg">
              <AlertCircle size={14} className="text-amber-500 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-700">
                Esta proposta é válida por <strong>{propostaSelecionada.proposta.validade}</strong> a partir de {propostaSelecionada.proposta.enviadoEm}.
                Ao aceitar, um contrato digital será gerado. A parceria só será ativada após a assinatura de ambas as partes.
              </p>
            </div>

            <div className="flex gap-2 pt-1">
              <Button variant="danger" className="flex-1" onClick={() => setRecusaModal(true)}>
                <X size={13} /> Recusar
              </Button>
              <Button variant="secondary" className="flex-1" onClick={() => setNegociacaoModal(propostaSelecionada.id)}>
                <MessageCircle size={13} /> Negociar
              </Button>
              <Button className="flex-1" onClick={() => setAceiteConfirm(true)}>
                <Check size={13} /> Aceitar
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Modal: Negociação ───────────────────────────────────── */}
      <Modal
        isOpen={negociacaoModal !== null}
        onClose={() => setNegociacaoModal(null)}
        title="Negociar condições comerciais"
        size="lg"
      >
        {negociacaoModal && (
          <NegociacaoPainel
            solicitacaoId={negociacaoModal}
            onAceitar={async (propostaId) => {
              const res = await fetch('/api/empresa/parcerias/aceitar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ propostaId }),
              })
              if (res.ok) {
                setNegociacaoModal(null)
                setPropostaModal(null)
                await fetchParcerias()
              }
            }}
          />
        )}
      </Modal>

      {/* ── Modal: Confirmar aceite ─────────────────────────────── */}
      <Modal
        isOpen={aceiteConfirm}
        onClose={() => { setAceiteConfirm(false); setActionError(null) }}
        title="Confirmar aceite da proposta"
        size="sm"
      >
        <div className="space-y-4">
          {propostaSelecionada && (
            <div className="p-3 bg-gray-50 rounded-lg flex items-center gap-2">
              <PostoChip nome={propostaSelecionada.posto} />
              <span className="text-xs text-gray-400">{propostaSelecionada.cidade}</span>
            </div>
          )}
          <p className="text-sm text-gray-600">
            Ao aceitar, um contrato digital será gerado para assinatura. A parceria <strong>só será ativada após a assinatura de ambas as partes</strong> (empresa e posto).
          </p>
          <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3">
            <p className="text-xs text-blue-700">Um e-mail de confirmação será enviado ao posto parceiro.</p>
          </div>
          {actionError && (
            <p className="text-sm text-red-600">{actionError}</p>
          )}
          <div className="flex gap-3 pt-1">
            <Button variant="secondary" className="flex-1" onClick={() => { setAceiteConfirm(false); setActionError(null) }}>Cancelar</Button>
            <Button className="flex-1" onClick={aceitarProposta} disabled={actionLoading}>
              {actionLoading ? <><Loader2 size={13} className="animate-spin" /> Confirmando...</> : <><Check size={13} /> Confirmar aceite</>}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Modal: Confirmar recusa ─────────────────────────────── */}
      <Modal
        isOpen={recusaModal}
        onClose={() => { setRecusaModal(false); setActionError(null) }}
        title="Recusar proposta"
        size="sm"
      >
        <div className="space-y-4">
          {propostaSelecionada && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm font-semibold text-gray-800">{propostaSelecionada.posto}</p>
              <p className="text-xs text-gray-400">{propostaSelecionada.cidade}</p>
            </div>
          )}
          <p className="text-sm text-gray-600">
            Ao recusar, a solicitação será encerrada. O posto será notificado e você poderá aguardar novos convites de postos parceiros.
          </p>
          {actionError && (
            <p className="text-sm text-red-600">{actionError}</p>
          )}
          <div className="flex gap-3 pt-1">
            <Button variant="secondary" className="flex-1" onClick={() => { setRecusaModal(false); setActionError(null) }}>Voltar</Button>
            <Button variant="danger" className="flex-1" onClick={recusarProposta} disabled={actionLoading}>
              {actionLoading ? <><Loader2 size={13} className="animate-spin" /> Recusando...</> : <><X size={13} /> Confirmar recusa</>}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Montado só com o id preenchido: enquanto o modal está fechado, o
          componente nem existe e o Leaflet não é baixado. */}
      <ModalPostoParceiro parceriaId={postoModal} onClose={() => setPostoModal(null)} />
    </div>
  )
}
