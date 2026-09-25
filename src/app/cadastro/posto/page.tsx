'use client'

import { useState, useEffect } from 'react'
import { Logo } from '@/components/ui/logo'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Fuel, Eye, EyeOff, Store, Info, Check, AlertCircle, Globe, Loader2,
  BadgeCheck, HandCoins, ShieldCheck, Users, CheckCircle, ArrowLeft,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { maskTelefone } from '@/lib/utils'

// ─── Plans ─────────────────────────────────────────────────────────────────

type Plan = {
  id: string
  stripeProductId: string
  stripePriceId: string
  nome: string
  descricao: string
  valor: number
  maxPostos: string | null
  popular: boolean
}

const ease = [0.22, 1, 0.36, 1] as const

const GANHOS = [
  { icon: BadgeCheck,  label: 'Pré-aprovado', desc: 'Já chega reconhecido, com prova registrada.' },
  { icon: HandCoins,   label: 'Recebimento garantido', desc: 'Sem inadimplência surpresa no fim do mês.' },
  { icon: ShieldCheck, label: 'Fim do calote', desc: 'Sem assinatura negada nem contestação.' },
  { icon: Users,       label: 'Clientes recorrentes', desc: 'Frotas B2B abastecendo no seu posto.' },
]

// ─── Step indicator ─────────────────────────────────────────────────────────

