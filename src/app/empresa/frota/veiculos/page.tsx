'use client'

import { Fragment, useEffect, useState } from 'react'
import {
  Plus, Pencil, Trash2, Search, Gauge, Loader2, AlertCircle,
  ChevronRight, ChevronLeft, Lock, LockOpen, Wrench, History, Truck, Fuel, X, Eye,
  Check,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Modal } from '@/components/ui/modal'
// Iniciais do avatar: o mesmo critério do menu de conta, não uma segunda cópia.
import { iniciaisDe } from '@/hooks/use-perfil-atual'
import { ModalVeiculo } from '@/components/empresa/modal-veiculo'
import { Input } from '@/components/ui/input'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Veiculo {
  id: string
  placa: string
  modelo: string
  combustivel: string
  limiteMensal: number | null
  motoristaPadraoId: string | null
  motoristaNome: string | null
  exigirQuilometragem: boolean
  bloqueado: boolean
  bloqueioTipo: 'manutencao' | 'operacional' | null
}

interface Motorista { id: string; nome: string }

interface BloqueioLog {
  id: string
  acao: 'bloqueio' | 'desbloqueio'
  tipo: 'manutencao' | 'operacional' | null
  motivo: string
  perfil_nome: string
  created_at: string
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const COMBUSTIVEIS = [
  'Gasolina Comum', 'Gasolina Aditivada', 'Etanol',
  'Diesel S-10', 'Diesel Comum', 'GNV',
]

const FORM_VAZIO = {
  placa: '', modelo: '', combustivel: 'Gasolina Comum',
  limiteMensal: '', motoristaPadraoId: '', exigirQuilometragem: false,
}

const STEPS = ['Identificação', 'Combustível', 'Configurações']

/**
 * Situação exibida na tabela.
 *
 * "Em manutenção" não é um status no banco: `veiculos.status` só tem
 * 'ativo' e 'inativo'. Manutenção é um BLOQUEIO com
 * `bloqueio_tipo = 'manutencao'`. Aqui os dois campos viram um rótulo só,
 * que é como o usuário pensa a frota.
 *
 * 'inativo' não entra na lista: a rota já filtra `status = 'ativo'` — remover
 * um veículo é baixa lógica, e ele some da tela. Oferecer esse filtro daria
 * uma opção que nunca casa com nada.
 */
type Situacao = 'ativo' | 'manutencao' | 'bloqueado'

function situacaoDe(v: Veiculo): Situacao {
  if (v.bloqueado) return v.bloqueioTipo === 'manutencao' ? 'manutencao' : 'bloqueado'
  return 'ativo'
}

const SITUACAO: Record<Situacao, { rotulo: string; classe: string; ponto: string }> = {
  ativo:      { rotulo: 'Ativo',         classe: 'bg-emerald-50 text-emerald-700 border-emerald-200', ponto: 'bg-emerald-500' },
  manutencao: { rotulo: 'Em manutenção', classe: 'bg-amber-50 text-amber-700 border-amber-200',       ponto: 'bg-amber-500' },
  bloqueado:  { rotulo: 'Bloqueado',     classe: 'bg-red-50 text-red-700 border-red-200',             ponto: 'bg-red-500' },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPlaca(raw: string): string {
  const v = raw.toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (v.length <= 3) return v
  if (v.length > 4 && /[A-Z]/.test(v[4])) return `${v.slice(0, 7)}`
  return `${v.slice(0, 3)}-${v.slice(3, 7)}`
}

function formatLimite(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

/**
 * Trilha das etapas do cadastro.
 *
 * Mostra as três ao mesmo tempo para o usuário saber quanto falta antes de
 * começar: as concluídas ganham o visto, a atual o anel, e as futuras ficam
 * apagadas. É só indicação — não dá para pular etapa clicando, porque a
 * regra de avanço continua sendo a do `canAdvance()`.
 */
function IndicadorEtapas({ etapas, atual }: { etapas: string[]; atual: number }) {
  return (
    <div className="mb-6">
      <p className="sr-only">Etapa {atual + 1} de {etapas.length}: {etapas[atual]}</p>
      <div className="flex items-start">
        {etapas.map((rotulo, i) => {
          const concluida = i < atual
          const ehAtual   = i === atual
          return (
            <Fragment key={rotulo}>
              <div
                aria-current={ehAtual ? 'step' : undefined}
                className="flex w-[4.5rem] shrink-0 flex-col items-center gap-2 sm:w-24"
              >
                <span className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                  concluida ? 'bg-blue-600 text-white' :
                  ehAtual   ? 'bg-blue-600 text-white ring-4 ring-blue-500/25' :
                              'border border-gray-200 bg-gray-100 text-gray-400'
                }`}>
                  {concluida ? <Check size={15} strokeWidth={3} /> : i + 1}
                </span>
                <span className={`text-center text-[11px] leading-tight sm:text-xs ${
                  ehAtual ? 'font-semibold text-blue-700' :
                  concluida ? 'font-medium text-gray-700' : 'text-gray-400'
                }`}>
                  {rotulo}
                </span>
              </div>
              {i < etapas.length - 1 && (
                <div
                  aria-hidden
                  className={`mt-[15px] h-0.5 flex-1 rounded-full transition-colors ${concluida ? 'bg-blue-600' : 'bg-gray-200'}`}
                />
              )}
            </Fragment>
          )
        })}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function VeiculosPage() {
  const [veiculos,   setVeiculos]   = useState<Veiculo[]>([])
  const [motoristas, setMotoristas] = useState<Motorista[]>([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState<string | null>(null)

  const [search,      setSearch]      = useState('')
  const [fuelFilter,  setFuelFilter]  = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  // Seleção só prepara a interface: não há ação em massa implementada, então
  // nada é feito com ela além de marcar as linhas.
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set())
  const [pagina, setPagina] = useState(1)
  // Detalhe do veículo: guarda o objeto que a listagem já tem em memória, então
  // abrir não custa consulta nenhuma.
  const [detalhe, setDetalhe] = useState<Veiculo | null>(null)
  const [porPagina, setPorPagina] = useState(10)

  // Cadastro / edição
  const [modalOpen,  setModalOpen]  = useState(false)
  const [editingId,  setEditingId]  = useState<string | null>(null)
  const [step,       setStep]       = useState(0)
  const [form,       setForm]       = useState(FORM_VAZIO)
  const [saving,     setSaving]     = useState(false)
  const [saveError,  setSaveError]  = useState<string | null>(null)
  // Quais campos o usuário já visitou. Serve só para não apontar erro num
  // formulário que ele ainda nem tocou — a REGRA de validação é a mesma de
  // sempre, a do `canAdvance()`.
  const [tocados,    setTocados]    = useState<Record<string, boolean>>({})

  // Remoção
  const [deleteTarget, setDeleteTarget] = useState<Veiculo | null>(null)
  const [deleting,     setDeleting]     = useState(false)

  // Bloqueio
  const [bloqueioTarget, setBloqueioTarget] = useState<Veiculo | null>(null)
  const [bloqueioTipo,   setBloqueioTipo]   = useState<'manutencao' | 'operacional'>('operacional')
  const [bloqueioMotivo, setBloqueioMotivo] = useState('')
  const [bloqueioSaving, setBloqueioSaving] = useState(false)
  const [bloqueioError,  setBloqueioError]  = useState<string | null>(null)

  // Desbloqueio
  const [desbloqueioTarget, setDesbloqueioTarget] = useState<Veiculo | null>(null)
  const [desbloqueioMotivo, setDesbloqueioMotivo] = useState('')
  const [desbloqueioSaving, setDesbloqueioSaving] = useState(false)
  const [desbloqueioError,  setDesbloqueioError]  = useState<string | null>(null)

  // Histórico
  const [historicoTarget,  setHistoricoTarget]  = useState<Veiculo | null>(null)
  const [historico,        setHistorico]        = useState<BloqueioLog[]>([])
  const [loadingHistorico, setLoadingHistorico] = useState(false)

  // ── Fetch ──────────────────────────────────────────────────────────────────

  async function fetchVeiculos() {
    try {
      setLoading(true)
      setError(null)
      const [resV, resM] = await Promise.all([
        fetch('/api/empresa/frota/veiculos'),
        fetch('/api/empresa/frota/motoristas'),
      ])
      if (!resV.ok) throw new Error('Erro ao carregar veículos.')
      const { veiculos: v } = await resV.json()
      const { motoristas: m } = resM.ok ? await resM.json() : { motoristas: [] }
      setVeiculos(v ?? [])
      setMotoristas(m ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchVeiculos() }, [])

  // ── Cadastro / Edição ──────────────────────────────────────────────────────

  function openAdd() {
    setForm(FORM_VAZIO)
    setEditingId(null)
    setSaveError(null)
    setTocados({})
    setStep(0)
    setModalOpen(true)
  }

  function openEdit(v: Veiculo) {
    setForm({
      placa:               v.placa,
      modelo:              v.modelo,
      combustivel:         v.combustivel,
      limiteMensal:        v.limiteMensal != null ? String(v.limiteMensal) : '',
      motoristaPadraoId:   v.motoristaPadraoId ?? '',
      exigirQuilometragem: v.exigirQuilometragem,
    })
    setEditingId(v.id)
    setSaveError(null)
    setTocados({})
    setStep(0)
    setModalOpen(true)
  }

  function update(field: string, value: string | boolean) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function canAdvance() {
    if (step === 0) return form.placa.length >= 7 && form.modelo.trim().length > 0
    if (step === 1) return !!form.combustivel
    return true
  }

  /**
   * As mensagens abaixo apenas EXPLICAM o `canAdvance()` — nenhuma delas
   * bloqueia nada por conta própria. Sem isso o botão "Próximo" fica
   * desabilitado e o usuário não descobre o porquê.
   */
  const erroPlaca  = tocados.placa  && form.placa.length < 7
    ? 'Placa incompleta — use AAA-0000 ou AAA0A00.' : undefined
  const erroModelo = tocados.modelo && !form.modelo.trim()
    ? 'Informe o modelo do veículo.' : undefined

  function dicaEtapa() {
    if (canAdvance()) return null
    if (step === 0) return 'Preencha a placa e o modelo para continuar.'
    if (step === 1) return 'Escolha o combustível para continuar.'
    return null
  }

  async function handleSave() {
    setSaving(true)
    setSaveError(null)
    try {
      const body = {
        placa:                form.placa,
        modelo:               form.modelo,
        combustivel:          form.combustivel,
        limite_mensal:        form.limiteMensal ? parseFloat(form.limiteMensal.replace(',', '.')) : null,
        motorista_padrao_id:  form.motoristaPadraoId || null,
        exigir_quilometragem: form.exigirQuilometragem,
      }
      const url    = editingId ? `/api/empresa/frota/veiculos/${editingId}` : '/api/empresa/frota/veiculos'
      const method = editingId ? 'PATCH' : 'POST'
      const res    = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data   = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro ao salvar.')
      setModalOpen(false)
      await fetchVeiculos()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Erro ao salvar.')
    } finally {
      setSaving(false)
    }
  }

  // ── Remoção ────────────────────────────────────────────────────────────────

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/empresa/frota/veiculos/${deleteTarget.id}`, { method: 'DELETE' })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? 'Erro ao remover.') }
      setDeleteTarget(null)
      setVeiculos(prev => prev.filter(v => v.id !== deleteTarget.id))
    } catch (err) { console.error(err) } finally { setDeleting(false) }
  }

  // ── Bloqueio ───────────────────────────────────────────────────────────────

  function openBloqueio(v: Veiculo) {
    setBloqueioTarget(v)
    setBloqueioTipo('operacional')
    setBloqueioMotivo('')
    setBloqueioError(null)
  }

  async function handleBloquear() {
    if (!bloqueioTarget) return
    setBloqueioSaving(true)
    setBloqueioError(null)
    try {
      const res = await fetch(`/api/empresa/frota/veiculos/${bloqueioTarget.id}/bloquear`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo: bloqueioTipo, motivo: bloqueioMotivo }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro ao bloquear.')
      setBloqueioTarget(null)
      setVeiculos(prev => prev.map(v =>
        v.id === bloqueioTarget.id ? { ...v, bloqueado: true, bloqueioTipo } : v
      ))
    } catch (err) {
      setBloqueioError(err instanceof Error ? err.message : 'Erro ao bloquear.')
    } finally {
      setBloqueioSaving(false)
    }
  }

  // ── Desbloqueio ────────────────────────────────────────────────────────────

  function openDesbloqueio(v: Veiculo) {
    setDesbloqueioTarget(v)
    setDesbloqueioMotivo('')
    setDesbloqueioError(null)
  }

  async function handleDesbloquear() {
    if (!desbloqueioTarget) return
    setDesbloqueioSaving(true)
    setDesbloqueioError(null)
    try {
      const res = await fetch(`/api/empresa/frota/veiculos/${desbloqueioTarget.id}/desbloquear`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motivo: desbloqueioMotivo }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro ao desbloquear.')
      setDesbloqueioTarget(null)
      setVeiculos(prev => prev.map(v =>
        v.id === desbloqueioTarget.id ? { ...v, bloqueado: false, bloqueioTipo: null } : v
      ))
    } catch (err) {
      setDesbloqueioError(err instanceof Error ? err.message : 'Erro ao desbloquear.')
    } finally {
      setDesbloqueioSaving(false)
    }
  }

  // ── Histórico ──────────────────────────────────────────────────────────────

  async function openHistorico(v: Veiculo) {
    setHistoricoTarget(v)
    setHistorico([])
    setLoadingHistorico(true)
    try {
      const res = await fetch(`/api/empresa/frota/veiculos/${v.id}/bloqueios`)
      const data = await res.json()
      setHistorico(data.logs ?? [])
    } catch { /* silencioso */ } finally {
      setLoadingHistorico(false)
    }
  }

  // ── Filtro ─────────────────────────────────────────────────────────────────

  // Filtros combinam: busca E combustível E situação. A busca passou a cobrir
  // o motorista também. Marca ficou de fora porque não existe no cadastro.
  const filtered = veiculos.filter(v => {
    const q = search.trim().toLowerCase()
    const casaBusca = !q
      || v.placa.toLowerCase().includes(q)
      || v.modelo.toLowerCase().includes(q)
      || (v.motoristaNome ?? '').toLowerCase().includes(q)
    return casaBusca
      && (!fuelFilter || v.combustivel === fuelFilter)
      && (!statusFilter || situacaoDe(v) === statusFilter)
  })

  const temFiltro = !!(search.trim() || fuelFilter || statusFilter)
  const limparFiltros = () => { setSearch(''); setFuelFilter(''); setStatusFilter(''); setPagina(1) }

  /**
   * KPIs a partir da lista JÁ CARREGADA — nenhuma consulta a mais.
   * Os combustíveis saem dos veículos que existem, não de uma lista fixa:
   * se a frota não tem GNV, GNV não vira um cartão zerado.
   */
  const porCombustivel = veiculos.reduce<Record<string, number>>((acc, v) => {
    if (v.combustivel) acc[v.combustivel] = (acc[v.combustivel] ?? 0) + 1
    return acc
  }, {})
  const emManutencao = veiculos.filter(v => situacaoDe(v) === 'manutencao').length

  // Paginação sobre o conjunto filtrado.
  const totalPaginas = Math.max(1, Math.ceil(filtered.length / porPagina))
  const paginaAtual  = Math.min(pagina, totalPaginas)
  const visiveis     = filtered.slice((paginaAtual - 1) * porPagina, paginaAtual * porPagina)

  /**
   * Cada indicador também filtra. Clicar de novo no mesmo desliga — sem isso o
   * usuário fica preso num filtro que ele não lembra de ter ligado.
   *
   * O primeiro cartão é o "todos": limpa TUDO, inclusive a busca — ele mostra
   * o total da frota, então a lista precisa ficar igual ao número dele.
   */
  const cartaoCls = (ativo: boolean) =>
    `flex items-center gap-3 rounded-xl border px-4 py-3 shrink-0 text-left transition-colors ${
      ativo
        ? 'border-blue-300 bg-blue-50 ring-1 ring-blue-200'
        : 'border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50'
    }`

  const idsVisiveis = visiveis.map(v => v.id)
  const todosMarcados = idsVisiveis.length > 0 && idsVisiveis.every(id => selecionados.has(id))
  const alternarTodos = () => setSelecionados(prev => {
    const proximo = new Set(prev)
    if (todosMarcados) idsVisiveis.forEach(id => proximo.delete(id))
    else idsVisiveis.forEach(id => proximo.add(id))
    return proximo
  })
  const alternarUm = (id: string) => setSelecionados(prev => {
    const proximo = new Set(prev)
    if (proximo.has(id)) proximo.delete(id); else proximo.add(id)
    return proximo
  })

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
            <Truck size={19} className="text-blue-600" />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Veículos</h1>
            <p className="text-gray-500 text-sm">Gerencie todos os veículos da sua frota</p>
          </div>
        </div>
        <Button size="sm" onClick={openAdd}>
          <Plus size={14} /> Adicionar veículo
        </Button>
      </div>

      {/* KPIs — saem da lista já carregada; nenhuma consulta a mais. */}
      {!loading && !error && veiculos.length > 0 && (
        <div className="flex gap-3 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={limparFiltros}
            aria-pressed={!temFiltro}
            title="Mostrar todos os veículos"
            className={cartaoCls(!temFiltro)}
          >
            <span className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
              <Truck size={16} className="text-blue-600" />
            </span>
            <div>
              <p className="text-xl font-bold text-gray-900 leading-none">{veiculos.length}</p>
              <p className="text-xs text-gray-500 mt-1">Veículos cadastrados</p>
            </div>
          </button>

          {Object.entries(porCombustivel)
            .sort((a, b) => b[1] - a[1])
            .map(([nome, qtd]) => (
              <button
                key={nome}
                type="button"
                onClick={() => { setFuelFilter(f => f === nome ? '' : nome); setPagina(1) }}
                aria-pressed={fuelFilter === nome}
                title={fuelFilter === nome ? `Remover o filtro ${nome}` : `Filtrar por ${nome}`}
                className={cartaoCls(fuelFilter === nome)}
              >
                <span className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                  <Fuel size={16} className="text-emerald-600" />
                </span>
                <div>
                  <p className="text-xl font-bold text-gray-900 leading-none">{qtd}</p>
                  <p className="text-xs text-gray-500 mt-1 whitespace-nowrap">{nome}</p>
                </div>
              </button>
            ))}

          <button
            type="button"
            onClick={() => { setStatusFilter(s => s === 'manutencao' ? '' : 'manutencao'); setPagina(1) }}
            aria-pressed={statusFilter === 'manutencao'}
            title={statusFilter === 'manutencao' ? 'Remover o filtro Em manutenção' : 'Filtrar por Em manutenção'}
            className={cartaoCls(statusFilter === 'manutencao')}
          >
            <span className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
              <Wrench size={16} className="text-amber-600" />
            </span>
            <div>
              <p className="text-xl font-bold text-gray-900 leading-none">{emManutencao}</p>
              <p className="text-xs text-gray-500 mt-1 whitespace-nowrap">Em manutenção</p>
            </div>
          </button>
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-blue-500"
            placeholder="Buscar por placa, modelo ou motorista..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPagina(1) }}
          />
        </div>
        <select
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-blue-500"
          value={fuelFilter}
          onChange={e => { setFuelFilter(e.target.value); setPagina(1) }}
        >
          <option value="">Todos os combustíveis</option>
          {COMBUSTIVEIS.map(c => <option key={c}>{c}</option>)}
        </select>
        {/* Só as três situações que de fato chegam à tela — 'inativo' é baixa
            lógica e a rota nem devolve. */}
        <select
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-blue-500"
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPagina(1) }}
        >
          <option value="">Todos os status</option>
          <option value="ativo">Ativo</option>
          <option value="manutencao">Em manutenção</option>
          <option value="bloqueado">Bloqueado</option>
        </select>
        {temFiltro && (
          <button
            onClick={limparFiltros}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 hover:text-gray-700 transition-colors"
          >
            <X size={14} /> Limpar filtros
          </button>
        )}
      </div>

      {loading && (
        <div className="flex flex-col items-center gap-3 py-16 text-gray-400">
          <Loader2 size={28} className="animate-spin" />
          <span className="text-sm">Carregando veículos...</span>
        </div>
      )}

      {!loading && error && (
        <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <AlertCircle size={16} className="shrink-0" />
          {error}
          <button onClick={fetchVeiculos} className="ml-auto text-red-600 underline text-xs">Tentar novamente</button>
        </div>
      )}

      {!loading && !error && (
        <Card padding="none">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-gray-400">
              {veiculos.length === 0 ? <Truck size={26} className="text-gray-200" /> : <Search size={24} className="text-gray-200" />}
              <p className="text-sm font-medium text-gray-500">
                {veiculos.length === 0
                  ? 'Você ainda não possui veículos cadastrados.'
                  : 'Nenhum veículo encontrado.'}
              </p>
              {/* O estado vazio oferece a saída certa para cada caso: cadastrar,
                  quando não há frota; limpar, quando o filtro é que não casa. */}
              {veiculos.length === 0 ? (
                <Button size="sm" onClick={openAdd} className="mt-2">
                  <Plus size={14} /> Adicionar veículo
                </Button>
              ) : (
                <button
                  onClick={limparFiltros}
                  className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <X size={13} /> Limpar filtros
                </button>
              )}
            </div>
          ) : (
            <>
            {/* Rolagem horizontal em telas estreitas, em vez de espremer colunas. */}
            <div className="overflow-x-auto">
            <table className="w-full min-w-[840px]">
              <thead>
                <tr className="text-xs text-gray-500 uppercase tracking-wide bg-gray-50">
                  <th className="pl-6 pr-2 py-3 w-10">
                    <input
                      type="checkbox"
                      aria-label="Selecionar todos da página"
                      checked={todosMarcados}
                      onChange={alternarTodos}
                      className="rounded border-gray-300 accent-blue-600"
                    />
                  </th>
                  <th className="px-4 py-3 text-left">Placa</th>
                  <th className="px-4 py-3 text-left">Modelo</th>
                  <th className="px-4 py-3 text-left">Combustível</th>
                  <th className="px-4 py-3 text-left">Limite/mês</th>
                  <th className="px-4 py-3 text-left">Motorista</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-6 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {visiveis.map(v => (
                  <tr key={v.id} className={`hover:bg-gray-50 transition-colors ${v.bloqueado ? 'bg-gray-50/60' : ''}`}>
                    <td className="pl-6 pr-2 py-3">
                      <input
                        type="checkbox"
                        aria-label={`Selecionar ${v.placa}`}
                        checked={selecionados.has(v.id)}
                        onChange={() => alternarUm(v.id)}
                        className="rounded border-gray-300 accent-blue-600"
                      />
                    </td>
                    <td className="px-4 py-3 text-sm font-mono font-medium text-gray-900">
                      <span className="flex items-center gap-2 flex-wrap">
                        <span className={v.bloqueado ? 'text-gray-400' : ''}>{v.placa}</span>
                        {v.bloqueioTipo === 'manutencao' && (
                          <span className="inline-flex items-center gap-1 text-xs font-sans font-medium bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">
                            <Wrench size={10} /> Manutenção
                          </span>
                        )}
                        {v.bloqueado && v.bloqueioTipo === 'operacional' && (
                          <span className="inline-flex items-center gap-1 text-xs font-sans font-medium bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">
                            <Lock size={10} /> Bloqueado
                          </span>
                        )}
                        {!v.bloqueado && v.exigirQuilometragem && (
                          <span title="Exige quilometragem"><Gauge size={13} className="text-blue-500" /></span>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{v.modelo}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{v.combustivel}</span>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-700 whitespace-nowrap">
                      {v.limiteMensal != null ? formatLimite(v.limiteMensal) : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {v.motoristaNome ? (
                        <span className="inline-flex items-center gap-2">
                          <span className="w-7 h-7 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold flex items-center justify-center shrink-0">
                            {iniciaisDe(v.motoristaNome)}
                          </span>
                          <span className="whitespace-nowrap">{v.motoristaNome}</span>
                        </span>
                      ) : (
                        <span className="text-gray-400">Não definido</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {(() => {
                        const sit = SITUACAO[situacaoDe(v)]
                        return (
                          <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full border whitespace-nowrap ${sit.classe}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${sit.ponto}`} />
                            {sit.rotulo}
                          </span>
                        )
                      })()}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Bloquear / Desbloquear */}
                        {v.bloqueado ? (
                          <button
                            onClick={() => openDesbloqueio(v)}
                            className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Desbloquear veículo"
                            aria-label={`Desbloquear ${v.placa}`}
                          >
                            <LockOpen size={14} />
                          </button>
                        ) : (
                          <button
                            onClick={() => openBloqueio(v)}
                            className="p-1.5 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors"
                            title="Bloquear veículo"
                            aria-label={`Bloquear ${v.placa}`}
                          >
                            <Lock size={14} />
                          </button>
                        )}
                        {/* Visualizar */}
                        <button
                          onClick={() => setDetalhe(v)}
                          className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Visualizar veículo"
                          aria-label={`Visualizar ${v.placa}`}
                        >
                          <Eye size={14} />
                        </button>
                        {/* Histórico */}
                        <button
                          onClick={() => openHistorico(v)}
                          className="p-1.5 text-gray-400 hover:text-purple-500 hover:bg-purple-50 rounded-lg transition-colors"
                          title="Ver histórico do veículo"
                          aria-label={`Ver histórico de ${v.placa}`}
                        >
                          <History size={14} />
                        </button>
                        {/* Editar */}
                        <button
                          onClick={() => openEdit(v)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Editar veículo"
                          aria-label={`Editar ${v.placa}`}
                        >
                          <Pencil size={14} />
                        </button>
                        {/* Remover */}
                        <button
                          onClick={() => setDeleteTarget(v)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Excluir veículo"
                          aria-label={`Excluir ${v.placa}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>

            {/* Paginação sobre o conjunto FILTRADO. A consulta continua trazendo
                a frota inteira da empresa numa ida só — para frotas de milhares
                valeria mover o corte para o banco, como no histórico. */}
            <div className="flex items-center justify-between gap-3 flex-wrap px-6 py-3 border-t border-gray-100">
              <p className="text-xs text-gray-400">
                Mostrando {(paginaAtual - 1) * porPagina + 1} a{' '}
                {Math.min(paginaAtual * porPagina, filtered.length)} de {filtered.length} veículo
                {filtered.length !== 1 ? 's' : ''}
                {selecionados.size > 0 && ` · ${selecionados.size} selecionado${selecionados.size !== 1 ? 's' : ''}`}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPagina(p => Math.max(1, p - 1))}
                  disabled={paginaAtual === 1}
                  aria-label="Página anterior"
                  className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={15} className="text-gray-600" />
                </button>
                <span className="text-xs text-gray-500 tabular-nums">
                  {paginaAtual} / {totalPaginas}
                </span>
                <button
                  onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
                  disabled={paginaAtual === totalPaginas}
                  aria-label="Próxima página"
                  className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight size={15} className="text-gray-600" />
                </button>
                <select
                  value={porPagina}
                  onChange={e => { setPorPagina(Number(e.target.value)); setPagina(1) }}
                  aria-label="Veículos por página"
                  className="ml-1 px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-blue-500"
                >
                  {[10, 25, 50].map(n => <option key={n} value={n}>{n} por página</option>)}
                </select>
              </div>
            </div>
            </>
          )}
        </Card>
      )}

      {/* ── Detalhe do veículo ────────────────────────────────────────────── */}
      {/* Cada ação fecha o detalhe e devolve para o fluxo que já existe: nada
          de bloqueio ou edição é reimplementado aqui dentro. */}
      <ModalVeiculo
        veiculo={detalhe}
        onFechar={() => setDetalhe(null)}
        onEditar={(v) => { setDetalhe(null); openEdit(v as Veiculo) }}
        onBloquear={(v) => { setDetalhe(null); openBloqueio(v as Veiculo) }}
        onDesbloquear={(v) => { setDetalhe(null); openDesbloqueio(v as Veiculo) }}
        onHistorico={(v) => { setDetalhe(null); openHistorico(v as Veiculo) }}
      />

      {/* ── Modal: Adicionar / Editar ──────────────────────────────────────── */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Editar veículo' : 'Adicionar veículo'}
        subtitulo={editingId
          ? 'Revise os dados do veículo nas etapas abaixo.'
          : `Cadastre os dados do veículo em ${STEPS.length} etapas.`}
        icone={<Truck size={19} />}
        footer={
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {/* A dica explica por que "Próximo" está desabilitado; ela some
                assim que a etapa fica válida. */}
            {dicaEtapa() && (
              <p className="text-xs text-gray-500 sm:pr-4">{dicaEtapa()}</p>
            )}
            {/* ml-auto encosta os botões à direita mesmo sem a dica. */}
            <div className="flex gap-2 sm:ml-auto sm:gap-3">
              <Button variant="secondary" className="flex-1 sm:flex-none sm:min-w-28"
                onClick={() => step === 0 ? setModalOpen(false) : setStep(s => s - 1)}>
                {step === 0 ? 'Cancelar' : <><ChevronLeft size={14} /> Voltar</>}
              </Button>
              {/* "Próximo" desabilitado vira cinza de verdade: o
                  disabled:opacity-50 padrão deixava o botão com cara de
                  clicável. O "Salvando..." mantém a opacidade, porque ali o
                  botão está ocupado, não bloqueado. */}
              {step < STEPS.length - 1 ? (
                <Button
                  className="flex-1 sm:flex-none sm:min-w-32 disabled:opacity-100 disabled:bg-gray-100 disabled:text-gray-500"
                  onClick={() => setStep(s => s + 1)} disabled={!canAdvance()}>
                  Próximo <ChevronRight size={14} />
                </Button>
              ) : (
                <Button className="flex-1 sm:flex-none sm:min-w-32" onClick={handleSave} disabled={saving}>
                  {saving ? <><Loader2 size={14} className="animate-spin" /> Salvando...</> : editingId ? 'Salvar alterações' : 'Adicionar'}
                </Button>
              )}
            </div>
          </div>
        }
      >
        <IndicadorEtapas etapas={STEPS} atual={step} />

        {step === 0 && (
          <div className="space-y-4">
            <Input label="Placa" placeholder="ABC-1234 ou ABC1D23"
              value={form.placa} onChange={e => update('placa', formatPlaca(e.target.value))}
              onBlur={() => setTocados(t => ({ ...t, placa: true }))}
              disabled={!!editingId} error={erroPlaca}
              helperText="Formato antigo (AAA-0000) ou Mercosul (AAA0A00)" />
            <Input label="Modelo" placeholder="Ex: Honda Fit 1.5 EX"
              value={form.modelo} onChange={e => update('modelo', e.target.value)}
              onBlur={() => setTocados(t => ({ ...t, modelo: true }))}
              error={erroModelo} />
          </div>
        )}

        {step === 1 && (
          <div role="radiogroup" aria-labelledby="rotulo-combustivel">
            <label id="rotulo-combustivel" className="block text-sm font-medium text-gray-700 mb-1">
              Selecione o combustível
            </label>
            <p className="mb-3 text-xs text-gray-500">
              É o combustível que o veículo usa no abastecimento.
            </p>
            {/* Uma coluna no celular: "Gasolina Aditivada" não cabe em duas. */}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {COMBUSTIVEIS.map(c => (
                <label key={c} className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 cursor-pointer transition-colors focus-within:ring-2 focus-within:ring-blue-100 ${
                  form.combustivel === c ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}>
                  <input type="radio" name="combustivel" value={c}
                    checked={form.combustivel === c} onChange={() => update('combustivel', c)} className="sr-only" />
                  <div className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${
                    form.combustivel === c ? 'border-blue-500' : 'border-gray-300'
                  }`}>
                    {form.combustivel === c && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                  </div>
                  <span className={`text-sm font-medium ${form.combustivel === c ? 'text-blue-700' : 'text-gray-700'}`}>{c}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <Input label="Limite mensal (R$)" type="number" placeholder="Ex: 1200 (opcional)"
              value={form.limiteMensal} onChange={e => update('limiteMensal', e.target.value)}
              helperText="Deixe em branco para sem limite" />
            <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
              onClick={() => update('exigirQuilometragem', !form.exigirQuilometragem)}>
              <div className="relative shrink-0">
                <div className={`w-9 h-5 rounded-full transition-colors ${form.exigirQuilometragem ? 'bg-blue-600' : 'bg-gray-200'}`} />
                <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.exigirQuilometragem ? 'translate-x-4' : ''}`} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Exigir quilometragem</p>
                <p className="text-xs text-gray-500">Motorista deverá informar o odômetro ao abastecer</p>
              </div>
            </label>
            <div>
              <label htmlFor="motorista-padrao" className="block text-sm font-medium text-gray-700 mb-1.5">
                Motorista padrão
              </label>
              <select id="motorista-padrao"
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-50"
                value={form.motoristaPadraoId} onChange={e => update('motoristaPadraoId', e.target.value)}>
                <option value="">Nenhum</option>
                {motoristas.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
              </select>
              <p className="mt-1.5 text-xs text-gray-500">Opcional — pode ser trocado a cada requisição.</p>
            </div>
            {saveError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                <AlertCircle size={14} className="shrink-0" />{saveError}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ── Modal: Remover ─────────────────────────────────────────────────── */}
      <Modal isOpen={deleteTarget !== null} onClose={() => setDeleteTarget(null)} title="Remover veículo" size="sm">
        {deleteTarget && (
          <div className="space-y-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm font-semibold text-gray-900 font-mono">{deleteTarget.placa}</p>
              <p className="text-xs text-gray-500 mt-0.5">{deleteTarget.modelo} · {deleteTarget.combustivel}</p>
            </div>
            <p className="text-sm text-gray-600">O veículo será removido da frota. Requisições e histórico serão preservados.</p>
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
              <Button variant="danger" className="flex-1" onClick={handleDelete} disabled={deleting}>
                {deleting ? <><Loader2 size={14} className="animate-spin" /> Removendo...</> : 'Remover'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Modal: Bloquear ────────────────────────────────────────────────── */}
      <Modal isOpen={bloqueioTarget !== null} onClose={() => setBloqueioTarget(null)} title="Bloquear veículo" size="sm">
        {bloqueioTarget && (
          <div className="space-y-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm font-semibold font-mono text-gray-900">{bloqueioTarget.placa}</p>
              <p className="text-xs text-gray-500 mt-0.5">{bloqueioTarget.modelo}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de bloqueio</label>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { value: 'operacional', label: 'Operacional', icon: Lock, desc: 'Suspenso por decisão da empresa' },
                  { value: 'manutencao',  label: 'Manutenção',  icon: Wrench, desc: 'Veículo em serviço ou reparo' },
                ] as const).map(({ value, label, icon: Icon, desc }) => (
                  <label key={value} className={`flex flex-col gap-1 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                    bloqueioTipo === value ? 'border-orange-400 bg-orange-50' : 'border-gray-200 hover:border-gray-300'
                  }`}>
                    <input type="radio" name="bloqueioTipo" value={value}
                      checked={bloqueioTipo === value} onChange={() => setBloqueioTipo(value)} className="sr-only" />
                    <div className="flex items-center gap-2">
                      <Icon size={14} className={bloqueioTipo === value ? 'text-orange-500' : 'text-gray-400'} />
                      <span className={`text-sm font-medium ${bloqueioTipo === value ? 'text-orange-700' : 'text-gray-700'}`}>{label}</span>
                    </div>
                    <span className="text-xs text-gray-400">{desc}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Motivo <span className="text-red-400">*</span></label>
              <textarea
                rows={3}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-orange-400 resize-none"
                placeholder="Descreva o motivo do bloqueio..."
                value={bloqueioMotivo}
                onChange={e => setBloqueioMotivo(e.target.value)}
              />
            </div>

            {bloqueioError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                <AlertCircle size={14} className="shrink-0" />{bloqueioError}
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setBloqueioTarget(null)}>Cancelar</Button>
              <Button className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
                onClick={handleBloquear} disabled={bloqueioSaving || !bloqueioMotivo.trim()}>
                {bloqueioSaving ? <><Loader2 size={14} className="animate-spin" /> Bloqueando...</> : 'Confirmar bloqueio'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Modal: Desbloquear ─────────────────────────────────────────────── */}
      <Modal isOpen={desbloqueioTarget !== null} onClose={() => setDesbloqueioTarget(null)} title="Desbloquear veículo" size="sm">
        {desbloqueioTarget && (
          <div className="space-y-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm font-semibold font-mono text-gray-900">{desbloqueioTarget.placa}</p>
              <p className="text-xs text-gray-500 mt-0.5">{desbloqueioTarget.modelo}</p>
              {desbloqueioTarget.bloqueioTipo === 'manutencao' && (
                <span className="inline-flex items-center gap-1 mt-1.5 text-xs font-medium bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">
                  <Wrench size={10} /> Em manutenção
                </span>
              )}
              {desbloqueioTarget.bloqueioTipo === 'operacional' && (
                <span className="inline-flex items-center gap-1 mt-1.5 text-xs font-medium bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">
                  <Lock size={10} /> Bloqueio operacional
                </span>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Motivo do desbloqueio <span className="text-red-400">*</span></label>
              <textarea
                rows={3}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 resize-none"
                placeholder="Ex: Manutenção concluída, veículo liberado para uso..."
                value={desbloqueioMotivo}
                onChange={e => setDesbloqueioMotivo(e.target.value)}
              />
            </div>

            {desbloqueioError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                <AlertCircle size={14} className="shrink-0" />{desbloqueioError}
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setDesbloqueioTarget(null)}>Cancelar</Button>
              <Button className="flex-1" onClick={handleDesbloquear} disabled={desbloqueioSaving || !desbloqueioMotivo.trim()}>
                {desbloqueioSaving ? <><Loader2 size={14} className="animate-spin" /> Desbloqueando...</> : 'Confirmar desbloqueio'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Modal: Histórico de bloqueios ──────────────────────────────────── */}
      <Modal isOpen={historicoTarget !== null} onClose={() => setHistoricoTarget(null)}
        title={historicoTarget ? `Histórico — ${historicoTarget.placa}` : 'Histórico'}>
        <div className="min-h-[200px]">
          {loadingHistorico && (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin text-gray-400" />
            </div>
          )}

          {!loadingHistorico && historico.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <History size={28} className="mb-2 text-gray-200" />
              <p className="text-sm">Nenhum registro de bloqueio encontrado.</p>
            </div>
          )}

          {!loadingHistorico && historico.length > 0 && (
            <ol className="relative border-l-2 border-gray-100 ml-3 space-y-5">
              {historico.map((log, i) => (
                <li key={log.id} className="ml-5">
                  {/* Dot */}
                  <span className={`absolute -left-[9px] flex items-center justify-center w-4 h-4 rounded-full ring-2 ring-white ${
                    log.acao === 'bloqueio'
                      ? (log.tipo === 'manutencao' ? 'bg-amber-400' : 'bg-red-400')
                      : 'bg-green-400'
                  }`} style={{ top: `${i * 88 + 4}px` }} />

                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      {log.acao === 'bloqueio' ? (
                        <>
                          {log.tipo === 'manutencao'
                            ? <span className="inline-flex items-center gap-1 text-xs font-medium bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full"><Wrench size={10} /> Em manutenção</span>
                            : <span className="inline-flex items-center gap-1 text-xs font-medium bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full"><Lock size={10} /> Bloqueado</span>
                          }
                        </>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">
                          <LockOpen size={10} /> Desbloqueado
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-700">{log.motivo}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Por <span className="font-medium text-gray-500">{log.perfil_nome}</span> · {formatDate(log.created_at)}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="pt-4 mt-auto">
          <Button variant="secondary" className="w-full" onClick={() => setHistoricoTarget(null)}>Fechar</Button>
        </div>
      </Modal>
    </div>
  )
}
