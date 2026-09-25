'use client'

import { useState } from 'react'
import { FileDown, Sheet, CalendarDays, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { DateRangePicker, type DateRange } from '@/components/ui/date-range-picker'
import { filtrarPorIntervalo, filtrarPorPosto, labelPeriodo, formatBRL, type Abastecimento } from '@/lib/relatorios-data'
import { useAbastecimentos } from '@/hooks/use-abastecimentos'
import { exportarPDF, exportarExcel } from '@/lib/export'

function defaultRange(): DateRange {
  const today = new Date()
  const fim = today.toISOString().slice(0, 10)
  const ini = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10)
  return { inicio: ini, fim }
}

function agruparPorDia(dados: Abastecimento[]) {
  const mapa: Record<string, { data: string; abastecimentos: number; litros: number; valor: number }> = {}
  for (const a of dados) {
    if (!mapa[a.data]) mapa[a.data] = { data: a.data, abastecimentos: 0, litros: 0, valor: 0 }
    mapa[a.data].abastecimentos++
    mapa[a.data].litros += a.litros
    mapa[a.data].valor += a.valor
  }
  return Object.values(mapa).sort((a, b) => {
    const [da, ma, ya] = a.data.split('/').map(Number)
    const [db, mb, yb] = b.data.split('/').map(Number)
    return new Date(ya, ma - 1, da).getTime() - new Date(yb, mb - 1, db).getTime()
  })
}

