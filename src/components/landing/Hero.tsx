'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import {
  Truck, Fuel, ArrowRight, ShieldCheck, CheckCircle2, Hash, Car, MapPin,
} from 'lucide-react'
import { LINKS } from './links'

const ease = [0.22, 1, 0.36, 1] as const

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
}
const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const } },
}

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-sand pt-28 pb-16 sm:pt-32 sm:pb-24">
      {/* brilhos de fundo */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -right-24 w-[28rem] h-[28rem] rounded-full bg-petrol-200/40 blur-3xl" />
        <div className="absolute top-40 -left-20 w-80 h-80 rounded-full bg-fuel-200/40 blur-3xl" />
      </div>

      {/* CENA — camada da seção, não coluna do grid: por isso sangra até a borda
          direita da viewport e ocupa a altura inteira.
          A fotografia é só fotografia; os cards voltaram a ser HTML (ver
          CardsDaCena), o que os deixa nítidos em qualquer densidade de tela,
          editáveis e legíveis por leitor de tela. */}
      <div className="pointer-events-none absolute inset-y-0 right-0 hidden lg:block w-[55vw] max-w-[1280px]">
        <Image
          src="/landing/hero-foto.jpg"
          alt="Frentista e motorista de transportadora apertando as mãos em um posto de combustível ao entardecer, com caminhão ao lado"
          fill
          priority
          sizes="55vw"
          quality={90}
          className="object-cover object-[72%_center] [mask-image:linear-gradient(to_right,transparent_0%,rgba(0,0,0,0.25)_14%,rgba(0,0,0,0.75)_30%,black_48%)]"
        />

        <CardsDaCena />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 grid lg:grid-cols-[minmax(0,44%)_minmax(0,1fr)] gap-12 lg:gap-8 items-center">
        {/* Coluna texto */}
        <motion.div variants={container} initial="hidden" animate="show">
          <motion.div variants={item}>
            <span className="inline-flex items-center gap-2 rounded-full bg-white border border-petrol-100 px-3 py-1.5 text-xs font-semibold text-petrol-700 shadow-soft">
              <ShieldCheck size={14} className="text-petrol-600" />
              Abastecimento pré-aprovado — fim do calote e do abastecimento fantasma
            </span>
          </motion.div>

          <motion.h1
            variants={item}
            className="mt-5 text-4xl sm:text-5xl lg:text-[3.4rem] font-bold leading-[1.05] tracking-tight text-petrol-950"
          >
            O posto <span className="text-petrol-600">recebe o que abasteceu</span>.
            A frota paga só o que{' '}
            <span className="relative whitespace-nowrap text-fuel-600">
              autorizou
              <svg className="absolute -bottom-1.5 left-0 w-full" height="8" viewBox="0 0 200 8" fill="none" aria-hidden>
                <path d="M2 6C50 2 150 2 198 6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="text-fuel-300" />
              </svg>
            </span>
          </motion.h1>

          <motion.p variants={item} className="mt-6 text-lg text-petrol-800/80 leading-relaxed max-w-xl">
            Cada abastecimento é <strong className="text-petrol-900 font-semibold">pré-aprovado pela própria
            transportadora</strong> — veículo liberado, motorista autorizado e requisição registrada — antes de
            o bico encostar no tanque. Quando acontece, já nasce reconhecido: o posto tem prova, a frota
            só paga o que autorizou.
          </motion.p>

          {/* Dois CTAs lado a lado — peso igual */}
          <motion.div variants={item} className="mt-8 flex flex-col sm:flex-row gap-3">
            <Link
              href={LINKS.transportadora}
              className="group inline-flex items-center justify-center gap-2 rounded-xl bg-petrol-600 px-6 py-3.5 text-base font-semibold text-white shadow-soft hover:bg-petrol-700 transition-all hover:-translate-y-0.5"
            >
              <Truck size={18} /> Sou Transportadora
              <ArrowRight size={17} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href={LINKS.posto}
              className="group inline-flex items-center justify-center gap-2 rounded-xl bg-fuel-500 px-6 py-3.5 text-base font-semibold text-white shadow-soft hover:bg-fuel-600 transition-all hover:-translate-y-0.5"
            >
              <Fuel size={18} /> Cadastrar meu Posto
              <ArrowRight size={17} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          </motion.div>

          <motion.ul variants={item} className="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-sm text-petrol-800/70">
            {['Sem calote ou contestação', 'Sem abastecimento fantasma', 'Recebimento garantido'].map((t) => (
              <li key={t} className="inline-flex items-center gap-1.5">
                <CheckCircle2 size={15} className="text-petrol-500" /> {t}
              </li>
            ))}
          </motion.ul>
        </motion.div>

        {/* Abaixo de lg a cena não cabe ao lado do texto: entra aqui, em largura
            total, depois dos CTAs. */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="lg:hidden -mx-4 sm:-mx-6"
        >
          <div>
            <Image
              src="/landing/hero-foto.jpg"
              alt="Frentista e motorista de transportadora apertando as mãos em um posto de combustível ao entardecer, com caminhão ao lado"
              width={1672}
              height={941}
              priority
              sizes="100vw"
              quality={90}
              className="w-full h-auto"
            />
          </div>
        </motion.div>
      </div>
    </section>
  )
}

