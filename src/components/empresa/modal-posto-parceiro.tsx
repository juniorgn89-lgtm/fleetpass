'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import {
  MapPin, Building2, Phone, Fuel, CalendarDays, Navigation,
  ExternalLink, Loader2, AlertCircle, FileText, Car, Store, MessageCircle,
} from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { exibirWhatsapp } from '@/lib/utils'

/**
 * Dados completos de um posto parceiro, com localização.
 *
 * O mapa entra por `dynamic(..., { ssr: false })` e este componente só é
 * montado quando o modal abre — então o Leaflet não é baixado enquanto a lista
 * de parcerias está na tela. É o mesmo `MapaPostos` da Vitrine: mapa somente
 * leitura que já sabe enquadrar e já ignora ponto sem coordenada.
 */
const MapaPostos = dynamic(() => import('@/components/vitrine/mapa-postos'), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center gap-2 text-xs text-gray-400">
      <Loader2 size={14} className="animate-spin" /> Carregando mapa…
    </div>
  ),
})

interface PostoParceiro {
  id: string
  nome: string
  cnpj: string
  bandeira: string
  endereco: string
  numero: string
  complemento: string | null
  bairro: string
  cidade: string
  estado: string
  cep: string
  lat: number | null
  lng: number | null
  telefone: string | null
  whatsapp: string | null
  combustiveis: string[]
  status: string
}

interface Dados {
  posto: PostoParceiro
  parceria: { status: string; iniciadaEm: string }
  empresa: { nome: string; cidade: string; estado: string }
}

/** Endereço em duas linhas, como no cadastro; pula o que não existe. */
function enderecoLinhas(p: PostoParceiro): string[] {
  const l1 = [p.endereco, p.numero].filter(Boolean).join(', ')
  const l2 = [p.bairro, `${p.cidade} - ${p.estado}`, p.cep].filter(Boolean).join(', ')
  return [l1, p.complemento, l2].filter(Boolean) as string[]
}

/**
 * Alvo do Google Maps: coordenada quando existe, senão o endereço escrito.
 * Nunca um valor inventado — sem os dois, devolve null e os botões somem.
 */
function alvoMaps(p: PostoParceiro): string | null {
  if (p.lat != null && p.lng != null) return `${p.lat},${p.lng}`
  const texto = [p.endereco, p.numero, p.bairro, p.cidade, p.estado, p.cep]
    .filter(Boolean).join(', ')
  return texto ? `${texto}, Brasil` : null
}

/** Uma linha da ficha; não renderiza nada quando o valor está vazio. */
function Linha({
  icone, rotulo, children,
}: { icone: React.ReactNode; rotulo: string; children?: React.ReactNode }) {
  if (!children) return null
  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gray-50 text-gray-400">
        {icone}
      </span>
      <span className="w-32 shrink-0 pt-1 text-sm text-gray-500">{rotulo}</span>
      <div className="min-w-0 flex-1 pt-1 text-sm text-gray-800">{children}</div>
    </div>
  )
}

