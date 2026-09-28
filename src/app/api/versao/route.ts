import { NextResponse } from 'next/server'
import { RELEASE_NOTES } from '@/lib/release-notes'

/**
 * GET /api/versao — qual versão está no ar, e o que ela trouxe.
 *
 * Existe por um motivo específico: o bundle que o usuário tem aberto é o
 * ANTIGO e não conhece as notas da versão nova. Ele pergunta aqui, e quem
 * responde é o servidor já atualizado.
 *
 * `build` é o que decide se há versão nova — a versão do package.json pode
 * repetir entre dois deploys, o commit não.
 *
 * Rota pública de propósito: não devolve nada além do que qualquer visitante
 * já veria no HTML da página. Autenticar aqui só atrapalharia o aviso de
 * atualização em tela de login.
 */
export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json(
    {
      versao: process.env.NEXT_PUBLIC_APP_VERSION ?? '0.0.0',
      build:  process.env.NEXT_PUBLIC_BUILD_ID ?? 'desconhecido',
      notas:  RELEASE_NOTES,
    },
    // Sem isto a resposta seria cacheada e o app nunca veria o deploy novo.
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
