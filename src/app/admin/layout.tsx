'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { SidebarAdmin } from '@/components/layout/sidebar-admin'
import { AppShell } from '@/components/layout/app-shell'
import { supabase } from '@/lib/supabase'
import { Loader2 } from 'lucide-react'

function useBreadcrumb() {
  const pathname = usePathname()
  const segments = pathname.split('/').filter(Boolean)

  const labels: Record<string, string> = {
    admin: 'Admin',
    postos: 'Postos',
    empresas: 'Empresas',
    transacoes: 'Transações',
    notas: 'Notas Fiscais',
    configuracoes: 'Configurações',
    planos: 'Planos Stripe',
    perfil: 'Perfil',
  }

  return segments.map((seg, i) => ({
    label: labels[seg] || decodeURIComponent(seg).replace(/-/g, ' '),
    href: '/' + segments.slice(0, i + 1).join('/'),
  }))
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const breadcrumb = useBreadcrumb()
  const router = useRouter()
  const [authorized, setAuthorized] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    async function checkAdmin() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.replace('/login')
          return
        }

        const { data: perfil } = await supabase
          .from('perfis')
          .select('role')
          .eq('id', user.id)
          .single()

        if ((perfil?.role as string) !== 'admin') {
          router.replace('/login')
          return
        }

        setAuthorized(true)
      } catch {
        router.replace('/login')
      } finally {
        setChecking(false)
      }
    }

    checkAdmin()
  }, [router])

  if (checking || !authorized) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="flex items-center gap-3">
          <Loader2 size={20} className="animate-spin text-gray-400" />
          <span className="text-sm text-gray-500">Verificando permissões...</span>
        </div>
      </div>
    )
  }

  return (
    <AppShell sidebar={<SidebarAdmin />} breadcrumb={breadcrumb}>
      {children}
    </AppShell>
  )
}
