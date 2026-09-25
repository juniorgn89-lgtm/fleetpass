'use client'

import { useEffect, useState } from 'react'
import { CalendarRange, AlertCircle, ChevronDown, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface DateRange {
  inicio: string  // yyyy-MM-dd
  fim: string     // yyyy-MM-dd
}

interface Preset {
  label: string
  shortLabel: string
  getRange: () => DateRange
}

const MAX_DAYS = 90

function toISO(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function today(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

function diffDays(inicio: string, fim: string): number {
  const a = new Date(inicio)
  const b = new Date(fim)
  return Math.round((b.getTime() - a.getTime()) / 86_400_000)
}

function formatLabel(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

const PRESETS: Preset[] = [
  {
    label: 'Hoje',
    shortLabel: 'Hoje',
    getRange: () => { const d = toISO(today()); return { inicio: d, fim: d } },
  },
  {
    label: 'Últimos 7 dias',
    shortLabel: '7 dias',
    getRange: () => ({ inicio: toISO(addDays(today(), -6)), fim: toISO(today()) }),
  },
  {
    label: 'Quinzena (15 dias)',
    shortLabel: 'Quinzena',
    getRange: () => ({ inicio: toISO(addDays(today(), -14)), fim: toISO(today()) }),
  },
  {
    label: 'Este mês',
    shortLabel: 'Este mês',
    getRange: () => {
      const t = today()
      return { inicio: `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-01`, fim: toISO(t) }
    },
  },
  {
    label: 'Mês anterior',
    shortLabel: 'Mês ant.',
    getRange: () => {
      const t = today()
      const first = new Date(t.getFullYear(), t.getMonth() - 1, 1)
      const last  = new Date(t.getFullYear(), t.getMonth(), 0)
      return { inicio: toISO(first), fim: toISO(last) }
    },
  },
  {
    label: 'Últimos 3 meses',
    shortLabel: '3 meses',
    getRange: () => ({ inicio: toISO(addDays(today(), -89)), fim: toISO(today()) }),
  },
]

interface Props {
  value: DateRange
  onChange: (range: DateRange) => void
  className?: string
}

export function DateRangePicker({ value, onChange, className }: Props) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<DateRange>(value)
  const [activePreset, setActivePreset] = useState<string | null>(null)
  const [error, setError] = useState('')

  // Sincroniza draft quando value muda externamente
  useEffect(() => { setDraft(value) }, [value])

  const validate = (ini: string, fim: string): string => {
    if (!ini || !fim) return 'Preencha as duas datas.'
    if (ini > fim)    return 'A data inicial deve ser anterior à final.'
    if (diffDays(ini, fim) > MAX_DAYS)
      return `O intervalo máximo é de 3 meses (${MAX_DAYS} dias). Selecione um período menor.`
    return ''
  }

  const handlePreset = (preset: Preset) => {
    const range = preset.getRange()
    setDraft(range)
    setActivePreset(preset.label)
    setError('')
  }

  const handleDateChange = (field: 'inicio' | 'fim', val: string) => {
    const next = { ...draft, [field]: val }
    setDraft(next)
    setActivePreset(null)
    setError(validate(next.inicio, next.fim))
  }

  const handleApply = () => {
    const err = validate(draft.inicio, draft.fim)
    if (err) { setError(err); return }
    onChange(draft)
    setOpen(false)
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    const range = PRESETS[3].getRange() // Volta para "Este mês"
    setDraft(range)
    setActivePreset('Este mês')
    onChange(range)
    setError('')
  }

  const displayLabel =
    value.inicio && value.fim
      ? `${formatLabel(value.inicio)} — ${formatLabel(value.fim)}`
      : 'Selecionar período'

  const days = value.inicio && value.fim ? diffDays(value.inicio, value.fim) + 1 : 0

  return (
    <div className={cn('relative', className)}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors bg-white',
          open ? 'border-blue-500 ring-2 ring-blue-100' : 'border-gray-200 hover:border-gray-300'
        )}
      >
        <CalendarRange size={14} className="text-gray-400 shrink-0" />
        <span className="text-gray-700 font-medium">{displayLabel}</span>
        {days > 0 && (
          <span className="text-[11px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full shrink-0">
            {days}d
          </span>
        )}
        <ChevronDown size={13} className={cn('text-gray-400 transition-transform shrink-0', open && 'rotate-180')} />
        {value.inicio && (
          <span onClick={handleClear} className="ml-0.5 text-gray-300 hover:text-gray-500 transition-colors">
            <X size={13} />
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <>
          {/* Overlay para fechar */}
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />

          <div className="absolute right-0 top-full mt-2 z-20 bg-white border border-gray-200 rounded-xl shadow-lg w-80 p-4">

            {/* Presets */}
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Atalhos
            </p>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => handlePreset(p)}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors',
                    activePreset === p.label
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600'
                  )}
                >
                  {p.shortLabel}
                </button>
              ))}
            </div>

            {/* Divider */}
            <div className="flex items-center gap-2 mb-3">
              <div className="flex-1 h-px bg-gray-100" />
              <span className="text-[10px] text-gray-400">ou personalizado</span>
              <div className="flex-1 h-px bg-gray-100" />
            </div>

            {/* Date inputs */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div>
                <label className="text-xs text-gray-500 font-medium block mb-1">De</label>
                <input
                  type="date"
                  value={draft.inicio}
                  max={draft.fim || toISO(today())}
                  onChange={(e) => handleDateChange('inicio', e.target.value)}
                  className={cn(
                    'w-full px-2.5 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 transition-colors',
                    error ? 'border-red-300 focus:ring-red-100' : 'border-gray-200 focus:ring-blue-100 focus:border-blue-400'
                  )}
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium block mb-1">Até</label>
                <input
                  type="date"
                  value={draft.fim}
                  min={draft.inicio}
                  max={draft.inicio ? toISO(addDays(new Date(draft.inicio), MAX_DAYS)) : toISO(today())}
                  onChange={(e) => handleDateChange('fim', e.target.value)}
                  className={cn(
                    'w-full px-2.5 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 transition-colors',
                    error ? 'border-red-300 focus:ring-red-100' : 'border-gray-200 focus:ring-blue-100 focus:border-blue-400'
                  )}
                />
              </div>
            </div>

            {/* Preview de dias */}
            {draft.inicio && draft.fim && !error && (
              <p className="text-xs text-gray-400 mb-3 text-center">
                {diffDays(draft.inicio, draft.fim) + 1} dias selecionados
                {' · '}
                {formatLabel(draft.inicio)} a {formatLabel(draft.fim)}
              </p>
            )}

            {/* Erro */}
            {error && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-3">
                <AlertCircle size={13} className="text-red-500 mt-0.5 shrink-0" />
                <p className="text-xs text-red-700 leading-snug">{error}</p>
              </div>
            )}

            {/* Limite informativo */}
            {!error && (
              <p className="text-[10px] text-gray-400 mb-3 text-center">
                Intervalo máximo: 3 meses ({MAX_DAYS} dias)
              </p>
            )}

            {/* Ações */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleApply}
                disabled={!!error || !draft.inicio || !draft.fim}
                className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-petrol-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed font-medium"
              >
                Aplicar
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
