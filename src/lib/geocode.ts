/**
 * Geocodificação de endereço via Nominatim (OpenStreetMap).
 *
 * Estava embutida na rota de meus-postos. Saiu de lá porque agora dois
 * pontos precisam dela: a gravação do posto (POST/PATCH) e o preenchimento
 * sob demanda das coordenadas que faltam.
 *
 * O Nominatim pede no máximo 1 requisição por segundo e um User-Agent que
 * identifique a aplicação — por isso quem chama precisa serializar.
 */

const ESTADO_NOME: Record<string, string> = {
  AC: 'Acre', AL: 'Alagoas', AP: 'Amapá', AM: 'Amazonas', BA: 'Bahia',
  CE: 'Ceará', DF: 'Distrito Federal', ES: 'Espírito Santo', GO: 'Goiás',
  MA: 'Maranhão', MT: 'Mato Grosso', MS: 'Mato Grosso do Sul',
  MG: 'Minas Gerais', PA: 'Pará', PB: 'Paraíba', PR: 'Paraná',
  PE: 'Pernambuco', PI: 'Piauí', RJ: 'Rio de Janeiro',
  RN: 'Rio Grande do Norte', RS: 'Rio Grande do Sul', RO: 'Rondônia',
  RR: 'Roraima', SC: 'Santa Catarina', SP: 'São Paulo', SE: 'Sergipe',
  TO: 'Tocantins',
}

export async function geocode(
  endereco: string, numero: string, bairro: string,
  cidade: string, estado: string, cep: string
): Promise<{ lat: number; lng: number } | null> {
  const headers = { 'User-Agent': 'FleetPass/1.0', 'Accept-Language': 'pt-BR' }
  const base = 'https://nominatim.openstreetmap.org/search'

  const tryUrl = async (url: string) => {
    const res = await fetch(url, { headers })
    const data = await res.json()
    if (data?.[0]) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
    return null
  }

  try {
    const estadoNome = ESTADO_NOME[estado.toUpperCase()] ?? estado

    // 1. Texto livre com bairro — dá contexto geográfico preciso ao Nominatim
    if (endereco && bairro && cidade) {
      const parts = [endereco, numero, bairro, cidade, estadoNome, 'Brasil'].filter(Boolean)
      const r = await tryUrl(`${base}?q=${encodeURIComponent(parts.join(', '))}&format=json&limit=1&countrycodes=br`)
      if (r) return r
    }

    // 2. Texto livre sem bairro
    if (endereco && cidade) {
      const parts = [endereco, numero, cidade, estadoNome, 'Brasil'].filter(Boolean)
      const r = await tryUrl(`${base}?q=${encodeURIComponent(parts.join(', '))}&format=json&limit=1&countrycodes=br`)
      if (r) return r
    }

    // 3. Busca estruturada (rua + número + cidade + estado)
    if (endereco && cidade) {
      const street = numero ? `${numero} ${endereco}` : endereco
      const r = await tryUrl(`${base}?street=${encodeURIComponent(street)}&city=${encodeURIComponent(cidade)}&state=${encodeURIComponent(estadoNome)}&country=BR&format=json&limit=1`)
      if (r) return r
    }

    // 4. CEP
    if (cep) {
      const clean = cep.replace(/\D/g, '')
      if (clean.length === 8) {
        const r = await tryUrl(`${base}?postalcode=${clean}&country=BR&format=json&limit=1`)
        if (r) return r
      }
    }

    // 5. Cidade + estado (fallback)
    return await tryUrl(`${base}?city=${encodeURIComponent(cidade)}&state=${encodeURIComponent(estadoNome)}&country=BR&format=json&limit=1`)
  } catch {
    return null
  }
}
