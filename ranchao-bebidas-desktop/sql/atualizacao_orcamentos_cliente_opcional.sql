-- Ranchão Bebidas — permite salvar orçamentos sem identificar o cliente
-- Execute uma única vez no SQL Editor do Supabase.

alter table public.orcamentos
  alter column cliente_nome drop not null;
