'use client'

import Link from 'next/link'
import { Truck, Fuel, ArrowRight } from 'lucide-react'
import { Reveal } from './Reveal'
import { LINKS } from './links'

export function CTAFinal() {
  return (
    <section className="py-20 sm:py-24 bg-sand">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <Reveal className="text-center max-w-2xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-petrol-950">
            Quanto você já perdeu este mês com abastecimentos não reconhecidos?
          </h2>
          <p className="mt-4 text-lg text-petrol-800/70">
            Pare a sangria hoje. Cadastro gratuito — comece a abastecer com prova e a pagar só o que autorizou.
          </p>
        </Reveal>

        <div className="mt-12 grid lg:grid-cols-2 gap-6">
          {/* Transportadora */}
          <Reveal>
            <div className="h-full rounded-xl3 bg-petrol-950 p-8 sm:p-10 text-white relative overflow-hidden">
              <div aria-hidden className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-petrol-500/25 blur-2xl" />
              <span className="relative inline-flex w-12 h-12 rounded-2xl bg-petrol-600 items-center justify-center">
                <Truck size={22} />
              </span>
              <h3 className="relative mt-5 text-2xl font-bold">Você é transportadora?</h3>
              <p className="relative mt-2 text-petrol-100/80 leading-relaxed">
                Libere veículo e motorista antes do abastecimento e pague só o que autorizou —
                nenhum abastecimento fantasma na sua conta.
              </p>
              <Link
                href={LINKS.transportadora}
                className="relative mt-7 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-base font-semibold text-petrol-950 hover:bg-petrol-50 transition-all hover:-translate-y-0.5"
              >
                Cadastrar transportadora <ArrowRight size={17} />
              </Link>
            </div>
          </Reveal>

          {/* Posto */}
          <Reveal delay={0.1}>
            <div className="tema-fixo h-full rounded-xl3 bg-fuel-600 p-8 sm:p-10 text-white relative overflow-hidden">
              <div aria-hidden className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-fuel-300/30 blur-2xl" />
              <span className="relative inline-flex w-12 h-12 rounded-2xl bg-white/15 items-center justify-center">
                <Fuel size={22} />
              </span>
              <h3 className="relative mt-5 text-2xl font-bold">Você tem um posto?</h3>
              <p className="relative mt-2 text-fuel-50/90 leading-relaxed">
                Abasteça com prova registrada e recebimento garantido. Nunca mais perca dinheiro
                com assinatura negada ou contestação.
              </p>
              <Link
                href={LINKS.posto}
                className="relative mt-7 inline-flex items-center gap-2 rounded-xl bg-petrol-950 px-6 py-3.5 text-base font-semibold text-white hover:bg-ink transition-all hover:-translate-y-0.5"
              >
                Cadastrar meu posto <ArrowRight size={17} />
              </Link>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
