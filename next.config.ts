import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // O Next reencoda toda imagem otimizada e, por padrão, só aceita quality=75.
    // A arte do hero tem texto pequeno (cards do painel) que fica borrado nesse
    // nível; 90 fica liberado para quem precisar pedir explicitamente.
    qualities: [75, 90],
  },
};

export default nextConfig;
