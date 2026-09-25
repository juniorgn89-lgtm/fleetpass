'use client'

import { useState, useMemo, useEffect } from 'react'
import { Check, X, TrendingUp, Store, Building2, ChevronRight, ChevronLeft, Send, AlertCircle, CheckCircle2, Handshake, FilePlus, Fuel, DollarSign, Inbox, Users } from 'lucide-react'
import { GraficoLinha, MiniGrafico, type PontoSerie } from '@/components/ui/grafico-linha'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'

function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const COMBUSTIVEIS_POSTO = ['Gasolina Comum', 'Gasolina Aditivada', 'Etanol', 'Diesel Comum', 'Diesel S-10']

const POSTO_COLORS = ['bg-blue-500', 'bg-violet-500', 'bg-emerald-500', 'bg-amber-500']

const MOTIVOS_REJEICAO = ['Volume insuficiente', 'Combustível não disponível', 'Localização inadequada', 'Capacidade indisponível', 'Outro']
const VALIDADES_PROPOSTA = ['7 dias', '15 dias', '30 dias']

type MetricaKey = 'receita' | 'count' | 'litros'

type PostoDesempenho = {
  id: string
  label: string
  receita: number
  litros: number
  count: number
  combustiveis: { nome: string; litros: number; valor: number }[]
}

type ActivityItem = {
  tipo: 'concluido' | 'pendente' | 'ativo'
  desc: string
  sub: string
  time: string
  posto: string
  ts: string
}

type Solicitacao = {
  id: string
  posto: string
  empresa: string
  cnpj: string
  cidade: string
  veiculos?: number
  combustiveis: string[]
  volume: string
  valorEstimado: string
  mensagem: string
}

