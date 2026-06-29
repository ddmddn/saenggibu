alter table routine_logs
  add column if not exists photos text[] not null default '{}';

insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do nothing;

create policy "photos_select_own"
on storage.objects for select
using (
  bucket_id = 'photos'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "photos_insert_own"
on storage.objects for insert
with check (
  bucket_id = 'photos'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "photos_update_own"
on storage.objects for update
using (
  bucket_id = 'photos'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'photos'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "photos_delete_own"
on storage.objects for delete
using (
  bucket_id = 'photos'
  and auth.uid()::text = (storage.foldername(name))[1]
);
