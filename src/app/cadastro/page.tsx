import Link from 'next/link'
import { Logo } from '@/components/ui/logo'
import { Building2, Fuel, ArrowRight, ArrowLeft } from 'lucide-react'

export default function CadastroPage() {
  return (
    <div className="relative min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <Link
        href="/"
        className="absolute top-5 left-5 z-20 inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft size={16} /> Voltar ao início
      </Link>
      <Link href="/" className="flex items-center gap-2 mb-10">
        <Logo tamanho={32} />
      </Link>

      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Como você quer usar o FleetPass?</h1>
        <p className="text-gray-500 mt-2">Escolha o perfil que melhor representa você.</p>
      </div>

      <div className="flex gap-5 max-w-2xl w-full">
        <Link
          href="/cadastro/empresa"
          className="group flex-1 flex flex-col items-center p-8 bg-white border-2 border-gray-100 rounded-2xl hover:border-blue-500 hover:shadow-lg hover:shadow-blue-50 transition-all duration-200 cursor-pointer"
        >
          <div className="w-16 h-16 bg-blue-50 group-hover:bg-blue-100 rounded-2xl flex items-center justify-center mb-5 transition-colors">
            <Building2 size={28} className="text-blue-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Empresa</h2>
          <p className="text-sm text-gray-500 text-center leading-relaxed mb-5">
            Tenho uma frota e quero gerenciar abastecimentos de forma digital.
          </p>
          <div className="flex items-center gap-1.5 text-sm font-medium text-blue-600 group-hover:gap-2.5 transition-all">
            Cadastrar empresa <ArrowRight size={14} />
          </div>
        </Link>

        <Link
          href="/cadastro/posto"
          className="group flex-1 flex flex-col items-center p-8 bg-white border-2 border-gray-100 rounded-2xl hover:border-blue-500 hover:shadow-lg hover:shadow-blue-50 transition-all duration-200 cursor-pointer"
        >
          <div className="w-16 h-16 bg-amber-50 group-hover:bg-amber-100 rounded-2xl flex items-center justify-center mb-5 transition-colors">
            <Fuel size={28} className="text-amber-500" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Posto de Combustível</h2>
          <p className="text-sm text-gray-500 text-center leading-relaxed mb-5">
            Tenho um ou mais postos e quero atrair empresas parceiras B2B.
          </p>
          <div className="flex items-center gap-1.5 text-sm font-medium text-blue-600 group-hover:gap-2.5 transition-all">
            Criar conta <ArrowRight size={14} />
          </div>
        </Link>
      </div>

      <p className="mt-8 text-sm text-gray-400">
        Já tem uma conta?{' '}
        <Link href="/login" className="text-blue-600 hover:underline">
          Entrar
        </Link>
      </p>
    </div>
  )
}
