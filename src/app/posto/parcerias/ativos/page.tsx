'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import {
  Eye, Search, Store, X, Lock, Unlock, Bell, AlertTriangle,
  CreditCard, ChevronDown, ChevronUp, FileSignature,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

const AVISO_LIMITE = 2000

interface PendenteAssinatura {
  id: string
  posto: string
  postoId: string
  empresa: string
  cnpj: string
  cidade: string
  desde: string
  combustiveis: string[]
  assinadoEmpresaEm: string | null
  assinadoPostoEm: string | null
}

interface Parceiro {
  id: string
  posto: string
  postoId: string
  empresa: string
  cnpj: string
  cidade: string
  desde: string
  combustiveis: string[]
  limiteValor: number | null
  creditoUsado: number
  ciclo: string
  status: string
  bloqueadoManual: boolean
  motivoBloqueio?: string
  reqExtras?: number
  creditoExtra?: number
}

const MOTIVOS_BLOQUEIO = [
  'Inadimplência',
  'Suspeita de fraude',
  'Documentação pendente',
  'Solicitação da empresa',
  'Revisão de contrato',
  'Outro',
]

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function semLimite(p: Parceiro)       { return p.limiteValor == null }
function creditoRestante(p: Parceiro) { return semLimite(p) ? Infinity : p.limiteValor! - p.creditoUsado }
function percentUsado(p: Parceiro)    { return semLimite(p) ? 0 : Math.min(100, (p.creditoUsado / p.limiteValor!) * 100) }
function isBloqueado(p: Parceiro) {
  if (p.bloqueadoManual) return true
  if (semLimite(p)) return false
  if (p.reqExtras !== undefined && p.reqExtras > 0) return false
  return p.creditoUsado >= p.limiteValor!
}
function isAvisoLimite(p: Parceiro)   { return !semLimite(p) && !isBloqueado(p) && creditoRestante(p) < AVISO_LIMITE }

