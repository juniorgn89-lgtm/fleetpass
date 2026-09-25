'use client'

import { useEffect, useState } from 'react'
import { Logo } from '@/components/ui/logo'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Eye, EyeOff, Lock, ShieldCheck, CheckCircle2, KeyRound, AlertCircle, Loader2,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

const ease = [0.22, 1, 0.36, 1] as const

function ForcaSenha({ senha }: { senha: string }) {
  const checks = [senha.length >= 8, /[A-Z]/.test(senha), /[0-9]/.test(senha), /[^A-Za-z0-9]/.test(senha)]
  const f = checks.filter(Boolean).length
  const labels = ['', 'Fraca', 'Regular', 'Boa', 'Forte']
  const colors = ['', 'bg-red-400', 'bg-amber-400', 'bg-blue-400', 'bg-emerald-500']
  if (!senha) return null
  return (
    <div className="mt-2">
      <div className="flex gap-1 mb-1">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className={cn('h-1 flex-1 rounded-full transition-colors', i <= f ? colors[f] : 'bg-gray-100')} />
        ))}
      </div>
      <p className="text-xs text-gray-500">Senha {labels[f]}</p>
    </div>
  )
}

export default function RedefinirSenhaPage() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)
  const [authorized, setAuthorized] = useState(false)
  const [show, setShow] = useState(false)
  const [senha, setSenha] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    let ativo = true
    supabase.auth.getUser().then(({ data }) => {
      if (!ativo) return
      setAuthorized(!!data.user)
      setChecking(false)
    })
    return () => { ativo = false }
  }, [])

  const senhaError = confirmar && confirmar !== senha ? 'As senhas não coincidem' : undefined
  const valido = senha.length >= 6 && !senhaError

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!valido) return
    setError('')
    setLoading(true)
    const { error: err } = await supabase.auth.updateUser({ password: senha })
    if (err) {
      setError(err.message.includes('different') ? 'A nova senha não pode ser igual à anterior.' : 'Não foi possível redefinir. O link pode ter expirado.')
      setLoading(false)
      return
    }
    await supabase.auth.signOut()
    setDone(true)
    setLoading(false)
  }

  return (
    <div className="h-screen flex overflow-hidden">
      {/* ── Left panel ───────────────────────────────────────────────────── */}
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

          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease, delay: 0.1 }}>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/10 px-3 py-1.5 text-xs font-semibold text-petrol-100">
              <KeyRound size={13} className="text-fuel-300" />
              Nova senha
            </span>
            <h2 className="mt-4 text-3xl xl:text-[2.5rem] font-bold leading-[1.1] tracking-tight text-white">
              Quase lá.<br />
              <span className="text-fuel-400">Crie sua nova senha.</span>
            </h2>
            <p className="mt-3 text-petrol-100/70 text-[15px] leading-relaxed max-w-md">
              Escolha uma senha forte e única. Você usará ela para acessar o FleetPass a partir de agora.
            </p>
            <div className="mt-6 flex items-center gap-2 text-sm text-petrol-100/70">
              <ShieldCheck size={16} className="text-fuel-300" /> Conexão segura e link de uso único
            </div>
          </motion.div>
        </div>
      </div>

      {/* ── Right panel — formulário ─────────────────────────────────────── */}
      <div className="relative flex-1 flex items-center justify-center bg-white p-8 overflow-y-auto">
        <Link href="/login" className="absolute top-5 left-5 z-20 inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">
          <ArrowLeft size={16} /> Voltar ao login
        </Link>

        <div className="w-full max-w-sm">
          {checking ? (
            <div className="flex items-center justify-center gap-2 py-10 text-gray-400">
              <Loader2 size={20} className="animate-spin" /> <span className="text-sm">Validando link…</span>
            </div>
          ) : done ? (
            <div className="text-center">
              <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={26} className="text-emerald-500" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Senha redefinida!</h1>
              <p className="text-gray-500 text-sm">Use a nova senha para entrar na sua conta.</p>
              <Button size="lg" className="w-full mt-6" onClick={() => router.push('/login')}>Ir para o login</Button>
            </div>
          ) : !authorized ? (
            <div className="text-center">
              <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <AlertCircle size={26} className="text-red-500" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Link inválido ou expirado</h1>
              <p className="text-gray-500 text-sm">
                Este link de recuperação não é mais válido. Solicite um novo para continuar.
              </p>
              <Link href="/recuperar-senha">
                <Button size="lg" className="w-full mt-6">Solicitar novo link</Button>
              </Link>
            </div>
          ) : (
            <>
              <div className="w-12 h-12 bg-petrol-50 rounded-xl flex items-center justify-center mb-4">
                <Lock size={22} className="text-petrol-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Criar nova senha</h1>
              <p className="text-gray-500 text-sm mb-6">Defina a senha que você usará para acessar sua conta.</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative">
                  <Input
                    label="Nova senha"
                    type={show ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={senha}
                    onChange={(e) => { setSenha(e.target.value); setError('') }}
                  />
                  <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-9 text-gray-400 hover:text-gray-600">
                    {show ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                  <ForcaSenha senha={senha} />
                </div>
                <Input
                  label="Confirmar nova senha"
                  type="password"
                  placeholder="••••••••"
                  value={confirmar}
                  onChange={(e) => { setConfirmar(e.target.value); setError('') }}
                  error={senhaError}
                />

                {error && (
                  <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
                )}

                <Button type="submit" variant="primary" size="lg" className="w-full" disabled={loading || !valido}>
                  {loading ? 'Salvando…' : 'Redefinir senha'}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