const ACTIVITY_CFG = {
  concluido: { icon: CheckCircle2, iconBg: 'bg-blue-100',   iconColor: 'text-blue-600'   },
  ativo:     { icon: Handshake,    iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600' },
  pendente:  { icon: FilePlus,     iconBg: 'bg-amber-100',   iconColor: 'text-amber-600'   },
} as const

type PropostaFormItem = {
  tipo: string
  ativo: boolean
  modalPreco: 'bomba' | 'acrescimo' | 'desconto'
  valor: string
  unidade: '%' | 'R$/L'
}
type CicloFaturamento = {
  tipo: 'diario' | 'semanal' | 'quinzenal' | 'mensal'
  intervaloDias: string
  prazoRecebimento: string
}

type PropostaForm = {
  combustiveis: PropostaFormItem[]
  ciclo: CicloFaturamento
  limiteCredito: string
  semLimiteCredito: boolean
  volumeMinimo: string
  validade: string
  observacoes: string
}

function formatCondicao(item: PropostaFormItem): string {
  if (item.modalPreco === 'bomba') return 'Preço de bomba'
  const sinal = item.modalPreco === 'acrescimo' ? '+' : '-'
  return item.unidade === '%'
    ? `${sinal} ${item.valor}% sobre bomba`
    : `${sinal} R$ ${item.valor}/L sobre bomba`
}

function formatCiclo(ciclo: CicloFaturamento): string {
  const labels: Record<CicloFaturamento['tipo'], string> = {
    diario: `Diário (a cada ${ciclo.intervaloDias || '1'} dias)`,
    semanal: 'Semanal',
    quinzenal: 'Quinzenal',
    mensal: 'Mensal',
  }
  return `${labels[ciclo.tipo]} + ${ciclo.prazoRecebimento || '0'} dias`
}

function descCiclo(ciclo: CicloFaturamento): string {
  const p = parseInt(ciclo.prazoRecebimento) || 0
  switch (ciclo.tipo) {
    case 'diario': {
      const d = parseInt(ciclo.intervaloDias) || 1
      return `Vende por ${d} dias → fatura → vence em ${p} dias`
    }
    case 'semanal':
      return `Vende seg–dom → fatura na seg → vence em ${p} dias`
    case 'quinzenal':
      return `2 ciclos/mês: dias 01–15 (fatura dia 16, vence dia ${15 + p}) · dias 16–último (fatura dia 01, vence dia ${String(p).padStart(2, '0')})`
    case 'mensal':
      return `Vende o mês inteiro → fatura no dia 01 → vence no dia ${String(p).padStart(2, '0')}`
  }
}

function PostoChip({ nome }: { nome: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
      <Store size={10} /> {nome}
    </span>
  )
}

const STEP_LABELS_DASH = ['Revisão', 'Preços', 'Ciclo', 'Detalhes', 'Confirmação']

function StepIndicator({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <div key={n} className="flex items-center gap-1.5">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors shrink-0 ${
            n <= step ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'
          }`}>
            {n < step ? <Check size={11} /> : n}
          </div>
          {n < 5 && <div className={`h-px w-5 transition-colors ${n < step ? 'bg-blue-600' : 'bg-gray-200'}`} />}
        </div>
      ))}
      <span className="text-xs text-gray-400 ml-2">{STEP_LABELS_DASH[step - 1]}</span>
    </div>
  )
}

export default function PostoDashboardPage() {
  const [loading, setLoading] = useState(true)
  const [dashError, setDashError] = useState('')
  const [metrics, setMetrics] = useState({ abastecimentosPeriodo: 0, receitaB2B: 0, litrosPeriodo: 0, ticketMedio: 0, solicitacoesPendentes: 0, empresasParceiras: 0 })
  const [serie, setSerie] = useState<{ dia: string; receita: number; litros: number; abastecimentos: number }[]>([])
  const [periodos, setPeriodos] = useState<{ label: string; inicio: string; fim: string }[]>([])
  const [postosDesempenho, setPostosDesempenho] = useState<PostoDesempenho[]>([])
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([])
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([])
  const [periodoIdx, setPeriodoIdx] = useState(0)
  const [metrica, setMetrica] = useState<MetricaKey>('receita')

  useEffect(() => {
    async function loadDashboard() {
      try {
        const res = await fetch('/api/posto/dashboard')
        if (!res.ok) throw new Error('Erro ao carregar dados')
        const data = await res.json()
        setMetrics(data.metrics ?? { abastecimentosPeriodo: 0, receitaB2B: 0, litrosPeriodo: 0, ticketMedio: 0, solicitacoesPendentes: 0, empresasParceiras: 0 })
        setSerie(data.serie ?? [])
        setPeriodos(data.periodos ?? [])
        setPostosDesempenho(data.postosDesempenho ?? [])
        setRecentActivity(data.recentActivity ?? [])
        setSolicitacoes(data.solicitacoes ?? [])
      } catch (err) {
        setDashError('Não foi possível carregar os dados do dashboard.')
      } finally {
        setLoading(false)
      }
    }
    loadDashboard()
  }, [])

  const totalReceita = postosDesempenho.reduce((s, p) => s + p.receita, 0)
  const totalAbast   = postosDesempenho.reduce((s, p) => s + p.count, 0)
  const totalLitros  = postosDesempenho.reduce((s, p) => s + p.litros, 0)
  const maxMetrica   = Math.max(...postosDesempenho.map(p => p[metrica] as number), 1)
  const metricaTotal = postosDesempenho.reduce((s, p) => s + (p[metrica] as number), 0)

  // Proposta modal
  const [propostaModal, setPropostaModal] = useState<string | null>(null)
  const [propostaStep, setPropostaStep] = useState(1)
  const [propostaForm, setPropostaForm] = useState<PropostaForm>({
    combustiveis: [], ciclo: { tipo: 'mensal', intervaloDias: '1', prazoRecebimento: '5' }, limiteCredito: '', semLimiteCredito: false, volumeMinimo: '', validade: '15 dias', observacoes: '',
  })

  // Rejeição modal
  const [rejeitarModal, setRejeitarModal] = useState<string | null>(null)
  const [motivoRejeicao, setMotivoRejeicao] = useState('')
  const [motivoOutro, setMotivoOutro] = useState('')
  const [propostaEnviada, setPropostaEnviada] = useState<string | null>(null)

  const solicitacaoSelecionada = solicitacoes.find((s) => s.id === propostaModal)
  const solicitacaoRejeitar = solicitacoes.find((s) => s.id === rejeitarModal)

  function abrirPropostaModal(id: string) {
    const sol = solicitacoes.find((s) => s.id === id)
    if (!sol) return
    const combustiveisForm: PropostaFormItem[] = sol.combustiveis
      .filter((c) => COMBUSTIVEIS_POSTO.includes(c))
      .map((c) => ({ tipo: c, ativo: true, modalPreco: 'bomba', valor: '', unidade: '%' }))
    setPropostaForm({ combustiveis: combustiveisForm, ciclo: { tipo: 'mensal', intervaloDias: '1', prazoRecebimento: '5' }, limiteCredito: '', semLimiteCredito: false, volumeMinimo: '', validade: '15 dias', observacoes: '' })
    setPropostaStep(1)
    setPropostaModal(id)
  }

  function fecharPropostaModal() {
    setPropostaModal(null)
    setPropostaStep(1)
  }

  async function enviarProposta() {
    if (!solicitacaoSelecionada) return
    const body = {
      combustiveis: propostaForm.combustiveis
        .filter(c => c.ativo)
        .map(c => ({
          tipo: c.tipo,
          ativo: true,
          modal_preco: c.modalPreco,
          valor: c.modalPreco !== 'bomba' ? parseFloat(c.valor) || 0 : null,
          unidade: c.unidade,
        })),
      ciclo: {
        tipo: propostaForm.ciclo.tipo,
        intervaloDias: propostaForm.ciclo.intervaloDias,
        prazoRecebimento: propostaForm.ciclo.prazoRecebimento,
      },
      limiteCredito: propostaForm.semLimiteCredito ? null : (propostaForm.limiteCredito || null),
      volumeMinimo: propostaForm.volumeMinimo || null,
      validade: propostaForm.validade,
      observacoes: propostaForm.observacoes || null,
    }
    const res = await fetch(`/api/posto/solicitacoes/${solicitacaoSelecionada.id}/proposta`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (res.ok) {
      setSolicitacoes(prev => prev.filter(s => s.id !== solicitacaoSelecionada.id))
      setPropostaEnviada(solicitacaoSelecionada.id)
      fecharPropostaModal()
      setMetrics(m => ({ ...m, solicitacoesPendentes: Math.max(0, m.solicitacoesPendentes - 1) }))
      setTimeout(() => setPropostaEnviada(null), 4000)
    }
  }

  async function confirmarRejeicao() {
    if (!solicitacaoRejeitar) return
    const res = await fetch(`/api/posto/solicitacoes/${solicitacaoRejeitar.id}/rejeitar`, { method: 'PATCH' })
    if (res.ok) {
      setSolicitacoes(prev => prev.filter(s => s.id !== solicitacaoRejeitar.id))
      setMetrics(m => ({ ...m, solicitacoesPendentes: Math.max(0, m.solicitacoesPendentes - 1) }))
      setRejeitarModal(null)
      setMotivoRejeicao('')
      setMotivoOutro('')
    }
  }

  function updateCombustivel(tipo: string, updates: Partial<PropostaFormItem>) {
    setPropostaForm((prev) => ({
      ...prev,
      combustiveis: prev.combustiveis.map((c) => c.tipo === tipo ? { ...c, ...updates } : c),
    }))
  }

  async function handlePeriodoChange(idx: number) {
    setPeriodoIdx(idx)
    if (!periodos[idx]) return
    const res = await fetch(`/api/posto/dashboard?periodo=${periodos[idx].inicio}`)
    if (res.ok) {
      const data = await res.json()
      setPostosDesempenho(data.postosDesempenho ?? [])
      setSerie(data.serie ?? [])
      if (data.metrics) setMetrics(data.metrics)
    }
  }

  const propostaValida = propostaForm.combustiveis.some((c) =>
    c.ativo && (c.modalPreco === 'bomba' || (c.valor && parseFloat(c.valor) > 0))
  )

  // Séries dos minigráficos, na mesma ordem dos cartões.
  const serieReceita: PontoSerie[] = serie.map((d) => ({ dia: d.dia, valor: d.receita }))
  const serieLitros:  PontoSerie[] = serie.map((d) => ({ dia: d.dia, valor: d.litros }))
  const serieAbast:   PontoSerie[] = serie.map((d) => ({ dia: d.dia, valor: d.abastecimentos }))

  // Cada cartão leva uma segunda linha de contexto: o número sozinho não diz
  // de que período é nem com o que se compara.
  const metricsCards = [
    {
      label: 'Abastecimentos', value: String(metrics.abastecimentosPeriodo),
      contexto: `${Math.round(metrics.litrosPeriodo)} L no período`,
      Icone: Fuel, cor: 'text-blue-600', fundo: 'bg-blue-50', serie: serieAbast,
    },
    {
      label: 'Receita B2B', value: formatBRL(metrics.receitaB2B),
      contexto: `Ticket médio: ${formatBRL(metrics.ticketMedio)}`,
      Icone: DollarSign, cor: 'text-emerald-600', fundo: 'bg-emerald-50', serie: serieReceita,
    },
    {
      label: 'Solicitações pendentes', value: String(metrics.solicitacoesPendentes),
      contexto: metrics.solicitacoesPendentes > 0 ? 'Aguardando sua resposta' : 'Nada aguardando',
      Icone: Inbox, cor: 'text-amber-600', fundo: 'bg-amber-50', serie: [] as PontoSerie[],
    },
    {
      label: 'Empresas parceiras', value: String(metrics.empresasParceiras),
      contexto: 'Parcerias ativas',
      Icone: Users, cor: 'text-blue-600', fundo: 'bg-blue-50', serie: [] as PontoSerie[],
    },
  ]

  return (
    <div className="space-y-6">
      {/* Metrics */}
      <div className="grid grid-cols-4 gap-4">
        {loading
          ? metricsCards.map((m) => (
              <Card key={m.label} padding="md">
                <p className="text-sm text-gray-500">{m.label}</p>
                <div className="h-8 w-24 bg-gray-200 rounded mt-1 animate-pulse" />
                <div className="h-4 w-16 bg-gray-100 rounded mt-1 animate-pulse" />
              </Card>
            ))
          : metricsCards.map((m) => (
              <Card key={m.label} padding="md">
                <div className="flex items-start gap-3">
                  <span className={`w-9 h-9 rounded-xl ${m.fundo} flex items-center justify-center shrink-0`}>
                    <m.Icone size={17} className={m.cor} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-500 truncate">{m.label}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-0.5 leading-tight">{m.value}</p>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{m.contexto}</p>
                  </div>
                </div>
                <div className="mt-2 -mb-1"><MiniGrafico pontos={m.serie} cor={m.cor} /></div>
              </Card>
            ))
        }
      </div>

      {dashError && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 font-medium">
          <AlertCircle size={16} className="text-red-600" />
          {dashError}
        </div>
      )}

      {/* Toast de confirmação */}
      {propostaEnviada !== null && (
        <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700 font-medium">
          <Check size={16} className="text-emerald-600" />
          Proposta enviada com sucesso! A empresa receberá um e-mail para análise.
        </div>
      )}

      {/* Pending + Activity */}
      <div className="grid grid-cols-5 gap-5">
        {/* Solicitações pendentes — um painel, igual ao de Atividade recente.
            Antes era um <h2> solto com um card por solicitação embaixo: com
            uma solicitação só, sobrava um cartão órfão e um vão ao lado de uma
            coluna cheia. Agora as duas colunas são painéis do mesmo tipo,
            alinhados pelo topo. */}
        <Card padding="none" className="col-span-3">
          <div className="px-5 pt-4 pb-3 border-b border-gray-100 flex items-center justify-between gap-3">
            <h2 className="font-semibold text-gray-900">Solicitações pendentes</h2>
            {solicitacoes.length > 0 && (
              <Link href="/posto/parcerias/solicitacoes" className="text-xs font-medium text-blue-600 hover:text-blue-700">
                Ver todas ({solicitacoes.length})
              </Link>
            )}
          </div>

          <div className="divide-y divide-gray-50">
          {solicitacoes.length === 0 && !loading && (
            <p className="px-5 py-8 text-center text-sm text-gray-400">Nenhuma solicitação pendente.</p>
          )}
          {solicitacoes.map((s) => (
            <div key={s.id} className="px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="mb-2"><PostoChip nome={s.posto} /></div>
                  <h3 className="font-semibold text-gray-900">{s.empresa}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">{s.cnpj} · {s.cidade}</p>
                  <div className="flex flex-wrap gap-1 mt-2 mb-1">
                    {s.combustiveis.map((c) => (
                      <span key={c} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{c}</span>
                    ))}
                  </div>
                  {s.veiculos != null && <p className="text-xs text-gray-400">{s.veiculos} veículos · {s.volume}</p>}
                  {s.veiculos == null && <p className="text-xs text-gray-400">{s.volume}</p>}
                  {s.valorEstimado && <p className="text-xs font-semibold text-emerald-600 mt-0.5">{s.valorEstimado}</p>}
                  {s.mensagem && <p className="text-xs text-gray-500 mt-1 italic">"{s.mensagem}"</p>}
                </div>
                {/* Uma ação principal só. Rejeitar era um botão vermelho
                    sólido, do mesmo peso do "Enviar proposta" — dois pesos
                    iguais fazem a tela perguntar em vez de sugerir. Vermelho
                    fica no texto, que é o suficiente para marcar o destrutivo. */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => { setRejeitarModal(s.id); setMotivoRejeicao('') }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-500 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                  >
                    <X size={13} /> Rejeitar
                  </button>
                  <Button size="sm" onClick={() => abrirPropostaModal(s.id)}>
                    <Send size={13} /> Enviar proposta
                  </Button>
                </div>
              </div>
            </div>
          ))}
          </div>
        </Card>

        {/* Atividade recente */}
        <Card padding="none" className="col-span-2">
          <div className="px-5 pt-4 pb-3 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Atividade recente</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {recentActivity.map((a, i) => {
              const cfg = ACTIVITY_CFG[a.tipo]
              const Icon = cfg.icon
              return (
                <div key={i} className="flex items-start gap-3 px-5 py-3.5">
                  <div className={`w-8 h-8 rounded-full ${cfg.iconBg} flex items-center justify-center shrink-0 mt-0.5`}>
                    <Icon size={15} className={cfg.iconColor} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 leading-snug">{a.desc}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <PostoChip nome={a.posto} />
                      <span className="text-[11px] text-gray-400">{a.sub}</span>
                    </div>
                  </div>
                  <span className="text-[11px] text-gray-400 shrink-0 mt-1">{a.time}</span>
                </div>
              )
            })}
            {recentActivity.length === 0 && !loading && (
              <div className="px-5 py-8 text-center text-sm text-gray-400">Nenhuma atividade recente.</div>
            )}
          </div>
        </Card>
      </div>

      {/* ── Desempenho por posto ───────────────────────────────── */}
      <Card padding="none">
        {/* Cabeçalho */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Desempenho por posto</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {totalAbast} abastecimentos · {totalLitros} L · {formatBRL(totalReceita)}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {/* Métrica */}
            <div className="flex gap-1 bg-gray-100 p-0.5 rounded-lg">
              {([
                { key: 'receita',         label: 'Faturamento'     },
                { key: 'count',           label: 'Abastecimentos'  },
                { key: 'litros',          label: 'Volume'          },
              ] as { key: MetricaKey; label: string }[]).map(m => (
                <button key={m.key} onClick={() => setMetrica(m.key)}
                  className={`px-3 py-1 text-xs rounded-md transition-colors font-medium ${
                    metrica === m.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >{m.label}</button>
              ))}
            </div>
            {/* Período */}
            <div className="flex gap-1.5">
              {periodos.map((p, i) => (
                <button key={p.label} onClick={() => handlePeriodoChange(i)}
                  className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                    periodoIdx === i
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                  }`}
                >{p.label}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Cabeçalho de colunas: o ranking anterior era só barra e número
            solto — sem dizer qual grandeza cada coluna trazia. */}
        <div className="px-6 py-2 border-b border-gray-100 bg-gray-50/60 flex items-center gap-4 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
          <span className="w-6 shrink-0">#</span>
          <span className="w-40 shrink-0">Posto</span>
          <span className="w-24 shrink-0 text-right">Abast.</span>
          <span className="w-28 shrink-0 text-right">Volume (L)</span>
          <span className="w-32 shrink-0 text-right">Receita B2B</span>
          <span className="flex-1 min-w-0">Participação</span>
        </div>

        {/* Linhas */}
        <div className="divide-y divide-gray-50">
          {postosDesempenho.map((p, i) => {
            const val   = p[metrica] as number
            const pct   = maxMetrica > 0 ? (val / maxMetrica) * 100 : 0
            const share = metricaTotal > 0 ? (val / metricaTotal) * 100 : 0
            const barColor = POSTO_COLORS[i % POSTO_COLORS.length]
            return (
              <div key={p.id} className="px-6 py-3.5 flex items-center gap-4 hover:bg-gray-50/60 transition-colors">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  i === 0 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'
                }`}>{i + 1}</span>

                <p className="w-40 shrink-0 text-sm font-medium text-gray-800 truncate" title={p.label}>{p.label}</p>

                {/* Uma coluna por grandeza. A métrica escolhida no seletor vem
                    em negrito — é por ela que a tabela está ordenada. */}
                <span className={`w-24 shrink-0 text-right text-sm tabular-nums ${metrica === 'count' ? 'font-bold text-gray-900' : 'text-gray-500'}`}>
                  {p.count}
                </span>
                <span className={`w-28 shrink-0 text-right text-sm tabular-nums ${metrica === 'litros' ? 'font-bold text-gray-900' : 'text-gray-500'}`}>
                  {Math.round(p.litros)}
                </span>
                <span className={`w-32 shrink-0 text-right text-sm tabular-nums ${metrica === 'receita' ? 'font-bold text-gray-900' : 'text-gray-500'}`}>
                  {formatBRL(p.receita)}
                </span>

                <div className="flex-1 min-w-0 flex items-center gap-2.5">
                  <div className="flex-1 min-w-0 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full ${barColor} rounded-full transition-all duration-300`}
                      style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-11 shrink-0 text-right text-[11px] tabular-nums text-gray-400">
                    {share.toFixed(1)}%
                  </span>
                </div>
              </div>
            )
          })}

          {postosDesempenho.every(p => (p[metrica] as number) === 0) && (
            <div className="px-6 py-8 text-center text-sm text-gray-400">
              Nenhum abastecimento no período selecionado.
            </div>
          )}
        </div>

        {/* Rodapé com totais */}
        {/* Totais nas MESMAS colunas das linhas, para o olho somar na vertical. */}
        <div className="px-6 py-3 border-t-2 border-gray-200 bg-gray-50 flex items-center gap-4">
          <span className="w-6 shrink-0" />
          <span className="w-40 shrink-0 text-xs font-semibold uppercase tracking-wide text-gray-500">Total da rede</span>
          <span className="w-24 shrink-0 text-right text-sm tabular-nums text-gray-600">{totalAbast}</span>
          <span className="w-28 shrink-0 text-right text-sm tabular-nums text-gray-600">{Math.round(totalLitros)}</span>
          <span className="w-32 shrink-0 text-right text-sm font-bold tabular-nums text-gray-900">{formatBRL(totalReceita)}</span>
          {/* Sem movimento no período não há participação a somar: "100%" de
              zero contradiz a mensagem logo acima. */}
          <span className="flex-1 min-w-0 text-right text-[11px] text-gray-400">
            {metricaTotal > 0 ? '100%' : '—'}
          </span>
        </div>
      </Card>

      {/* ── Evolução no período ─────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-5">
        <GraficoLinha
          titulo="Faturamento B2B"
          icone={<DollarSign size={15} className="text-emerald-600" />}
          pontos={serieReceita}
          formatar={formatBRL}
          vazio="Nenhum faturamento no período"
        />
        <GraficoLinha
          titulo="Volume de abastecimentos"
          icone={<Fuel size={15} className="text-blue-600" />}
          pontos={serieLitros}
          formatar={(v) => `${Math.round(v)} L`}
          vazio="Nenhum abastecimento no período"
        />
      </div>

      {/* ── Modal: Enviar Proposta (3 etapas) ──────────────────── */}
      <Modal
        isOpen={propostaModal !== null}
        onClose={fecharPropostaModal}
        title={['Solicitação recebida', 'Condição de preços', 'Ciclo de faturamento', 'Detalhes da proposta', 'Confirmar envio'][propostaStep - 1]}
        size="lg"
      >
        {solicitacaoSelecionada && (
          <div className="space-y-5">
            <StepIndicator step={propostaStep} />

            {/* Etapa 1 — Revisão */}
            {propostaStep === 1 && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <PostoChip nome={solicitacaoSelecionada.posto} />
                  <span className="text-xs text-gray-400">←</span>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-blue-100 rounded flex items-center justify-center">
                      <Building2 size={12} className="text-blue-600" />
                    </div>
                    <span className="text-sm font-semibold text-gray-800">{solicitacaoSelecionada.empresa}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-400 mb-1">CNPJ</p>
                    <p className="text-sm font-medium text-gray-800">{solicitacaoSelecionada.cnpj}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-400 mb-1">Localização</p>
                    <p className="text-sm font-medium text-gray-800">{solicitacaoSelecionada.cidade}</p>
                  </div>
                  {solicitacaoSelecionada.veiculos != null && (
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-400 mb-1">Frota</p>
                      <p className="text-sm font-bold text-gray-900">{solicitacaoSelecionada.veiculos} veículos</p>
                    </div>
                  )}
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-400 mb-1">Volume estimado</p>
                    <p className="text-sm font-bold text-gray-900">{solicitacaoSelecionada.volume}</p>
                  </div>
                  <div className="p-3 bg-emerald-50 rounded-lg col-span-2">
                    <p className="text-xs text-gray-400 mb-1">Receita estimada</p>
                    <p className="text-lg font-bold text-emerald-700">{solicitacaoSelecionada.valorEstimado}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Combustíveis solicitados</p>
                  <div className="flex flex-wrap gap-2">
                    {solicitacaoSelecionada.combustiveis.map((c) => (
                      <span key={c} className="text-sm bg-blue-50 text-blue-700 px-3 py-1 rounded-full font-medium">{c}</span>
                    ))}
                  </div>
                </div>
                {solicitacaoSelecionada.mensagem && (
                  <div className="p-3 bg-gray-50 rounded-lg border-l-4 border-blue-300">
                    <p className="text-xs text-gray-400 mb-1">Mensagem da empresa</p>
                    <p className="text-sm text-gray-600 italic">"{solicitacaoSelecionada.mensagem}"</p>
                  </div>
                )}
                <div className="flex gap-3 pt-1">
                  <Button variant="secondary" className="flex-1" onClick={fecharPropostaModal}>Cancelar</Button>
                  <Button className="flex-1" onClick={() => setPropostaStep(2)}>
                    Definir preços <ChevronRight size={14} />
                  </Button>
                </div>
              </div>
            )}

            {/* Etapa 2 — Condição de preços */}
            {propostaStep === 2 && (
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-semibold text-gray-800 mb-1">Combustíveis ofertados e condição de preço</p>
                  <p className="text-xs text-gray-400 mb-3">Defina se o cliente pagará o preço de bomba, com acréscimo ou desconto.</p>
                  <div className="space-y-3">
                    {propostaForm.combustiveis.map((c) => (
                      <div key={c.tipo} className={`p-3 border rounded-lg transition-colors ${c.ativo ? 'border-blue-200 bg-blue-50/30' : 'border-gray-200'}`}>
                        <div className="flex items-center gap-2 mb-2">
                          <input type="checkbox" checked={c.ativo}
                            onChange={(e) => updateCombustivel(c.tipo, { ativo: e.target.checked })}
                            className="w-4 h-4 rounded accent-blue-600 cursor-pointer"
                          />
                          <span className="text-sm font-semibold text-gray-700">{c.tipo}</span>
                        </div>
                        {c.ativo && (
                          <div className="ml-6 space-y-2">
                            <div className="flex gap-4">
                              {(['bomba', 'acrescimo', 'desconto'] as const).map((mode) => (
                                <label key={mode} className="flex items-center gap-1.5 cursor-pointer">
                                  <input type="radio" name={`modal-dash-${c.tipo}`} checked={c.modalPreco === mode}
                                    onChange={() => updateCombustivel(c.tipo, { modalPreco: mode, valor: '' })}
                                    className="accent-blue-600"
                                  />
                                  <span className="text-sm text-gray-600">
                                    {mode === 'bomba' ? 'Preço de bomba' : mode === 'acrescimo' ? 'Acréscimo' : 'Desconto'}
                                  </span>
                                </label>
                              ))}
                            </div>
                            {c.modalPreco !== 'bomba' && (
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-gray-500">{c.modalPreco === 'acrescimo' ? '+' : '-'}</span>
                                <input type="number" step="0.01" min="0" placeholder="0" value={c.valor}
                                  onChange={(e) => updateCombustivel(c.tipo, { valor: e.target.value })}
                                  className="w-20 px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50"
                                />
                                <select value={c.unidade}
                                  onChange={(e) => updateCombustivel(c.tipo, { unidade: e.target.value as '%' | 'R$/L' })}
                                  className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50"
                                >
                                  <option value="%">%</option>
                                  <option value="R$/L">R$/L</option>
                                </select>
                                <span className="text-xs text-gray-400">sobre o preço de bomba</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                    {!propostaValida && (
                      <p className="text-xs text-amber-600 mt-1">Ative pelo menos um combustível para continuar.</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-3 pt-1">
                  <Button variant="secondary" onClick={() => setPropostaStep(1)}>
                    <ChevronLeft size={14} /> Voltar
                  </Button>
                  <Button className="flex-1" onClick={() => setPropostaStep(3)} disabled={!propostaValida}>
                    Definir ciclo <ChevronRight size={14} />
                  </Button>
                </div>
              </div>
            )}

            {/* Etapa 3 — Ciclo de faturamento */}
            {propostaStep === 3 && (
              <div className="space-y-4">
                <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                  <p className="text-sm font-semibold text-gray-800">Ciclo de faturamento</p>
                  <div className="space-y-2">
                    {([
                      { val: 'diario', label: 'Diário' },
                      { val: 'semanal', label: 'Semanal' },
                      { val: 'quinzenal', label: 'Quinzenal' },
                      { val: 'mensal', label: 'Mensal' },
                    ] as { val: CicloFaturamento['tipo']; label: string }[]).map(({ val, label }) => (
                      <div key={val}>
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input type="radio" name="ciclo-tipo-dash"
                            checked={propostaForm.ciclo.tipo === val}
                            onChange={() => setPropostaForm((p) => ({ ...p, ciclo: { ...p.ciclo, tipo: val } }))}
                            className="accent-blue-600"
                          />
                          <span className="text-sm text-gray-700 w-20">{label}</span>
                          {val === 'diario' && propostaForm.ciclo.tipo === 'diario' && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-gray-400">a cada</span>
                              <input type="number" min="1" max="30" value={propostaForm.ciclo.intervaloDias}
                                onChange={(e) => setPropostaForm((p) => ({ ...p, ciclo: { ...p.ciclo, intervaloDias: e.target.value } }))}
                                className="w-14 px-2 py-1 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                              />
                              <span className="text-xs text-gray-400">dias</span>
                            </div>
                          )}
                        </label>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
                    <span className="text-sm font-medium text-gray-700 shrink-0">Prazo de vencimento</span>
                    <input type="number" min="1" max="90" value={propostaForm.ciclo.prazoRecebimento}
                      onChange={(e) => setPropostaForm((p) => ({ ...p, ciclo: { ...p.ciclo, prazoRecebimento: e.target.value } }))}
                      className="w-16 px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 text-center"
                    />
                    <span className="text-sm text-gray-500">dias (contando o dia do faturamento)</span>
                  </div>
                  {propostaForm.ciclo.prazoRecebimento && (
                    <div className="bg-blue-50 rounded-lg px-3 py-2 text-xs text-blue-700">
                      <span className="font-semibold">Exemplo: </span>{descCiclo(propostaForm.ciclo)}
                    </div>
                  )}
                </div>
                <div className="flex gap-3 pt-1">
                  <Button variant="secondary" onClick={() => setPropostaStep(2)}>
                    <ChevronLeft size={14} /> Voltar
                  </Button>
                  <Button className="flex-1" onClick={() => setPropostaStep(4)}>
                    Detalhes da proposta <ChevronRight size={14} />
                  </Button>
                </div>
              </div>
            )}

            {/* Etapa 4 — Detalhes */}
            {propostaStep === 4 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Validade da proposta</label>
                    <select value={propostaForm.validade}
                      onChange={(e) => setPropostaForm((p) => ({ ...p, validade: e.target.value }))}
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50"
                    >
                      {VALIDADES_PROPOSTA.map((v) => <option key={v}>{v}</option>)}
                    </select>
                  </div>
                  <div />
                  <div>
                    <Input label="Volume mínimo mensal (L)" type="number" placeholder="Ex: 1000"
                      value={propostaForm.volumeMinimo}
                      onChange={(e) => setPropostaForm((p) => ({ ...p, volumeMinimo: e.target.value }))}
                      helperText="Opcional"
                    />
                  </div>
                  <div>
                    <Input label="Limite de crédito mensal (R$)" type="number" placeholder="Ex: 20000"
                      value={propostaForm.limiteCredito}
                      onChange={(e) => setPropostaForm((p) => ({ ...p, limiteCredito: e.target.value }))}
                      helperText={propostaForm.semLimiteCredito ? 'Sem limite definido' : 'Opcional'}
                      disabled={propostaForm.semLimiteCredito}
                    />
                    <label className="flex items-center gap-2 mt-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={propostaForm.semLimiteCredito}
                        onChange={(e) => setPropostaForm((p) => ({ ...p, semLimiteCredito: e.target.checked, limiteCredito: e.target.checked ? '' : p.limiteCredito }))}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-xs text-gray-600">Sem limite de crédito</span>
                    </label>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Observações</label>
                  <textarea rows={3}
                    placeholder="Condições especiais, horários de atendimento, instruções para motoristas..."
                    value={propostaForm.observacoes}
                    onChange={(e) => setPropostaForm((p) => ({ ...p, observacoes: e.target.value }))}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50 resize-none"
                  />
                </div>
                <div className="flex gap-3 pt-1">
                  <Button variant="secondary" onClick={() => setPropostaStep(3)}>
                    <ChevronLeft size={14} /> Voltar
                  </Button>
                  <Button className="flex-1" onClick={() => setPropostaStep(5)}>
                    Revisar proposta <ChevronRight size={14} />
                  </Button>
                </div>
              </div>
            )}

            {/* Etapa 5 — Confirmar */}
            {propostaStep === 5 && (
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-xl space-y-3 border border-blue-100">
                  <div className="flex items-center gap-2 pb-2 border-b border-blue-200">
                    <PostoChip nome={solicitacaoSelecionada.posto} />
                    <span className="text-xs text-gray-400">→</span>
                    <span className="text-sm font-semibold text-gray-800">{solicitacaoSelecionada.empresa}</span>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2">Combustíveis e condição de preço</p>
                    <div className="space-y-1.5">
                      {propostaForm.combustiveis.filter((c) => c.ativo).map((c) => (
                        <div key={c.tipo} className="flex justify-between text-sm">
                          <span className="text-gray-600">{c.tipo}</span>
                          <span className="font-semibold text-gray-900">{formatCondicao(c)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="border-t border-blue-200 pt-3 space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Ciclo de faturamento</span>
                      <span className="font-medium text-gray-800">{formatCiclo(propostaForm.ciclo)}</span>
                    </div>
                    <div className="text-xs text-gray-400 text-right">{descCiclo(propostaForm.ciclo)}</div>
                    {propostaForm.volumeMinimo && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Volume mínimo</span>
                        <span className="font-medium text-gray-800">{propostaForm.volumeMinimo} L/mês</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Limite de crédito</span>
                      <span className="font-medium text-gray-800">
                        {propostaForm.semLimiteCredito ? 'Sem limite' : propostaForm.limiteCredito ? `R$ ${propostaForm.limiteCredito}` : 'Não definido'}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Validade da proposta</span>
                      <span className="font-medium text-gray-800">{propostaForm.validade}</span>
                    </div>
                    {propostaForm.observacoes && (
                      <div className="pt-1">
                        <p className="text-xs text-gray-400 mb-0.5">Observações</p>
                        <p className="text-xs text-gray-600 italic">"{propostaForm.observacoes}"</p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-100 rounded-lg">
                  <AlertCircle size={14} className="text-amber-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-700">
                    A empresa receberá um e-mail com esta proposta e terá <strong>{propostaForm.validade}</strong> para aceitar ou recusar.
                  </p>
                </div>
                <div className="flex gap-3 pt-1">
                  <Button variant="secondary" onClick={() => setPropostaStep(4)}>
                    <ChevronLeft size={14} /> Editar
                  </Button>
                  <Button className="flex-1" onClick={enviarProposta}>
                    <Send size={14} /> Enviar proposta
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ── Modal: Rejeitar ────────────────────────────────────── */}
      <Modal isOpen={rejeitarModal !== null} onClose={() => setRejeitarModal(null)} title="Rejeitar solicitação" size="sm">
        <div className="space-y-4">
          {solicitacaoRejeitar && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm font-semibold text-gray-800">{solicitacaoRejeitar.empresa}</p>
              <p className="text-xs text-gray-400">{solicitacaoRejeitar.cnpj} · {solicitacaoRejeitar.cidade}</p>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Motivo da rejeição</label>
            <div className="space-y-2">
              {MOTIVOS_REJEICAO.map((m) => (
                <label key={m} className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="radio"
                    name="motivo-dash"
                    value={m}
                    checked={motivoRejeicao === m}
                    onChange={() => setMotivoRejeicao(m)}
                    className="accent-blue-600"
                  />
                  <span className="text-sm text-gray-700 group-hover:text-gray-900">{m}</span>
                </label>
              ))}
            </div>
            {motivoRejeicao === 'Outro' && (
              <textarea
                rows={2}
                placeholder="Descreva o motivo..."
                value={motivoOutro}
                onChange={(e) => setMotivoOutro(e.target.value)}
                className="mt-3 w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50 resize-none"
              />
            )}
          </div>
          <div className="flex gap-3 pt-1">
            <Button variant="secondary" className="flex-1" onClick={() => setRejeitarModal(null)}>Cancelar</Button>
            <Button
              variant="danger"
              className="flex-1"
              onClick={confirmarRejeicao}
              disabled={!motivoRejeicao || (motivoRejeicao === 'Outro' && !motivoOutro)}
            >
              <X size={13} /> Confirmar rejeição
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
