'use client'

import { use, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Fuel, Building2, MapPin, Calendar, User,
  QrCode, CheckCircle2, Copy, Check, AlertTriangle, Lock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ABASTECIMENTOS, formatBRL } from '@/lib/relatorios-data'

type ScanState = 'idle' | 'scanning' | 'done'

const POSTO_MOCK    = 'Shell — Centro'
const ENDERECO_MOCK = 'Av. Paulista, 1000 — São Paulo, SP'

export default function RequisicaoMotoristaPage({
  params,
}: {
  params: Promise<{ codigo: string }>
}) {
  const { codigo } = use(params)
  const router = useRouter()
  const [scanState, setScanState] = useState<ScanState>('idle')
  const [copied, setCopied]       = useState(false)

  const req = ABASTECIMENTOS.find((a) => a.codigo === decodeURIComponent(codigo))

  if (!req) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-sm text-blue-600 font-medium"
        >
          <ArrowLeft size={16} /> Voltar
        </button>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center space-y-3">
          <p className="text-base font-semibold text-gray-800">Requisição não encontrada</p>
          <Button variant="secondary" onClick={() => router.back()}>Voltar</Button>
        </div>
      </div>
    )
  }

  const handleScan = () => {
    setScanState('scanning')
    setTimeout(() => setScanState('done'), 1800)
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(req.codigo).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const isValidada   = req.status === 'faturado'
  const isContestada = req.status === 'contestado'

  const infoRows = [
    { icon: MapPin,    label: 'Posto',       value: POSTO_MOCK },
    { icon: MapPin,    label: 'Endereço',    value: ENDERECO_MOCK, small: true },
    { icon: Building2, label: 'Empresa',     value: req.empresa },
    { icon: User,      label: 'Motorista',   value: req.motorista },
    { icon: Fuel,      label: 'Combustível', value: `${req.combustivel} · ${req.litros} L` },
    { icon: Fuel,      label: 'Valor total', value: formatBRL(req.valor), highlight: true },
    { icon: Calendar,  label: 'Data',        value: req.data },
  ]

  return (
    <div className="space-y-4">
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-2 text-sm text-blue-600 font-medium"
      >
        <ArrowLeft size={16} /> Voltar
      </button>

      {/* Status banner */}
      {isValidada ? (
        <div className="bg-emerald-500 text-white rounded-2xl px-5 py-4 flex items-center gap-3">
          <CheckCircle2 size={22} />
          <div>
            <p className="font-bold text-base">Abastecimento validado</p>
            <p className="text-emerald-100 text-xs mt-0.5">Esta requisição foi confirmada pelo frentista.</p>
          </div>
        </div>
      ) : isContestada ? (
        <div className="bg-red-500 text-white rounded-2xl px-5 py-4 flex items-center gap-3">
          <AlertTriangle size={22} />
          <div>
            <p className="font-bold text-base">Requisição contestada</p>
            <p className="text-red-100 text-xs mt-0.5">Entre em contato com o responsável da empresa.</p>
          </div>
        </div>
      ) : (
        <div className="bg-blue-600 text-white rounded-2xl px-5 py-4 flex items-center gap-3">
          <QrCode size={22} />
          <div>
            <p className="font-bold text-base">Requisição disponível</p>
            <p className="text-blue-100 text-xs mt-0.5">Escaneie o QR Code do frentista para liberar.</p>
          </div>
        </div>
      )}

      {/* Info */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
        {infoRows.map((item) => (
          <div key={item.label} className="flex items-center gap-3 px-5 py-3.5">
            <div className="w-8 h-8 bg-gray-100 rounded-xl flex items-center justify-center shrink-0">
              <item.icon size={15} className="text-gray-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-gray-400">{item.label}</p>
              <p
                className={`text-sm font-medium ${
                  item.highlight ? 'text-blue-700 font-bold' : 'text-gray-900'
                } ${item.small ? 'text-xs text-gray-500' : ''}`}
              >
                {item.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Validated: read-only notice ── */}
      {isValidada && (
        <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm p-5 flex items-center gap-3">
          <Lock size={16} className="text-emerald-500 shrink-0" />
          <p className="text-sm text-emerald-700">
            Esta requisição foi validada. Nenhuma alteração é permitida.
          </p>
        </div>
      )}

      {/* ── Contested notice ── */}
      {isContestada && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex items-start gap-3">
          <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 leading-relaxed">
            Esta requisição está contestada. Entre em contato com o responsável da sua empresa para resolver a situação.
          </p>
        </div>
      )}

      {/* ── Pending: scan flow ── */}
      {!isValidada && !isContestada && (
        <>
          {scanState === 'idle' && (
            <button
              onClick={handleScan}
              className="w-full bg-blue-600 hover:bg-blue-700 dark:hover:bg-petrol-500 active:scale-95 text-white font-semibold text-sm rounded-2xl h-14 flex items-center justify-center gap-2 transition-all shadow-sm shadow-blue-300"
            >
              <QrCode size={18} /> Escanear QR Code do Frentista
            </button>
          )}

          {scanState === 'scanning' && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 flex flex-col items-center gap-3">
              <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-medium text-gray-600">Escaneando QR Code…</p>
              <p className="text-xs text-gray-400 text-center">
                Aponte a câmera para o QR Code gerado pelo frentista
              </p>
            </div>
          )}

          {scanState === 'done' && (
            <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm p-5 space-y-4">
              <div className="flex items-center gap-2 text-emerald-600">
                <CheckCircle2 size={16} />
                <p className="text-sm font-semibold">QR Code lido com sucesso!</p>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <p className="text-xs text-gray-400 mb-1">Código para o frentista</p>
                <p className="text-2xl font-mono font-bold text-gray-900 tracking-widest">
                  {req.codigo}
                </p>
              </div>

              <button
                onClick={handleCopy}
                className="w-full flex items-center justify-center gap-2 border border-gray-200 rounded-xl py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                {copied ? <Check size={15} className="text-emerald-500" /> : <Copy size={15} />}
                {copied ? 'Copiado!' : 'Copiar código'}
              </button>

              <p className="text-xs text-gray-400 text-center leading-relaxed">
                Passe este código para o frentista digitar no sistema para liberar o abastecimento.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
