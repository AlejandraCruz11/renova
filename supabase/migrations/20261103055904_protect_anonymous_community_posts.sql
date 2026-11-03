create or replace view public.community_feed as
select p.id, p.category, p.content, p.anonymous, p.support_count, p.created_at,
       case when p.anonymous then 'Comunidad anónima'
            else coalesce(nullif(pr.display_name, ''), 'Miembro de Renova')
       end as author
from public.community_posts p
left join public.profiles pr on pr.id = p.user_id;

revoke all on public.community_posts from anon, authenticated;
grant insert, update, delete on public.community_posts to authenticated;
grant select (id, category, content, anonymous, support_count, created_at) on public.community_posts to authenticated;
grant select on public.community_feed to authenticated;