function StepDots({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-2 mb-6">
      {[1, 2].map((n) => (
        <div
          key={n}
          className={`h-1.5 rounded-full transition-all ${
            n === step ? 'w-8 bg-blue-600' : n < step ? 'w-4 bg-blue-300' : 'w-4 bg-gray-200'
          }`}
        />
      ))}
      <span className="text-xs text-gray-400 ml-1">Passo {step} de 2</span>
    </div>
  )
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function CadastroPostoPage() {
  const [step, setStep] = useState(1)
  const [showPassword, setShowPassword] = useState(false)
  const [form, setForm] = useState({
    nome: '', email: '', telefone: '', cargo: '', senha: '', confirmarSenha: '',
  })
  const [plans, setPlans] = useState<Plan[]>([])
  const [plansLoading, setPlansLoading] = useState(true)
  const [plansError, setPlansError] = useState('')
  const [selectedPlan, setSelectedPlan] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [checkoutError, setCheckoutError] = useState('')

  useEffect(() => {
    fetch('/api/planos')
      .then(r => r.json())
      .then(data => {
        if (data.planos?.length) {
          setPlans(data.planos)
          const popular = data.planos.find((p: Plan) => p.popular)
          setSelectedPlan(popular?.id ?? data.planos[0].id)
        } else {
          setPlansError('Nenhum plano disponível no momento.')
        }
      })
      .catch(() => setPlansError('Erro ao carregar planos. Tente novamente.'))
      .finally(() => setPlansLoading(false))
  }, [])

  const update = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }))

  const senhaError = form.confirmarSenha && form.confirmarSenha !== form.senha
    ? 'As senhas não coincidem'
    : undefined

  const step1Valid = form.nome && form.email && form.senha && !senhaError

  async function handleAssinar() {
    setCheckoutError('')
    setLoading(true)
    try {
      const cadastroRes = await fetch('/api/cadastro/posto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome:     form.nome,
          email:    form.email,
          senha:    form.senha,
          telefone: form.telefone,
          cargo:    form.cargo,
        }),
      })
      const cadastroData = await cadastroRes.json()
      if (!cadastroRes.ok) {
        setCheckoutError(cadastroData.error ?? 'Erro ao criar conta. Tente novamente.')
        setLoading(false)
        return
      }

      const plan = plans.find(p => p.id === selectedPlan)
      const checkoutRes = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId:  selectedPlan,
          priceId: plan?.stripePriceId,
          email:   form.email,
          nome:    form.nome,
        }),
      })
      const checkoutData = await checkoutRes.json()
      if (!checkoutRes.ok || !checkoutData.url) {
        setCheckoutError(checkoutData.error ?? 'Erro ao iniciar pagamento. Tente novamente.')
        setLoading(false)
        return
      }

      window.location.href = checkoutData.url
    } catch {
      setCheckoutError('Erro de conexão. Verifique sua internet e tente novamente.')
      setLoading(false)
    }
  }

  return (
    <div className="h-screen flex overflow-hidden">
      {/* ── Left panel — vitrine para postos ─────────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-petrol-950">
        <div className="absolute inset-0 bg-gradient-to-br from-petrol-900 via-petrol-950 to-[#03161a]" />
        <div className="absolute inset-0 bg-grid opacity-[0.06]" />
        <motion.div
          aria-hidden
          className="absolute -top-32 -left-24 w-96 h-96 rounded-full bg-fuel-500/15 blur-3xl"
          animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          aria-hidden
          className="absolute -bottom-24 -right-20 w-[30rem] h-[30rem] rounded-full bg-petrol-500/20 blur-3xl"
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.75, 0.5] }}
          transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        />

        <div className="relative z-10 flex flex-col justify-center gap-8 w-full max-w-xl mx-auto p-8 xl:p-10 overflow-y-auto">
          {/* logo */}
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease }}>
            <Link href="/" className="flex items-center gap-2.5">
              <Logo tamanho={36} variante="claro" />
            </Link>
          </motion.div>

          {/* headline + ganhos */}
          <div>
            <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease, delay: 0.1 }}>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/10 px-3 py-1.5 text-xs font-semibold text-petrol-100">
                <Fuel size={13} className="text-fuel-300" />
                Cadastro de posto
              </span>
              <h2 className="mt-4 text-3xl xl:text-[2.5rem] font-bold leading-[1.1] tracking-tight text-white">
                O que sai da bomba,<br />
                <span className="text-fuel-400">você recebe.</span>
              </h2>
              <p className="mt-3 text-petrol-100/70 text-[15px] leading-relaxed max-w-md">
                Todo abastecimento chega pré-aprovado pela transportadora. Nada de assinatura
                negada, contestação ou inadimplência surpresa.
              </p>
            </motion.div>

            {/* card de ganhos */}
            <motion.div
              initial={{ opacity: 0, y: 26 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease, delay: 0.25 }}
              className="mt-6 max-w-sm rounded-2xl bg-white/[0.07] border border-white/10 backdrop-blur-md p-4 shadow-2xl shadow-black/40"
            >
              <p className="text-[11px] font-semibold uppercase tracking-wider text-petrol-100/50 mb-3">
                O que o seu posto ganha
              </p>
              <div className="space-y-3">
                {GANHOS.map((g) => (
                  <div key={g.label} className="flex items-start gap-3">
                    <span className="w-8 h-8 rounded-lg bg-fuel-500/15 flex items-center justify-center shrink-0">
                      <g.icon size={16} className="text-fuel-300" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white">{g.label}</p>
                      <p className="text-xs text-petrol-100/60 leading-snug">{g.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* rodapé */}
          <motion.div
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease, delay: 0.45 }}
            className="flex items-center gap-2 text-sm text-petrol-100/70"
          >
            <CheckCircle size={16} className="text-fuel-300" />
            Cadastro gratuito · pague só por CNPJ cadastrado
          </motion.div>
        </div>
      </div>

      {/* ── Right panel — formulário ─────────────────────────────────────── */}
      <div className="relative flex-1 flex items-center justify-center bg-white p-6 overflow-y-auto">
        <Link
          href="/"
          className="absolute top-5 left-5 z-20 inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft size={16} /> Voltar ao início
        </Link>
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <Link href="/" className="flex lg:hidden items-center gap-2 justify-center mb-6">
            <Logo tamanho={32} />
          </Link>

          {/* Step 1 — dados da conta */}
          {step === 1 && (
            <div>
              <StepDots step={1} />

              <div className="flex items-center gap-3 mb-5">
                <div className="w-11 h-11 bg-amber-50 rounded-xl flex items-center justify-center shrink-0">
                  <Store size={21} className="text-amber-500" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Criar conta de posto</h1>
                  <p className="text-sm text-gray-400">Você cadastra seus postos no painel.</p>
                </div>
              </div>

              <div className="space-y-3">
                <Input
                  label="Nome completo"
                  placeholder="Maria Andrade"
                  value={form.nome}
                  onChange={(e) => update('nome', e.target.value)}
                />
                <Input
                  label="Email"
                  type="email"
                  placeholder="maria@suaempresa.com.br"
                  value={form.email}
                  onChange={(e) => update('email', e.target.value)}
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Telefone"
                    placeholder="(11) 99999-9999"
                    value={form.telefone}
                    onChange={(e) => update('telefone', maskTelefone(e.target.value))}
                    maxLength={15}
                    inputMode="tel"
                  />
                  <Input
                    label="Cargo"
                    placeholder="Proprietário"
                    value={form.cargo}
                    onChange={(e) => update('cargo', e.target.value)}
                  />
                </div>
                <div className="relative">
                  <Input
                    label="Senha"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={form.senha}
                    onChange={(e) => update('senha', e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-9 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <Input
                  label="Confirmar senha"
                  type="password"
                  placeholder="••••••••"
                  value={form.confirmarSenha}
                  onChange={(e) => update('confirmarSenha', e.target.value)}
                  error={senhaError}
                />

                <div className="flex items-start gap-2.5 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                  <Info size={14} className="text-blue-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-blue-800 leading-relaxed">
                    <strong>Gerencie múltiplos postos</strong> em uma única conta. A cobrança é por CNPJ: cada posto que você adicionar entra na assinatura.
                  </p>
                </div>

                <Button
                  className="w-full mt-1"
                  onClick={() => setStep(2)}
                  disabled={!step1Valid}
                >
                  Próximo — assinatura
                </Button>
              </div>

              <p className="mt-5 text-sm text-gray-400 text-center">
                Já tem uma conta?{' '}
                <Link href="/login" className="text-blue-600 hover:underline">Entrar</Link>
              </p>
            </div>
          )}

          {/* Step 2 — assinatura */}
          {step === 2 && (
            <div>
              <StepDots step={2} />

              <div className="mb-5">
                <h1 className="text-xl font-bold text-gray-900">Sua assinatura</h1>
                <p className="text-sm text-gray-400 mt-0.5">
                  Você paga por CNPJ (posto) cadastrado. Comece com o primeiro e adicione quantos
                  quiser no painel — cada CNPJ entra na cobrança. Sem teto de postos.
                </p>
              </div>

              {plansLoading && (
                <div className="flex items-center justify-center gap-2 py-12 text-gray-400">
                  <Loader2 size={20} className="animate-spin" />
                  <span className="text-sm">Carregando planos…</span>
                </div>
              )}

              {plansError && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-4">
                  <AlertCircle size={15} className="shrink-0" /> {plansError}
                </div>
              )}

              {!plansLoading && !plansError && (
                <>
                  <div className={plans.length === 1 ? 'mb-5' : 'grid gap-4 mb-5 grid-cols-2'}>
                    {plans.map((plan) => {
                      const isSelected = selectedPlan === plan.id
                      return (
                        <button
                          key={plan.id}
                          onClick={() => setSelectedPlan(plan.id)}
                          className={`relative w-full text-left rounded-xl border-2 p-5 transition-all ${
                            isSelected
                              ? 'border-blue-500 bg-blue-50 shadow-sm shadow-blue-100'
                              : 'border-gray-200 bg-white hover:border-gray-300'
                          }`}
                        >
                          {plan.popular && (
                            <div className="absolute -top-3 left-5">
                              <span className="bg-blue-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wide whitespace-nowrap">
                                Plano único
                              </span>
                            </div>
                          )}

                          <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center mb-3">
                            <Store size={17} className="text-blue-500" />
                          </div>

                          <p className="font-semibold text-gray-900 mb-0.5">{plan.nome}</p>
                          <div className="flex items-baseline gap-0.5 mb-1">
                            <span className="text-xs text-gray-400">R$</span>
                            <span className="text-2xl font-bold text-gray-900">
                              {plan.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                            <span className="text-xs text-gray-400">/CNPJ·mês</span>
                          </div>
                          <p className="text-xs text-gray-500 mb-3">Cobrado por CNPJ cadastrado</p>

                          {plan.descricao && (
                            <p className="text-xs text-gray-400 leading-relaxed">{plan.descricao}</p>
                          )}

                          {isSelected && (
                            <div className="absolute top-3 right-3 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                              <Check size={11} className="text-white" />
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </div>

                  {(() => {
                    const plan = plans.find((p) => p.id === selectedPlan)
                    if (!plan) return null
                    return (
                      <div className="flex items-center gap-3 p-4 bg-gray-50 border border-gray-100 rounded-xl mb-4">
                        <Globe size={16} className="text-gray-400 shrink-0" />
                        <div>
                          <p className="text-sm font-semibold text-gray-800">
                            R$ {plan.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} por CNPJ/mês
                          </p>
                          <p className="text-xs text-gray-400">
                            Começa com 1 CNPJ · cada posto soma na cobrança · cancele quando quiser
                          </p>
                        </div>
                      </div>
                    )
                  })()}
                </>
              )}

              {checkoutError && (
                <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2.5 mb-4">
                  <AlertCircle size={13} className="shrink-0" /> {checkoutError}
                </div>
              )}

              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => { setStep(1); setCheckoutError('') }}>
                  ← Voltar
                </Button>
                <Button className="flex-1" onClick={handleAssinar} isLoading={loading} disabled={!selectedPlan || plansLoading}>
                  Assinar e pagar →
                </Button>
              </div>

              <p className="text-center text-xs text-gray-400 mt-4">
                Pagamento seguro processado pelo Stripe.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
