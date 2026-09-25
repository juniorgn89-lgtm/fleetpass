'use client'

import { useEffect, useRef, useState } from 'react'
import { Send, Clock, FileText, CheckCircle2, XCircle, RefreshCw, Building2, Store, Loader2, ArrowRight } from 'lucide-react'

type Autor = 'empresa' | 'posto'
type TipoEvento = 'mensagem' | 'proposta_enviada' | 'proposta_revisada' | 'proposta_recusada' | 'proposta_aceita'

interface Mensagem {
  id: string
  autor_tipo: Autor
  autor_id: string
  tipo: TipoEvento
  conteudo: string | null
  proposta_id: string | null
  created_at: string
  lida_em: string | null
}

interface Proposta {
  id: string
  versao: number
  status: 'pendente' | 'aceita' | 'rejeitada' | 'expirada' | 'substituida'
  combustiveis: any
  ciclo_tipo: string
  ciclo_intervalo_dias: number | null
  ciclo_prazo_recebimento: number
  limite_credito: number | null
  volume_minimo: number | null
  validade_ate: string
  observacoes: string | null
  created_at: string
}

interface Solicitacao {
  id: string
  status: string
  mensagem: string | null
  empresas: { nome_empresa: string } | null
  postos: { nome: string } | null
}

interface Props {
  solicitacaoId: string
  onAceitar?: (propostaId: string) => void | Promise<void>
  onRevisarProposta?: (propostaAtual: Proposta | null) => void
}

