'use client'

import { useState } from 'react'
import { Logo } from '@/components/ui/logo'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Eye, EyeOff, ShieldCheck, CheckCircle2, Car, Fuel, Hash, MapPin, ScanLine, BadgeCheck, ArrowLeft,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'

const ROLE_REDIRECT: Record<string, string> = {
  empresa:   '/empresa',
  posto:     '/posto',
  frentista: '/frentista/validar',
  motorista: '/empresa',
  admin:     '/admin',
}

const ease = [0.22, 1, 0.36, 1] as const

export default function LoginPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (!authError && authData.user) {
      const { data: perfil } = await supabase
        .from('perfis')
        .select('role')
        .eq('id', authData.user.id)
        .single()

      const redirect = ROLE_REDIRECT[perfil?.role ?? ''] ?? '/empresa'
      router.push(redirect)
      return
    }

    setError('Email ou senha incorretos.')
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex">
      {/* ── Left panel — vitrine do produto ──────────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-petrol-950">
        {/* fundo: gradiente + grade + brilhos */}
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

        {/* conteúdo */}
        <div className="relative z-10 flex flex-col justify-between w-full max-w-xl mx-auto p-12 xl:p-14">
          {/* logo */}
          <motion.div
            initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease }}
          >
            <Link href="/" className="flex items-center gap-2.5">
              <Logo tamanho={36} variante="claro" />
            </Link>
          </motion.div>

          {/* centro: headline + mockup */}
          <div className="py-8">
            <motion.div
              initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease, delay: 0.1 }}
            >
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/10 px-3 py-1.5 text-xs font-semibold text-petrol-100">
                <ShieldCheck size={13} className="text-fuel-300" />
                Abastecimento pré-aprovado
              </span>
              <h2 className="mt-5 text-4xl xl:text-[2.75rem] font-bold leading-[1.1] tracking-tight text-white">
                Cada abastecimento,<br />
                <span className="text-fuel-400">já nasce reconhecido.</span>
              </h2>
              <p className="mt-4 text-petrol-100/70 text-[15px] leading-relaxed max-w-md">
                O posto recebe com prova registrada; a frota paga só o que autorizou.
                Sem calote, sem contestação, sem abastecimento fantasma.
              </p>
            </motion.div>

            {/* card de produto em vidro */}
            <motion.div
              initial={{ opacity: 0, y: 26 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease, delay: 0.25 }}
              className="mt-9 relative max-w-sm"
            >
              <motion.div
                animate={{ y: [0, -7, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                className="rounded-2xl bg-white/[0.07] border border-white/10 backdrop-blur-md p-5 shadow-2xl shadow-black/40"
              >
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-fuel-300">
                    <Hash size={12} /> FL-K9H-B83Q
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-petrol-100 bg-petrol-500/30 border border-petrol-400/30 rounded-full px-2 py-0.5">
                    <CheckCircle2 size={11} /> liberado
                  </span>
                </div>

                <div className="mt-4 space-y-2.5">
                  {[
                    { icon: Car, label: 'Veículo', value: 'ABC-1234' },
                    { icon: Fuel, label: 'Combustível', value: 'Diesel S-10' },
                    { icon: MapPin, label: 'Posto', value: 'Auto Posto Senna' },
                  ].map((r) => (
                    <div key={r.label} className="flex items-center gap-2.5 text-[13px]">
                      <r.icon size={14} className="text-petrol-300 shrink-0" />
                      <span className="text-petrol-100/50">{r.label}</span>
                      <span className="ml-auto font-semibold text-white">{r.value}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-3 gap-2 text-center">
                  {[
                    { k: 'Requisições', v: '128' },
                    { k: 'Postos', v: '14' },
                    { k: 'Economia', v: '9%' },
                  ].map((s) => (
                    <div key={s.k}>
                      <p className="text-base font-bold text-white">{s.v}</p>
                      <p className="text-[10px] text-petrol-100/50">{s.k}</p>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* selo flutuante */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.7 }}
                className="absolute -right-3 -top-4 flex items-center gap-2 rounded-xl bg-white px-3 py-2 shadow-xl"
              >
                <span className="w-7 h-7 rounded-lg bg-fuel-50 flex items-center justify-center">
                  <ShieldCheck size={15} className="text-fuel-600" />
                </span>
                <div className="leading-tight">
                  <p className="text-[11px] font-bold text-petrol-950">Pagamento garantido</p>
                  <p className="text-[9px] text-petrol-700/70">pré-aprovado pela frota</p>
                </div>
              </motion.div>
            </motion.div>
          </div>

          {/* rodapé: selos de confiança */}
          <motion.div
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease, delay: 0.45 }}
            className="flex flex-wrap gap-x-7 gap-y-3"
          >
            {[
              { icon: BadgeCheck, label: 'Recebimento garantido' },
              { icon: ShieldCheck, label: 'Sem contestação' },
              { icon: ScanLine, label: 'Validação por QR' },
            ].map((f) => (
              <div key={f.label} className="flex items-center gap-2 text-sm text-petrol-100/80">
                <f.icon size={16} className="text-fuel-300" />
                {f.label}
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* ── Right panel — formulário ─────────────────────────────────────── */}
      <div className="relative flex-1 flex items-center justify-center bg-white p-8 overflow-y-auto">
        <Link
          href="/"
          className="absolute top-5 left-5 z-20 inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft size={16} /> Voltar ao início
        </Link>
        <div className="w-full max-w-sm py-8">

          {/* Mobile logo */}
          <Link href="/" className="flex items-center gap-2 mb-8 lg:hidden">
            <Logo tamanho={32} />
          </Link>

          <h1 className="text-2xl font-bold text-gray-900 mb-1">Bem-vindo de volta</h1>
          <p className="text-gray-500 text-sm mb-6">Entre na sua conta para continuar.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <div className="relative">
              <Input
                label="Senha"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-9 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {error && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <div className="flex justify-end">
              <Link href="/recuperar-senha" className="text-sm text-blue-600 hover:underline">
                Esqueci minha senha
              </Link>
            </div>

            <Button type="submit" variant="primary" size="lg" className="w-full" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Entrando...
                </span>
              ) : 'Entrar'}
            </Button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-xs text-gray-400">ou</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          <p className="text-center text-sm text-gray-500">
            Não tem conta?{' '}
            <Link href="/cadastro" className="text-blue-600 font-medium hover:underline">
              Criar conta
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
