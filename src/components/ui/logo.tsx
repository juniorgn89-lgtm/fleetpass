import Image from 'next/image'
import { cn } from '@/lib/utils'

/**
 * Marca do FleetPass.
 *
 * O símbolo é o mesmo da família Visor360 (`public/brand/simbolo-512.png`) —
 * dois triângulos teal e um âmbar, as mesmas cores que ancoram os tokens
 * `petrol-*` e `fuel-*` em globals.css. Antes cada tela desenhava a marca à
 * mão com um ícone `Fuel` dentro de uma caixa colorida, o que fazia a
 * identidade divergir de página para página.
 *
 * `variante` controla só a cor do texto, para uso sobre fundo claro ou escuro.
 */
export function Logo({
  tamanho = 32,
  texto = true,
  variante = 'escuro',
  className,
}: {
  tamanho?: number
  texto?: boolean
  variante?: 'escuro' | 'claro'
  className?: string
}) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <Image
        src="/brand/simbolo-512.png"
        alt=""
        width={tamanho}
        height={tamanho}
        className="shrink-0 object-contain"
        priority
      />
      {texto && (
        <span
          className={cn(
            'font-bold tracking-tight',
            variante === 'claro' ? 'text-white' : 'text-petrol-950',
          )}
          style={{ fontSize: Math.round(tamanho * 0.58) }}
        >
          FleetPass
        </span>
      )}
    </span>
  )
}
