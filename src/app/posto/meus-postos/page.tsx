'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import {
  Store, Plus, MapPin, Fuel, CheckCircle, ChevronRight, ChevronDown,
  X, Pencil, Power, ArrowLeft, Star, TrendingUp, Users, Building2,
  Zap, MessageSquare, ThumbsUp, Loader2, AlertCircle, AlertTriangle,
  Search, Sparkles, Map as MapIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { cn, maskTelefone, normalizarWhatsapp, exibirWhatsapp } from '@/lib/utils'
import { limparDoc, maskCpfCnpj, isCnpjValid } from '@/lib/documento'

const MapPicker = dynamic(
  () => import('@/components/ui/map-picker').then((m) => m.MapPicker),
  { ssr: false, loading: () => <div className="h-full flex items-center justify-center text-xs text-gray-400">Carregando mapa…</div> }
)

const COMBUSTIVEIS = [
  'Gasolina Comum', 'Gasolina Aditivada', 'Etanol', 'Diesel S-10', 'Diesel Comum', 'GNV',
]
const BANDEIRAS = ['Shell', 'Ipiranga', 'Petrobras', 'Vibra', 'Raízen', 'Independente']
const STATES = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
  'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO',
]

type StatusPosto = 'ativo' | 'inativo'

interface Posto {
  id: string
  nome: string
  cnpj: string
  endereco: string
  numero: string
  bairro: string
  cidade: string
  estado: string
  cep: string
  bandeira: string
  combustiveis: string[]
  capacidade: string | null
  whatsapp: string | null
  status: StatusPosto
  lat?: number | null
  lng?: number | null
}

/** Retorno de GET /api/posto/cnpj — dados públicos da Receita Federal. */
interface DadosReceita {
  cnpj: string
  razaoSocial: string
  nomeFantasia: string
  nomeSugerido: string
  endereco: string
  numero: string
  complemento: string
  bairro: string
  cidade: string
  estado: string
  cep: string
  telefone: string
  atividade: string
  situacao: string
  alertas: string[]
  /** De onde veio o logradouro: da Receita, completado pelo CEP, ou nenhum. */
  origemEndereco: 'receita' | 'cep' | 'incompleto'
}

function StarFill({ filled }: { filled: boolean }) {
  return <Star size={13} className={filled ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'} />
}

function PainelPosto({ posto, onBack }: { posto: Posto; onBack: () => void }) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors">
          <ArrowLeft size={15} /> Meus postos
        </button>
        <span className="text-gray-300">/</span>
        <span className="text-sm font-semibold text-gray-800">{posto.nome}</span>
      </div>
      <div className="flex items-center gap-3 p-4 bg-white border border-gray-100 rounded-xl">
        <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center shrink-0">
          <Store size={18} className="text-amber-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-bold text-gray-900">{posto.nome}</p>
            <span className={cn('text-[11px] font-medium px-2 py-0.5 rounded-full border', posto.status === 'ativo' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-100 text-gray-500 border-gray-200')}>
              {posto.status === 'ativo' ? 'Ativo' : 'Inativo'}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
            <MapPin size={11} /> {posto.endereco}{posto.numero ? `, ${posto.numero}` : ''} · {posto.cidade}/{posto.estado}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <Card padding="md"><div className="flex items-center gap-2 mb-2"><TrendingUp size={14} className="text-emerald-500" /><p className="text-xs text-gray-500">Receita B2B — Mês atual</p></div><p className="text-2xl font-bold text-gray-900">—</p></Card>
        <Card padding="md"><div className="flex items-center gap-2 mb-2"><Zap size={14} className="text-blue-500" /><p className="text-xs text-gray-500">Abastecimentos — Mês atual</p></div><p className="text-2xl font-bold text-gray-900">—</p></Card>
        <Card padding="md"><div className="flex items-center gap-2 mb-2"><Users size={14} className="text-purple-500" /><p className="text-xs text-gray-500">Parceiros ativos</p></div><p className="text-2xl font-bold text-gray-900">—</p></Card>
      </div>
      <Card padding="md">
        <div className="flex items-center gap-2 mb-4"><MessageSquare size={15} className="text-gray-500" /><h2 className="font-semibold text-gray-900">Avaliações recebidas</h2></div>
        <div className="flex items-center justify-center gap-2 py-10 text-gray-400"><ThumbsUp size={20} className="opacity-30" /><p className="text-sm">Ainda não há avaliações para este posto.</p></div>
      </Card>
    </div>
  )
}

function emptyForm() {
  return {
    nome: '', cnpj: '', endereco: '', numero: '', complemento: '', bairro: '',
    cidade: '', estado: '', cep: '', bandeira: '', capacidade: '', whatsapp: '',
    combustiveis: [] as string[],
    lat: null as number | null,
    lng: null as number | null,
  }
}

const BRAZIL_CENTER: [number, number] = [-15.7801, -47.9292]

/** Selo discreto nos campos que já vieram preenchidos. */
function SeloAuto({ origem }: { origem: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded">
      <Sparkles size={9} /> {origem}
    </span>
  )
}

/** Título de bloco dentro do formulário — separa "sobre o posto" de "operação". */
function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">{titulo}</h3>
      {children}
    </section>
  )
}

