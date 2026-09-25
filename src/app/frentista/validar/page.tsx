'use client'

import { Fragment, useEffect, useState } from 'react'
import {
  User, Lock, Car, Search, KeyRound, CheckCircle2, AlertCircle, ChevronRight,
  Fuel, MapPin, Gauge, Hash, RefreshCw, ShieldCheck, Building2, Calendar,
  Droplets, DollarSign,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { QRCodeCanvas } from '@/components/ui/qr-code'
import { supabase } from '@/lib/supabase'

type Step = 'login' | 'placa' | 'qrcode' | 'codigo'

interface Ticket {
  codigo:      string
  veiculo:     string
  combustivel: string
  limite:      string
  posto:       string
  motorista:   string | null
  empresa:     string | null
  validade:    string | null
}

const STEPS: { key: Step; label: string }[] = [
  { key: 'login',  label: 'Identificação' },
  { key: 'placa',  label: 'Placa' },
  { key: 'qrcode', label: 'QR Code' },
  { key: 'codigo', label: 'Código' },
]

function StepIndicator({ step }: { step: Step }) {
  const idx = STEPS.findIndex((s) => s.key === step)
  return (
    <div className="flex items-start mb-8">
      {STEPS.map((s, i) => (
        <Fragment key={s.key}>
          <div className="flex flex-col items-center shrink-0">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                i <= idx ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'
              } ${i === idx ? 'ring-4 ring-blue-100' : ''}`}
            >
              {i < idx ? <CheckCircle2 size={16} /> : i + 1}
            </div>
            <span className={`text-[10px] mt-1 font-medium ${i === idx ? 'text-blue-600' : 'text-gray-400'}`}>
              {s.label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`flex-1 h-0.5 mt-4 mx-2 ${i < idx ? 'bg-blue-600' : 'bg-gray-200'}`} />
          )}
        </Fragment>
      ))}
    </div>
  )
}

export default function ValidarPage() {
  const [step, setStep]       = useState<Step>('login')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  // Step 1 — login
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')

  // Step 2 — placa
  const [placa, setPlaca] = useState('')

  // Step 3 — QR
  const [reqId, setReqId] = useState('')
  const [token, setToken] = useState('')
  // true quando a placa não tem requisição pendente neste posto
  const [semRequisicao, setSemRequisicao] = useState(false)

  // Step 4 — código + liberação
  const [codigo, setCodigo] = useState('')
  const [ticket, setTicket] = useState<Ticket | null>(null)

  // Step 6 — registro do abastecimento (litros + valor)
  const [litros, setLitros]               = useState('')
  const [valorUnitario, setValorUnitario] = useState('')
  const [hodometro, setHodometro]         = useState('')
  const [registrando, setRegistrando]     = useState(false)
  const [registrado, setRegistrado]       = useState<{ litros: number; valorUnitario: number; valorCobrado: number } | null>(null)

  const qrUrl =
    token && typeof window !== 'undefined'
      ? `${window.location.origin}/motorista/validar?t=${encodeURIComponent(token)}`
      : ''

  // Se já houver um frentista logado (ex.: navegação pela sidebar), pula o login.
  useEffect(() => {
    let ativo = true
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !ativo) return
      const { data: perfil } = await supabase.from('perfis').select('role').eq('id', user.id).single()
      if (ativo && (perfil?.role as string) === 'frentista') setStep('placa')
    })()
    return () => { ativo = false }
  }, [])

  // ── Passo 1: login do frentista ──────────────────────────────────────────
  const handleLogin = async () => {
    const mail = email.trim().toLowerCase()
    if (!mail || !senha) { setError('Preencha e-mail e senha.'); return }
    setLoading(true)
    setError('')
    try {
      const { data, error: authErr } = await supabase.auth.signInWithPassword({ email: mail, password: senha })
      if (authErr || !data.user) { setError('E-mail ou senha incorretos.'); return }

      const { data: perfil } = await supabase.from('perfis').select('role').eq('id', data.user.id).single()
      if ((perfil?.role as string) !== 'frentista') {
        setError('Estas credenciais não são de um frentista.')
        await supabase.auth.signOut()
        return
      }
      setStep('placa')
    } catch {
      setError('Falha ao autenticar.')
    } finally {
      setLoading(false)
    }
  }

  // ── Passo 2: busca por placa → gera QR ───────────────────────────────────
  const handlePlaca = async () => {
    const pl = placa.trim()
    if (!pl) { setError('Informe a placa do veículo.'); return }
    setLoading(true)
    setError('')
    setSemRequisicao(false)
    try {
      const res = await fetch('/api/frentista/requisicao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placa: pl }),
      })
      const data = await res.json()

      // Sem requisição pendente para esta placa → avança para o passo do QR
      // exibindo o aviso, em vez de mostrar erro na tela da placa.
      if (res.status === 404) {
        setReqId(''); setToken('')
        setSemRequisicao(true)
        setStep('qrcode')
        return
      }
      if (!res.ok) throw new Error(data.error ?? 'Erro ao buscar requisição.')

      setReqId(data.reqId)
      setToken(data.token)
      setStep('qrcode')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao buscar requisição.')
    } finally {
      setLoading(false)
    }
  }

  // ── Passo 5: confere código → libera ─────────────────────────────────────
  const handleLiberar = async () => {
    const c = codigo.trim().toUpperCase()
    if (!c) { setError('Digite o código informado pelo motorista.'); return }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/frentista/requisicao/liberar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reqId, codigo: c }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro ao liberar.')
      setTicket(data.ticket)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao liberar.')
    } finally {
      setLoading(false)
    }
  }

  // ── Passo 6: registra litros + valor → conclui ───────────────────────────
  const handleRegistrar = async () => {
    const l = Number(litros.replace(',', '.'))
    const v = Number(valorUnitario.replace(',', '.'))
    if (!l || l <= 0) { setError('Informe os litros abastecidos.'); return }
    if (!v || v <= 0) { setError('Informe o valor por litro.'); return }
    setRegistrando(true)
    setError('')
    try {
      const res = await fetch('/api/frentista/requisicao/registrar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reqId,
          litros: l,
          valorUnitario: v,
          hodometro: hodometro ? Number(hodometro.replace(',', '.')) : null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro ao registrar.')
      setRegistrado({ litros: l, valorUnitario: v, valorCobrado: data.valorCobrado })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao registrar.')
    } finally {
      setRegistrando(false)
    }
  }

  const reiniciar = () => {
    setStep('placa'); setPlaca(''); setReqId(''); setToken('')
    setCodigo(''); setTicket(null); setError(''); setSemRequisicao(false)
    setLitros(''); setValorUnitario(''); setHodometro(''); setRegistrado(null)
  }

  // ── Tela final: abastecimento liberado ───────────────────────────────────
  if (ticket) {
    const rows = [
      { icon: Car,        label: 'Veículo',     value: ticket.veiculo },
      { icon: User,       label: 'Motorista',   value: ticket.motorista ?? '—' },
      { icon: Building2,  label: 'Empresa',     value: ticket.empresa ?? '—' },
      { icon: Fuel,       label: 'Combustível', value: ticket.combustivel },
      { icon: Gauge,      label: 'Limite',      value: ticket.limite },
      { icon: MapPin,     label: 'Posto',       value: ticket.posto },
      { icon: Hash,       label: 'Código',      value: ticket.codigo, mono: true },
      ...(ticket.validade
        ? [{ icon: Calendar, label: 'Válida até', value: new Date(ticket.validade).toLocaleDateString('pt-BR') }]
        : []),
    ]
    return (
      <div className="max-w-lg mx-auto space-y-5">
        <div className="bg-emerald-500 text-white rounded-2xl px-6 py-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center shrink-0">
            <CheckCircle2 size={26} />
          </div>
          <div>
            <p className="font-bold text-lg">{registrado ? 'Abastecimento concluído' : 'Abastecimento liberado'}</p>
            <p className="text-emerald-100 text-sm mt-0.5">
              {registrado ? 'Registro salvo com sucesso.' : 'Pode abastecer o veículo.'}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide px-5 pt-4 pb-1">
            Ticket de abastecimento
          </p>
          {rows.map((item) => (
            <div key={item.label} className="flex items-center gap-3 px-5 py-3">
              <div className="w-8 h-8 bg-gray-100 rounded-xl flex items-center justify-center shrink-0">
                <item.icon size={15} className="text-gray-500" />
              </div>
              <span className="text-xs text-gray-400 flex-1">{item.label}</span>
              <span className={`text-sm font-medium text-gray-900 text-right ${item.mono ? 'font-mono' : ''}`}>
                {item.value}
              </span>
            </div>
          ))}
        </div>

        {registrado ? (
          <>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide px-5 pt-4 pb-1">
                Resumo do abastecimento
              </p>
              {[
                { icon: Droplets,   label: 'Litros',        value: `${registrado.litros.toLocaleString('pt-BR')} L` },
                { icon: DollarSign, label: 'Valor por litro', value: `R$ ${registrado.valorUnitario.toFixed(2).replace('.', ',')}` },
                { icon: DollarSign, label: 'Total cobrado',  value: `R$ ${registrado.valorCobrado.toFixed(2).replace('.', ',')}` },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3 px-5 py-3">
                  <div className="w-8 h-8 bg-gray-100 rounded-xl flex items-center justify-center shrink-0">
                    <item.icon size={15} className="text-gray-500" />
                  </div>
                  <span className="text-xs text-gray-400 flex-1">{item.label}</span>
                  <span className="text-sm font-semibold text-gray-900 text-right">{item.value}</span>
                </div>
              ))}
            </div>

            <Button className="w-full" size="lg" onClick={reiniciar}>
              <KeyRound size={16} /> Validar próximo abastecimento
            </Button>
          </>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
            <div>
              <p className="text-base font-semibold text-gray-800">Registrar abastecimento</p>
              <p className="text-xs text-gray-400 mt-0.5">Após abastecer, informe os litros e o valor para concluir.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Litros</label>
                <div className="relative">
                  <Droplets size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    inputMode="decimal"
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50"
                    placeholder="0,00"
                    value={litros}
                    onChange={(e) => { setLitros(e.target.value); setError('') }}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Valor por litro</label>
                <div className="relative">
                  <DollarSign size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    inputMode="decimal"
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50"
                    placeholder="0,00"
                    value={valorUnitario}
                    onChange={(e) => { setValorUnitario(e.target.value); setError('') }}
                  />
                </div>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Hodômetro (opcional)</label>
              <div className="relative">
                <Gauge size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  inputMode="numeric"
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50"
                  placeholder="km"
                  value={hodometro}
                  onChange={(e) => { setHodometro(e.target.value); setError('') }}
                />
              </div>
            </div>
            {error && <ErrorBox msg={error} />}
            <Button className="w-full" size="lg" onClick={handleRegistrar} disabled={registrando}>
              {registrando ? <RefreshCw size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
              {registrando ? 'Registrando…' : 'Registrar e concluir'}
            </Button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Validar abastecimento</h1>
        <p className="text-sm text-gray-400 mt-0.5">Siga os passos para liberar o abastecimento do motorista.</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
        <StepIndicator step={step} />

        {/* ── Passo 1: Login ────────────────────────────────────── */}
        {step === 'login' && (
          <>
            <div>
              <p className="text-base font-semibold text-gray-800">Identificação do frentista</p>
              <p className="text-xs text-gray-400 mt-0.5">Entre com seu e-mail e senha para começar.</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">E-mail</label>
              <div className="relative">
                <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50"
                  placeholder="frentista@posto.com.br"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError('') }}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Senha</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50"
                  placeholder="••••••••"
                  value={senha}
                  onChange={(e) => { setSenha(e.target.value); setError('') }}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                />
              </div>
            </div>
            {error && <ErrorBox msg={error} />}
            <Button className="w-full" onClick={handleLogin} disabled={loading}>
              {loading ? <RefreshCw size={15} className="animate-spin" /> : <User size={15} />}
              {loading ? 'Entrando…' : 'Entrar'}
              {!loading && <ChevronRight size={15} className="ml-auto" />}
            </Button>
          </>
        )}

        {/* ── Passo 2: Placa ────────────────────────────────────── */}
        {step === 'placa' && (
          <>
            <div>
              <p className="text-base font-semibold text-gray-800">Placa do veículo</p>
              <p className="text-xs text-gray-400 mt-0.5">Informe a placa do veículo a ser abastecido.</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Placa</label>
              <div className="relative">
                <Car size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-3 py-2.5 text-sm font-mono font-bold text-gray-900 uppercase tracking-widest focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50"
                  placeholder="ABC-1234"
                  maxLength={8}
                  value={placa}
                  onChange={(e) => { setPlaca(e.target.value.toUpperCase()); setError('') }}
                  onKeyDown={(e) => e.key === 'Enter' && handlePlaca()}
                />
              </div>
            </div>
            {error && <ErrorBox msg={error} />}
            <Button className="w-full" onClick={handlePlaca} disabled={loading}>
              {loading ? <RefreshCw size={15} className="animate-spin" /> : <Search size={15} />}
              {loading ? 'Buscando…' : 'Buscar e gerar QR Code'}
              {!loading && <ChevronRight size={15} className="ml-auto" />}
            </Button>
          </>
        )}

        {/* ── Passo 3: QR Code ──────────────────────────────────── */}
        {step === 'qrcode' && semRequisicao && (
          <>
            <div className="flex flex-col items-center text-center gap-3 py-4">
              <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center">
                <AlertCircle size={26} className="text-amber-500" />
              </div>
              <div>
                <p className="text-base font-semibold text-gray-800">Nenhuma requisição pendente</p>
                <p className="text-sm text-gray-500 mt-1 max-w-xs">
                  Não existem requisições pendentes deste veículo
                  {placa && <> (<span className="font-mono font-semibold text-gray-700">{placa}</span>)</>}{' '}
                  para este posto.
                </p>
              </div>
            </div>
            <Button className="w-full" onClick={() => { setError(''); setSemRequisicao(false); setStep('placa') }}>
              <Car size={15} /> Tentar outra placa
              <ChevronRight size={15} className="ml-auto" />
            </Button>
          </>
        )}

        {step === 'qrcode' && !semRequisicao && (
          <>
            <div>
              <p className="text-base font-semibold text-gray-800">QR Code gerado</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Mostre para o motorista escanear. Ele receberá o código de autorização.
              </p>
            </div>
            <div className="flex flex-col items-center gap-3 py-2">
              {/* Branco literal, não a superfície do tema: no escuro o QR
                  ficaria preto sobre escuro e a câmera não leria. */}
              <div className="p-4 bg-[#ffffff] border-2 border-gray-900 dark:border-white/20 rounded-2xl shadow-sm">
                {qrUrl && <QRCodeCanvas value={qrUrl} size={190} />}
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                <ShieldCheck size={13} className="text-emerald-500" />
                Assinado digitalmente · válido por 5 minutos
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-700 leading-relaxed">
              Após escanear, o motorista verá um código. Peça que ele informe esse código para você digitar no próximo passo.
            </div>
            <Button className="w-full" onClick={() => { setError(''); setStep('codigo') }}>
              <KeyRound size={15} /> Já recebi o código do motorista
              <ChevronRight size={15} className="ml-auto" />
            </Button>
          </>
        )}

        {/* ── Passo 4: Código → liberar ─────────────────────────── */}
        {step === 'codigo' && (
          <>
            <div>
              <p className="text-base font-semibold text-gray-800">Inserir código do motorista</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Digite o código que o motorista recebeu ao escanear o QR Code.
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Código da requisição</label>
              <div className="relative">
                <Hash size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-3 py-2.5 text-sm font-mono font-bold text-gray-900 uppercase tracking-widest focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50"
                  placeholder="FL-XK9-3P2A"
                  value={codigo}
                  onChange={(e) => { setCodigo(e.target.value.toUpperCase()); setError('') }}
                  onKeyDown={(e) => e.key === 'Enter' && handleLiberar()}
                />
              </div>
            </div>
            {error && <ErrorBox msg={error} />}
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => { setError(''); setStep('qrcode') }}>
                Voltar
              </Button>
              <Button className="flex-1" onClick={handleLiberar} disabled={loading}>
                {loading ? <RefreshCw size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                {loading ? 'Conferindo…' : 'Liberar abastecimento'}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function ErrorBox({ msg }: { msg: string }) {
  return (
    <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
      <AlertCircle size={14} className="shrink-0" />
      {msg}
    </div>
  )
}
