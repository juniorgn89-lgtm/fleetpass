'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { RefreshCw, X } from 'lucide-react'
import { useVersaoApp } from '@/hooks/use-versao-app'
import { RELEASE_NOTES, type ReleaseNote } from '@/lib/release-notes'
import { NovidadesLista, NovidadesModal, novidadesDesde } from '@/components/feedback/novidades'

/** Última versão que rodou neste navegador — para saber, no reinício, o que é novo. */
const CHAVE_VERSAO = 'fleetpass.versao'
/** Versão cujas novidades já apareceram na tela de atualização (não repetir depois). */
const CHAVE_VISTAS = 'fleetpass.novidadesVistas'

const ler = (s: Storage, chave: string) => {
  try { return s.getItem(chave) } catch { return null }
}
const gravar = (s: Storage, chave: string, valor: string) => {
  try { s.setItem(chave, valor) } catch { /* sem storage: só perde a memória da versão */ }
}

const VERSAO_ATUAL = process.env.NEXT_PUBLIC_APP_VERSION ?? '0.0.0'

/**
 * Aviso e tela de atualização — no espírito do iPhone.
 *
 * 1. Saiu deploy novo → `useVersaoApp` percebe e aparece o banner.
 * 2. "Atualizar" abre a tela cheia: busca as notas da versão NOVA em
 *    `/api/versao` (este bundle não as conhece), mostra a lista com uma barra
 *    de progresso que dá tempo de ler, e recarrega a página no fim.
 * 3. Depois do reinício, se a versão mudou e as notas ainda não foram vistas,
 *    abre o modal "FleetPass atualizado".
 *
 * Nunca atualiza sozinho. O frentista pode estar no meio de uma validação de
 * abastecimento, e perder isso por causa de um deploy seria inaceitável.
 *
 * Fica dentro da casca autenticada, então só aparece depois do login — em
 * qualquer papel.
 */