export function ModalPostoParceiro({
  parceriaId,
  onClose,
}: {
  parceriaId: string | null
  onClose: () => void
}) {
  const [dados, setDados] = useState<Dados | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (!parceriaId) return
    let cancelado = false
    setCarregando(true)
    setErro('')
    setDados(null)
    ;(async () => {
      try {
        const res = await fetch(`/api/empresa/parcerias/${parceriaId}/posto`)
        const json = await res.json()
        if (cancelado) return
        if (!res.ok) { setErro(json.error ?? 'Não foi possível carregar os dados do posto.'); return }
        setDados(json)
      } catch {
        if (!cancelado) setErro('Não foi possível carregar os dados do posto.')
      } finally {
        if (!cancelado) setCarregando(false)
      }
    })()
    return () => { cancelado = true }
  }, [parceriaId])

  const p = dados?.posto
  const alvo = p ? alvoMaps(p) : null
  const temCoordenada = p?.lat != null && p?.lng != null

  return (
    <Modal
      isOpen={parceriaId !== null}
      onClose={onClose}
      title={p ? p.nome : 'Dados do posto'}
      size="lg"
      // Duas colunas pedem mais largura do que o `lg` do componente (672px).
      // Sobrescrever aqui evita mexer no Modal, que é compartilhado.
      className="max-w-5xl"
    >
      {carregando && (
        <div className="flex items-center justify-center gap-2 py-20 text-gray-400">
          <Loader2 size={18} className="animate-spin" />
          <span className="text-sm">Carregando dados do posto…</span>
        </div>
      )}

      {!carregando && erro && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle size={15} className="shrink-0" /> {erro}
        </div>
      )}

      {!carregando && !erro && p && dados && (
        <div className="space-y-5">
          {/* Cabeçalho: cidade/UF, bandeira, situação e combustíveis */}
          <div className="-mt-2 space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
              <span className="inline-flex items-center gap-1">
                <MapPin size={13} className="text-gray-400" /> {p.cidade}, {p.estado}
              </span>
              {p.bandeira && (
                <>
                  <span className="text-gray-300">·</span>
                  <span>{p.bandeira}</span>
                </>
              )}
              <span className={`ml-1 text-[11px] font-medium px-2 py-0.5 rounded-full border ${
                p.status === 'ativo'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-gray-100 text-gray-500 border-gray-200'
              }`}>
                {p.status === 'ativo' ? 'Ativo' : 'Inativo'}
              </span>
            </div>
            {p.combustiveis.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {p.combustiveis.map((c) => (
                  <span key={c} className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-medium">
                    {c}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Duas colunas no desktop, empilhadas no celular */}
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Ficha do posto */}
            <section className="rounded-xl border border-gray-100 p-5">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-2">
                <FileText size={15} className="text-gray-400" /> Informações do posto
              </h3>
              <div>
                <Linha icone={<Building2 size={14} />} rotulo="CNPJ">{p.cnpj}</Linha>
                <Linha icone={<MapPin size={14} />} rotulo="Endereço">
                  {enderecoLinhas(p).map((l) => <p key={l}>{l}</p>)}
                </Linha>
                <Linha icone={<Phone size={14} />} rotulo="Telefone">{p.telefone}</Linha>
                <Linha icone={<Store size={14} />} rotulo="Rede">{p.bandeira}</Linha>
                <Linha icone={<CalendarDays size={14} />} rotulo="Início da parceria">
                  {new Date(dados.parceria.iniciadaEm).toLocaleDateString('pt-BR')}
                </Linha>
                <Linha icone={<Fuel size={14} />} rotulo="Combustíveis">
                  {p.combustiveis.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {p.combustiveis.map((c) => (
                        <span key={c} className="text-[11px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                          {c}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </Linha>
              </div>

              {/* WhatsApp como ação, não como texto: é o canal pelo qual a
                  transportadora fala com o posto. A mensagem já entra escrita,
                  com o contexto de quem são — aqui, parceiro ativo, e não
                  alguém propondo parceria como na Vitrine.

                  Sem número, o bloco não some: some é pior, porque a pessoa
                  não distingue "o posto não informou" de "o app não tem isso".
                  Aqui a falta fica dita, e o telefone fixo continua na ficha. */}
              {p.whatsapp ? (
                <a
                  href={`https://wa.me/${p.whatsapp}?text=${encodeURIComponent(
                    `Olá! Somos a ${dados.empresa.nome}, parceira do ${p.nome} no FleetPass.`,
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 flex items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700 hover:bg-emerald-100 transition-colors"
                >
                  <MessageCircle size={15} />
                  Falar no WhatsApp · {exibirWhatsapp(p.whatsapp)}
                </a>
              ) : (
                <div className="mt-4 flex items-center justify-center gap-2 rounded-lg border border-dashed border-gray-200 px-4 py-2.5 text-sm text-gray-400">
                  <MessageCircle size={15} />
                  WhatsApp não informado pelo posto
                </div>
              )}
            </section>

            {/* Localização */}
            <section className="rounded-xl border border-gray-100 p-5 flex flex-col">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <Car size={15} className="text-gray-400" /> Localização e rota
              </h3>
              <p className="mt-0.5 mb-3 text-xs text-gray-400">
                Trajeto da sua empresa até o posto
              </p>

              {temCoordenada ? (
                <div className="rounded-xl overflow-hidden border border-gray-200 flex-1 min-h-[260px]">
                  <MapaPostos
                    postos={[{
                      postoId: p.id, nome: p.nome, cidade: p.cidade,
                      estado: p.estado, lat: p.lat, lng: p.lng,
                    }]}
                  />
                </div>
              ) : (
                <div className="flex-1 min-h-[260px] rounded-xl border border-gray-200 bg-gray-50 flex flex-col items-center justify-center px-4 text-center">
                  <MapPin size={20} className="text-gray-300" />
                  <p className="mt-2 text-sm font-medium text-gray-600">
                    Localização do posto ainda não disponível.
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    O posto não tem coordenadas cadastradas. O endereço ao lado continua válido.
                  </p>
                </div>
              )}

              {/* Ações de rota. Sem endereço nem coordenada não há o que abrir,
                  então os botões somem em vez de levar a uma busca vazia. */}
              {alvo && (
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(alvo)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex flex-col items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-white hover:bg-blue-700 dark:hover:bg-petrol-500 transition-colors"
                  >
                    <span className="inline-flex items-center gap-2 text-sm font-medium">
                      <Navigation size={15} /> Traçar rota
                    </span>
                    <span className="text-[11px] text-white/75">Abrir no Google Maps com rota</span>
                  </a>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(alvo)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <span className="inline-flex items-center gap-2 text-sm font-medium">
                      <ExternalLink size={15} /> Abrir no Google Maps
                    </span>
                    <span className="text-[11px] text-gray-400">Ver localização do posto</span>
                  </a>
                </div>
              )}

              {/* Por que não há distância, tempo nem linha de rota aqui dentro:
                  a empresa não tem endereço nem coordenada no cadastro — só
                  cidade e UF. Sair da cidade como origem erraria por dezenas de
                  quilômetros, então a origem fica com o Google Maps, que usa a
                  posição real do aparelho. */}
              <p className="mt-3 text-[11px] leading-relaxed text-gray-400">
                A rota abre no Google Maps a partir da sua localização atual: o cadastro da
                empresa tem apenas cidade e estado, sem endereço ou coordenadas que sirvam de
                origem confiável.
              </p>
            </section>
          </div>

          <div className="flex justify-end pt-1">
            <button
              onClick={onClose}
              className="rounded-lg border border-gray-200 bg-white px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}
