'use client'

import { useState, useEffect } from 'react'
import { SobreVersao } from '@/components/feedback/sobre-versao'
import {
  User, Store, CreditCard, Bell, Shield, ChevronRight,
  AlertCircle, Mail, Phone,
  Pencil, CheckCircle2, Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface ContaData {
  nome: string; email: string; telefone: string; cargo: string; plano: string; postos: string[]
}
interface NotifPrefs {
  emailBloqueio: boolean; emailFatura: boolean; emailCredito: boolean
  whatsappBloqueio: boolean; whatsappFatura: boolean; whatsappCredito: boolean
}
interface Assinatura {
  plano: string; status: string; statusLabel: string
  quantidade: number; valorUnitario: number; valorTotal: number
  intervalo: string; moeda: string
  proximaCobranca: { data: string; valor: number } | null
  cancelaEm: string | null
}
interface FaturaAssinatura {
  id: string; numero: string; data: string; periodo: string
  valor: number; status: string; statusLabel: string; url: string | null
}
interface AssinaturaData {
  configurado: boolean; assinatura: Assinatura | null; faturas: FaturaAssinatura[]
}

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

// ─── Seções ───────────────────────────────────────────────────────────────────

type Secao = 'conta' | 'plano' | 'notificacoes' | 'seguranca'

const MENU: { id: Secao; label: string; icon: React.ElementType; desc: string }[] = [
  { id: 'conta',         label: 'Minha conta',        icon: User,       desc: 'Dados pessoais e acesso' },
  { id: 'plano',         label: 'Plano e cobrança',    icon: CreditCard, desc: 'Assinatura, faturas e upgrade' },
  { id: 'notificacoes',  label: 'Notificações',         icon: Bell,       desc: 'E-mail, WhatsApp e alertas' },
  { id: 'seguranca',     label: 'Segurança',            icon: Shield,     desc: 'Senha e autenticação' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Campo({ label, value, onEdit }: { label: string; value: string; onEdit?: () => void }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm font-medium text-gray-800 mt-0.5">{value}</p>
      </div>
      {onEdit && (
        <button onClick={onEdit} className="text-gray-300 hover:text-gray-600 transition-colors p-1">
          <Pencil size={13} />
        </button>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ConfiguracoesPage() {
  const [secao, setSecao] = useState<Secao>('conta')
  const [conta, setConta] = useState<ContaData | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [notif, setNotif] = useState<NotifPrefs>({
    emailBloqueio: true,
    emailFatura: true,
    emailCredito: true,
    whatsappBloqueio: false,
    whatsappFatura: true,
    whatsappCredito: false,
  })
  const [salvando, setSalvando] = useState(false)
  const [salvo, setSalvo] = useState(false)
  const [assin, setAssin] = useState<AssinaturaData | null>(null)
  const [loadingAssin, setLoadingAssin] = useState(true)
  const [erroAssin, setErroAssin] = useState('')

  useEffect(() => {
    fetch('/api/posto/configuracoes')
      .then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error); return d })
      .then((d) => { setConta(d.conta); if (d.notificacoes) setNotif(d.notificacoes) })
      .catch((e) => setErro(e instanceof Error ? e.message : 'Erro ao carregar.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetch('/api/posto/assinatura')
      .then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error); return d })
      .then((d) => setAssin(d))
      .catch((e) => setErroAssin(e instanceof Error ? e.message : 'Erro ao carregar assinatura.'))
      .finally(() => setLoadingAssin(false))
  }, [])

  const salvar = async () => {
    setSalvando(true)
    try {
      const res = await fetch('/api/posto/configuracoes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificacoes: notif }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error ?? 'Erro ao salvar.')
      setSalvo(true)
      setTimeout(() => setSalvo(false), 2500)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar.')
      setTimeout(() => setErro(''), 4000)
    } finally {
      setSalvando(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-gray-400">
        <Loader2 size={22} className="animate-spin" /> <span className="text-sm">Carregando configurações…</span>
      </div>
    )
  }
  if (!conta) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-sm text-red-500">
        <AlertCircle size={16} /> {erro || 'Erro ao carregar.'}
      </div>
    )
  }

  const CONTA = conta
  const iniciais = (CONTA.nome || '—').split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
        <p className="text-gray-500 text-sm mt-1">Gerencie sua conta, plano e preferências.</p>
      </div>

      <div className="flex gap-6 items-start">
        {/* Menu lateral */}
        <div className="w-56 shrink-0 bg-white border border-gray-100 rounded-2xl overflow-hidden">
          {MENU.map((m) => {
            const Icon = m.icon
            const ativo = secao === m.id
            return (
              <button
                key={m.id}
                onClick={() => setSecao(m.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-gray-50 last:border-0 ${
                  ativo ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50 text-gray-600'
                }`}
              >
                <Icon size={15} className={ativo ? 'text-blue-600' : 'text-gray-400'} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${ativo ? 'text-blue-700' : 'text-gray-700'}`}>{m.label}</p>
                  <p className="text-[11px] text-gray-400 truncate">{m.desc}</p>
                </div>
                <ChevronRight size={13} className={ativo ? 'text-blue-400' : 'text-gray-200'} />
              </button>
            )
          })}
        </div>

        {/* Conteúdo */}
        <div className="flex-1 min-w-0 bg-white border border-gray-100 rounded-2xl p-6 space-y-6">

          {/* ── Minha Conta ── */}
          {secao === 'conta' && (
            <>
              <div>
                <h2 className="text-base font-semibold text-gray-900 mb-4">Minha conta</h2>
                <div className="flex items-center gap-4 mb-6 pb-5 border-b border-gray-50">
                  <div className="w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-lg font-bold text-white">{iniciais}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{CONTA.nome}</p>
                    <p className="text-sm text-gray-400">{CONTA.cargo} · {CONTA.postos.length} postos</p>
                  </div>
                  <Button variant="secondary" size="sm" className="ml-auto"><Pencil size={13} /> Editar foto</Button>
                </div>
                <Campo label="Nome completo"   value={CONTA.nome}     onEdit={() => {}} />
                <Campo label="E-mail"          value={CONTA.email}    onEdit={() => {}} />
                <Campo label="Telefone"        value={CONTA.telefone} onEdit={() => {}} />
                <Campo label="Cargo"           value={CONTA.cargo}    onEdit={() => {}} />
                <div className="pt-3">
                  <p className="text-xs text-gray-400 mb-2">Postos vinculados</p>
                  <div className="flex gap-2 flex-wrap">
                    {CONTA.postos.map(p => (
                      <span key={p} className="inline-flex items-center gap-1.5 text-xs bg-blue-50 text-blue-700 border border-blue-100 px-2.5 py-1 rounded-full">
                        <Store size={10} /> {p}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ── Plano e Cobrança ── */}
          {secao === 'plano' && (
            <>
              <div>
                <h2 className="text-base font-semibold text-gray-900 mb-1">Plano e cobrança</h2>
                <p className="text-sm text-gray-400 mb-5">Sua assinatura FleetPass e o histórico de faturas.</p>

                {loadingAssin ? (
                  <div className="flex items-center justify-center gap-2 py-12 text-gray-400">
                    <Loader2 size={18} className="animate-spin" /> <span className="text-sm">Carregando assinatura…</span>
                  </div>
                ) : erroAssin ? (
                  <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
                    <AlertCircle size={14} /> {erroAssin}
                  </div>
                ) : !assin?.configurado ? (
                  <div className="flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                    <AlertCircle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-700">A cobrança via Stripe ainda não está configurada neste ambiente.</p>
                  </div>
                ) : !assin.assinatura ? (
                  <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                    <CreditCard size={16} className="text-blue-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-blue-700">Nenhuma assinatura ativa encontrada para esta conta.</p>
                  </div>
                ) : (
                  <>
                    {/* Card da assinatura */}
                    <div className="border border-blue-200 bg-blue-50 rounded-xl p-5 mb-5">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-lg font-bold text-gray-900">{assin.assinatura.plano}</p>
                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                              assin.assinatura.status === 'active' || assin.assinatura.status === 'trialing'
                                ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                            }`}>
                              {assin.assinatura.statusLabel}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500">
                            {assin.assinatura.quantidade} {assin.assinatura.quantidade === 1 ? 'CNPJ' : 'CNPJs'} × {brl(assin.assinatura.valorUnitario)} / {assin.assinatura.intervalo}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-gray-900">{brl(assin.assinatura.valorTotal)}</p>
                          <p className="text-xs text-gray-400">por {assin.assinatura.intervalo}</p>
                        </div>
                      </div>

                      {assin.assinatura.proximaCobranca && (
                        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-blue-100 text-sm text-blue-700">
                          <CreditCard size={14} className="shrink-0" />
                          <span>Próxima cobrança: <strong>{brl(assin.assinatura.proximaCobranca.valor)}</strong> em <strong>{assin.assinatura.proximaCobranca.data}</strong></span>
                        </div>
                      )}
                      {assin.assinatura.cancelaEm && (
                        <div className="flex items-center gap-2 mt-2 text-sm text-amber-700">
                          <AlertCircle size={14} className="shrink-0" />
                          <span>Assinatura será cancelada em <strong>{assin.assinatura.cancelaEm}</strong>.</span>
                        </div>
                      )}
                    </div>

                    {/* Histórico de faturas */}
                    <div>
                      <p className="text-sm font-semibold text-gray-700 mb-3">Histórico de faturas</p>
                      {assin.faturas.length === 0 ? (
                        <p className="text-sm text-gray-400 py-6 text-center border border-gray-100 rounded-xl">Nenhuma fatura emitida ainda.</p>
                      ) : (
                        <div className="border border-gray-100 rounded-xl overflow-hidden">
                          <table className="w-full">
                            <thead>
                              <tr className="text-xs text-gray-400 uppercase tracking-wide bg-gray-50">
                                <th className="px-4 py-2.5 text-left">Fatura</th>
                                <th className="px-4 py-2.5 text-left">Data</th>
                                <th className="px-4 py-2.5 text-right">Valor</th>
                                <th className="px-4 py-2.5 text-center">Status</th>
                                <th className="px-4 py-2.5 text-right"></th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                              {assin.faturas.map(f => (
                                <tr key={f.id} className="hover:bg-gray-50/50">
                                  <td className="px-4 py-3 text-sm text-gray-700">{f.numero}</td>
                                  <td className="px-4 py-3 text-sm text-gray-500">{f.data}</td>
                                  <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">{brl(f.valor)}</td>
                                  <td className="px-4 py-3 text-center">
                                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                                      f.status === 'paid' ? 'bg-emerald-50 text-emerald-700'
                                        : f.status === 'open' ? 'bg-amber-50 text-amber-700'
                                        : 'bg-gray-100 text-gray-500'
                                    }`}>
                                      {f.status === 'paid' && <CheckCircle2 size={10} />} {f.statusLabel}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    {f.url && <a href={f.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline">Ver</a>}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </>
                )}

                <div className="mt-4 pt-4 border-t border-gray-50">
                  <p className="text-xs text-gray-400">
                    A cobrança é por CNPJ ativo — cada posto adicionado entra automaticamente na assinatura.
                    Para cancelar ou emitir nota fiscal, fale com{' '}
                    <a href="mailto:financeiro@fuellink.com.br" className="text-blue-500 hover:underline">financeiro@fuellink.com.br</a>.
                  </p>
                </div>
              </div>
            </>
          )}

          {/* ── Notificações ── */}
          {secao === 'notificacoes' && (
            <>
              <div>
                <h2 className="text-base font-semibold text-gray-900 mb-1">Notificações</h2>
                <p className="text-sm text-gray-400 mb-5">Escolha como deseja ser notificado sobre eventos importantes.</p>

                {([
                  { key: 'Bloqueio', label: 'Bloqueio de parceiro', desc: 'Quando um parceiro for bloqueado automaticamente por limite de crédito.', emailKey: 'emailBloqueio' as const, waKey: 'whatsappBloqueio' as const },
                  { key: 'Fatura',   label: 'Fatura fechada',        desc: 'Quando uma fatura for gerada e enviada a um cliente.',                   emailKey: 'emailFatura'   as const, waKey: 'whatsappFatura'   as const },
                  { key: 'Credito',  label: 'Alerta de crédito',     desc: `Quando um parceiro estiver com menos de R$ 2.000 de crédito restante.`, emailKey: 'emailCredito'  as const, waKey: 'whatsappCredito'  as const },
                ] as const).map(n => (
                  <div key={n.key} className="flex items-start justify-between gap-6 py-4 border-b border-gray-50 last:border-0">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800">{n.label}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{n.desc}</p>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
                        <input type="checkbox" checked={notif[n.emailKey]} onChange={e => setNotif(v => ({ ...v, [n.emailKey]: e.target.checked }))} className="accent-blue-600 w-3.5 h-3.5" />
                        <Mail size={12} /> E-mail
                      </label>
                      <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
                        <input type="checkbox" checked={notif[n.waKey]} onChange={e => setNotif(v => ({ ...v, [n.waKey]: e.target.checked }))} className="accent-green-600 w-3.5 h-3.5" />
                        <Phone size={12} /> WhatsApp
                      </label>
                    </div>
                  </div>
                ))}

                <div className="pt-4 flex items-center gap-3">
                  <Button onClick={salvar} isLoading={salvando} size="sm">
                    {salvo ? <><CheckCircle2 size={13} /> Salvo!</> : 'Salvar preferências'}
                  </Button>
                  {erro && <span className="text-xs text-red-500 flex items-center gap-1"><AlertCircle size={12} /> {erro}</span>}
                </div>
              </div>
            </>
          )}

          {/* ── Segurança ── */}
          {secao === 'seguranca' && (
            <>
              <div>
                <h2 className="text-base font-semibold text-gray-900 mb-1">Segurança</h2>
                <p className="text-sm text-gray-400 mb-5">Gerencie sua senha e autenticação de dois fatores.</p>

                <div className="space-y-4">
                  <div className="border border-gray-100 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-800">Senha</p>
                        <p className="text-xs text-gray-400 mt-0.5">Última alteração há 45 dias.</p>
                      </div>
                      <Button variant="secondary" size="sm">Alterar senha</Button>
                    </div>
                  </div>

                  <div className="border border-gray-100 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-800">Autenticação de dois fatores (2FA)</p>
                        <p className="text-xs text-gray-400 mt-0.5">Proteja sua conta com um código adicional no login.</p>
                      </div>
                      <span className="text-xs text-amber-600 bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-full font-medium">Não ativado</span>
                    </div>
                    <div className="mt-3">
                      <Button size="sm"><Shield size={13} /> Ativar 2FA</Button>
                    </div>
                  </div>

                  <div className="border border-gray-100 rounded-xl p-4">
                    <p className="text-sm font-medium text-gray-800 mb-2">Sessões ativas</p>
                    {[
                      { dispositivo: 'Chrome · Windows 11', local: 'São Paulo, SP', atual: true,  quando: 'Agora' },
                      { dispositivo: 'Safari · iPhone 14',   local: 'São Paulo, SP', atual: false, quando: '2h atrás' },
                    ].map((s, i) => (
                      <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                        <div>
                          <p className="text-xs font-medium text-gray-700">{s.dispositivo}</p>
                          <p className="text-[11px] text-gray-400">{s.local} · {s.quando}</p>
                        </div>
                        {s.atual
                          ? <span className="text-[11px] text-emerald-600 font-medium">Sessão atual</span>
                          : <button className="text-xs text-red-400 hover:text-red-600 transition-colors">Encerrar</button>
                        }
                      </div>
                    ))}
                  </div>

                  <div className="border border-red-100 bg-red-50 rounded-xl p-4">
                    <div className="flex items-start gap-2">
                      <AlertCircle size={14} className="text-red-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-red-700">Zona de risco</p>
                        <p className="text-xs text-red-400 mt-0.5 mb-3">Estas ações são irreversíveis. Proceda com cuidado.</p>
                        <Button variant="secondary" size="sm" className="border-red-200 text-red-600 hover:border-red-300 bg-white">
                          Excluir minha conta
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

        </div>
      </div>

      {/* Sobre — versão instalada e o histórico de novidades. */}
      <div className="space-y-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Sobre</h2>
        <SobreVersao />
      </div>
    </div>
  )
}
