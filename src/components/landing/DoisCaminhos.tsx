'use client'

import Link from 'next/link'
import { Truck, Fuel, ArrowRight, Check } from 'lucide-react'
import { Reveal } from './Reveal'
import { LINKS } from './links'

const TRANSPORTADORA = {
  eyebrow: 'Para Transportadoras',
  title: 'Só pague o que você de fato autorizou',
  bullets: [
    'Libere veículo e motorista antes — nada abastece sem sua aprovação',
    'Zero abastecimento fantasma: motorista a mais, desvio ou veículo de terceiro não entram na sua conta',
    'Limite por requisição e rastreabilidade de cada litro liberado',
    'Condições comerciais negociadas e formalizadas em contrato digital',
  ],
  cta: 'Sou Transportadora',
  href: LINKS.transportadora,
}

const POSTO = {
  eyebrow: 'Para Postos',
  title: 'Nunca mais perca um abastecimento não reconhecido',
  bullets: [
    'Abastecimento pré-aprovado pela frota — já nasce reconhecido, sem “depois eu contesto”',
    'Prova registrada da liberação: fim do calote e da contestação de assinatura',
    'Recebimento garantido do que saiu da bomba, sem disputa no fim do mês',
    'Frentista valida no balcão por código e QR, sem papelada',
  ],
  cta: 'Cadastrar meu Posto',
  href: LINKS.posto,
}

export function DoisCaminhos() {
  return (
    <section id="dois-caminhos" className="py-20 sm:py-24 bg-sand scroll-mt-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* max-w-3xl: em 2xl a frase do h2 não cabia em uma linha e "lados"
            caía sozinho. text-balance evita órfã caso ainda quebre em telas
            menores. */}
        <Reveal className="text-center max-w-3xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-petrol-950 text-balance">
            O mesmo mecanismo protege os dois lados
          </h2>
          <p className="mt-4 text-lg text-petrol-800/70 leading-relaxed">
            A pré-aprovação que dá prova ao posto é a mesma que impede a frota de pagar o que não autorizou.
            Ninguém sai no prejuízo. Escolha o seu lado.
          </p>
        </Reveal>

        <div className="mt-12 grid lg:grid-cols-2 gap-6">
          {/* Transportadora — identidade petróleo */}
          <Reveal>
            <article className="group h-full flex flex-col rounded-xl3 bg-white border border-petrol-100 p-7 sm:p-8 hover:shadow-glow transition-shadow duration-300">
              <span className="h-1.5 w-14 rounded-full bg-petrol-500 mb-6" aria-hidden />
              <div className="flex items-center gap-3">
                <span className="w-12 h-12 rounded-2xl bg-petrol-600 flex items-center justify-center shadow-soft">
                  <Truck size={22} className="text-white" />
                </span>
                <p className="text-sm font-semibold uppercase tracking-wider text-petrol-600">{TRANSPORTADORA.eyebrow}</p>
              </div>
              <h3 className="mt-5 text-2xl font-bold text-petrol-950 leading-snug">{TRANSPORTADORA.title}</h3>
              <ul className="mt-6 space-y-3 flex-1">
                {TRANSPORTADORA.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-3 text-[15px] text-petrol-800/85">
                    <span className="mt-0.5 w-5 h-5 rounded-full bg-petrol-100 flex items-center justify-center shrink-0">
                      <Check size={13} className="text-petrol-700" />
                    </span>
                    {b}
                  </li>
                ))}
              </ul>
              <Link
                href={TRANSPORTADORA.href}
                className="mt-8 inline-flex items-center justify-center gap-2 rounded-xl bg-petrol-600 px-6 py-3.5 text-base font-semibold text-white hover:bg-petrol-700 transition-all hover:-translate-y-0.5 shadow-soft"
              >
                {TRANSPORTADORA.cta} <ArrowRight size={17} />
              </Link>
            </article>
          </Reveal>

          {/* Posto — identidade âmbar */}
          <Reveal delay={0.1}>
            <article className="group h-full flex flex-col rounded-xl3 bg-white border border-fuel-100 p-7 sm:p-8 hover:shadow-glow transition-shadow duration-300">
              <span className="h-1.5 w-14 rounded-full bg-fuel-500 mb-6" aria-hidden />
              <div className="flex items-center gap-3">
                <span className="w-12 h-12 rounded-2xl bg-fuel-500 flex items-center justify-center shadow-soft">
                  <Fuel size={22} className="text-white" />
                </span>
                <p className="text-sm font-semibold uppercase tracking-wider text-fuel-600">{POSTO.eyebrow}</p>
              </div>
              <h3 className="mt-5 text-2xl font-bold text-petrol-950 leading-snug">{POSTO.title}</h3>
              <ul className="mt-6 space-y-3 flex-1">
                {POSTO.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-3 text-[15px] text-petrol-800/85">
                    <span className="mt-0.5 w-5 h-5 rounded-full bg-fuel-100 flex items-center justify-center shrink-0">
                      <Check size={13} className="text-fuel-700" />
                    </span>
                    {b}
                  </li>
                ))}
              </ul>
              <Link
                href={POSTO.href}
                className="mt-8 inline-flex items-center justify-center gap-2 rounded-xl bg-fuel-500 px-6 py-3.5 text-base font-semibold text-white hover:bg-fuel-600 transition-all hover:-translate-y-0.5 shadow-soft"
              >
                {POSTO.cta} <ArrowRight size={17} />
              </Link>
            </article>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
