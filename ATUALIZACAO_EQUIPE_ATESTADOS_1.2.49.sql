-- RANCHÃO BEBIDAS — ATUALIZAÇÃO 1.2.49
-- Adiciona a data de admissão ao cadastro dos colaboradores.

alter table public.bh_funcionarios
  add column if not exists data_admissao date;

comment on column public.bh_funcionarios.data_admissao is
  'Data de admissão do colaborador na empresa.';

notify pgrst, 'reload schema';
