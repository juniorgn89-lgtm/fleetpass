'use client'

import { useEffect, useState } from 'react'
import {
  Fuel, Gauge, User, Wallet, Lock, LockOpen, Wrench, History,
  Pencil, Loader2, Activity, CalendarClock,
} from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { iniciaisDe } from '@/hooks/use-perfil-atual'

/**
 * Detalhe de um veículo.
 *
 * Os campos do veículo NÃO são buscados: a listagem já os tem em memória e os
 * passa por prop. A única leitura extra é a de utilização recente, e ela só
 * acontece quando o modal abre — carregar isso por veículo na tabela seria um
 * N+1.
 *
 * As ações não reimplementam nada: chamam de volta os fluxos que a página já
 * tem (editar, bloquear, desbloquear, histórico), para não haver duas regras
 * de bloqueio no código.
 */
export interface VeiculoDetalhe {
  id: string
  placa: string
  modelo: string
  combustivel: string
  limiteMensal: number | null
  motoristaNome: string | null
  exigirQuilometragem: boolean
  bloqueado: boolean
  bloqueioTipo: 'manutencao' | 'operacional' | null
}

interface Utilizacao {
  dias: number
  abastecimentos: number
  litros: number
  valor: number
  ultimoUso: string | null
}

const brl = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

/** Uma linha da ficha. Valor ausente vira "—", nunca some a linha inteira: a
 *  ficha é curta e a lacuna informa tanto quanto o dado. */
function Linha({ icone, rotulo, children }: {
  icone: React.ReactNode; rotulo: string; children: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-gray-100 last:border-0">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gray-50 text-gray-400">
        {icone}
      </span>
      <span className="w-40 shrink-0 pt-1 text-sm text-gray-500">{rotulo}</span>
      <div className="min-w-0 flex-1 pt-1 text-sm text-gray-800">{children}</div>
    </div>
  )
}

