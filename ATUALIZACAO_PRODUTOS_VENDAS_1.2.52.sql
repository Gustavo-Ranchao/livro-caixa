-- Ranchao Bebidas 1.2.52 - Catalogo de produtos e vendas consultivas
create extension if not exists pgcrypto;

create table if not exists public.produtos_estoque (
  id uuid primary key default gen_random_uuid(), loja text not null,
  codigo text not null, descricao text not null, unidade_comercial text not null default 'UN',
  saldo numeric(18,3) not null default 0, fator_embalagem numeric(18,3) not null default 1,
  embalagens numeric(18,3) not null default 0, custo_unitario numeric(18,4) not null default 0,
  custo_total numeric(18,4) not null default 0, preco_padrao numeric(18,4) not null default 0,
  preco_atacado numeric(18,4), preco_revenda numeric(18,4), preco_especial numeric(18,4),
  encontrado_ultima_importacao boolean not null default true, ativo boolean not null default true,
  importado_em timestamptz not null default now(), atualizado_em timestamptz not null default now(),
  constraint produtos_estoque_loja_codigo_key unique(loja,codigo)
);
create index if not exists produtos_estoque_loja_descricao_idx on public.produtos_estoque(loja,descricao);

create table if not exists public.produtos_importacoes (
  id uuid primary key default gen_random_uuid(), loja text not null, arquivo_nome text,
  total_linhas integer not null default 0, novos integer not null default 0,
  atualizados integer not null default 0, ausentes integer not null default 0,
  alertas integer not null default 0, criado_em timestamptz not null default now()
);

create table if not exists public.clientes_vendas (
  id uuid primary key default gen_random_uuid(), loja text not null, nome text not null,
  documento text, telefone text, tabela_preco text not null default 'padrao'
    check (tabela_preco in ('padrao','atacado','revenda','especial')),
  ativo boolean not null default true, criado_em timestamptz not null default now(), atualizado_em timestamptz not null default now()
);
create index if not exists clientes_vendas_loja_nome_idx on public.clientes_vendas(loja,nome);

create table if not exists public.vendas_produtos (
  id uuid primary key default gen_random_uuid(), loja text not null, numero bigint not null,
  data_venda date not null default current_date, cliente_id uuid references public.clientes_vendas(id) on delete set null,
  cliente_nome text, tabela_preco text not null default 'padrao', subtotal numeric(18,2) not null default 0,
  desconto numeric(18,2) not null default 0, total numeric(18,2) not null default 0,
  observacoes text, status text not null default 'concluida' check(status in ('concluida','cancelada')),
  criado_em timestamptz not null default now(), atualizado_em timestamptz not null default now(),
  constraint vendas_produtos_loja_numero_key unique(loja,numero)
);
create index if not exists vendas_produtos_loja_data_idx on public.vendas_produtos(loja,data_venda desc);

create table if not exists public.vendas_produtos_itens (
  id uuid primary key default gen_random_uuid(), venda_id uuid not null references public.vendas_produtos(id) on delete cascade,
  produto_id uuid references public.produtos_estoque(id) on delete set null, codigo text not null,
  descricao text not null, unidade_comercial text not null default 'UN', quantidade numeric(18,3) not null,
  custo_unitario numeric(18,4) not null default 0, preco_unitario numeric(18,4) not null,
  total numeric(18,2) not null, criado_em timestamptz not null default now()
);
create index if not exists vendas_produtos_itens_venda_idx on public.vendas_produtos_itens(venda_id);

create table if not exists public.vendas_produtos_sequencias (
  loja text primary key, ultimo_numero bigint not null default 0
);

create or replace function public.proxima_venda_produto_numero(p_loja text)
returns bigint language plpgsql security definer set search_path=public as $$
declare v_numero bigint;
begin
  insert into public.vendas_produtos_sequencias(loja,ultimo_numero) values(p_loja,1)
  on conflict(loja) do update set ultimo_numero=public.vendas_produtos_sequencias.ultimo_numero+1
  returning ultimo_numero into v_numero;
  return v_numero;
end; $$;

alter table public.produtos_estoque enable row level security;
alter table public.produtos_importacoes enable row level security;
alter table public.clientes_vendas enable row level security;
alter table public.vendas_produtos enable row level security;
alter table public.vendas_produtos_itens enable row level security;
alter table public.vendas_produtos_sequencias enable row level security;

do $$ declare t text; begin
  foreach t in array array['produtos_estoque','produtos_importacoes','clientes_vendas','vendas_produtos','vendas_produtos_itens','vendas_produtos_sequencias'] loop
    execute format('drop policy if exists %I on public.%I',t||'_auth',t);
    execute format('create policy %I on public.%I for all to authenticated using (true) with check (true)',t||'_auth',t);
  end loop;
end $$;
grant select,insert,update,delete on public.produtos_estoque,public.produtos_importacoes,public.clientes_vendas,public.vendas_produtos,public.vendas_produtos_itens,public.vendas_produtos_sequencias to authenticated;
revoke all on function public.proxima_venda_produto_numero(text) from public, anon;
grant execute on function public.proxima_venda_produto_numero(text) to authenticated;