export default function ParceirosAtivosPage() {
  const [parceiros, setParceiros] = useState<Parceiro[]>([])
  const [pendentesAssinatura, setPendentesAssinatura] = useState<PendenteAssinatura[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)
  const [busca, setBusca]             = useState('')
  const [filtroPosto, setFiltroPosto] = useState('')
  const [notifOpen, setNotifOpen]     = useState(false)

  // Modal de desbloqueio
  const [desbloqueioId, setDesbloqueioId]         = useState<string | null>(null)
  const [tipoDesbloqueio, setTipoDesbloqueio]     = useState<'credito' | 'requisicoes'>('credito')
  const [valorDesbloqueio, setValorDesbloqueio]   = useState('')

  const [bloqueioModal, setBloqueioModal]   = useState<string | null>(null)
  const [motivoSel,     setMotivoSel]       = useState('')
  const [motivoCustom,  setMotivoCustom]    = useState('')

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetch('/api/posto/parcerias')
      .then((res) => {
        if (!res.ok) throw new Error(`Erro ao carregar parceiros (${res.status})`)
        return res.json()
      })
      .then((data) => {
        setParceiros(data.parcerias ?? [])
        setPendentesAssinatura(data.pendentesAssinatura ?? [])
      })
      .catch((err: Error) => {
        setError(err.message)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  const postos = useMemo(() => [...new Set(parceiros.map((p) => p.posto))], [parceiros])

  const abrirBloqueio = (id: string) => {
    setBloqueioModal(id)
    setMotivoSel('')
    setMotivoCustom('')
  }

  const confirmarBloqueio = async () => {
    if (bloqueioModal === null) return
    const motivo = motivoSel === 'Outro' ? motivoCustom.trim() : motivoSel
    if (!motivo) return
    try {
      const res = await fetch(`/api/posto/parcerias/${bloqueioModal}/bloqueio`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bloquear: true, motivo }),
      })
      if (!res.ok) throw new Error(`Erro ao bloquear parceria (${res.status})`)
      setParceiros((prev) => prev.map((p) =>
        p.id === bloqueioModal ? { ...p, bloqueadoManual: true, motivoBloqueio: motivo } : p
      ))
      setBloqueioModal(null)
    } catch (err) {
      console.error(err)
    }
  }

  const toggleBloqueio = async (id: string) => {
    try {
      const res = await fetch(`/api/posto/parcerias/${id}/bloqueio`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bloquear: false }),
      })
      if (!res.ok) throw new Error(`Erro ao desbloquear parceria (${res.status})`)
      setParceiros((prev) => prev.map((p) =>
        p.id === id ? { ...p, bloqueadoManual: false, motivoBloqueio: undefined } : p
      ))
    } catch (err) {
      console.error(err)
    }
  }

  const abrirDesbloqueio = (id: string) => {
    setDesbloqueioId(id)
    setTipoDesbloqueio('credito')
    setValorDesbloqueio('')
  }

  const confirmarDesbloqueio = () => {
    if (desbloqueioId === null) return
    const val = parseFloat(valorDesbloqueio.replace(/\./g, '').replace(',', '.'))
    if (isNaN(val) || val <= 0) return
    setParceiros((prev) => prev.map((p) => {
      if (p.id !== desbloqueioId) return p
      if (tipoDesbloqueio === 'credito') {
        return { ...p, limiteValor: (p.limiteValor ?? 0) + val, creditoExtra: val, bloqueadoManual: false, reqExtras: undefined }
      } else {
        return { ...p, reqExtras: Math.round(val), creditoExtra: undefined, bloqueadoManual: false }
      }
    }))
    setDesbloqueioId(null)
    setValorDesbloqueio('')
  }

  const filtrados = useMemo(() => {
    return parceiros.filter((p) => {
      const matchEmpresa = p.empresa.toLowerCase().includes(busca.toLowerCase())
      const matchPosto   = filtroPosto ? p.posto === filtroPosto : true
      return matchEmpresa && matchPosto
    })
  }, [parceiros, busca, filtroPosto])

  const avisos    = parceiros.filter(isAvisoLimite)
  const bloqueados = parceiros.filter(isBloqueado)
  const temFiltro = busca !== '' || filtroPosto !== ''
  const limparFiltros = () => { setBusca(''); setFiltroPosto('') }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Parceiros Ativos</h1>
        <p className="text-gray-500 text-sm">{parceiros.length} empresas parceiras ativas.</p>
      </div>

      {/* Contratos aguardando assinatura */}
      {!loading && pendentesAssinatura.length > 0 && (
        <div className="flex flex-col gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center shrink-0">
              <FileSignature size={15} className="text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-900">
                {pendentesAssinatura.length === 1 ? '1 contrato aguardando assinatura' : `${pendentesAssinatura.length} contratos aguardando assinatura`}
              </p>
              <p className="text-xs text-amber-700">Parceria ficará ativa após ambas as partes assinarem.</p>
            </div>
          </div>
          {pendentesAssinatura.map((pa) => (
            <div key={pa.id} className="flex items-center justify-between ml-11 bg-white border border-amber-100 rounded-lg px-3 py-2">
              <div>
                <p className="text-sm font-medium text-gray-800">{pa.empresa}</p>
                <p className="text-xs text-gray-400">{pa.cnpj} · {pa.cidade}</p>
                <div className="flex gap-1 mt-1">
                  {pa.assinadoEmpresaEm
                    ? <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded-full">Empresa assinou</span>
                    : <span className="text-[10px] bg-gray-50 text-gray-500 border border-gray-200 px-1.5 py-0.5 rounded-full">Empresa pendente</span>
                  }
                  {pa.assinadoPostoEm
                    ? <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded-full">Você assinou</span>
                    : <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded-full">Sua assinatura pendente</span>
                  }
                </div>
              </div>
              {!pa.assinadoPostoEm && (
                <Link href={`/posto/parcerias/ativos/${pa.id}`}>
                  <Button size="sm"><FileSignature size={13} /> Assinar</Button>
                </Link>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Loading / Error */}
      {loading && <p className="text-sm text-gray-500">Carregando...</p>}
      {error && (
        <div className="border border-red-200 bg-red-50 rounded-xl px-4 py-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Painel de notificações */}
      {!loading && !error && (avisos.length > 0 || bloqueados.length > 0) && (
        <div className="border border-amber-200 bg-amber-50 rounded-xl overflow-hidden">
          <button
            onClick={() => setNotifOpen((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-amber-100/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Bell size={14} className="text-amber-600" />
              <span className="text-sm font-semibold text-amber-800">
                Notificações de crédito
              </span>
              <span className="bg-amber-200 text-amber-800 text-[11px] font-bold px-1.5 py-0.5 rounded-full">
                {avisos.length + bloqueados.length}
              </span>
            </div>
            {notifOpen ? <ChevronUp size={14} className="text-amber-600" /> : <ChevronDown size={14} className="text-amber-600" />}
          </button>

          {notifOpen && (
            <div className="px-4 pb-3 space-y-2 border-t border-amber-200">
              {bloqueados.map((p) => (
                <div key={p.id} className="flex items-center gap-2.5 py-2">
                  <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center shrink-0">
                    <Lock size={11} className="text-red-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-red-700">{p.empresa}</p>
                    <p className="text-xs text-red-500">
                      {!semLimite(p) && p.creditoUsado >= p.limiteValor!
                        ? `Limite de crédito atingido — emissão de requisições bloqueada automaticamente.`
                        : `Bloqueio manual ativo — emissão de requisições suspensa.`
                      }
                    </p>
                  </div>
                  <span className="text-xs font-bold text-red-600 shrink-0">{semLimite(p) ? 'Sem limite' : `${formatBRL(p.limiteValor!)} / mês`}</span>
                </div>
              ))}
              {avisos.map((p) => (
                <div key={p.id} className="flex items-center gap-2.5 py-2">
                  <div className="w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center shrink-0">
                    <AlertTriangle size={11} className="text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-amber-800">{p.empresa}</p>
                    <p className="text-xs text-amber-600">
                      Limite quase atingido — restam <strong>{formatBRL(creditoRestante(p))}</strong> de crédito disponível neste ciclo.
                    </p>
                  </div>
                  <span className="text-xs font-bold text-amber-700 shrink-0">{semLimite(p) ? 'Sem limite' : `${formatBRL(p.limiteValor!)} / mês`}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Filtros */}
      {!loading && !error && (
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar empresa..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50"
            />
          </div>
          <div className="relative">
            <Store size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <select
              value={filtroPosto}
              onChange={(e) => setFiltroPosto(e.target.value)}
              className="pl-8 pr-8 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50 appearance-none cursor-pointer"
            >
              <option value="">Todos os postos</option>
              {postos.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          {temFiltro && (
            <button
              onClick={limparFiltros}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 px-3 py-2 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
            >
              <X size={12} /> Limpar
            </button>
          )}
          <p className="text-xs text-gray-400 ml-auto">
            {filtrados.length} de {parceiros.length} parceiro{parceiros.length !== 1 ? 's' : ''}
          </p>
        </div>
      )}

      {/* Lista */}
      {!loading && !error && (
        filtrados.length === 0 ? (
          <Card padding="none">
            <div className="flex flex-col items-center justify-center py-14 gap-2">
              <Search size={24} className="text-gray-200" />
              <p className="text-sm font-medium text-gray-400">Nenhum parceiro encontrado</p>
              <button onClick={limparFiltros} className="text-xs text-blue-500 hover:underline mt-1">Limpar filtros</button>
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtrados.map((p) => {
              const bloqueado  = isBloqueado(p)
              const aviso      = isAvisoLimite(p)
              const restante   = creditoRestante(p)
              const pct        = percentUsado(p)
              const barColor   = bloqueado ? 'bg-red-500' : aviso ? 'bg-amber-400' : 'bg-emerald-400'

              return (
                <Card key={p.id} padding="md">
                  {/* Faixa de status no topo do card quando bloqueado */}
                  {bloqueado && (
                    <div className="flex items-start gap-2 mb-3 px-3 py-2 bg-red-50 border border-red-100 rounded-lg">
                      <Lock size={12} className="text-red-500 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-red-600">
                          {!semLimite(p) && p.creditoUsado >= p.limiteValor!
                            ? 'Limite de crédito atingido — novas requisições bloqueadas automaticamente.'
                            : 'Bloqueio manual ativo — emissão de requisições suspensa.'}
                        </p>
                        {p.bloqueadoManual && p.motivoBloqueio && (
                          <p className="text-xs text-red-400 mt-0.5">
                            Motivo: <span className="font-medium text-red-500">{p.motivoBloqueio}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                  {aviso && (
                    <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-amber-50 border border-amber-100 rounded-lg">
                      <AlertTriangle size={12} className="text-amber-500 shrink-0" />
                      <p className="text-xs font-semibold text-amber-700 flex-1">
                        Atenção: restam apenas <strong>{formatBRL(restante)}</strong> de crédito neste ciclo.
                      </p>
                    </div>
                  )}
                  {p.creditoExtra && (
                    <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg">
                      <Unlock size={12} className="text-blue-400 shrink-0" />
                      <p className="text-xs text-blue-600 flex-1">
                        Acesso liberado com <strong>+{formatBRL(p.creditoExtra)}</strong> de crédito adicional neste ciclo.
                      </p>
                    </div>
                  )}
                  {p.reqExtras !== undefined && p.reqExtras > 0 && (
                    <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg">
                      <Unlock size={12} className="text-blue-400 shrink-0" />
                      <p className="text-xs text-blue-600 flex-1">
                        Acesso liberado com <strong>{p.reqExtras} requisição{p.reqExtras !== 1 ? 'ões' : ''} extra{p.reqExtras !== 1 ? 's' : ''}</strong> neste ciclo.
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${bloqueado ? 'bg-red-100' : 'bg-blue-100'}`}>
                        <span className={`text-sm font-bold ${bloqueado ? 'text-red-600' : 'text-blue-700'}`}>
                          {p.empresa.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                        </span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="mb-1">
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
                            <Store size={10} /> {p.posto}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <h3 className="font-semibold text-gray-900">{p.empresa}</h3>
                          <Badge variant={bloqueado ? 'expirado' : 'ativo'} />
                        </div>
                        <p className="text-xs text-gray-400">{p.cnpj} · {p.cidade}</p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {p.combustiveis.map((c) => (
                            <span key={c} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{c}</span>
                          ))}
                        </div>

                        {/* Barra de crédito */}
                        {semLimite(p) ? (
                          <div className="mt-3 flex items-center gap-1.5">
                            <CreditCard size={11} className="text-gray-400" />
                            <span className="text-[11px] text-gray-400">Sem limite de crédito</span>
                            <span className="text-[11px] font-semibold text-gray-600 ml-auto">{formatBRL(p.creditoUsado)} usado no ciclo</span>
                          </div>
                        ) : (
                          <div className="mt-3">
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-1">
                                <CreditCard size={11} className="text-gray-400" />
                                <span className="text-[11px] text-gray-400">Crédito usado no ciclo</span>
                              </div>
                              <span className={`text-[11px] font-semibold ${bloqueado ? 'text-red-600' : aviso ? 'text-amber-600' : 'text-gray-600'}`}>
                                {formatBRL(p.creditoUsado)} / {formatBRL(p.limiteValor!)}
                              </span>
                            </div>
                            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${barColor}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <p className="text-[10px] text-gray-400 mt-0.5">
                              {bloqueado && p.creditoUsado >= p.limiteValor!
                                ? 'Limite esgotado'
                                : `Restam ${formatBRL(restante)}`
                              }
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="text-right shrink-0">
                        <p className="text-xs text-gray-400">Desde {p.desde}</p>
                        <p className="text-sm font-medium text-gray-700 mt-0.5">{semLimite(p) ? 'Sem limite' : `${formatBRL(p.limiteValor!)}/mês`}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{p.ciclo}</p>
                      </div>
                    </div>

                    <div className="ml-2 shrink-0 flex flex-col gap-2">
                      <Link href={`/posto/parcerias/ativos/${p.id}`}>
                        <Button variant="secondary" size="sm">
                          <Eye size={13} /> Ver detalhes
                        </Button>
                      </Link>
                      <button
                        onClick={() => {
                          if (bloqueado) {
                            if (!p.bloqueadoManual && p.creditoUsado >= (p.limiteValor ?? 0)) {
                              abrirDesbloqueio(p.id)
                            } else {
                              toggleBloqueio(p.id)
                            }
                          } else {
                            abrirBloqueio(p.id)
                          }
                        }}
                        className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                          bloqueado
                            ? 'text-emerald-600 border-emerald-200 hover:border-emerald-400 bg-emerald-50'
                            : 'text-red-500 border-red-100 hover:border-red-300 bg-red-50'
                        }`}
                      >
                        {bloqueado ? <><Unlock size={12} /> Desbloquear</> : <><Lock size={12} /> Bloquear</>}
                      </button>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )
      )}

      {/* Modal de desbloqueio */}
      {desbloqueioId !== null && (() => {
        const p = parceiros.find((x) => x.id === desbloqueioId)!
        return (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <div>
                  <h2 className="text-base font-semibold text-gray-900">Liberar acesso</h2>
                  <p className="text-xs text-gray-400 mt-0.5">{p.empresa}</p>
                </div>
                <button onClick={() => setDesbloqueioId(null)} className="text-gray-400 hover:text-gray-600">
                  <X size={18} />
                </button>
              </div>

              <div className="px-6 py-4 space-y-4">
                <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  <Lock size={12} className="text-red-500 shrink-0" />
                  <p className="text-xs text-red-600">
                    {semLimite(p)
                      ? 'Bloqueio manual ativo.'
                      : <>Limite de crédito atingido — <strong>{formatBRL(p.creditoUsado)}</strong> de <strong>{formatBRL(p.limiteValor!)}</strong> usados.</>
                    }
                  </p>
                </div>

                <p className="text-sm text-gray-600">Escolha como liberar o acesso deste cliente:</p>

                <div className="space-y-2">
                  <label className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${tipoDesbloqueio === 'credito' ? 'border-blue-500 bg-blue-50' : 'border-gray-100 hover:border-gray-200'}`}>
                    <input
                      type="radio"
                      name="tipo"
                      value="credito"
                      checked={tipoDesbloqueio === 'credito'}
                      onChange={() => { setTipoDesbloqueio('credito'); setValorDesbloqueio('') }}
                      className="mt-0.5 accent-blue-600"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-800">Crédito adicional</p>
                      <p className="text-xs text-gray-400">Aumenta o limite do ciclo atual. Quando o novo limite for atingido, o bloqueio ocorre novamente.</p>
                    </div>
                  </label>

                  <label className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${tipoDesbloqueio === 'requisicoes' ? 'border-blue-500 bg-blue-50' : 'border-gray-100 hover:border-gray-200'}`}>
                    <input
                      type="radio"
                      name="tipo"
                      value="requisicoes"
                      checked={tipoDesbloqueio === 'requisicoes'}
                      onChange={() => { setTipoDesbloqueio('requisicoes'); setValorDesbloqueio('') }}
                      className="mt-0.5 accent-blue-600"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-800">Número de requisições extras</p>
                      <p className="text-xs text-gray-400">Libera um número fixo de abastecimentos adicionais. Ao esgotar as requisições, o bloqueio retorna automaticamente.</p>
                    </div>
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {tipoDesbloqueio === 'credito' ? 'Valor adicional de crédito (R$)' : 'Número de requisições'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder={tipoDesbloqueio === 'credito' ? 'Ex: 500' : 'Ex: 5'}
                    value={valorDesbloqueio}
                    onChange={(e) => setValorDesbloqueio(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50"
                  />
                  {tipoDesbloqueio === 'credito' && valorDesbloqueio && !isNaN(parseFloat(valorDesbloqueio)) && (
                    <p className="text-xs text-gray-400 mt-1">
                      Novo limite: <strong>{formatBRL((p.limiteValor ?? 0) + parseFloat(valorDesbloqueio))}</strong>
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100">
                <button
                  onClick={() => setDesbloqueioId(null)}
                  className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                >
                  Cancelar
                </button>
                <Button
                  onClick={confirmarDesbloqueio}
                  disabled={!valorDesbloqueio || parseFloat(valorDesbloqueio) <= 0}
                >
                  <Unlock size={13} /> Liberar acesso
                </Button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Modal de bloqueio manual */}
      {bloqueioModal !== null && (() => {
        const p = parceiros.find((x) => x.id === bloqueioModal)!
        const motivo = motivoSel === 'Outro' ? motivoCustom.trim() : motivoSel
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed top-0 left-0 w-screen h-screen bg-black/60 backdrop-blur-sm" onClick={() => setBloqueioModal(null)} />
            <div className="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <Lock size={16} className="text-red-500" />
                  <span className="text-sm font-semibold text-gray-900">Bloquear empresa</span>
                </div>
                <button onClick={() => setBloqueioModal(null)} className="text-gray-400 hover:text-gray-600">
                  <X size={18} />
                </button>
              </div>

              <div className="px-6 py-5 space-y-4">
                <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">
                  <p className="font-medium">{p.empresa}</p>
                  <p className="text-xs mt-0.5 text-red-500">A empresa será notificada com o motivo informado.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Motivo do bloqueio</label>
                  <div className="flex flex-wrap gap-2">
                    {MOTIVOS_BLOQUEIO.map((m) => (
                      <button
                        key={m}
                        onClick={() => setMotivoSel(m)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                          motivoSel === m
                            ? 'bg-red-600 text-white border-red-600'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-red-300 hover:text-red-600'
                        }`}
                      >{m}</button>
                    ))}
                  </div>
                </div>

                {motivoSel === 'Outro' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Descreva o motivo</label>
                    <textarea
                      value={motivoCustom}
                      onChange={(e) => setMotivoCustom(e.target.value)}
                      rows={3}
                      placeholder="Informe o motivo detalhado..."
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-red-400 resize-none"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100">
                <button
                  onClick={() => setBloqueioModal(null)}
                  className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmarBloqueio}
                  disabled={!motivo}
                  className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 dark:hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <Lock size={13} /> Confirmar bloqueio
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
