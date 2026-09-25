'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Download, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

const POR_PAGINA = 15

type Abastecimento = {
  id: string
  codigo: string
  data: string
  veiculo: string
  veiculoId: string | null
  veiculoPlaca: string
  motorista: string
  motoristaId: string | null
  posto: string
  postoId: string | null
  combustivel: string
  litros: number
  valor: number
}

type Opcoes = {
  postos:     { id: string; nome: string }[]
  veiculos:   { id: string; nome: string }[]
  motoristas: { id: string; nome: string }[]
}

type Totais = { valor: number; registros: number; postos: number }

// Gera lista dos últimos 12 meses
function mesesDisponiveis() {
  const hoje = new Date()
  const lista: { ano: number; mes: number; label: string }[] = []
  for (let i = 0; i < 12; i++) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1)
    lista.push({
      ano:   d.getFullYear(),
      mes:   d.getMonth() + 1,
      label: d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
    })
  }
  return lista
}

const MESES = mesesDisponiveis()

function fmtValor(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtLitros(v: number) {
  return `${v.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} L`
}

function HistoricoEmpresa() {
  // Filtro inicial vindo da Vitrine: /empresa/historico?postoId=<id>
  const searchParams = useSearchParams()

  const [mesIdx,       setMesIdx]       = useState(0)   // índice em MESES
  const [postoId,      setPostoId]      = useState(searchParams.get('postoId') ?? '')
  const [veiculoId,    setVeiculoId]    = useState('')
  const [motoristaId,  setMotoristaId]  = useState('')

  const [dados,    setDados]    = useState<Abastecimento[]>([])
  const [opcoes,   setOpcoes]   = useState<Opcoes>({ postos: [], veiculos: [], motoristas: [] })
  const [totais,   setTotais]   = useState<Totais>({ valor: 0, registros: 0, postos: 0 })
  const [loading,  setLoading]  = useState(true)
  const [pagina,   setPagina]   = useState(1)

  // Trocar filtro volta para a primeira página. Fica nos handlers, e não num
  // efeito: em efeito isto é estado derivado e dispara render em cascata.
  const trocarFiltro = <T,>(set: (v: T) => void) => (v: T) => { set(v); setPagina(1) }

  const fetchDados = useCallback(async () => {
    setLoading(true)
    const { ano, mes } = MESES[mesIdx]
    const params = new URLSearchParams({
      ano: String(ano), mes: String(mes),
      pagina: String(pagina), porPagina: String(POR_PAGINA),
    })
    if (postoId)     params.set('postoId',     postoId)
    if (veiculoId)   params.set('veiculoId',   veiculoId)
    if (motoristaId) params.set('motoristaId', motoristaId)

    const res = await fetch(`/api/empresa/historico?${params}`)
    const d   = await res.json()
    setDados(d.abastecimentos ?? [])
    setTotais(d.totais ?? { valor: 0, registros: 0, postos: 0 })
    setOpcoes(d.opcoes ?? { postos: [], veiculos: [], motoristas: [] })
    setLoading(false)
  }, [mesIdx, postoId, veiculoId, motoristaId, pagina])

  useEffect(() => { fetchDados() }, [fetchDados])

  // `dados` agora é a página que veio do banco; a contagem do período vem de
  // `totais.registros`, que conta o conjunto filtrado inteiro.
  const totalRegistros = totais.registros
  const totalPaginas = Math.max(1, Math.ceil(totalRegistros / POR_PAGINA))
  const paginaAtual  = Math.min(pagina, totalPaginas)
  const paginados    = dados

  async function exportarCSV() {
    // A lista na tela é uma página; o CSV sempre exportou o período inteiro e
    // precisa continuar exportando — por isso a busca própria com `tudo=1`.
    const { ano, mes } = MESES[mesIdx]
    const params = new URLSearchParams({ ano: String(ano), mes: String(mes), tudo: '1' })
    if (postoId)     params.set('postoId',     postoId)
    if (veiculoId)   params.set('veiculoId',   veiculoId)
    if (motoristaId) params.set('motoristaId', motoristaId)

    let todos: Abastecimento[] = dados
    try {
      const res = await fetch(`/api/empresa/historico?${params}`)
      if (res.ok) todos = (await res.json()).abastecimentos ?? dados
    } catch { /* sem rede: exporta ao menos o que está na tela */ }

    const cab  = ['Código', 'Data', 'Veículo', 'Motorista', 'Posto', 'Combustível', 'Litros', 'Valor']
    const linhas = todos.map(h => [
      h.codigo, h.data, h.veiculo, h.motorista, h.posto,
      h.combustivel, fmtLitros(h.litros), fmtValor(h.valor),
    ])
    const csv  = [cab, ...linhas].map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `historico-${MESES[mesIdx].ano}-${String(MESES[mesIdx].mes).padStart(2,'0')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const { label: mesLabel } = MESES[mesIdx]

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Histórico</h1>
          <p className="text-gray-500 text-sm">Todos os abastecimentos realizados pela frota.</p>
        </div>
        <Button variant="secondary" size="sm" onClick={exportarCSV} disabled={dados.length === 0}>
          <Download size={14} /> Exportar CSV
        </Button>
      </div>

      {/* Totais */}
      <div className="grid grid-cols-3 gap-4">
        <Card padding="md">
          <p className="text-sm text-gray-500">Total gasto</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {loading ? '—' : fmtValor(totais.valor)}
          </p>
          <p className="text-xs text-gray-400 mt-0.5 capitalize">{mesLabel}</p>
        </Card>
        <Card padding="md">
          <p className="text-sm text-gray-500">Abastecimentos</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {loading ? '—' : totais.registros}
          </p>
          <p className="text-xs text-gray-400 mt-0.5 capitalize">{mesLabel}</p>
        </Card>
        <Card padding="md">
          <p className="text-sm text-gray-500">Postos utilizados</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {loading ? '—' : totais.postos}
          </p>
          <p className="text-xs text-gray-400 mt-0.5 capitalize">{mesLabel}</p>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 flex-wrap">
        <select
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-blue-500"
          value={mesIdx}
          onChange={e => trocarFiltro(setMesIdx)(Number(e.target.value))}
        >
          {MESES.map((m, i) => (
            <option key={i} value={i} className="capitalize">{m.label}</option>
          ))}
        </select>

        <select
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-blue-500"
          value={postoId}
          onChange={e => trocarFiltro(setPostoId)(e.target.value)}
        >
          <option value="">Todos postos</option>
          {opcoes.postos.map(p => (
            <option key={p.id} value={p.id}>{p.nome}</option>
          ))}
        </select>

        <select
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-blue-500"
          value={veiculoId}
          onChange={e => trocarFiltro(setVeiculoId)(e.target.value)}
        >
          <option value="">Todos veículos</option>
          {opcoes.veiculos.map(v => (
            <option key={v.id} value={v.id}>{v.nome}</option>
          ))}
        </select>

        <select
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-blue-500"
          value={motoristaId}
          onChange={e => trocarFiltro(setMotoristaId)(e.target.value)}
        >
          <option value="">Todos motoristas</option>
          {opcoes.motoristas.map(m => (
            <option key={m.id} value={m.id}>{m.nome}</option>
          ))}
        </select>
      </div>

      <Card padding="none">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400 gap-2">
            <Loader2 size={18} className="animate-spin" />
            <span className="text-sm">Carregando histórico...</span>
          </div>
        ) : dados.length === 0 ? (
          <div className="py-16 text-center text-gray-400 text-sm">
            Nenhum abastecimento encontrado para o período selecionado.
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead>
                <tr className="text-xs text-gray-400 uppercase tracking-wide bg-gray-50">
                  <th className="px-6 py-3 text-left">Data</th>
                  <th className="px-6 py-3 text-left">Veículo</th>
                  <th className="px-6 py-3 text-left">Motorista</th>
                  <th className="px-6 py-3 text-left">Posto</th>
                  <th className="px-6 py-3 text-left">Combustível</th>
                  <th className="px-6 py-3 text-right">Litros</th>
                  <th className="px-6 py-3 text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {paginados.map(h => (
                  <tr key={h.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3 text-sm text-gray-500">{h.data}</td>
                    <td className="px-6 py-3 text-sm text-gray-700">{h.veiculo}</td>
                    <td className="px-6 py-3 text-sm text-gray-600">{h.motorista}</td>
                    <td className="px-6 py-3 text-sm text-gray-600">{h.posto}</td>
                    <td className="px-6 py-3">
                      <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                        {h.combustivel}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-600 text-right">{fmtLitros(h.litros)}</td>
                    <td className="px-6 py-3 text-sm font-semibold text-gray-900 text-right">{fmtValor(h.valor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Paginação */}
            <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100">
              <p className="text-xs text-gray-400">
                Exibindo {totalRegistros === 0 ? 0 : (paginaAtual - 1) * POR_PAGINA + 1}–{Math.min(paginaAtual * POR_PAGINA, totalRegistros)} de {totalRegistros} registros
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPagina(p => Math.max(1, p - 1))}
                  disabled={paginaAtual === 1}
                  className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={15} className="text-gray-600" />
                </button>
                {Array.from({ length: Math.min(totalPaginas, 7) }, (_, i) => {
                  // janela deslizante de 7 páginas centrada na atual
                  const half  = 3
                  let start   = Math.max(1, paginaAtual - half)
                  const end   = Math.min(totalPaginas, start + 6)
                  start       = Math.max(1, end - 6)
                  return start + i
                }).map(n => (
                  <button
                    key={n}
                    onClick={() => setPagina(n)}
                    className={`min-w-[28px] h-7 text-xs rounded-lg transition-colors ${
                      n === paginaAtual ? 'bg-blue-600 text-white font-medium' : 'text-gray-500 hover:bg-gray-100'
                    }`}
                  >
                    {n}
                  </button>
                ))}
                <button
                  onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
                  disabled={paginaAtual === totalPaginas}
                  className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight size={15} className="text-gray-600" />
                </button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  )
}

// useSearchParams() exige fronteira de Suspense para a página poder ser
// pré-renderizada estaticamente (App Router).
export default function HistoricoEmpresaPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20 text-gray-400">
          <Loader2 size={20} className="animate-spin" />
        </div>
      }
    >
      <HistoricoEmpresa />
    </Suspense>
  )
}
