'use client'

import Link from 'next/link'
import { Logo } from '@/components/ui/logo'
import { Linkedin, Instagram, Mail } from 'lucide-react'
import { LINKS } from './links'

const COLS = [
  {
    title: 'Plataforma',
    items: [
      { label: 'Como funciona', href: '#como-funciona' },
      { label: 'Para transportadoras', href: LINKS.transportadora },
      { label: 'Para postos', href: LINKS.posto },
      { label: 'Entrar', href: LINKS.login },
    ],
  },
  {
    title: 'Empresa',
    items: [
      { label: 'Sobre nós', href: '#' },
      { label: 'Contato', href: LINKS.contato },
      { label: 'Trabalhe conosco', href: '#' },
    ],
  },
  {
    title: 'Legal',
    items: [
      { label: 'Termos de uso', href: '#' },
      { label: 'Política de privacidade', href: '#' },
      { label: 'LGPD', href: '#' },
    ],
  },
]

export function Footer() {
  return (
    <footer className="bg-petrol-950 text-petrol-100/70">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-14">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          {/* Marca */}
          <div>
            <Link href="/" className="flex items-center gap-2" aria-label="FleetPass — início">
              <Logo tamanho={32} variante="claro" />
            </Link>
            <p className="mt-4 text-sm leading-relaxed max-w-xs">
              A plataforma que conecta transportadoras e postos para gestão de parcerias
              e abastecimento de frotas.
            </p>
            <div className="mt-5 flex items-center gap-3">
              <a href="#" aria-label="LinkedIn" className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors">
                <Linkedin size={16} className="text-white" />
              </a>
              <a href="#" aria-label="Instagram" className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors">
                <Instagram size={16} className="text-white" />
              </a>
              <a href={LINKS.contato} aria-label="E-mail" className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors">
                <Mail size={16} className="text-white" />
              </a>
            </div>
          </div>

          {/* Colunas de links */}
          {COLS.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h3 className="text-sm font-semibold text-white">{col.title}</h3>
              <ul className="mt-4 space-y-2.5">
                {col.items.map((it) => (
                  <li key={it.label}>
                    <Link href={it.href} className="text-sm hover:text-white transition-colors">
                      {it.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-12 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs">© {new Date().getFullYear()} FleetPass. Todos os direitos reservados.</p>
          <p className="text-xs">Feito no Brasil 🇧🇷 para frotas e postos.</p>
        </div>
      </div>
    </footer>
  )
}
