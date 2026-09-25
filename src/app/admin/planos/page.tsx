'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Plus, RefreshCw, Copy, Check, Trash2, Package,
  AlertCircle, Loader2, X, ChevronDown, ChevronUp, Pencil, Info,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Preco {
  id: string
  valor: number
  moeda: string
  intervalo: string
  intervaloCount: number
  ativo: boolean
}

interface Produto {
  id: string
  nome: string
  descricao: string
  ativo: boolean
  maxPostos: string | null
  planId: string | null
  precos: Preco[]
  criadoEm: number
}

interface EditPrecoState {
  productId: string
  priceId: string
  valor: string
  intervalo: string
}

const FORM_VAZIO = {
  nome: '',
  descricao: '',
  valor: '',
  intervalo: 'mes',
  planId: '',
}

const INTERVALOS = [
  { value: 'mes', label: 'Mensal' },
  { value: 'ano', label: 'Anual' },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtDate(unix: number) {
  return new Date(unix * 1000).toLocaleDateString('pt-BR')
}

// ---------------------------------------------------------------------------
// Component — Copy button
// ---------------------------------------------------------------------------
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  return (
    <button
      onClick={handleCopy}
      title="Copiar"
      className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
    >
      {copied ? <Check size={13} className="text-green-600" /> : <Copy size={13} />}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Component — ProdutoRow
// ---------------------------------------------------------------------------
function ProdutoRow({
  produto,
  onArquivar,
  onEditPreco,
}: {
  produto: Produto
  onArquivar: (id: string) => void
  onEditPreco: (state: EditPrecoState) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-4 px-5 py-4 bg-white">
        <div className="w-9 h-9 bg-indigo-50 rounded-lg flex items-center justify-center shrink-0">
          <Package size={16} className="text-indigo-600" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-gray-900 text-sm">{produto.nome}</p>
            {produto.planId && (
              <span className="text-[10px] font-mono bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded">
                {produto.planId}
              </span>
            )}
            <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
              por CNPJ
            </span>
          </div>
          {produto.descricao && (
            <p className="text-xs text-gray-400 mt-0.5 truncate">{produto.descricao}</p>
          )}
        </div>

        {/* Preços (resumo) */}
        <div className="hidden sm:flex items-center gap-2">
          {produto.precos.map((p) => (
            <span key={p.id} className="text-sm font-semibold text-gray-800">
              {fmtBRL(p.valor)}<span className="text-xs font-normal text-gray-400">/CNPJ·{p.intervalo === 'month' ? 'mês' : 'ano'}</span>
            </span>
          ))}
          {produto.precos.length === 0 && (
            <span className="text-xs text-amber-600">Sem preço</span>
          )}
        </div>

        <p className="hidden lg:block text-xs text-gray-400 shrink-0">{fmtDate(produto.criadoEm)}</p>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {confirmDelete ? (
            <div className="flex items-center gap-1">
              <button
                onClick={() => onArquivar(produto.id)}
                className="text-xs px-2 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-500"
              >
                Confirmar
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
              title="Arquivar produto"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Expanded — Price IDs + edição */}
      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50 px-5 py-3 space-y-2">
          <p className="text-xs font-medium text-gray-500 mb-2">Preços ativos</p>
          {produto.precos.length === 0 ? (
            <p className="text-xs text-gray-400">Nenhum preço cadastrado.</p>
          ) : (
            produto.precos.map((p) => (
              <div key={p.id} className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2">
                <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded shrink-0">
                  {p.intervalo === 'month' ? 'Mensal' : 'Anual'}
                </span>
                <code className="text-xs font-mono text-gray-500 flex-1 truncate">{p.id}</code>
                <CopyButton text={p.id} />
                <span className="text-xs font-semibold text-gray-700 shrink-0">
                  {fmtBRL(p.valor)}/{p.intervalo === 'month' ? 'mês' : 'ano'}
                </span>
                <button
                  onClick={() =>
                    onEditPreco({
                      productId: produto.id,
                      priceId: p.id,
                      valor: String(p.valor),
                      intervalo: p.intervalo === 'month' ? 'mes' : 'ano',
                    })
                  }
                  className="p-1 rounded hover:bg-indigo-50 text-gray-400 hover:text-indigo-600 transition-colors shrink-0"
                  title="Editar preço"
                >
                  <Pencil size={13} />
                </button>
              </div>
            ))
          )}
          <div className="pt-1 border-t border-gray-200 flex items-center gap-2">
            <span className="text-[10px] text-gray-400">Product ID:</span>
            <code className="text-xs font-mono text-gray-500">{produto.id}</code>
            <CopyButton text={produto.id} />
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function PlanosAdminPage() {
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Modal novo produto
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(FORM_VAZIO)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  // Modal editar preço
  const [editPreco, setEditPreco] = useState<EditPrecoState | null>(null)
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState('')

  const fetchProdutos = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/stripe/produtos')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro ao buscar produtos.')
      setProdutos(data.produtos)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchProdutos() }, [fetchProdutos])

  const handleSave = async () => {
    if (!form.nome || !form.valor) {
      setSaveError('Nome e valor são obrigatórios.')
      return
    }
    setSaving(true)
    setSaveError('')
    try {
      const res = await fetch('/api/admin/stripe/produtos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro ao criar produto.')
      setShowModal(false)
      setForm(FORM_VAZIO)
      await fetchProdutos()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  const handleArquivar = async (productId: string) => {
    try {
      const res = await fetch('/api/admin/stripe/produtos', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro ao arquivar.')
      setProdutos((ps) => ps.filter((p) => p.id !== productId))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  const handleSavePreco = async () => {
    if (!editPreco?.valor) {
      setEditError('Informe o novo valor.')
      return
    }
    setEditSaving(true)
    setEditError('')
    try {
      const res = await fetch('/api/admin/stripe/produtos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: editPreco.productId,
          priceId: editPreco.priceId,
          novoValor: editPreco.valor,
          intervalo: editPreco.intervalo,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro ao atualizar preço.')
      setEditPreco(null)
      await fetchProdutos()
    } catch (err) {
      setEditError(err instanceof Error ? err.message : String(err))
    } finally {
      setEditSaving(false)
    }
  }

  const setField = (k: keyof typeof FORM_VAZIO, v: string) =>
    setForm((f) => ({ ...f, [k]: v }))

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Planos / Produtos Stripe</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gerencie os produtos e preços cadastrados na sua conta Stripe</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchProdutos}
            disabled={loading}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-40"
            title="Atualizar"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <Button variant="primary" size="md" onClick={() => { setShowModal(true); setSaveError('') }}>
            <Plus size={16} />
            Novo produto
          </Button>
        </div>
      </div>

      {/* Erro geral */}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
          <AlertCircle size={16} className="shrink-0" />
          {error}
        </div>
      )}

      {/* Lista de produtos */}
      <Card>
        <CardHeader
          title="Produtos ativos"
          subtitle={`${produtos.length} produto${produtos.length !== 1 ? 's' : ''} encontrado${produtos.length !== 1 ? 's' : ''} no Stripe`}
        />
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-gray-400">
            <Loader2 size={20} className="animate-spin" />
            <span className="text-sm">Buscando produtos no Stripe…</span>
          </div>
        ) : produtos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Package size={32} className="mb-3 opacity-40" />
            <p className="text-sm font-medium">Nenhum produto cadastrado</p>
            <p className="text-xs mt-1">Clique em "Novo produto" para começar</p>
          </div>
        ) : (
          <div className="space-y-3">
            {produtos.map((p) => (
              <ProdutoRow
                key={p.id}
                produto={p}
                onArquivar={handleArquivar}
                onEditPreco={(state) => { setEditPreco(state); setEditError('') }}
              />
            ))}
          </div>
        )}
      </Card>

      {/* Dica env */}
      <Card>
        <CardHeader title="Como usar o Price ID" subtitle="Plano único por CNPJ — copie o Price ID e configure no .env.local" />
        <div className="bg-[#12181a] dark:bg-black/40 rounded-xl p-4 font-mono text-xs text-gray-300 dark:text-gray-400 space-y-1">
          <p><span className="text-gray-500"># Price ID do produto "padrao" (cobrança por CNPJ)</span></p>
          <p>STRIPE_PRICE_PADRAO=<span className="text-indigo-400">price_...</span></p>
        </div>
      </Card>

      {/* Modal — novo produto */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900">Novo produto no Stripe</h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Nome do produto <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ex: Profissional"
                  value={form.nome}
                  onChange={(e) => setField('nome', e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Descrição</label>
                <input
                  type="text"
                  placeholder="Ex: Até 3 postos, suporte prioritário"
                  value={form.descricao}
                  onChange={(e) => setField('descricao', e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Valor por CNPJ (R$) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="49.90"
                    value={form.valor}
                    onChange={(e) => setField('valor', e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Intervalo</label>
                  <select
                    value={form.intervalo}
                    onChange={(e) => setField('intervalo', e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    {INTERVALOS.map((i) => (
                      <option key={i.value} value={i.value}>{i.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Plan ID
                  <span className="text-gray-400 font-normal ml-1">(slug — use "padrao" para o plano principal)</span>
                </label>
                <input
                  type="text"
                  placeholder="padrao"
                  value={form.planId}
                  onChange={(e) => setField('planId', e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>

              <div className="flex items-start gap-2 bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs px-3 py-2.5 rounded-lg">
                <Info size={13} className="shrink-0 mt-0.5" />
                <span>
                  Cobrança <strong>por CNPJ</strong>: o valor acima é multiplicado pelo número de postos
                  cadastrados na conta. Não há teto de postos.
                </span>
              </div>

              {saveError && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2.5 rounded-lg">
                  <AlertCircle size={13} className="shrink-0" />
                  {saveError}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100">
              <Button variant="secondary" size="md" onClick={() => setShowModal(false)}>
                Cancelar
              </Button>
              <Button variant="primary" size="md" onClick={handleSave} disabled={saving}>
                {saving && <Loader2 size={14} className="animate-spin" />}
                {saving ? 'Cadastrando…' : 'Cadastrar no Stripe'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal — editar preço */}
      {editPreco && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900">Editar preço</h2>
              <button
                onClick={() => setEditPreco(null)}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs px-3 py-2.5 rounded-lg">
                No Stripe, preços não podem ser editados — o preço atual será arquivado e um novo será criado no lugar.
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Novo valor (R$) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editPreco.valor}
                    onChange={(e) => setEditPreco((s) => s ? { ...s, valor: e.target.value } : s)}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Intervalo</label>
                  <select
                    value={editPreco.intervalo}
                    onChange={(e) => setEditPreco((s) => s ? { ...s, intervalo: e.target.value } : s)}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    {INTERVALOS.map((i) => (
                      <option key={i.value} value={i.value}>{i.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {editError && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2.5 rounded-lg">
                  <AlertCircle size={13} className="shrink-0" />
                  {editError}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100">
              <Button variant="secondary" size="md" onClick={() => setEditPreco(null)}>
                Cancelar
              </Button>
              <Button variant="primary" size="md" onClick={handleSavePreco} disabled={editSaving}>
                {editSaving && <Loader2 size={14} className="animate-spin" />}
                {editSaving ? 'Salvando…' : 'Salvar novo preço'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
