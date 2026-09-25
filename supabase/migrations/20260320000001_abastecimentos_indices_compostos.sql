-- Índices compostos para abastecimentos
--
-- POR QUE
-- Toda leitura pesada de abastecimentos filtra por dono E por intervalo de
-- data, nunca por um só:
--
--   posto_id  + data → posto/dashboard, posto/faturamento, posto/historico,
--                      posto/perfil, posto/relatorios, posto/relatorios/cliente
--   empresa_id + data → empresa/historico, posto/relatorios/cliente
--
-- Hoje existem índices avulsos em posto_id, empresa_id e data. O Postgres
-- resolve o par com bitmap AND dos dois, o que funciona mas lê mais páginas do
-- que o necessário e piora conforme a tabela cresce. Um índice composto
-- atende o filtro e a ordenação de uma vez.
--
-- A ordem DESC acompanha o `order('data', { ascending: false })` da maioria
-- das rotas; o Postgres percorre o índice ao contrário para as poucas que
-- pedem ascendente, sem custo relevante.
--
-- COMO APLICAR
-- CONCURRENTLY não roda dentro de transação. Rode estes comandos avulsos no
-- editor SQL do Supabase — NÃO por `supabase db push`, que envolve cada
-- migration em BEGIN/COMMIT e falharia. Em troca, a tabela segue aceitando
-- escrita durante a criação.
--
-- Nada de dado, RLS ou permissão é alterado aqui.

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_abastecimentos_posto_data
  ON public.abastecimentos (posto_id, data DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_abastecimentos_empresa_data
  ON public.abastecimentos (empresa_id, data DESC);

-- NÃO removido de propósito: `idx_abastecimentos_posto_id` e
-- `idx_abastecimentos_empresa_id` passam a ser cobertos pelos compostos acima
-- (o Postgres usa o prefixo do índice). Provavelmente são redundantes, mas
-- confirmar exige olhar o uso real em pg_stat_user_indexes com tráfego de
-- produção. Fica para uma limpeza separada.
