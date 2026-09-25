-- Livro-Caixa / ERP
-- Execute este arquivo UMA VEZ no Supabase: SQL Editor > New query > Run.
-- Objetivo: impedir qualquer acesso sem login e manter o ERP funcionando para usuários autenticados.

begin;

do $$
declare
  tabela text;
  tabelas text[] := array[
    'bh_atestados',
    'bh_funcionarios',
    'bh_registros',
    'caixa_diferencas',
    'checklist_execucoes',
    'checklist_itens',
    'comb_pag_compras',
    'comb_pag_pagamentos',
    'compras_empresas',
    'compras_marcas',
    'compras_produtos',
    'comprovantes',
    'configuracoes',
    'contagens_estoque',
    'contagens_estoque_itens',
    'despesas_fixas',
    'despesas_fixas_puladas',
    'estoque_inventarios',
    'fluxo_caixa_contas',
    'fluxo_caixa_lancamentos',
    'fluxo_caixa_saldos',
    'fornecedores',
    'lancamentos',
    'leituras_comprovantes',
    'pagamentos_caixa',
    'pagamentos_caixa_memoria',
    'pagamentos_caixa_tipos',
    'vendas_itens'
  ];
begin
  foreach tabela in array tabelas loop
    if to_regclass(format('public.%I', tabela)) is not null then
      execute format('alter table public.%I enable row level security', tabela);
      execute format('alter table public.%I force row level security', tabela);
      execute format('revoke all privileges on table public.%I from anon', tabela);
      execute format('grant select, insert, update, delete on table public.%I to authenticated', tabela);
      execute format('drop policy if exists erp_authenticated_access on public.%I', tabela);
      execute format(
        'create policy erp_authenticated_access on public.%I for all to authenticated using ((select auth.uid()) is not null) with check ((select auth.uid()) is not null)',
        tabela
      );
    else
      raise notice 'Tabela public.% não existe; ignorada.', tabela;
    end if;
  end loop;
end $$;

-- Permite que inserts autenticados usem colunas identity/serial.
grant usage, select on all sequences in schema public to authenticated;
revoke all privileges on all sequences in schema public from anon;

-- O bucket contém comprovantes e atestados: deve permanecer privado.
update storage.buckets
set public = false,
    file_size_limit = 15728640,
    allowed_mime_types = array[
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/pdf'
    ]::text[]
where id = 'comprovantes';

-- Bloqueia o perfil anônimo em todos os objetos do Storage.
revoke select, insert, update, delete on table storage.objects from anon;
grant select, insert, update, delete on table storage.objects to authenticated;

drop policy if exists erp_comprovantes_select on storage.objects;
drop policy if exists erp_comprovantes_insert on storage.objects;
drop policy if exists erp_comprovantes_update on storage.objects;
drop policy if exists erp_comprovantes_delete on storage.objects;

create policy erp_comprovantes_select
on storage.objects for select to authenticated
using (bucket_id = 'comprovantes' and (select auth.uid()) is not null);

create policy erp_comprovantes_insert
on storage.objects for insert to authenticated
with check (bucket_id = 'comprovantes' and (select auth.uid()) is not null);

create policy erp_comprovantes_update
on storage.objects for update to authenticated
using (bucket_id = 'comprovantes' and (select auth.uid()) is not null)
with check (bucket_id = 'comprovantes' and (select auth.uid()) is not null);

create policy erp_comprovantes_delete
on storage.objects for delete to authenticated
using (bucket_id = 'comprovantes' and (select auth.uid()) is not null);

commit;

-- Conferência: todas as tabelas listadas devem aparecer com rls_ativo = true.
select
  schemaname,
  tablename,
  rowsecurity as rls_ativo
from pg_tables
where schemaname = 'public'
  and tablename in (
    'bh_atestados','bh_funcionarios','bh_registros','caixa_diferencas',
    'checklist_execucoes','checklist_itens','comb_pag_compras','comb_pag_pagamentos',
    'compras_empresas','compras_marcas','compras_produtos','comprovantes','configuracoes',
    'contagens_estoque','contagens_estoque_itens','despesas_fixas','despesas_fixas_puladas',
    'estoque_inventarios','fluxo_caixa_contas','fluxo_caixa_lancamentos','fluxo_caixa_saldos',
    'fornecedores','lancamentos','leituras_comprovantes','pagamentos_caixa','pagamentos_caixa_memoria',
    'pagamentos_caixa_tipos','vendas_itens'
  )
order by tablename;
