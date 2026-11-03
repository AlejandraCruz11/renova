insert into storage.buckets (id, name, public, allowed_mime_types, file_size_limit)
values ('avatars', 'avatars', true, array['image/jpeg','image/png','image/webp'], 5242880)
on conflict (id) do update set public = true, allowed_mime_types = excluded.allowed_mime_types, file_size_limit = excluded.file_size_limit;

create policy avatar_public_read on storage.objects for select to public using (bucket_id = 'avatars');
create policy avatar_owner_insert on storage.objects for insert to authenticated with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy avatar_owner_update on storage.objects for update to authenticated using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text) with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy avatar_owner_delete on storage.objects for delete to authenticated using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

create or replace function public.support_community_post(post_id uuid)
returns void language sql security definer set search_path = public
as $$ update public.community_posts set support_count = support_count + 1 where id = post_id; $$;
revoke all on function public.support_community_post(uuid) from public;
grant execute on function public.support_community_post(uuid) to authenticated;
