-- Fotos dos produtos no módulo Compras
-- Execute todo este arquivo no SQL Editor do Supabase.

alter table public.compras_produtos
  add column if not exists foto_caminho text,
  add column if not exists foto_nome text,
  add column if not exists foto_tipo text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('compras-produtos','compras-produtos',false,6291456,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists compras_produtos_fotos_select on storage.objects;
create policy compras_produtos_fotos_select on storage.objects for select to authenticated
using (bucket_id='compras-produtos' and auth.uid() is not null);

drop policy if exists compras_produtos_fotos_insert on storage.objects;
create policy compras_produtos_fotos_insert on storage.objects for insert to authenticated
with check (bucket_id='compras-produtos' and auth.uid() is not null);

drop policy if exists compras_produtos_fotos_delete on storage.objects;
create policy compras_produtos_fotos_delete on storage.objects for delete to authenticated
using (bucket_id='compras-produtos' and auth.uid() is not null);

notify pgrst, 'reload schema';