export function AvisoAtualizacao() {
  const { novaVersao } = useVersaoApp()
  const [dispensado, setDispensado] = useState(false)
  const [instalando, setInstalando] = useState(false)

  // Pós-reinício: "FleetPass atualizado" com o que mudou desde a versão anterior.
  const [posAtualizacao, setPosAtualizacao] = useState<ReleaseNote[] | null>(null)
  useEffect(() => {
    const anterior = ler(localStorage, CHAVE_VERSAO)
    if (anterior === VERSAO_ATUAL) return
    gravar(localStorage, CHAVE_VERSAO, VERSAO_ATUAL)
    // Primeira vez neste navegador: não há "antes", nada a comparar.
    if (!anterior) return
    // Já lidas na tela de atualização — não repetir.
    if (ler(sessionStorage, CHAVE_VISTAS) === VERSAO_ATUAL) return
    /* eslint-disable-next-line react-hooks/set-state-in-effect --
       Não é estado derivado: é uma leitura única de localStorage, que só
       existe depois de montar — no servidor não há storage, então isto não
       pode acontecer durante o render. */
    setPosAtualizacao(novidadesDesde(anterior))
  }, [])

  const mostrarBanner = novaVersao !== null && !dispensado && !instalando

  return (
    <>
      <NovidadesModal
        open={posAtualizacao !== null}
        onClose={() => setPosAtualizacao(null)}
        releases={posAtualizacao ?? []}
        titulo="FleetPass atualizado"
      />

      {instalando && <TelaAtualizacao />}

      {mostrarBanner && (
        <div className="fixed inset-x-0 bottom-0 z-[100] flex justify-center px-3 pb-3 pt-3">
          <div className="flex w-full max-w-lg items-center gap-3 rounded-xl border border-white/10 bg-petrol-950 px-4 py-3 text-white shadow-2xl">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10">
              <RefreshCw className="h-[18px] w-[18px]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-tight">Nova versão disponível</p>
              <p className="text-[11.5px] leading-snug text-white/70">
                Atualize e veja o que mudou. Se estiver no meio de uma requisição, termine antes.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setInstalando(true)}
              className="shrink-0 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-blue-500 active:scale-95"
            >
              Atualizar
            </button>
            <button
              type="button"
              aria-label="Depois"
              onClick={() => setDispensado(true)}
              className="shrink-0 rounded-md p-1.5 text-white/50 transition-colors hover:bg-white/10 hover:text-white/80"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </>
  )
}

/* ------------------------------------------------------- tela de atualização */

type Fase = 'preparando' | 'baixando' | 'reiniciando'

const ROTULO: Record<Fase, string> = {
  preparando:  'Preparando a atualização…',
  baixando:    'Baixando a nova versão…',
  reiniciando: 'Reiniciando o FleetPass…',
}

/** Tempo mínimo com a lista na tela antes de reiniciar — é para dar tempo de ler. */
const TEMPO_LEITURA_MS = 7000
const TEMPO_PREPARO_MIN_MS = 900
const TIMEOUT_NOTAS_MS = 2500

interface VersaoPublicada {
  versao: string
  notas: ReleaseNote[]
}

/** Busca a versão e as notas do deploy NOVO. Falha devolve null, sem inventar. */
async function buscarVersaoNova(): Promise<VersaoPublicada | null> {
  const ctrl = new AbortController()
  const timer = window.setTimeout(() => ctrl.abort(), TIMEOUT_NOTAS_MS)
  try {
    const res = await fetch(`/api/versao?v=${Date.now()}`, { cache: 'no-store', signal: ctrl.signal })
    if (!res.ok) return null
    const json = (await res.json()) as Partial<VersaoPublicada>
    if (!json.versao || !Array.isArray(json.notas)) return null
    return { versao: json.versao, notas: json.notas }
  } catch {
    return null
  } finally {
    window.clearTimeout(timer)
  }
}

function TelaAtualizacao() {
  const [fase, setFase] = useState<Fase>('preparando')
  const [progresso, setProgresso] = useState(4)
  const [versaoNova, setVersaoNova] = useState<string | null>(null)
  const [releases, setReleases] = useState<ReleaseNote[] | null>(null)
  const recarregado = useRef(false)

  useEffect(() => {
    let vivo = true
    const timers: number[] = []
    const depois = (ms: number, fn: () => void) => {
      timers.push(window.setTimeout(() => { if (vivo) fn() }, ms))
    }

    const rodar = async () => {
      const inicio = Date.now()

      const publicada = await buscarVersaoNova()
      if (!vivo) return
      if (publicada) {
        setVersaoNova(publicada.versao)
        setReleases(novidadesDesde(VERSAO_ATUAL, publicada.notas))
        // Vistas aqui → o reinício não repete o modal.
        gravar(sessionStorage, CHAVE_VISTAS, publicada.versao)
      } else {
        // Sem as notas novas não se inventa: mostra o que este bundle conhece,
        // e o modal pós-reinício corrige com as certas.
        setReleases(novidadesDesde(null, RELEASE_NOTES))
      }

      const espera = Math.max(0, TEMPO_PREPARO_MIN_MS - (Date.now() - inicio))
      depois(espera, () => {
        setFase('baixando')
        // A barra avança em passos ao longo do tempo de leitura, até ~92%.
        const passos = 24
        for (let i = 1; i <= passos; i++) {
          depois((TEMPO_LEITURA_MS * i) / passos, () => setProgresso(18 + Math.round((74 * i) / passos)))
        }
        depois(TEMPO_LEITURA_MS + 150, () => {
          setFase('reiniciando')
          setProgresso(100)
          if (recarregado.current) return
          recarregado.current = true
          // Reload completo, e não router.refresh(): é preciso baixar os chunks
          // novos, não só revalidar o servidor.
          depois(400, () => window.location.reload())
        })
      })
    }

    setProgresso(12)
    void rodar()
    return () => {
      vivo = false
      timers.forEach((t) => window.clearTimeout(t))
    }
  }, [])

  const itens = releases?.flatMap((r) => r.itens) ?? []

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Atualizando o FleetPass"
      className="fixed inset-0 z-[200] overflow-y-auto bg-gradient-to-b from-[#021a18] via-petrol-950 to-petrol-900 text-white"
    >
      <div className="mx-auto flex min-h-full w-full max-w-md flex-col items-center px-6 pb-10 pt-14 sm:justify-center sm:pt-10">
        {/* Símbolo com halo pulsando */}
        <div className="relative mb-6 flex h-24 w-24 items-center justify-center">
          <span className="absolute inset-0 rounded-[28px] bg-white/10 motion-safe:animate-ping [animation-duration:2.4s]" />
          <span className="absolute inset-2 rounded-3xl bg-white/5" />
          <Image
            src="/brand/simbolo-192.png"
            alt=""
            width={64}
            height={64}
            priority
            className="relative h-16 w-16 rounded-2xl shadow-2xl"
          />
        </div>

        <h1 className="text-center text-[22px] font-bold tracking-[-0.01em]">Atualizando o FleetPass</h1>
        <p className="mt-1 text-center text-[13px] text-white/60">
          {versaoNova ? `Versão ${versaoNova}` : 'Nova versão'}
          <span className="mx-1.5 text-white/30">·</span>
          você está na {VERSAO_ATUAL}
        </p>

        <div className="mt-7 w-full">
          <div className="mb-2 flex items-center justify-between text-[12.5px]">
            <span className="flex items-center gap-2 font-medium text-white/85">
              <RefreshCw className={fase === 'reiniciando'
                ? 'h-3.5 w-3.5'
                : 'h-3.5 w-3.5 motion-safe:animate-spin [animation-duration:1.6s]'} />
              {ROTULO[fase]}
            </span>
            <span className="tabular-nums text-white/60">{progresso}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/15">
            <div
              className="h-full rounded-full bg-fuel-400 transition-[width] duration-500 ease-out"
              style={{ width: `${progresso}%` }}
            />
          </div>
        </div>

        <div className="mt-8 w-full rounded-2xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur-sm">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-fuel-400">
            O que há de novo
          </p>
          {releases === null ? (
            <div className="space-y-3 pt-2 motion-safe:animate-pulse">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="h-9 w-9 shrink-0 rounded-xl bg-white/10" />
                  <div className="flex-1 space-y-1.5 pt-1">
                    <span className="block h-3 w-2/3 rounded bg-white/10" />
                    <span className="block h-2.5 w-full rounded bg-white/[0.07]" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              {releases[0] && (
                <p className="mb-4 text-[13px] leading-snug text-white/75">{releases[0].resumo}</p>
              )}
              <NovidadesLista itens={itens} tom="escuro" />
            </>
          )}
        </div>

        <p className="mt-6 text-center text-[11.5px] text-white/45">
          Não feche o app. Ele reinicia sozinho em instantes.
        </p>
      </div>
    </div>
  )
}
