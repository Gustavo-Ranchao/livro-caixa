-- Ranchão Bebidas 1.2.66
-- Execute uma única vez no SQL Editor do Supabase antes de usar a taxa de entrega.

alter table public.vendas_produtos
  add column if not exists taxa_entrega numeric(14,2) not null default 0;

comment on column public.vendas_produtos.taxa_entrega is
  'Taxa de entrega separada dos produtos; não altera estoque, custo ou margem dos itens.';
