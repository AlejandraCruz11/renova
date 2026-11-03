grant usage on schema public to authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert on public.cv_analyses to authenticated;
grant select, insert, update, delete on public.applications to authenticated;
grant insert, update, delete on public.community_posts to authenticated;
grant select (id, category, content, anonymous, support_count, created_at) on public.community_posts to authenticated;
grant select on public.community_feed to authenticated;
