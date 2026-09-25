-- Ranchão Bebidas — marcação de trabalho em feriado no Banco de Horas
-- Execute uma única vez no SQL Editor do Supabase.

alter table public.bh_registros
  add column if not exists trabalhou_feriado boolean not null default false;

comment on column public.bh_registros.trabalhou_feriado is
  'Indica que o colaborador trabalhou nessa data de feriado; a data deve constar nos relatórios para pagamento.';
