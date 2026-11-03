create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  headline text not null default '',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cv_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  resume_text text not null,
  job_description text not null,
  match_score integer not null check (match_score between 0 and 100),
  keywords_present text[] not null default '{}',
  keywords_missing text[] not null default '{}',
  optimized_bullets jsonb not null default '[]',
  created_at timestamptz not null default now()
);

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  company text not null,
  location text not null default '',
  stage text not null default 'Guardadas' check (stage in ('Guardadas','Postulado','En Entrevista','Oferta / Finalizado')),
  job_url text,
  match_score integer check (match_score between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (category in ('Vacantes y referidos','Consejos de carrera','Espacio seguro')),
  content text not null check (length(content) between 1 and 5000),
  anonymous boolean not null default false,
  support_count integer not null default 0 check (support_count >= 0),
  created_at timestamptz not null default now()
);

create index if not exists cv_analyses_user_created_idx on public.cv_analyses(user_id, created_at desc);
create index if not exists applications_user_stage_idx on public.applications(user_id, stage);
create index if not exists community_posts_created_idx on public.community_posts(created_at desc);

alter table public.profiles enable row level security;
alter table public.cv_analyses enable row level security;
alter table public.applications enable row level security;
alter table public.community_posts enable row level security;

create policy profile_self on public.profiles for all to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy analysis_self on public.cv_analyses for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy applications_self on public.applications for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy community_read on public.community_posts for select to authenticated using (true);
create policy community_insert on public.community_posts for insert to authenticated with check (user_id = auth.uid());
create policy community_update on public.community_posts for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy community_delete on public.community_posts for delete to authenticated using (user_id = auth.uid());