export default function RelatorioPeriodoPage() {
  const [range, setRange] = useState<DateRange>(defaultRange)
  const [posto, setPosto] = useState('todos')
  const [loadingPDF, setLoadingPDF] = useState(false)
  const [loadingXLS, setLoadingXLS] = useState(false)
  const { abastecimentos: ABASTECIMENTOS, postos: POSTOS } = useAbastecimentos()

  const filtrados = filtrarPorPosto(filtrarPorIntervalo(ABASTECIMENTOS, range.inicio, range.fim), posto)
  const porDia = agruparPorDia(filtrados)
  const totalValor = porDia.reduce((s, d) => s + d.valor, 0)
  const totalLitros = porDia.reduce((s, d) => s + d.litros, 0)
  const totalAbast = porDia.reduce((s, d) => s + d.abastecimentos, 0)
  const mediaDiaria = porDia.length > 0 ? totalValor / porDia.length : 0
  const maxDia = porDia.length > 0 ? Math.max(...porDia.map((d) => d.valor)) : 1

  const periodo = labelPeriodo(range.inicio, range.fim)

  const COLUNAS = ['Data', 'Abastecimentos', 'Volume (L)', 'Receita (R$)', 'Ticket Médio (R$)']
  const linhas = porDia.map((d) => [
    d.data,
    d.abastecimentos,
    `${d.litros} L`,
    formatBRL(d.valor),
    formatBRL(d.valor / d.abastecimentos),
  ])

  const handlePDF = async () => {
    setLoadingPDF(true)
    await exportarPDF({
      titulo: 'Relatório por Período',
      subtitulo: `Consolidado diário de abastecimentos B2B — ${periodo}`,
      periodo,
      colunas: COLUNAS,
      linhas,
      totais: [
        { label: 'Dias ativos', valor: String(porDia.length) },
        { label: 'Volume total', valor: `${totalLitros} L` },
        { label: 'Média diária', valor: formatBRL(mediaDiaria) },
        { label: 'Receita total', valor: formatBRL(totalValor) },
      ],
      nomeArquivo: `fleetpass-periodo-${range.inicio}-a-${range.fim}`,
    })
    setLoadingPDF(false)
  }

  const handleExcel = async () => {
    setLoadingXLS(true)
    await exportarExcel(COLUNAS, linhas, `fleetpass-periodo-${range.inicio}-a-${range.fim}`, 'Por Período')
    setLoadingXLS(false)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-violet-50 flex items-center justify-center">
              <CalendarDays size={15} className="text-violet-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Relatório por Período</h1>
          </div>
          <p className="text-gray-500 text-sm">
            Consolidado diário de abastecimentos, volume e receita B2B.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <select
            value={posto}
            onChange={e => setPosto(e.target.value)}
            className="h-8 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {POSTOS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
          <DateRangePicker value={range} onChange={setRange} />
          <Button variant="secondary" size="sm" onClick={handleExcel} isLoading={loadingXLS} disabled={porDia.length === 0}>
            <Sheet size={14} /> Excel
          </Button>
          <Button variant="primary" size="sm" onClick={handlePDF} isLoading={loadingPDF} disabled={porDia.length === 0}>
            <FileDown size={14} /> Exportar PDF
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Receita total', value: formatBRL(totalValor), sub: periodo, highlight: true },
          { label: 'Média diária', value: formatBRL(mediaDiaria), sub: 'por dia com movimento' },
          { label: 'Volume total', value: `${totalLitros} L`, sub: 'litros abastecidos' },
          { label: 'Dias ativos', value: porDia.length, sub: 'dias com abastecimento' },
        ].map((k) => (
          <Card key={k.label} padding="md">
            <p className="text-sm text-gray-500">{k.label}</p>
            <p className={`text-2xl font-bold mt-1 ${k.highlight ? 'text-blue-600' : 'text-gray-900'}`}>{k.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{k.sub}</p>
          </Card>
        ))}
      </div>

      {porDia.length === 0 ? (
        <Card padding="none">
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <CalendarDays size={28} className="text-gray-200" />
            <p className="text-sm text-gray-400 font-medium">Nenhum abastecimento no período selecionado</p>
            <p className="text-xs text-gray-400">Tente ampliar o intervalo de datas</p>
          </div>
        </Card>
      ) : (
        /* Gráfico de barras + tabela */
        <div className="grid grid-cols-5 gap-5">
          {/* Mini gráfico */}
          <Card padding="md" className="col-span-2 flex flex-col">
            <div className="flex items-center justify-between mb-3 shrink-0">
              <p className="text-sm font-semibold text-gray-700">Receita por dia</p>
              <TrendingUp size={15} className="text-blue-400" />
            </div>
            {(() => {
              const W = 200
              const H = 100
              const pad = 5
              const n = porDia.length

              const pts = porDia.map((d, i) => ({
                x: n === 1 ? W / 2 : pad + (i / (n - 1)) * (W - pad * 2),
                y: pad + (1 - d.valor / maxDia) * (H - pad * 2),
                d,
              }))

              // Smooth cubic bezier through points
              const buildPath = () => {
                if (n === 0) return ''
                if (n === 1) return `M ${pts[0].x},${pts[0].y}`
                let d = `M ${pts[0].x},${pts[0].y}`
                for (let i = 1; i < n; i++) {
                  const cpx = (pts[i - 1].x + pts[i].x) / 2
                  d += ` C ${cpx},${pts[i - 1].y} ${cpx},${pts[i].y} ${pts[i].x},${pts[i].y}`
                }
                return d
              }

              const linePath = buildPath()
              const areaPath = `${linePath} L ${pts[n - 1].x},${H} L ${pts[0].x},${H} Z`

              return (
                <div className="flex flex-col flex-1 min-h-0">
                  <div className="flex-1 min-h-0 w-full">
                    <svg
                      viewBox={`0 0 ${W} ${H}`}
                      preserveAspectRatio="none"
                      className="w-full h-full"
                    >
                      <defs>
                        <linearGradient id="areaBlue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.18" />
                          <stop offset="100%" stopColor="#14b8a6" stopOpacity="0.01" />
                        </linearGradient>
                      </defs>
                      <path d={areaPath} fill="url(#areaBlue)" />
                      <path
                        d={linePath}
                        fill="none"
                        stroke="#14b8a6"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        vectorEffect="non-scaling-stroke"
                      />
                      {pts.map((p) => (
                        <circle
                          key={p.d.data}
                          cx={p.x}
                          cy={p.y}
                          r="2.2"
                          fill="white"
                          stroke="#14b8a6"
                          strokeWidth="1.8"
                          vectorEffect="non-scaling-stroke"
                        />
                      ))}
                    </svg>
                  </div>
                  <div className="flex mt-2 shrink-0">
                    {porDia.map((d) => (
                      <span key={d.data} className="flex-1 text-[9px] text-gray-400 text-center truncate">
                        {d.data.slice(0, 5)}
                      </span>
                    ))}
                  </div>
                </div>
              )
            })()}
          </Card>

          {/* Tabela */}
          <Card padding="none" className="col-span-3">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-700">Detalhamento diário</p>
              <p className="text-xs text-gray-400">{porDia.length} dias · {periodo}</p>
            </div>
            <div className="overflow-x-auto max-h-72 overflow-y-auto">
              <table className="w-full">
                <thead className="sticky top-0">
                  <tr className="text-xs text-gray-400 uppercase tracking-wide bg-gray-50">
                    <th className="px-5 py-3 text-left">Data</th>
                    <th className="px-5 py-3 text-center">Abast.</th>
                    <th className="px-5 py-3 text-center">Volume</th>
                    <th className="px-5 py-3 text-right">Receita</th>
                    <th className="px-5 py-3 text-right">Ticket Médio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {porDia.map((d) => (
                    <tr key={d.data} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3.5 text-sm font-medium text-gray-800">{d.data}</td>
                      <td className="px-5 py-3.5 text-sm text-gray-600 text-center">{d.abastecimentos}</td>
                      <td className="px-5 py-3.5 text-sm text-gray-600 text-center">{d.litros} L</td>
                      <td className="px-5 py-3.5 text-sm font-semibold text-gray-900 text-right">{formatBRL(d.valor)}</td>
                      <td className="px-5 py-3.5 text-sm text-gray-500 text-right">
                        {formatBRL(d.valor / d.abastecimentos)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 border-t-2 border-gray-200">
                    <td className="px-5 py-3 text-sm font-bold text-gray-700">Total</td>
                    <td className="px-5 py-3 text-sm font-bold text-gray-700 text-center">{totalAbast}</td>
                    <td className="px-5 py-3 text-sm font-bold text-gray-700 text-center">{totalLitros} L</td>
                    <td className="px-5 py-3 text-sm font-bold text-gray-900 text-right">{formatBRL(totalValor)}</td>
                    <td className="px-5 py-3 text-sm font-bold text-gray-500 text-right">{formatBRL(mediaDiaria)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
