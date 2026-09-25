'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Logo } from '@/components/ui/logo'
import { Fuel, Menu, X, Truck, ArrowRight } from 'lucide-react'
import { LINKS } from './links'

// Duas entradas, uma por seção que existe. "Benefícios" apontava para a seção
// homônima, removida na simplificação da página — o link levava a lugar nenhum.
const NAV = [
  { label: 'Como funciona', href: '#como-funciona' },
  { label: 'Para você',     href: '#dois-caminhos' },
]

export function Header() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-white/85 backdrop-blur-md border-b border-petrol-100 shadow-soft' : 'bg-transparent'
      }`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="shrink-0" aria-label="FleetPass — início">
          <Logo tamanho={34} />
        </Link>

        {/* Nav (desktop) */}
        <nav className="hidden md:flex items-center gap-1" aria-label="Navegação principal">
          {NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="px-3 py-2 text-sm font-medium text-petrol-800/80 hover:text-petrol-950 rounded-lg hover:bg-petrol-50 transition-colors"
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* CTAs (desktop) */}
        <div className="hidden md:flex items-center gap-2">
          <Link
            href={LINKS.login}
            className="px-3 py-2 text-sm font-medium text-petrol-800 hover:text-petrol-950 transition-colors"
          >
            Entrar
          </Link>
          <Link
            href={LINKS.transportadora}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-petrol-600 rounded-xl hover:bg-petrol-700 transition-colors shadow-soft"
          >
            <Truck size={15} /> Sou Transportadora
          </Link>
          <Link
            href={LINKS.posto}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-fuel-500 rounded-xl hover:bg-fuel-600 transition-colors shadow-soft"
          >
            <Fuel size={15} /> Cadastrar meu Posto
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg text-petrol-900 hover:bg-petrol-50 transition-colors"
          aria-label={open ? 'Fechar menu' : 'Abrir menu'}
          aria-expanded={open}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden bg-white border-b border-petrol-100 shadow-soft">
          <nav className="px-4 py-4 space-y-1" aria-label="Navegação mobile">
            {NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="block px-3 py-2.5 text-sm font-medium text-petrol-800 rounded-lg hover:bg-petrol-50"
              >
                {item.label}
              </a>
            ))}
            <Link
              href={LINKS.login}
              onClick={() => setOpen(false)}
              className="block px-3 py-2.5 text-sm font-medium text-petrol-800 rounded-lg hover:bg-petrol-50"
            >
              Entrar
            </Link>
          </nav>
          {/* Dois CTAs sempre acessíveis no mobile */}
          <div className="px-4 pb-4 grid grid-cols-1 gap-2">
            <Link
              href={LINKS.transportadora}
              onClick={() => setOpen(false)}
              className="inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-white bg-petrol-600 rounded-xl hover:bg-petrol-700 transition-colors"
            >
              <Truck size={16} /> Sou Transportadora <ArrowRight size={15} />
            </Link>
            <Link
              href={LINKS.posto}
              onClick={() => setOpen(false)}
              className="inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-white bg-fuel-500 rounded-xl hover:bg-fuel-600 transition-colors"
            >
              <Fuel size={16} /> Cadastrar meu Posto <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}
