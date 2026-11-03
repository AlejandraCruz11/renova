drop view if exists public.community_feed;
alter table public.community_posts add column if not exists author_name text not null default 'Miembro de Renova';
revoke all on public.community_posts from anon, authenticated;
grant insert, update, delete on public.community_posts to authenticated;
grant select (id, category, content, anonymous, support_count, created_at, author_name) on public.community_posts to authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.support_community_post(uuid) from public, anon;
grant execute on function public.support_community_post(uuid) to authenticated;
