-- Ranchão Bebidas 1.2.57
-- Permite identificar registros incluídos manualmente na combinação de pagamentos.

alter table if exists public.comb_pag_compras
  add column if not exists origem_manual boolean not null default false;

alter table if exists public.comb_pag_pagamentos
  add column if not exists origem_manual boolean not null default false;

comment on column public.comb_pag_compras.origem_manual is
  'Indica que a compra foi incluída manualmente na tela de combinação.';

comment on column public.comb_pag_pagamentos.origem_manual is
  'Indica que o pagamento foi incluído manualmente na tela de combinação.';
