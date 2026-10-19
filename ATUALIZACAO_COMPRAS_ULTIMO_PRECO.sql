alter table public.compras_produtos
  add column if not exists ultimo_preco_compra numeric(14,2),
  add column if not exists preco_compra_atual numeric(14,2),
  add column if not exists preco_compra_atualizado_em timestamptz;

alter table public.compras_produtos
  drop constraint if exists compras_produtos_ultimo_preco_compra_check;
alter table public.compras_produtos
  add constraint compras_produtos_ultimo_preco_compra_check
  check (ultimo_preco_compra is null or ultimo_preco_compra >= 0);

alter table public.compras_produtos
  drop constraint if exists compras_produtos_preco_compra_atual_check;
alter table public.compras_produtos
  add constraint compras_produtos_preco_compra_atual_check
  check (preco_compra_atual is null or preco_compra_atual >= 0);

comment on column public.compras_produtos.ultimo_preco_compra is
  'Preço anterior utilizado para comparação no momento da compra.';
comment on column public.compras_produtos.preco_compra_atual is
  'Preço de compra mais recente informado para o produto.';