function formatBRL(v: number | null | undefined) {
  if (v == null) return '—'
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

export function NegociacaoPainel({ solicitacaoId, onAceitar, onRevisarProposta }: Props) {
  const [contexto, setContexto] = useState<{ role: Autor } | null>(null)
  const [solicitacao, setSolicitacao] = useState<Solicitacao | null>(null)
  const [propostas, setPropostas] = useState<Proposta[]>([])
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [texto, setTexto] = useState('')
  const [aceitando, setAceitando] = useState<string | null>(null)
  const [versaoAtiva, setVersaoAtiva] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  async function carregar() {
    try {
      const res = await fetch(`/api/parcerias/negociacao/${solicitacaoId}`)
      const data = await res.json()
      if (res.ok) {
        setContexto(data.contexto)
        setSolicitacao(data.solicitacao)
        setPropostas(data.propostas)
        setMensagens(data.mensagens)
        // Seleciona automaticamente a proposta vigente (ou mais recente) como aba inicial
        setVersaoAtiva(prev => {
          if (prev && data.propostas.some((p: Proposta) => p.id === prev)) return prev
          const vigente = data.propostas.find((p: Proposta) => p.status === 'pendente')
          return (vigente ?? data.propostas[0])?.id ?? null
        })
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { carregar() }, [solicitacaoId])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [mensagens.length])

  async function enviar() {
    if (!texto.trim() || sending) return
    setSending(true)
    try {
      const res = await fetch(`/api/parcerias/negociacao/${solicitacaoId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conteudo: texto.trim() }),
      })
      const data = await res.json()
      if (res.ok && data.mensagem) {
        setMensagens(prev => [...prev, data.mensagem])
        setTexto('')
      }
    } finally {
      setSending(false)
    }
  }

  async function aceitarProposta(propostaId: string) {
    setAceitando(propostaId)
    try {
      if (onAceitar) await onAceitar(propostaId)
      await carregar()
    } finally {
      setAceitando(null)
    }
  }

  const propostaVigente = propostas.find(p => p.status === 'pendente')
  const jaAceita = propostas.some(p => p.status === 'aceita')

  // Só permite revisar se a última manifestação foi uma mensagem da empresa
  // (após o posto enviar a proposta ou revisão mais recente).
  const ultimaPropostaDoPosto = [...mensagens]
    .filter(m => m.tipo === 'proposta_enviada' || m.tipo === 'proposta_revisada')
    .pop()
  const ultimaMsgEmpresa = [...mensagens]
    .filter(m => m.tipo === 'mensagem' && m.autor_tipo === 'empresa')
    .pop()
  const empresaPediuRevisao =
    !!ultimaMsgEmpresa &&
    (!ultimaPropostaDoPosto ||
      new Date(ultimaMsgEmpresa.created_at) > new Date(ultimaPropostaDoPosto.created_at))

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={20} className="animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full max-h-[70vh]">
      {/* Cabeçalho */}
      <div className="px-3 py-1.5 border-b border-gray-100 bg-gray-50 flex items-center gap-2 text-xs">
        <Building2 size={11} className="text-blue-500 shrink-0" />
        <span className="font-medium text-gray-700 truncate">{solicitacao?.empresas?.nome_empresa}</span>
        <ArrowRight size={10} className="text-gray-300 shrink-0" />
        <Store size={11} className="text-amber-500 shrink-0" />
        <span className="font-medium text-gray-700 truncate">{solicitacao?.postos?.nome}</span>
      </div>

      {/* Histórico de propostas em abas */}
      {propostas.length > 0 && (() => {
        const ordenadas = [...propostas].sort((a, b) => a.versao - b.versao)
        const selecionada = propostas.find(p => p.id === versaoAtiva) ?? propostas[0]
        return (
          <div className="border-b border-gray-100 bg-white">
            <div className="flex items-center gap-1 px-3 pt-1 overflow-x-auto">
              {ordenadas.map((p) => {
                const ativo = p.id === selecionada.id
                const isPendente = p.status === 'pendente'
                const isAceita = p.status === 'aceita'
                return (
                  <button
                    key={p.id}
                    onClick={() => setVersaoAtiva(p.id)}
                    className={`shrink-0 flex items-center gap-1 px-2 py-1 text-[11px] font-medium border-b-2 transition-colors ${
                      ativo
                        ? 'border-blue-600 text-blue-700'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    V{p.versao}
                    {isPendente && <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />}
                    {isAceita && <CheckCircle2 size={10} className="text-emerald-500" />}
                  </button>
                )
              })}
            </div>
            <div className="px-3 pb-2">
              <PropostaCard
                key={selecionada.id}
                proposta={selecionada}
                ehEmpresa={contexto?.role === 'empresa'}
                podeAceitar={contexto?.role === 'empresa' && selecionada.status === 'pendente' && !jaAceita}
                aceitando={aceitando === selecionada.id}
                onAceitar={() => aceitarProposta(selecionada.id)}
              />
            </div>
          </div>
        )
      })()}

      {/* Chat */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-2 bg-gray-50">
        {mensagens.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-8">
            Nenhuma mensagem ainda. Inicie a conversa para negociar condições comerciais.
          </p>
        )}
        {mensagens.map((m) => (
          <MensagemBubble key={m.id} msg={m} ehPropria={m.autor_tipo === contexto?.role} />
        ))}
      </div>

      {/* Ações */}
      {!jaAceita && (
        <div className="border-t border-gray-100 bg-white p-3 space-y-2">
          {contexto?.role === 'posto' && onRevisarProposta && empresaPediuRevisao && (
            <button
              onClick={() => onRevisarProposta(propostaVigente ?? null)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-white bg-amber-500 rounded-lg hover:bg-amber-600 transition-colors"
            >
              <RefreshCw size={13} /> Enviar proposta revisada
            </button>
          )}
          {contexto?.role === 'posto' && onRevisarProposta && !empresaPediuRevisao && propostaVigente && (
            <p className="text-[11px] text-gray-400 text-center italic">
              Aguardando manifestação da empresa sobre a proposta vigente.
            </p>
          )}
          <div className="flex gap-2">
            <input
              type="text"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), enviar())}
              placeholder="Escreva uma mensagem…"
              className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
              disabled={sending}
            />
            <button
              onClick={enviar}
              disabled={!texto.trim() || sending}
              className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-petrol-500 disabled:opacity-50 transition-colors"
            >
              {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function formatCicloLabel(tipo: string): string {
  return ({ diario: 'Diário', semanal: 'Semanal', quinzenal: 'Quinzenal', mensal: 'Mensal' } as Record<string, string>)[tipo] ?? tipo
}

function formatCondicao(c: any): string {
  if (!c) return '—'
  if (c.modal_preco === 'bomba') return 'Preço de bomba'
  const sinal = c.modal_preco === 'acrescimo' ? '+' : '-'
  const valor = c.valor ?? 0
  return c.unidade === '%'
    ? `${sinal} ${valor}% sobre bomba`
    : `${sinal} R$ ${valor}/L sobre bomba`
}

function PropostaCard({
  proposta, ehEmpresa, podeAceitar, aceitando, onAceitar,
}: {
  proposta: Proposta
  ehEmpresa: boolean
  podeAceitar: boolean
  aceitando: boolean
  onAceitar: () => void
}) {
  const statusCfg: Record<Proposta['status'], { label: string; className: string }> = {
    pendente:    { label: 'Vigente',     className: 'bg-blue-50 text-blue-700 border-blue-200' },
    aceita:      { label: 'Aceita',      className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    rejeitada:   { label: 'Rejeitada',   className: 'bg-red-50 text-red-700 border-red-200' },
    substituida: { label: 'Substituída', className: 'bg-gray-50 text-gray-500 border-gray-200' },
    expirada:    { label: 'Expirada',    className: 'bg-amber-50 text-amber-700 border-amber-200' },
  }
  const cfg = statusCfg[proposta.status]
  const combustiveis = Array.isArray(proposta.combustiveis) ? proposta.combustiveis : []
  const combsAtivos = combustiveis.filter((c: any) => c?.ativo !== false)

  return (
    <div className={`border rounded-md p-2 ${proposta.status === 'pendente' ? 'bg-white border-blue-200' : 'bg-gray-50 border-gray-100'}`}>
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${cfg.className}`}>
          {cfg.label}
        </span>
        <span className="text-[10px] text-gray-400">
          {formatDate(proposta.created_at)} · {formatCicloLabel(proposta.ciclo_tipo)} + {proposta.ciclo_prazo_recebimento}d
        </span>
      </div>

      {/* Combustíveis e preços */}
      {combsAtivos.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {combsAtivos.map((c: any, i: number) => (
            <span
              key={`${c.tipo}-${i}`}
              className="text-[10px] bg-blue-50 text-blue-700 border border-blue-100 px-1.5 py-0.5 rounded-full"
            >
              <strong>{c.tipo}</strong> · {formatCondicao(c)}
            </span>
          ))}
        </div>
      )}

      {proposta.observacoes && (
        <p className="text-[10px] text-gray-500 italic whitespace-pre-wrap mt-1.5 pt-1.5 border-t border-gray-100">
          "{proposta.observacoes}"
        </p>
      )}

      {podeAceitar && (
        <button
          onClick={onAceitar}
          disabled={aceitando}
          className="mt-2 w-full flex items-center justify-center gap-1.5 px-2 py-1.5 text-[11px] font-semibold text-white bg-emerald-600 rounded-md hover:bg-emerald-700 dark:hover:bg-emerald-500 disabled:opacity-50 transition-colors"
        >
          {aceitando ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle2 size={11} />}
          Aceitar esta versão
        </button>
      )}
    </div>
  )
}

function MensagemBubble({ msg, ehPropria }: { msg: Mensagem; ehPropria: boolean }) {
  // Eventos de sistema (propostas) renderizam central
  if (msg.tipo !== 'mensagem') {
    const cfg: Record<TipoEvento, { icon: any; label: string; className: string }> = {
      mensagem:           { icon: null, label: '', className: '' },
      proposta_enviada:   { icon: FileText,     label: 'Proposta enviada',   className: 'bg-blue-50 text-blue-700 border-blue-100' },
      proposta_revisada:  { icon: RefreshCw,    label: 'Proposta revisada',  className: 'bg-indigo-50 text-indigo-700 border-indigo-100' },
      proposta_recusada:  { icon: XCircle,      label: 'Proposta recusada',  className: 'bg-red-50 text-red-700 border-red-100' },
      proposta_aceita:    { icon: CheckCircle2, label: 'Proposta aceita',    className: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
    }
    const c = cfg[msg.tipo]
    const Icon = c.icon
    return (
      <div className="flex justify-center my-2">
        <div className={`inline-flex items-center gap-1.5 text-[10px] font-medium px-2.5 py-1 rounded-full border ${c.className}`}>
          {Icon && <Icon size={11} />}
          {c.label}
          {msg.conteudo && <span className="text-gray-400">· {msg.conteudo}</span>}
          <span className="text-gray-400">· {formatDate(msg.created_at)}</span>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex ${ehPropria ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${
        ehPropria
          ? 'bg-blue-600 text-white rounded-br-sm'
          : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm'
      }`}>
        <p className="whitespace-pre-wrap break-words">{msg.conteudo}</p>
        <div className={`text-[9px] mt-1 flex items-center gap-1 ${ehPropria ? 'text-blue-200' : 'text-gray-400'}`}>
          <Clock size={8} /> {formatDate(msg.created_at)}
          {ehPropria && msg.lida_em && <span>· Lida</span>}
        </div>
      </div>
    </div>
  )
}
