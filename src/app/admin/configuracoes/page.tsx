'use client'

import { useState, useEffect, useCallback } from 'react'
import { SobreVersao } from '@/components/feedback/sobre-versao'
import { Card, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Webhook, Bell, CheckCircle2,
  AlertCircle, RefreshCw,
} from 'lucide-react'

interface EnvVar { key: string; label: string; status: boolean }
interface EnvGroups { asaas: EnvVar[]; supabase: EnvVar[]; stripe: EnvVar[]; outros: EnvVar[] }

function EnvVarList({ vars, loading }: { vars: EnvVar[]; loading: boolean }) {
  if (loading && vars.length === 0) {
    return <p className="text-xs text-gray-400 py-2">Verificando…</p>
  }
  return (
    <div className="space-y-2">
      {vars.map((v) => (
        <div key={v.key} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
          <div className="flex items-center gap-3">
            {v.status
              ? <CheckCircle2 size={16} className="text-green-500 shrink-0" />
              : <AlertCircle size={16} className="text-red-500 shrink-0" />}
            <div>
              <p className="text-sm font-medium text-gray-800">{v.label}</p>
              <p className="text-xs font-mono text-gray-400">{v.key}</p>
            </div>
          </div>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${v.status ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
            {v.status ? 'Configurada' : 'Ausente'}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function ConfiguracoesAdminPage() {
  const [webhookUrl, setWebhookUrl] = useState('https://app.fuellink.com.br/api/webhooks/asaas')
  const [notifEmail, setNotifEmail] = useState(true)
  const [notifContestacao, setNotifContestacao] = useState(true)
  const [notifLimiteCredito, setNotifLimiteCredito] = useState(false)

  const [envGroups, setEnvGroups] = useState<EnvGroups>({ asaas: [], supabase: [], stripe: [], outros: [] })
  const [envLoading, setEnvLoading] = useState(true)

  const fetchEnv = useCallback(async () => {
    setEnvLoading(true)
    try {
      const res = await fetch('/api/admin/env-status')
      const data = await res.json()
      if (res.ok) setEnvGroups(data)
    } finally {
      setEnvLoading(false)
    }
  }, [])

  useEffect(() => { fetchEnv() }, [fetchEnv])

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configurações da plataforma</h1>
          <p className="text-sm text-gray-500 mt-0.5">Parâmetros globais, planos e integrações</p>
        </div>
      </div>

      {/* Asaas integration */}
      <Card>
        <CardHeader
          title="Integração Asaas"
          subtitle="Status das variáveis de ambiente para a integração com o gateway de pagamentos"
          action={
            <button
              onClick={fetchEnv}
              disabled={envLoading}
              className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 disabled:opacity-40"
            >
              <RefreshCw size={13} className={envLoading ? 'animate-spin' : ''} />
              {envLoading ? 'Verificando…' : 'Verificar'}
            </button>
          }
        />
        <EnvVarList vars={envGroups.asaas} loading={envLoading} />
      </Card>

      {/* Supabase */}
      <Card>
        <CardHeader
          title="Supabase"
          subtitle="Status das variáveis de ambiente para a conexão com o banco de dados"
        />
        <EnvVarList vars={envGroups.supabase} loading={envLoading} />
      </Card>

      {/* Stripe */}
      <Card>
        <CardHeader
          title="Stripe"
          subtitle="Variáveis de ambiente para cobrança recorrente e webhooks de assinatura"
          action={
            <a href="/admin/planos" className="text-xs text-indigo-600 hover:text-indigo-800">
              Gerenciar planos →
            </a>
          }
        />
        <EnvVarList vars={envGroups.stripe} loading={envLoading} />
      </Card>

      {/* Webhook */}
      <Card>
        <CardHeader
          title="Webhook URL"
          subtitle="Endpoint que recebe notificações do Asaas (pagamentos, transferências, etc.)"
        />
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Webhook size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="url"
              value={webhookUrl}
              onChange={e => setWebhookUrl(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm font-mono border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <Button variant="secondary" size="md">Testar webhook</Button>
        </div>
        <p className="text-xs text-gray-400 mt-2">Configure este URL no painel do Asaas em: Minha conta → Integrações → Webhooks</p>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader title="Notificações do sistema" subtitle="Configure quais eventos disparam alertas para o time de operações" />
        <div className="space-y-3">
          {[
            { key: 'email', label: 'Enviar alertas por e-mail', sub: 'Notificações enviadas para o e-mail administrativo', value: notifEmail, set: setNotifEmail },
            { key: 'contestacao', label: 'Transação contestada', sub: 'Quando uma empresa contesta um pagamento processado', value: notifContestacao, set: setNotifContestacao },
            { key: 'credito', label: 'Empresa próxima ao limite de crédito', sub: 'Quando uma empresa atingir 80% do limite configurado', value: notifLimiteCredito, set: setNotifLimiteCredito },
          ].map((n) => (
            <label key={n.key} className="flex items-start justify-between gap-4 py-3 border-b border-gray-50 last:border-0 cursor-pointer">
              <div className="flex items-start gap-3">
                <Bell size={16} className="text-indigo-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-800">{n.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{n.sub}</p>
                </div>
              </div>
              <div className="relative shrink-0 mt-0.5">
                <input
                  type="checkbox"
                  checked={n.value}
                  onChange={e => n.set(e.target.checked)}
                  className="sr-only peer"
                />
                <div
                  onClick={() => n.set(!n.value)}
                  className={`w-10 h-6 rounded-full cursor-pointer transition-colors ${n.value ? 'bg-indigo-600' : 'bg-gray-200'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${n.value ? 'left-5' : 'left-1'}`} />
                </div>
              </div>
            </label>
          ))}
        </div>
      </Card>

      {/* Sobre — versão instalada e o histórico de novidades. */}
      <div className="space-y-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Sobre</h2>
        <SobreVersao />
      </div>
    </div>
  )
}
