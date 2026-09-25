'use client'

import { useState } from 'react'
import { Logo } from '@/components/ui/logo'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Mail, ShieldCheck, MailCheck, KeyRound, Send,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'

const ease = [0.22, 1, 0.36, 1] as const

const PASSOS = [
  { icon: Mail,       label: 'Informe seu e-mail', desc: 'O mesmo usado no cadastro.' },
  { icon: MailCheck,  label: 'Abra o link enviado', desc: 'Chega em segundos na sua caixa.' },
  { icon: KeyRound,   label: 'Crie uma nova senha', desc: 'E pronto, acesso recuperado.' },
]

export default function RecuperarSenhaPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim())
    // Não revelamos se o e-mail existe — sempre mostramos sucesso.
    if (err && !/rate/i.test(err.message)) {
      setError('Não foi possível enviar agora. Tente novamente em instantes.')
      setLoading(false)
      return
    }
    setSent(true)
    setLoading(false)
  }

  return (
    <div className="h-screen flex overflow-hidden">
      {/* ── Left panel — vitrine ─────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-petrol-950">
        <div className="absolute inset-0 bg-gradient-to-br from-petrol-900 via-petrol-950 to-[#03161a]" />
        <div className="absolute inset-0 bg-grid opacity-[0.06]" />
        <motion.div aria-hidden className="absolute -top-32 -left-24 w-96 h-96 rounded-full bg-petrol-500/20 blur-3xl"
          animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.8, 0.5] }} transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }} />
        <motion.div aria-hidden className="absolute -bottom-24 -right-20 w-[30rem] h-[30rem] rounded-full bg-fuel-500/15 blur-3xl"
          animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.65, 0.4] }} transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut', delay: 1 }} />

        <div className="relative z-10 flex flex-col justify-center gap-8 w-full max-w-xl mx-auto p-8 xl:p-10 overflow-y-auto">
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease }}>
            <Link href="/" className="flex items-center gap-2.5">
              <Logo tamanho={36} variante="claro" />
            </Link>
          </motion.div>

          <div>
            <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease, delay: 0.1 }}>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/10 px-3 py-1.5 text-xs font-semibold text-petrol-100">
                <ShieldCheck size={13} className="text-fuel-300" />
                Recuperação de acesso
              </span>
              <h2 className="mt-4 text-3xl xl:text-[2.5rem] font-bold leading-[1.1] tracking-tight text-white">
                Esqueceu a senha?<br />
                <span className="text-fuel-400">Sem problema.</span>
              </h2>
              <p className="mt-3 text-petrol-100/70 text-[15px] leading-relaxed max-w-md">
                Enviamos um link seguro para você criar uma nova senha em segundos.
              </p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 26 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease, delay: 0.25 }}
              className="mt-6 max-w-sm rounded-2xl bg-white/[0.07] border border-white/10 backdrop-blur-md p-4 shadow-2xl shadow-black/40">
              <div className="space-y-3">
                {PASSOS.map((p, i) => (
                  <div key={p.label} className="flex items-start gap-3">
                    <span className="w-8 h-8 rounded-lg bg-fuel-500/15 flex items-center justify-center shrink-0 text-fuel-300 text-xs font-bold">
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white">{p.label}</p>
                      <p className="text-xs text-petrol-100/60 leading-snug">{p.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* ── Right panel — formulário ─────────────────────────────────────── */}
      <div className="relative flex-1 flex items-center justify-center bg-white p-8 overflow-y-auto">
        <Link href="/" className="absolute top-5 left-5 z-20 inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">
          <ArrowLeft size={16} /> Voltar ao início
        </Link>

        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <Link href="/" className="flex lg:hidden items-center gap-2 justify-center mb-8">
            <Logo tamanho={32} />
          </Link>

          {sent ? (
            <div className="text-center">
              <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <MailCheck size={26} className="text-emerald-500" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Verifique seu e-mail</h1>
              <p className="text-gray-500 text-sm leading-relaxed">
                Se houver uma conta para <strong className="text-gray-700">{email}</strong>, enviamos um link
                para redefinir a senha. Confira também a caixa de spam.
              </p>
              <Link href="/login">
                <Button variant="secondary" size="lg" className="w-full mt-6">Voltar para o login</Button>
              </Link>
              <button
                onClick={() => { setSent(false); setError('') }}
                className="mt-3 text-sm text-blue-600 hover:underline"
              >
                Não recebeu? Enviar de novo
              </button>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Recuperar senha</h1>
              <p className="text-gray-500 text-sm mb-6">
                Informe o e-mail da sua conta e enviaremos um link para criar uma nova senha.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label="Email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError('') }}
                  required
                />

                {error && (
                  <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
                )}

                <Button type="submit" variant="primary" size="lg" className="w-full" disabled={loading || !email}>
                  {loading ? 'Enviando…' : <><Send size={16} /> Enviar link de recuperação</>}
                </Button>
              </form>

              <p className="text-center text-sm text-gray-500 mt-6">
                Lembrou a senha?{' '}
                <Link href="/login" className="text-blue-600 font-medium hover:underline">Entrar</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
