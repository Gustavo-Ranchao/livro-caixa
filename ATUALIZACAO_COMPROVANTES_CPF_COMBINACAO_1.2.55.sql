-- Ranchao Bebidas 1.2.55
-- CPF no cadastro dos colaboradores.

alter table public.bh_funcionarios
  add column if not exists cpf text;

do $$ begin
  if not exists (select 1 from pg_constraint where conname='bh_funcionarios_cpf_formato_check') then
    alter table public.bh_funcionarios add constraint bh_funcionarios_cpf_formato_check
      check (cpf is null or btrim(cpf)='' or length(regexp_replace(cpf,'[^0-9]','','g'))=11);
  end if;
end $$;

grant select,insert,update,delete on public.bh_funcionarios to authenticated;
