import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
