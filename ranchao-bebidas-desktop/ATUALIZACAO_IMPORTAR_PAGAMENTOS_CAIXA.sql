-- Ranchão Bebidas
-- Permite importar uma vez cada registro da aba Pagamentos para Pagamento no Caixa.
-- A origem continua independente: editar ou excluir no destino não altera Pagamentos.

alter table public.pagamentos_caixa
  add column if not exists pagamento_origem_id bigint;

create unique index if not exists pagamentos_caixa_origem_unica_idx
  on public.pagamentos_caixa (loja, pagamento_origem_id);

comment on column public.pagamentos_caixa.pagamento_origem_id is
  'ID usado apenas para impedir que o mesmo pagamento seja importado duas vezes.';

notify pgrst, 'reload schema';