const campoCls = 'w-full px-3 py-2.5 text-sm text-gray-900 bg-white border rounded-lg outline-none transition-colors'
const campoNormal = 'border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-50'

/**
 * Contorno âmbar em campo obrigatório ainda em branco.
 *
 * Não é vermelho de propósito: vermelho diz "você errou", e campo vazio no
 * começo do formulário não é erro — é só o que falta preencher. O vermelho
 * fica reservado a valor inválido (WhatsApp que não é celular, por exemplo),
 * e por isso o âmbar só aparece enquanto o campo está vazio.
 */
const PENDENTE = 'border-amber-400 bg-amber-50/50 focus:border-amber-500 focus:ring-2 focus:ring-amber-100'
const pend = (vazio: boolean) => (vazio ? PENDENTE : campoNormal)

// ── Page ─────────────────────────────────────────────────────────────────────

export default function MeusPostosPage() {
  const [postos, setPostos]       = useState<Posto[]>([])
  const [loading, setLoading]     = useState(true)
  const [fetchError, setFetchError] = useState('')

  // Modal cadastro/edição — 1: CNPJ, 2: completar, 3: sucesso
  const [showModal, setShowModal]   = useState(false)
  const [modalStep, setModalStep]   = useState(1)
  const [editingId, setEditingId]   = useState<string | null>(null)
  const [form, setForm]             = useState(emptyForm())
  const [savingPosto, setSavingPosto] = useState(false)
  const [formErro, setFormErro]     = useState('')

  // Consulta de CNPJ na Receita
  const [buscandoCnpj, setBuscandoCnpj] = useState(false)
  const [cnpjErro, setCnpjErro]         = useState('')
  const [receita, setReceita]           = useState<DadosReceita | null>(null)
  const [modoManual, setModoManual]     = useState(false)
  // 409 do servidor: o CNPJ já é de outro posto. Diferente dos demais erros,
  // aqui não adianta preencher na mão — o INSERT esbarraria no índice único.
  const [cnpjDuplicado, setCnpjDuplicado] = useState(false)
  const [enderecoAberto, setEnderecoAberto] = useState(false)
  const [mapaAberto, setMapaAberto]     = useState(false)
  // Evita disparar a mesma consulta duas vezes enquanto o usuário edita o campo.
  const ultimoCnpjRef = useRef('')

  const [painelPosto, setPainelPosto] = useState<Posto | null>(null)

  const fetchPostos = useCallback(async () => {
    setLoading(true)
    setFetchError('')
    try {
      const res  = await fetch('/api/posto/meus-postos')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro ao buscar postos.')
      setPostos(data.postos)
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'Erro ao buscar postos.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchPostos() }, [fetchPostos])

  /**
   * Preenche as coordenadas que faltam, uma por vez.
   *
   * Antes isso acontecia dentro do GET da listagem, em promises que ninguém
   * aguardava — não completavam e a listagem repetia tudo na chamada seguinte.
   * Agora sai daqui: a lista já apareceu, e o preenchimento acontece atrás,
   * um posto por segundo, que é o teto da política do Nominatim.
   *
   * O endpoint é idempotente, então isto converge: depois que todos têm
   * coordenada, `semCoordenada` fica vazio e nenhuma chamada acontece.
   */
  useEffect(() => {
    const semCoordenada = postos.filter((p) => p.lat == null && p.cidade)
    if (semCoordenada.length === 0) return

    let cancelado = false
    ;(async () => {
      for (const posto of semCoordenada) {
        if (cancelado) return
        try {
          const res = await fetch('/api/posto/meus-postos/geocodificar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: posto.id }),
          })
          if (res.ok) {
            const { lat, lng } = await res.json()
            if (!cancelado && lat != null) {
              setPostos((prev) => prev.map((x) => (x.id === posto.id ? { ...x, lat, lng } : x)))
            }
          }
        } catch { /* endereço não localizado não é erro para o usuário */ }
        // 1 req/s é o limite pedido pelo Nominatim.
        await new Promise((r) => setTimeout(r, 1100))
      }
    })()

    return () => { cancelado = true }
    // Só o conjunto de ids importa: reexecutar a cada troca de objeto faria
    // a fila recomeçar a cada atualização de coordenada.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postos.map((p) => p.id).join(',')])

  const update    = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }))
  const toggleFuel = (fuel: string) => setForm(f => ({
    ...f,
    combustiveis: f.combustiveis.includes(fuel)
      ? f.combustiveis.filter(c => c !== fuel)
      : [...f.combustiveis, fuel],
  }))

  // Posto com bandeira costuma vender quase toda a lista; marcar um a um é
  // trabalho à toa. O mesmo botão desmarca, para servir de "recomeçar".
  const todosCombustiveis = form.combustiveis.length === COMBUSTIVEIS.length
  const alternarTodosCombustiveis = () => setForm(f => ({
    ...f,
    combustiveis: f.combustiveis.length === COMBUSTIVEIS.length ? [] : [...COMBUSTIVEIS],
  }))

  const toggleStatus = async (id: string) => {
    try {
      const res  = await fetch('/api/posto/meus-postos/status', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setPostos(prev => prev.map(p => p.id === id ? { ...p, status: data.posto.status } : p))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao alterar status.')
    }
  }

  /** Zera tudo que é específico da consulta de CNPJ. */
  const resetCnpj = () => {
    setBuscandoCnpj(false)
    setCnpjErro('')
    setReceita(null)
    setCnpjDuplicado(false)
    setModoManual(false)
    setEnderecoAberto(false)
    setMapaAberto(false)
    ultimoCnpjRef.current = ''
  }

  /**
   * Consulta o CNPJ e despeja o resultado no formulário.
   *
   * É este passo que justifica o redesenho: dos 12 campos do cadastro, 8 saem
   * daqui (nome, logradouro, número, complemento, bairro, cidade, UF, CEP) e o
   * telefone entra como sugestão de WhatsApp quando é celular. Sobram bandeira,
   * combustíveis e capacidade — o que só o dono do posto sabe.
   *
   * Campos já digitados pelo usuário não são sobrescritos (`f.nome || …`):
   * quem voltou ao passo 1 para corrigir o CNPJ não perde o que ajustou.
   */
  const consultarCnpj = useCallback(async (valor: string) => {
    const limpo = limparDoc(valor)
    ultimoCnpjRef.current = limpo
    setCnpjDuplicado(false)

    if (!isCnpjValid(limpo)) {
      setReceita(null)
      setCnpjErro('CNPJ inválido. Confira os números.')
      return
    }

    setBuscandoCnpj(true)
    setCnpjErro('')
    try {
      const res  = await fetch(`/api/posto/cnpj?cnpj=${limpo}`)
      const data = await res.json()
      if (!res.ok) {
        setReceita(null)
        setCnpjDuplicado(res.status === 409)
        setCnpjErro(data.error ?? 'Não foi possível consultar o CNPJ.')
        return
      }

      const dados = data as DadosReceita
      setReceita(dados)
      setModoManual(false)
      // MEI e empresas recém-abertas costumam vir sem logradouro/número. Aí o
      // bloco de endereço já abre expandido, em vez de esconder campos vazios
      // atrás de um resumo que parece completo.
      setEnderecoAberto(!dados.endereco || !dados.numero)

      const celular = normalizarWhatsapp(dados.telefone)
      setForm(f => ({
        ...f,
        cnpj:        dados.cnpj,
        nome:        f.nome        || dados.nomeSugerido,
        endereco:    f.endereco    || dados.endereco,
        numero:      f.numero      || dados.numero,
        complemento: f.complemento || dados.complemento,
        bairro:      f.bairro      || dados.bairro,
        cidade:      f.cidade      || dados.cidade,
        estado:      f.estado      || dados.estado,
        cep:         f.cep         || dados.cep,
        whatsapp:    f.whatsapp    || (celular ? exibirWhatsapp(celular) : ''),
      }))
    } catch {
      setReceita(null)
      setCnpjErro('Não foi possível consultar o CNPJ agora. Tente de novo em instantes.')
    } finally {
      setBuscandoCnpj(false)
    }
  }, [])

  /** Dispara a busca sozinha assim que os 14 dígitos estão na tela. */
  const onChangeCnpj = (valor: string) => {
    const mascarado = maskCpfCnpj(valor)
    update('cnpj', mascarado)
    const limpo = limparDoc(mascarado)
    if (limpo.length < 14) {
      setCnpjErro('')
      setReceita(null)
      setCnpjDuplicado(false)
      ultimoCnpjRef.current = ''
      return
    }
    if (limpo !== ultimoCnpjRef.current) consultarCnpj(mascarado)
  }

  const openModal = () => {
    setEditingId(null)
    setForm(emptyForm())
    resetCnpj()
    setModalStep(1)
    setFormErro('')
    setShowModal(true)
  }

  const openEditModal = (p: Posto) => {
    setEditingId(p.id)
    setForm({ ...emptyForm(), nome: p.nome, cnpj: p.cnpj, endereco: p.endereco, numero: p.numero, bairro: p.bairro, cidade: p.cidade, estado: p.estado, cep: p.cep, bandeira: p.bandeira, capacidade: p.capacidade ?? '', whatsapp: p.whatsapp ? exibirWhatsapp(p.whatsapp) : '', combustiveis: [...p.combustiveis], lat: p.lat ?? null, lng: p.lng ?? null })
    resetCnpj()
    // Na edição o CNPJ já é conhecido: pula a consulta e abre direto o
    // formulário, com o endereço expandido (é o que costuma motivar a edição).
    setEnderecoAberto(true)
    setModalStep(2)
    setFormErro('')
    setShowModal(true)
  }

  const closeModal = () => setShowModal(false)

  // Salva edição
  const salvarEditar = async () => {
    setSavingPosto(true)
    setFormErro('')
    try {
      const res  = await fetch('/api/posto/meus-postos', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editingId, nome: form.nome, cnpj: form.cnpj, bandeira: form.bandeira, endereco: form.endereco, numero: form.numero, complemento: form.complemento || null, bairro: form.bairro, cidade: form.cidade, estado: form.estado, cep: form.cep, combustiveis: form.combustiveis, capacidade: form.capacidade || null, whatsapp: form.whatsapp, lat: form.lat, lng: form.lng }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setPostos(prev => prev.map(p => p.id === editingId ? { ...p, ...data.posto } : p))
      closeModal()
    } catch (err) {
      setFormErro(err instanceof Error ? err.message : 'Erro ao salvar.')
    } finally {
      setSavingPosto(false)
    }
  }

  // Salva novo posto (sem Asaas)
  const salvarPosto = async () => {
    setSavingPosto(true)
    setFormErro('')
    try {
      const res  = await fetch('/api/posto/meus-postos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nome: form.nome, cnpj: form.cnpj, bandeira: form.bandeira, endereco: form.endereco, numero: form.numero, complemento: form.complemento || null, bairro: form.bairro, cidade: form.cidade, estado: form.estado, cep: form.cep, combustiveis: form.combustiveis, capacidade: form.capacidade || null, whatsapp: form.whatsapp, lat: form.lat, lng: form.lng }) })
      const data = await res.json()
      if (!res.ok) { setFormErro(data.error ?? 'Erro ao criar posto.'); return }
      setPostos(prev => [...prev, data.posto])
      setModalStep(3) // tela de sucesso
    } finally {
      setSavingPosto(false)
    }
  }

  const ativos = postos.filter(p => p.status === 'ativo').length

  if (painelPosto) {
    return <PainelPosto posto={painelPosto} onBack={() => setPainelPosto(null)} />
  }

  const STEPS = [
    { n: 1, label: 'CNPJ' },
    { n: 2, label: 'Dados do posto' },
  ]

  // Resumo de uma linha exibido no cabeçalho do bloco de endereço fechado.
  const resumoEndereco = [
    [form.endereco, form.numero].filter(Boolean).join(', '),
    form.bairro,
    [form.cidade, form.estado].filter(Boolean).join('/'),
  ].filter(Boolean).join(' · ')

  // Endereço da Receita em duas linhas. Sem logradouro (comum em MEI) a
  // primeira vira aviso e o bairro desce para a linha da cidade.
  const ruaDaReceita = receita
    ? [
        [receita.endereco, receita.numero].filter(Boolean).join(', '),
        receita.complemento,
        receita.bairro,
      ].filter(Boolean).join(' — ')
    : ''
  const cidadeDaReceita = receita
    ? [receita.endereco ? '' : receita.bairro, `${receita.cidade}/${receita.estado}`, receita.cep]
        .filter(Boolean).join(' · ')
    : ''

  // Com o bloco fechado, o contorno dos campos internos fica invisível — o
  // cabeçalho precisa carregar o aviso no lugar deles.
  const enderecoPendente = !form.endereco || !form.numero || !form.cidade || !form.estado

  const podeSalvar =
    !!form.nome && !!form.bandeira && form.combustiveis.length > 0 &&
    !!normalizarWhatsapp(form.whatsapp) && !enderecoPendente && !savingPosto

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
              <Store size={15} className="text-amber-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Meus Postos</h1>
          </div>
          <p className="text-gray-500 text-sm">
            {loading ? 'Carregando…' : `${ativos} de ${postos.length} posto${postos.length !== 1 ? 's' : ''} ativo${ativos !== 1 ? 's' : ''}.`}
          </p>
        </div>
        <Button size="sm" onClick={openModal}><Plus size={14} /> Adicionar posto</Button>
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-2 py-20 text-gray-400">
          <Loader2 size={20} className="animate-spin" /><span className="text-sm">Carregando postos…</span>
        </div>
      )}

      {!loading && fetchError && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
          <AlertCircle size={15} className="shrink-0" /> {fetchError}
        </div>
      )}

      {!loading && !fetchError && postos.length === 0 && (
        <Card padding="none">
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center">
              <Store size={24} className="text-gray-300" />
            </div>
            <p className="text-sm font-semibold text-gray-400">Nenhum posto cadastrado</p>
            <p className="text-xs text-gray-400">Informe o CNPJ e preenchemos o resto para você.</p>
            <Button size="sm" onClick={openModal} className="mt-2"><Plus size={14} /> Adicionar primeiro posto</Button>
          </div>
        </Card>
      )}

      {!loading && !fetchError && postos.length > 0 && (
        <div className="grid grid-cols-1 gap-4">
          {postos.map(p => (
            <Card key={p.id} padding="none">
              <div className="flex items-stretch">
                <div className={cn('w-1.5 rounded-l-xl shrink-0', p.status === 'ativo' ? 'bg-emerald-400' : 'bg-gray-200')} />
                <div className="flex-1 px-6 py-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-base font-bold text-gray-900">{p.nome}</h3>
                        <span className={cn('text-[11px] font-medium px-2 py-0.5 rounded-full border', p.status === 'ativo' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-100 text-gray-500 border-gray-200')}>
                          {p.status === 'ativo' ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>
                      <p className="text-xs font-mono text-gray-400 mb-3">{p.cnpj}</p>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1"><MapPin size={12} className="text-gray-400" />{p.endereco}{p.numero ? `, ${p.numero}` : ''} · {p.cidade}/{p.estado}</span>
                        <span className="flex items-center gap-1"><Fuel size={12} className="text-gray-400" />{p.bandeira}</span>
                        {p.capacidade && <><span className="text-gray-300">·</span><span>{p.capacidade} L/mês est.</span></>}
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {p.combustiveis.map(c => (
                          <span key={c} className="text-[11px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">{c}</span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => toggleStatus(p.id)} className={cn('flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors', p.status === 'ativo' ? 'text-gray-400 hover:text-red-500 border-gray-200 hover:border-red-200' : 'text-emerald-600 hover:text-emerald-700 border-emerald-200 hover:border-emerald-400')}>
                        <Power size={12} />{p.status === 'ativo' ? 'Desativar' : 'Ativar'}
                      </button>
                      <button onClick={() => openEditModal(p)} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 px-3 py-1.5 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
                        <Pencil size={12} /> Editar
                      </button>
                      <button onClick={() => setPainelPosto(p)} className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 px-3 py-1.5 rounded-lg border border-blue-200 hover:border-blue-400 transition-colors font-medium">
                        Ver painel <ChevronRight size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal cadastro/edição */}
      {showModal && (
        <>
          <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={closeModal} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* max-h + overflow: com o mapa aberto o formulário passa da tela. */}
            <div className="w-full max-w-xl max-h-[90vh] flex flex-col bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
                <div className="flex items-center gap-2">
                  <Store size={17} className="text-amber-500" />
                  <span className="text-sm font-semibold text-gray-900">
                    {modalStep === 3 ? 'Posto adicionado!' : editingId ? 'Editar posto' : 'Adicionar posto'}
                  </span>
                </div>
                <button onClick={closeModal} className="text-gray-300 hover:text-gray-500 transition-colors"><X size={18} /></button>
              </div>

              {/* Indicador de passos — some na edição (entra direto no passo 2). */}
              {modalStep <= 2 && !editingId && (
                <div className="px-6 pt-4 shrink-0">
                  <div className="flex items-center gap-1 mb-4">
                    {STEPS.map((s, i) => (
                      <div key={s.n} className="flex items-center gap-1">
                        <div className={cn('w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-colors shrink-0', modalStep > s.n ? 'bg-emerald-500 text-white' : modalStep === s.n ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400')}>
                          {modalStep > s.n ? <CheckCircle size={13} /> : s.n}
                        </div>
                        <span className={cn('text-xs whitespace-nowrap', modalStep === s.n ? 'text-gray-900 font-medium' : 'text-gray-400')}>{s.label}</span>
                        {i < STEPS.length - 1 && <ChevronRight size={12} className="text-gray-200 mx-1" />}
                      </div>
                    ))}
                  </div>
                  <div className="h-1 bg-gray-100 rounded-full mb-5">
                    <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${((modalStep - 1) / (STEPS.length - 1)) * 100}%` }} />
                  </div>
                </div>
              )}

              {/* Só o conteúdo rola; as ações ficam fixas no rodapé. */}
              <div className="px-6 pb-6 overflow-y-auto flex-1">
                {/* ── Passo 1 — CNPJ ──────────────────────────────────────── */}
                {modalStep === 1 && (
                  <div className="space-y-5">
                    <div className="text-center pt-2">
                      <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-3">
                        <Building2 size={22} className="text-blue-600" />
                      </div>
                      <h2 className="text-lg font-bold text-gray-900">Comece pelo CNPJ</h2>
                      <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
                        Buscamos razão social, endereço completo e telefone na Receita Federal.
                        Você só confere e completa o que falta.
                      </p>
                    </div>

                    <div className="relative">
                      <Input
                        label="CNPJ do posto"
                        placeholder="00.000.000/0001-00"
                        inputMode="numeric"
                        autoFocus
                        value={form.cnpj}
                        onChange={e => onChangeCnpj(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') consultarCnpj(form.cnpj) }}
                        error={cnpjErro || undefined}
                        helperText={!cnpjErro && !receita ? 'A consulta começa sozinha ao completar os 14 dígitos.' : undefined}
                      />
                      <span className="absolute right-3 top-[38px] text-gray-300">
                        {buscandoCnpj ? <Loader2 size={16} className="animate-spin text-blue-500" /> : <Search size={16} />}
                      </span>
                    </div>

                    {buscandoCnpj && (
                      <p className="text-xs text-blue-600 flex items-center gap-1.5">
                        <Loader2 size={12} className="animate-spin" /> Consultando a Receita Federal…
                      </p>
                    )}

                    {/* Cartão de confirmação — o usuário reconhece a empresa
                        antes de seguir, em vez de descobrir no fim do cadastro. */}
                    {receita && !buscandoCnpj && (
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 overflow-hidden">
                        <div className="flex items-start gap-3 px-4 py-3 border-b border-emerald-100">
                          <CheckCircle size={17} className="text-emerald-500 mt-0.5 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-gray-900 leading-snug">{receita.razaoSocial}</p>
                            {receita.nomeFantasia && (
                              <p className="text-xs text-gray-500 mt-0.5">Nome fantasia: {receita.nomeFantasia}</p>
                            )}
                          </div>
                          {receita.situacao && (
                            <span className={cn(
                              'text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0',
                              receita.situacao.toUpperCase() === 'ATIVA'
                                ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                                : 'bg-amber-100 text-amber-700 border-amber-200',
                            )}>
                              {receita.situacao}
                            </span>
                          )}
                        </div>
                        <dl className="px-4 py-3 space-y-2 bg-white/60">
                          <div className="flex gap-2 text-xs">
                            <dt className="shrink-0 pt-px"><MapPin size={12} className="text-gray-400" /></dt>
                            <dd className="text-gray-600">
                              {receita.endereco ? ruaDaReceita : (
                                <span className="text-amber-700">Logradouro não consta na Receita — você informa no próximo passo.</span>
                              )}
                              <br />
                              {cidadeDaReceita}
                              {receita.origemEndereco === 'cep' && (
                                <span className="block mt-1 text-[11px] text-gray-500">
                                  A Receita não informou o logradouro; completamos pelo CEP. Confira a rua e informe o número.
                                </span>
                              )}
                            </dd>
                          </div>
                          {receita.atividade && (
                            <div className="flex gap-2 text-xs">
                              <dt className="shrink-0 pt-px"><Fuel size={12} className="text-gray-400" /></dt>
                              <dd className="text-gray-600">{receita.atividade}</dd>
                            </div>
                          )}
                        </dl>
                        {receita.alertas.length > 0 && (
                          <ul className="px-4 py-2.5 bg-amber-50 border-t border-amber-100 space-y-1">
                            {receita.alertas.map(a => (
                              <li key={a} className="flex items-start gap-1.5 text-[11px] text-amber-800">
                                <AlertTriangle size={11} className="mt-0.5 shrink-0" /> {a}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}

                  </div>
                )}

                {/* ── Passo 2 — Completar ─────────────────────────────────── */}
                {modalStep === 2 && (
                  <div className="space-y-6">
                    {/* Faixa de contexto: lembra qual CNPJ está sendo cadastrado. */}
                    <div className="flex items-center gap-3 rounded-xl bg-gray-50 border border-gray-100 px-4 py-3">
                      <Building2 size={16} className="text-gray-400 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-mono text-gray-500">{form.cnpj}</p>
                        {/* No modo manual não há razão social para mostrar;
                            a linha some em vez de ficar vazia. */}
                        {(receita?.razaoSocial || form.nome) && (
                          <p className="text-sm font-semibold text-gray-800 truncate">
                            {receita?.razaoSocial || form.nome}
                          </p>
                        )}
                      </div>
                      {!editingId && (
                        <button onClick={() => setModalStep(1)} className="text-xs text-blue-600 hover:text-blue-700 font-medium shrink-0">
                          Trocar
                        </button>
                      )}
                    </div>

                    {modoManual && (
                      <p className="flex items-start gap-1.5 text-[11px] text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                        <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                        Preenchimento manual: confira o endereço antes de finalizar.
                      </p>
                    )}

                    <Secao titulo="Identificação">
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <label htmlFor="nome-posto" className="text-sm font-medium text-gray-700">Nome do posto</label>
                          {receita && form.nome === receita.nomeSugerido && <SeloAuto origem="Receita" />}
                        </div>
                        <input
                          id="nome-posto"
                          className={cn(campoCls, pend(!form.nome))}
                          placeholder="Auto Posto Central"
                          value={form.nome}
                          onChange={e => update('nome', e.target.value)}
                        />
                        <p className="mt-1.5 text-xs text-gray-500">É este nome que as transportadoras veem na Vitrine.</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Bandeira</label>
                        <select className={cn(campoCls, pend(!form.bandeira))} value={form.bandeira} onChange={e => update('bandeira', e.target.value)}>
                          <option value="">Selecione a bandeira</option>
                          {BANDEIRAS.map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                      </div>
                    </Secao>

                    <Secao titulo="Contato">
                      {/* Obrigatório: é por este número que a transportadora fala
                          com o posto na Vitrine. Validado também na API. */}
                      <Input
                        label="WhatsApp do posto *"
                        placeholder="(27) 99925-0088"
                        inputMode="numeric"
                        value={form.whatsapp}
                        className={form.whatsapp ? undefined : PENDENTE}
                        onChange={e => update('whatsapp', maskTelefone(e.target.value))}
                        error={form.whatsapp && !normalizarWhatsapp(form.whatsapp) ? 'Informe um celular com DDD (9 dígitos).' : undefined}
                        helperText="As transportadoras usam este número para falar com o posto na Vitrine."
                      />
                    </Secao>

                    <Secao titulo="Operação">
                      <div>
                        <div className="flex items-center justify-between gap-3 mb-1">
                          <label className="text-sm font-medium text-gray-700">Combustíveis disponíveis *</label>
                          <button
                            type="button"
                            onClick={alternarTodosCombustiveis}
                            className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors shrink-0"
                          >
                            {todosCombustiveis ? 'Limpar seleção' : 'Marcar todos'}
                          </button>
                        </div>
                        <p className="text-xs text-gray-500 mb-2">
                          Marque todos os que o posto vende — é por eles que as transportadoras filtram a Vitrine.
                        </p>
                        {/* O contorno envolve o grupo: o obrigatório aqui é
                            "ao menos um", não uma opção em particular. */}
                        <div className={cn('flex flex-wrap gap-2', form.combustiveis.length === 0 && 'rounded-xl border border-amber-400 bg-amber-50/50 p-2.5')}>
                          {COMBUSTIVEIS.map(fuel => (
                            <button key={fuel} type="button" onClick={() => toggleFuel(fuel)} className={cn('px-3 py-1.5 rounded-full text-sm font-medium border transition-colors', form.combustiveis.includes(fuel) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600')}>{fuel}</button>
                          ))}
                        </div>
                        {form.combustiveis.length === 0 && <p className="text-xs text-amber-700 mt-2">Marque ao menos um combustível.</p>}
                      </div>
                      <Input label="Capacidade estimada (L/mês)" type="number" placeholder="50000" value={form.capacidade} onChange={e => update('capacidade', e.target.value)} helperText="Opcional — volume estimado de combustível vendido por mês." />
                    </Secao>

                    {/* Endereço recolhido: veio pronto da Receita e quase nunca
                        precisa de edição. Fica a um clique de distância. */}
                    <div className={cn('rounded-xl border overflow-hidden', enderecoPendente ? 'border-amber-400' : 'border-gray-200')}>
                      <button
                        type="button"
                        onClick={() => setEnderecoAberto(v => !v)}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                        aria-expanded={enderecoAberto}
                      >
                        <MapPin size={15} className="text-gray-400 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-800">Endereço</span>
                            {/* Credita a fonte certa: a rua pode ter vindo do CEP. */}
                            {receita?.endereco && !modoManual && (
                              <SeloAuto origem={receita.origemEndereco === 'cep' ? 'CEP' : 'Receita'} />
                            )}
                          </div>
                          <p className={cn('text-xs truncate mt-0.5', enderecoPendente ? 'text-amber-700' : 'text-gray-500')}>
                            {enderecoPendente
                              ? (form.numero ? 'Endereço incompleto' : 'Falta o número do endereço')
                              : resumoEndereco}
                          </p>
                        </div>
                        <ChevronDown size={16} className={cn('text-gray-400 shrink-0 transition-transform', enderecoAberto && 'rotate-180')} />
                      </button>

                      {enderecoAberto && (
                        <div className="px-4 pb-4 pt-1 space-y-3 border-t border-gray-100">
                          <div className="grid grid-cols-3 gap-3">
                            <div className="col-span-2"><Input label="Endereço (rua/av.)" placeholder="Av. Paulista" className={pend(!form.endereco)} value={form.endereco} onChange={e => update('endereco', e.target.value)} /></div>
                            {/* Número obrigatório: a Receita não o traz para
                                MEI e o CEP nunca traz — sem ele o geocoding
                                erra a quadra. */}
                            <Input label="Número *" placeholder="1000" className={pend(!form.numero)} value={form.numero} onChange={e => update('numero', e.target.value)} />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <Input label="Bairro" placeholder="Centro" value={form.bairro} onChange={e => update('bairro', e.target.value)} />
                            <Input label="Complemento" placeholder="(opcional)" value={form.complemento} onChange={e => update('complemento', e.target.value)} />
                          </div>
                          <div className="grid grid-cols-3 gap-3">
                            <div className="col-span-2"><Input label="Cidade" placeholder="São Paulo" className={pend(!form.cidade)} value={form.cidade} onChange={e => update('cidade', e.target.value)} /></div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1.5">Estado</label>
                              <select className={cn(campoCls, pend(!form.estado))} value={form.estado} onChange={e => update('estado', e.target.value)}>
                                <option value="">UF</option>
                                {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                            </div>
                          </div>
                          <Input label="CEP" placeholder="00000-000" value={form.cep} onChange={e => update('cep', e.target.value)} />

                          {/* O servidor geocodifica o endereço ao salvar; o mapa
                              só existe para quem quer ajustar o pin na mão. */}
                          <button
                            type="button"
                            onClick={() => setMapaAberto(v => !v)}
                            className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium"
                          >
                            <MapIcon size={13} />
                            {mapaAberto ? 'Ocultar mapa' : form.lat ? 'Ajustar pin no mapa' : 'Marcar no mapa (opcional)'}
                          </button>
                          {mapaAberto && (
                            <>
                              <p className="text-xs text-gray-500">Clique no mapa ou arraste o pin para marcar a localização exata.</p>
                              <div className="rounded-xl overflow-hidden border border-gray-200" style={{ height: 260 }}>
                                <MapPicker lat={form.lat ?? BRAZIL_CENTER[0]} lng={form.lng ?? BRAZIL_CENTER[1]} onChange={(lat, lng) => setForm(f => ({ ...f, lat, lng }))} />
                              </div>
                              {form.lat && <p className="text-[11px] text-gray-400 font-mono">{form.lat.toFixed(6)}, {form.lng?.toFixed(6)}</p>}
                            </>
                          )}
                          {!mapaAberto && !form.lat && (
                            <p className="text-[11px] text-gray-400">Sem pin marcado, localizamos o posto pelo endereço automaticamente.</p>
                          )}
                        </div>
                      )}
                    </div>

                  </div>
                )}

                {/* ── Passo 3 — Sucesso ───────────────────────────────────── */}
                {modalStep === 3 && (
                  <div className="text-center py-2 space-y-4">
                    <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto">
                      <CheckCircle size={32} className="text-emerald-500" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">Posto adicionado!</h2>
                      <p className="text-sm text-gray-500 mt-1">
                        <strong>{form.nome}</strong> já está ativo e pode receber solicitações de parceria.
                      </p>
                    </div>

                    <div className="space-y-2 pt-1">
                      <Button className="w-full" onClick={openModal}><Plus size={14} /> Adicionar outro posto</Button>
                      <button onClick={closeModal} className="w-full py-2.5 text-sm text-gray-400 hover:text-gray-600 transition-colors">Fechar</button>
                    </div>
                  </div>
                )}
              </div>

              {/* Rodapé fixo — a ação principal fica sempre visível, mesmo com
                  o endereço e o mapa abertos empurrando o formulário para baixo. */}
              {modalStep <= 2 && (
                <div className="shrink-0 border-t border-gray-100 bg-white px-6 py-4 space-y-3">
                  {modalStep === 2 && formErro && (
                    <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{formErro}</div>
                  )}
                  <div className="flex gap-3">
                    {modalStep === 1 ? (
                      <>
                        <Button variant="secondary" className="flex-1" onClick={closeModal}>Cancelar</Button>
                        <Button className="flex-1" onClick={() => setModalStep(2)} disabled={!receita || buscandoCnpj}>
                          Continuar <ChevronRight size={14} />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button variant="secondary" className="flex-1" onClick={editingId ? closeModal : () => setModalStep(1)}>
                          {editingId ? 'Cancelar' : 'Voltar'}
                        </Button>
                        <Button
                          className="flex-1"
                          onClick={editingId ? salvarEditar : salvarPosto}
                          disabled={!podeSalvar}
                          isLoading={savingPosto}
                        >
                          {editingId ? <><CheckCircle size={14} /> Salvar alterações</> : 'Finalizar cadastro'}
                        </Button>
                      </>
                    )}
                  </div>

                  {/* Saída de emergência: CNPJ válido que a Receita não devolve
                      (base fora do ar, inscrição recente) não pode travar o
                      cadastro. O endereço já abre expandido no passo 2. */}
                  {modalStep === 1 && !receita && !cnpjDuplicado && (
                    <button
                      type="button"
                      onClick={() => {
                        setModoManual(true)
                        setEnderecoAberto(true)
                        setCnpjErro('')
                        setModalStep(2)
                      }}
                      disabled={!isCnpjValid(limparDoc(form.cnpj))}
                      className="w-full text-xs text-gray-400 hover:text-gray-600 disabled:opacity-40 disabled:hover:text-gray-400 transition-colors"
                    >
                      Não encontrou? Preencher os dados manualmente
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
