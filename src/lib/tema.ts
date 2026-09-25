'use client'

import { useSyncExternalStore } from 'react'

/**
 * Tema claro/escuro — mesmas três opções do Visor360: Claro, Sistema, Escuro.
 *
 * "Sistema" é o padrão de quem nunca escolheu: o app segue o sistema
 * operacional e reage se ele mudar no meio da sessão. Escolha manual grava em
 * localStorage e passa a mandar.
 *
 * É um store de módulo lido por `useSyncExternalStore` — o FleetPass não tem
 * zustand (o Visor360 tem) e um contexto exigiria envolver o layout raiz, que
 * é server component. `useSyncExternalStore` também resolve a hidratação: o
 * servidor renderiza com o instantâneo neutro e o cliente corrige sozinho.
 */
export type ModoTema = 'claro' | 'escuro' | 'sistema'

export const CHAVE_TEMA = 'fleetpass-tema'

const MODOS: ModoTema[] = ['claro', 'escuro', 'sistema']

interface Estado {
  modo: ModoTema
  /** Se está escuro AGORA — com modo 'sistema', depende do sistema operacional. */
  escuro: boolean
}

function sistemaEscuro(): boolean {
  return typeof window !== 'undefined'
    && window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function lerModo(): ModoTema {
  if (typeof window === 'undefined') return 'sistema'
  try {
    const v = localStorage.getItem(CHAVE_TEMA)
    if (MODOS.includes(v as ModoTema)) return v as ModoTema
  } catch { /* localStorage bloqueado (aba anônima, cookies barrados) */ }
  return 'sistema'
}

function calcular(modo: ModoTema): Estado {
  return { modo, escuro: modo === 'sistema' ? sistemaEscuro() : modo === 'escuro' }
}

function aplicar(escuro: boolean) {
  document.documentElement.classList.toggle('dark', escuro)
}

// O instantâneo precisa ser estável entre renders: `useSyncExternalStore`
// compara por identidade, e devolver um objeto novo a cada chamada daria laço.
let estado: Estado = { modo: 'sistema', escuro: false }
const NEUTRO: Estado = estado
const inscritos = new Set<() => void>()
let iniciado = false

function iniciar() {
  if (iniciado || typeof window === 'undefined') return
  iniciado = true
  estado = calcular(lerModo())
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    // Só importa enquanto o modo é "sistema"; nos demais, a escolha manda.
    if (estado.modo !== 'sistema') return
    estado = calcular('sistema')
    aplicar(estado.escuro)
    inscritos.forEach((fn) => fn())
  })
}

function inscrever(aoMudar: () => void) {
  iniciar()
  inscritos.add(aoMudar)
  return () => { inscritos.delete(aoMudar) }
}

function instantaneo(): Estado {
  iniciar()
  return estado
}

function instantaneoServidor(): Estado {
  return NEUTRO
}

export function definirModo(modo: ModoTema) {
  try { localStorage.setItem(CHAVE_TEMA, modo) } catch { /* localStorage bloqueado */ }
  estado = calcular(modo)
  aplicar(estado.escuro)
  inscritos.forEach((fn) => fn())
}

export function useTema() {
  const { modo, escuro } = useSyncExternalStore(inscrever, instantaneo, instantaneoServidor)
  return { modo, escuro, definirModo }
}
