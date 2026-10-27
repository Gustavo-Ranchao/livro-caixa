-- Ranchão Bebidas 1.2.47
-- Permite classificar as contas a pagar e transportar a classificação
-- para o lançamento em dinheiro no Fluxo de Caixa.

alter table public.lancamentos
  add column if not exists codigo_tipo_id bigint;

create index if not exists idx_lancamentos_codigo_tipo_id
  on public.lancamentos (codigo_tipo_id);

comment on column public.lancamentos.codigo_tipo_id is
  'Classificação financeira selecionada em Contas a pagar.';

notify pgrst, 'reload schema';