/**
 * Interface flutuante sobre a fotografia: painel da frota, selo de pagamento e
 * ticket da requisição.
 *
 * São componentes HTML, não pixels: ficam nítidos em tela retina, o conteúdo é
 * editável no código e leitores de tela conseguem anunciá-los. Posicionados
 * sobre o pavimento molhado à esquerda e sob o caminhão, longe dos rostos e do
 * aperto de mãos — que são o assunto da foto.
 */
function CardsDaCena() {
  return (
    <div className="absolute inset-0">
      {/* Painel — pavimento à esquerda, abaixo da marquise */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.35, ease }}
        className="absolute bottom-[10%] left-[30%] w-[46%] max-w-[22rem] rounded-xl3 bg-petrol-950/90 backdrop-blur-md p-4 shadow-glow"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-white/90">
            <span className="w-6 h-6 rounded-lg bg-petrol-600 flex items-center justify-center">
              <Fuel size={13} />
            </span>
            <span className="text-xs font-semibold">Painel da frota</span>
          </div>
          <span className="text-[10px] font-medium text-petrol-200 bg-white/10 rounded-full px-2 py-0.5">ao vivo</span>
        </div>

        <div className="grid grid-cols-3 gap-1.5 mb-2.5">
          {[
            { l: 'Requisições', v: '128' },
            { l: 'Postos', v: '14' },
            { l: 'Economia', v: '9%' },
          ].map((c) => (
            <div key={c.l} className="rounded-lg bg-white/5 border border-white/10 p-2">
              <p className="text-[9px] text-petrol-200">{c.l}</p>
              <p className="text-sm font-bold text-white mt-0.5">{c.v}</p>
            </div>
          ))}
        </div>

        <div className="h-12 rounded-lg bg-white/5 border border-white/10 flex items-end gap-1 px-2 pb-2">
          {[42, 60, 38, 72, 55, 80, 64, 90, 70, 84].map((h, i) => (
            <div key={i} className="flex-1 rounded-t bg-gradient-to-t from-petrol-500 to-petrol-300" style={{ height: `${h}%` }} />
          ))}
        </div>
      </motion.div>

      {/* Ticket — pavimento à direita, sob o caminhão */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.55, ease }}
        className="absolute bottom-[2%] left-[20%] w-[26%] max-w-[13rem] rounded-xl2 z-10 bg-white/95 backdrop-blur border border-petrol-100 shadow-soft p-3.5"
      >
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-fuel-600">
            <Hash size={11} /> FL-K9H-B83Q
          </span>
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-petrol-600 bg-petrol-50 rounded-full px-1.5 py-0.5">
            <CheckCircle2 size={10} /> liberado
          </span>
        </div>
        <div className="mt-2.5 space-y-1.5 text-[11px]">
          <LinhaTicket icon={Car} label="Veículo" value="ABC-1234" />
          <LinhaTicket icon={Fuel} label="Combustível" value="Diesel S-10" />
          <LinhaTicket icon={MapPin} label="Posto" value="Auto Posto Senna" />
        </div>
      </motion.div>

      {/* Selo — céu, acima da marquise */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.75, ease }}
        className="absolute bottom-[29%] left-[58%] rounded-xl2 z-10 bg-white/95 backdrop-blur border border-petrol-100 shadow-soft px-3 py-2 flex items-center gap-2"
      >
        <span className="w-7 h-7 rounded-lg bg-fuel-50 flex items-center justify-center shrink-0">
          <ShieldCheck size={15} className="text-fuel-600" />
        </span>
        <div className="leading-tight">
          <p className="text-[11px] font-bold text-petrol-950">Pagamento garantido</p>
          <p className="text-[10px] text-petrol-700/70">pré-aprovado pela frota</p>
        </div>
      </motion.div>
    </div>
  )
}

function LinhaTicket({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon size={12} className="text-petrol-400 shrink-0" />
      <span className="text-petrol-500">{label}</span>
      <span className="ml-auto font-semibold text-petrol-900">{value}</span>
    </div>
  )
}
