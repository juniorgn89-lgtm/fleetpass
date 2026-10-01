'use client'

import { cn } from '@/lib/utils'
import { X } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  className?: string
  size?: 'sm' | 'md' | 'lg'
  /**
   * Selo à esquerda do título — um ícone já usado para o assunto do modal.
   * Opcional: sem ele o cabeçalho fica exatamente como antes.
   */
  icone?: ReactNode
  /** Uma linha sob o título dizendo o que o modal faz. */
  subtitulo?: string
  /**
   * Barra de ações fixa no pé. Fica FORA da área rolável de propósito: num
   * celular o formulário rola e os botões continuam à vista.
   */
  footer?: ReactNode
}

const sizeStyles = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
}

export function Modal({
  isOpen, onClose, title, children, className, size = 'md',
  icone, subtitulo, footer,
}: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={cn(
          'relative w-full bg-white rounded-xl shadow-xl z-10 flex flex-col max-h-[calc(100vh-4rem)]',
          sizeStyles[size],
          className
        )}
      >
        {title && (
          <div className={cn(
            'flex justify-between gap-3 px-6 py-4 border-b border-gray-100 shrink-0',
            // Sem subtítulo o cabeçalho é de uma linha só e continua centrado,
            // como sempre foi nos demais modais.
            subtitulo ? 'items-start' : 'items-center',
          )}>
            <div className="flex min-w-0 items-center gap-3">
              {icone && (
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  {icone}
                </span>
              )}
              <div className="min-w-0">
                <h2 className={cn('font-semibold text-gray-900', subtitulo ? 'text-lg leading-tight' : 'text-base')}>
                  {title}
                </h2>
                {subtitulo && <p className="mt-0.5 text-sm text-gray-500">{subtitulo}</p>}
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Fechar"
              className="shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        )}
        {!title && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors z-10"
          >
            <X size={18} />
          </button>
        )}
        <div className="p-6 overflow-y-auto flex-1 min-h-0">{children}</div>
        {footer && (
          <div className="shrink-0 border-t border-gray-100 bg-white px-6 py-4 rounded-b-xl">{footer}</div>
        )}
      </div>
    </div>
  )
}
