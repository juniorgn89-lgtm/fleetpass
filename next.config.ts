import type { NextConfig } from "next";
import { version } from "./package.json";

const nextConfig: NextConfig = {
  // Identidade desta build, lida pelo cliente para saber que há versão nova.
  //
  // `versão` é a do package.json — o que o usuário vê. `build` é o que de fato
  // distingue dois deploys: a versão pode repetir entre eles, o commit não.
  // Fora da Vercel (dev, build local) cai num carimbo de tempo, que muda a
  // cada build e por isso é ignorado em desenvolvimento.
  env: {
    NEXT_PUBLIC_APP_VERSION: version,
    NEXT_PUBLIC_BUILD_ID:
      process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || Date.now().toString(36),
  },
  images: {
    // O Next reencoda toda imagem otimizada e, por padrão, só aceita quality=75.
    // A arte do hero tem texto pequeno (cards do painel) que fica borrado nesse
    // nível; 90 fica liberado para quem precisar pedir explicitamente.
    qualities: [75, 90],
  },
  // O indicador de dev do Next (a bolinha preta com o "N") nasce no canto
  // inferior esquerdo — em cima do botão de conta no rodapé da sidebar. Só
  // aparece com `next dev`, mas atrapalhava o clique durante o trabalho.
  devIndicators: {
    position: 'bottom-right',
  },
};

export default nextConfig;
