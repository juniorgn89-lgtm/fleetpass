'use client'

import { useState } from 'react'
import { Logo } from '@/components/ui/logo'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  CheckCircle, ChevronRight, Eye, EyeOff, Building2, AlertCircle,
  ShieldCheck, Ban, Truck, MapPin, ArrowLeft,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { cn, maskTelefone } from '@/lib/utils'
import { maskCpfCnpj, isCpfCnpjValid, limparDoc, tamanhoEsperado } from '@/lib/documento'

const SEGMENTS = [
  'Transportadora', 'Logística', 'Construção Civil', 'Agronegócio',
  'Comércio', 'Prestação de Serviços', 'Outros',
]

const STATES = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
  'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO',
]

const ease = [0.22, 1, 0.36, 1] as const

const GANHOS = [
  { icon: ShieldCheck, label: 'Liberação prévia', desc: 'Nada abastece sem a sua aprovação.' },
  { icon: Ban,         label: 'Zero abastecimento fantasma', desc: 'Você paga só o que autorizou.' },
  { icon: Truck,       label: 'Controle da frota', desc: 'Veículos, motoristas e limites num só lugar.' },
  { icon: MapPin,      label: 'Rede de postos', desc: 'Encontre parceiros na sua rota.' },
]

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ]
  const strength = checks.filter(Boolean).length
  const labels = ['', 'Fraca', 'Regular', 'Boa', 'Forte']
  const colors = ['', 'bg-red-400', 'bg-amber-400', 'bg-blue-400', 'bg-emerald-500']
  if (!password) return null
  return (
    <div className="mt-2">
      <div className="flex gap-1 mb-1">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className={cn('h-1 flex-1 rounded-full transition-colors', i <= strength ? colors[strength] : 'bg-gray-100')} />
        ))}
      </div>
      <p className="text-xs text-gray-500">Senha {labels[strength]}</p>
    </div>
  )
}

