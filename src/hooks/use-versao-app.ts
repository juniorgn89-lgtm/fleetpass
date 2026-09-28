'use client'

import { useEffect, useState } from 'react'

/** De quanto em quanto tempo perguntar se saiu versão nova. */
const INTERVALO_MS = 30 * 60 * 1000

export interface VersaoNoAr {
  versao: string
  build: string
}

/**
 * Descobre se há uma versão mais nova publicada.
 *
 * Compara o `build` desta página (fixado no bundle em tempo de build) com o
 * que a rota `/api/versao` devolve — e essa rota é servida pelo deploy que
 * está no ar. Se diferem, o usuário está com um bundle velho aberto.
 *
 * Pergunta ao montar, a cada 30 minutos e ao voltar para a aba: quem deixa o
 * FleetPass aberto o dia inteiro no balcão não recarrega por conta própria.
 *
 * Em desenvolvimento não faz nada: o build id é um carimbo de tempo que muda a
 * cada reinício do servidor, e o aviso apareceria sem parar.
 */
export function useVersaoApp(): { novaVersao: VersaoNoAr | null } {
  const [novaVersao, setNovaVersao] = useState<VersaoNoAr | null>(null)

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return

    const buildAtual = process.env.NEXT_PUBLIC_BUILD_ID
    if (!buildAtual) return

    let vivo = true

    const consultar = async () => {
      try {
        const res = await fetch('/api/versao', { cache: 'no-store' })
        if (!res.ok) return
        const dados = (await res.json()) as Partial<VersaoNoAr>
        if (!vivo || !dados.build || !dados.versao) return
        // Só sinaliza quando o deploy no ar é outro.
        if (dados.build !== buildAtual) {
          setNovaVersao({ versao: dados.versao, build: dados.build })
        }
      } catch {
        // Offline ou servidor fora: silêncio. Tenta de novo no próximo ciclo.
      }
    }

    void consultar()
    const timer = window.setInterval(consultar, INTERVALO_MS)
    const aoVoltar = () => { if (document.visibilityState === 'visible') void consultar() }
    document.addEventListener('visibilitychange', aoVoltar)

    return () => {
      vivo = false
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', aoVoltar)
    }
  }, [])

  return { novaVersao }
}
