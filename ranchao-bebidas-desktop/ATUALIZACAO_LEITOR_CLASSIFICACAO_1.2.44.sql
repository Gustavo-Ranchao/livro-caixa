-- RANCHÃO BEBIDAS — LEITOR DE COMPROVANTES 1.2.44
-- Acrescenta uma classificação opcional aos comprovantes já existentes.
-- Pode ser executado novamente com segurança.

alter table public.leituras_comprovantes
  add column if not exists categoria text;

comment on column public.leituras_comprovantes.categoria is
  'Classificação gerencial do pagamento: mercadoria, despesa_operacional, impostos_taxas, pessoal, investimento ou outros.';

create index if not exists leituras_comprovantes_loja_categoria_idx
  on public.leituras_comprovantes (loja, categoria);