export function ModalVeiculo({
  veiculo, onFechar, onEditar, onBloquear, onDesbloquear, onHistorico,
}: {
  veiculo: VeiculoDetalhe | null
  onFechar: () => void
  onEditar: (v: VeiculoDetalhe) => void
  onBloquear: (v: VeiculoDetalhe) => void
  onDesbloquear: (v: VeiculoDetalhe) => void
  onHistorico: (v: VeiculoDetalhe) => void
}) {
  const [uso, setUso] = useState<Utilizacao | null>(null)
  const [carregandoUso, setCarregandoUso] = useState(false)
  const [erroUso, setErroUso] = useState('')

  useEffect(() => {
    if (!veiculo) return
    let cancelado = false
    setUso(null); setErroUso(''); setCarregandoUso(true)
    ;(async () => {
      try {
        const res = await fetch(`/api/empresa/frota/veiculos/${veiculo.id}/utilizacao`)
        const json = await res.json()
        if (cancelado) return
        if (!res.ok) { setErroUso(json.error ?? 'Não foi possível carregar a utilização.'); return }
        setUso(json)
      } catch {
        if (!cancelado) setErroUso('Não foi possível carregar a utilização.')
      } finally {
        if (!cancelado) setCarregandoUso(false)
      }
    })()
    return () => { cancelado = true }
  }, [veiculo])

  if (!veiculo) return <Modal isOpen={false} onClose={onFechar}>{null}</Modal>

  const v = veiculo
  const situacao = v.bloqueado
    ? (v.bloqueioTipo === 'manutencao'
        ? { rotulo: 'Em manutenção', classe: 'bg-amber-50 text-amber-700 border-amber-200', ponto: 'bg-amber-500' }
        : { rotulo: 'Bloqueado',     classe: 'bg-red-50 text-red-700 border-red-200',       ponto: 'bg-red-500' })
    : { rotulo: 'Ativo', classe: 'bg-emerald-50 text-emerald-700 border-emerald-200', ponto: 'bg-emerald-500' }

  return (
    <Modal isOpen onClose={onFechar} title={v.placa} size="lg">
      <div className="space-y-5">
        {/* Cabeçalho: modelo e situação, sob a placa que o Modal já titula */}
        <div className="-mt-2 flex flex-wrap items-center gap-2">
          <span className="text-sm text-gray-500">{v.modelo || 'Modelo não informado'}</span>
          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border inline-flex items-center gap-1.5 ${situacao.classe}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${situacao.ponto}`} />
            {situacao.rotulo}
          </span>
        </div>

        <section className="rounded-xl border border-gray-100 p-4">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1">
            Informações
          </h3>
          <Linha icone={<Fuel size={14} />} rotulo="Combustível">
            {v.combustivel
              ? <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{v.combustivel}</span>
              : <span className="text-gray-400">—</span>}
          </Linha>
          <Linha icone={<Wallet size={14} />} rotulo="Limite mensal">
            {v.limiteMensal != null ? brl(v.limiteMensal) : <span className="text-gray-400">Sem limite definido</span>}
          </Linha>
          <Linha icone={<User size={14} />} rotulo="Motorista padrão">
            {v.motoristaNome ? (
              <span className="inline-flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold flex items-center justify-center shrink-0">
                  {iniciaisDe(v.motoristaNome)}
                </span>
                {v.motoristaNome}
              </span>
            ) : <span className="text-gray-400">Não definido</span>}
          </Linha>
          <Linha icone={<Gauge size={14} />} rotulo="Exigir quilometragem">
            {v.exigirQuilometragem ? 'Sim' : 'Não'}
          </Linha>
          {/* Só existe tipo de bloqueio quando há bloqueio — daí a linha
              aparecer condicionalmente, e não com "—". */}
          {v.bloqueado && (
            <Linha icone={<Lock size={14} />} rotulo="Tipo de bloqueio">
              {v.bloqueioTipo === 'manutencao' ? 'Manutenção' : 'Operacional'}
              <span className="block text-xs text-gray-400 mt-0.5">
                O motivo registrado aparece no histórico.
              </span>
            </Linha>
          )}
        </section>

        {/* Utilização: a única leitura extra, e só com o modal aberto. */}
        <section className="rounded-xl border border-gray-100 p-4">
          <h3 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-3">
            <Activity size={13} /> Utilização recente
            {uso && <span className="normal-case tracking-normal font-normal">· últimos {uso.dias} dias</span>}
          </h3>

          {carregandoUso && (
            <div className="flex items-center gap-2 py-4 text-sm text-gray-400">
              <Loader2 size={14} className="animate-spin" /> Carregando utilização…
            </div>
          )}

          {!carregandoUso && erroUso && (
            <p className="py-3 text-sm text-gray-400">{erroUso}</p>
          )}

          {!carregandoUso && !erroUso && uso && (
            uso.abastecimentos === 0 ? (
              <p className="py-3 text-sm text-gray-400">
                Nenhum abastecimento registrado nos últimos {uso.dias} dias.
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <p className="text-lg font-bold text-gray-900 leading-none">{uso.abastecimentos}</p>
                  <p className="text-xs text-gray-500 mt-1">Abastecimentos</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-900 leading-none">{Math.round(uso.litros)} L</p>
                  <p className="text-xs text-gray-500 mt-1">Litros</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-900 leading-none">{brl(uso.valor)}</p>
                  <p className="text-xs text-gray-500 mt-1">Valor</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-900 leading-none inline-flex items-center gap-1">
                    <CalendarClock size={15} className="text-gray-400" />
                    {uso.ultimoUso ? new Date(uso.ultimoUso).toLocaleDateString('pt-BR') : '—'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Última utilização</p>
                </div>
              </div>
            )
          )}
        </section>

        {/* Ações — todas devolvem para os fluxos que a página já tem. */}
        <div className="flex flex-col sm:flex-row gap-2">
          <Button variant="secondary" size="sm" className="flex-1" onClick={() => onHistorico(v)}>
            <History size={14} /> Ver histórico
          </Button>
          {v.bloqueado ? (
            <Button variant="secondary" size="sm" className="flex-1" onClick={() => onDesbloquear(v)}>
              <LockOpen size={14} /> Desbloquear
            </Button>
          ) : (
            <Button variant="secondary" size="sm" className="flex-1" onClick={() => onBloquear(v)}>
              <Wrench size={14} /> Bloquear
            </Button>
          )}
          <Button size="sm" className="flex-1" onClick={() => onEditar(v)}>
            <Pencil size={14} /> Editar veículo
          </Button>
        </div>
      </div>
    </Modal>
  )
}