export default function CadastroEmpresaPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    nomeEmpresa: '', cnpj: '', segmento: '', cidade: '', estado: '',
    nomeCompleto: '', email: '', telefone: '', cargo: '', senha: '', confirmarSenha: '',
  })

  const update = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }))

  const senhaError = form.confirmarSenha && form.confirmarSenha !== form.senha
    ? 'As senhas não coincidem'
    : undefined

  const docCompleto = limparDoc(form.cnpj).length === tamanhoEsperado(form.cnpj)
  const docValido = isCpfCnpjValid(form.cnpj)
  const cnpjError = form.cnpj && docCompleto && !docValido
    ? 'CNPJ/CPF inválido — confira o número.'
    : undefined

  const step1Valid = !!(form.nomeEmpresa && docValido && form.segmento && form.cidade && form.estado)
  const step2Valid = !!(form.nomeCompleto && form.email && form.senha && form.senha.length >= 6 && !senhaError)

  const handleCriarConta = async () => {
    if (!step2Valid) return
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/cadastro/empresa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nomeCompleto: form.nomeCompleto,
          email:        form.email,
          senha:        form.senha,
          telefone:     form.telefone,
          cargo:        form.cargo,
          nomeEmpresa:  form.nomeEmpresa,
          cnpj:         form.cnpj,
          segmento:     form.segmento,
          cidade:       form.cidade,
          estado:       form.estado,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Erro ao criar conta. Tente novamente.')
        return
      }

      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.senha,
      })
      if (loginError) {
        router.push('/login?cadastro=ok')
        return
      }

      setStep(3)
    } catch {
      setError('Erro de conexão. Verifique sua internet e tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const steps = [
    { n: 1, label: 'Empresa' },
    { n: 2, label: 'Responsável' },
    { n: 3, label: 'Concluído' },
  ]

  return (
    <div className="h-screen flex overflow-hidden">
      {/* ── Left panel — vitrine para transportadoras ────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-petrol-950">
        <div className="absolute inset-0 bg-gradient-to-br from-petrol-900 via-petrol-950 to-[#03161a]" />
        <div className="absolute inset-0 bg-grid opacity-[0.06]" />
        <motion.div
          aria-hidden
          className="absolute -top-32 -left-24 w-96 h-96 rounded-full bg-petrol-500/20 blur-3xl"
          animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          aria-hidden
          className="absolute -bottom-24 -right-20 w-[30rem] h-[30rem] rounded-full bg-fuel-500/15 blur-3xl"
          animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.65, 0.4] }}
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
                <Truck size={13} className="text-fuel-300" />
                Cadastro de transportadora
              </span>
              <h2 className="mt-4 text-3xl xl:text-[2.5rem] font-bold leading-[1.1] tracking-tight text-white">
                Coloque sua frota<br />
                <span className="text-fuel-400">no controle.</span>
              </h2>
              <p className="mt-3 text-petrol-100/70 text-[15px] leading-relaxed max-w-md">
                Cadastre veículos e motoristas, conecte-se aos postos que convidam sua frota
                e libere cada abastecimento antes de ele acontecer. Pague só o que você autorizou.
              </p>
            </motion.div>

            {/* card de ganhos */}
            <motion.div
              initial={{ opacity: 0, y: 26 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease, delay: 0.25 }}
              className="mt-6 max-w-sm rounded-2xl bg-white/[0.07] border border-white/10 backdrop-blur-md p-4 shadow-2xl shadow-black/40"
            >
              <p className="text-[11px] font-semibold uppercase tracking-wider text-petrol-100/50 mb-3">
                O que sua transportadora ganha
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
            Cadastro gratuito · sem mensalidade para começar
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

          {/* Progress */}
          {step < 3 && (
            <div className="mb-6">
              <div className="flex items-center justify-center gap-2 mb-4">
                {steps.map((s, i) => (
                  <div key={s.n} className="flex items-center gap-2">
                    <div className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                      step > s.n ? 'bg-emerald-500 text-white' :
                      step === s.n ? 'bg-blue-600 text-white' :
                      'bg-gray-100 text-gray-400'
                    )}>
                      {step > s.n ? <CheckCircle size={16} /> : s.n}
                    </div>
                    <span className={cn('text-sm', step === s.n ? 'text-gray-900 font-medium' : 'text-gray-400')}>
                      {s.label}
                    </span>
                    {i < steps.length - 2 && <ChevronRight size={14} className="text-gray-200 mx-1" />}
                  </div>
                ))}
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full">
                <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${((step - 1) / 2) * 100}%` }} />
              </div>
            </div>
          )}

          <div>

            {/* Step 1 — Dados da empresa */}
            {step === 1 && (
              <div>
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
                    <Building2 size={20} className="text-blue-600" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-gray-900">Dados da empresa</h1>
                    <p className="text-sm text-gray-400">Informe os dados da sua empresa.</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <Input
                    label="Nome da empresa"
                    placeholder="TransLog Transportes Ltda."
                    value={form.nomeEmpresa}
                    onChange={(e) => update('nomeEmpresa', e.target.value)}
                  />
                  <Input
                    label="CNPJ ou CPF"
                    placeholder="00.000.000/0001-00"
                    value={form.cnpj}
                    onChange={(e) => update('cnpj', maskCpfCnpj(e.target.value))}
                    error={cnpjError}
                    helperText="Aceita CPF, CNPJ e o novo CNPJ alfanumérico"
                    maxLength={18}
                    autoCapitalize="characters"
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Segmento</label>
                    <select
                      className="w-full px-3 py-2.5 text-sm text-gray-900 bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50"
                      value={form.segmento}
                      onChange={(e) => update('segmento', e.target.value)}
                    >
                      <option value="">Selecione o segmento</option>
                      {SEGMENTS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <Input
                        label="Cidade"
                        placeholder="São Paulo"
                        value={form.cidade}
                        onChange={(e) => update('cidade', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Estado</label>
                      <select
                        className="w-full px-3 py-2.5 text-sm text-gray-900 bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50"
                        value={form.estado}
                        onChange={(e) => update('estado', e.target.value)}
                      >
                        <option value="">UF</option>
                        {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                  <Button className="w-full mt-2" onClick={() => setStep(2)} disabled={!step1Valid}>
                    Continuar
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2 — Dados do responsável */}
            {step === 2 && (
              <div>
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
                    <Building2 size={20} className="text-blue-600" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-gray-900">Dados do responsável</h1>
                    <p className="text-sm text-gray-400">Quem vai administrar a conta.</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <Input
                    label="Nome completo"
                    placeholder="João da Silva"
                    value={form.nomeCompleto}
                    onChange={(e) => update('nomeCompleto', e.target.value)}
                  />
                  <Input
                    label="Email"
                    type="email"
                    placeholder="joao@translog.com.br"
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
                      placeholder="Gerente de Frota"
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
                    <PasswordStrength password={form.senha} />
                  </div>
                  <Input
                    label="Confirmar senha"
                    type="password"
                    placeholder="••••••••"
                    value={form.confirmarSenha}
                    onChange={(e) => update('confirmarSenha', e.target.value)}
                    error={senhaError}
                  />

                  {error && (
                    <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2.5">
                      <AlertCircle size={13} className="shrink-0" /> {error}
                    </div>
                  )}

                  <div className="flex gap-3 mt-2">
                    <Button variant="secondary" className="flex-1" onClick={() => { setStep(1); setError('') }}>
                      Voltar
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={handleCriarConta}
                      disabled={!step2Valid || loading}
                      isLoading={loading}
                    >
                      Criar conta
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3 — Sucesso */}
            {step === 3 && (
              <div className="text-center py-4">
                <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-5">
                  <CheckCircle size={32} className="text-emerald-500" />
                </div>
                <h1 className="text-xl font-bold text-gray-900 mb-2">Conta criada!</h1>
                <p className="text-gray-500 text-sm mb-1">
                  Bem-vindo ao FleetPass, <strong>{form.nomeCompleto}</strong>!
                </p>
                <p className="text-gray-400 text-sm mb-8">
                  <strong>{form.nomeEmpresa}</strong> está pronta para encontrar postos parceiros.
                </p>
                <Button className="w-full" size="lg" onClick={() => router.push('/empresa')}>
                  Ir para o painel
                </Button>
              </div>
            )}
          </div>

          {step < 3 && (
            <p className="text-center text-sm text-gray-400 mt-4">
              Já tem uma conta?{' '}
              <Link href="/login" className="text-blue-600 hover:underline">Entrar</Link>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
