-- Fix function search path security warning
create or replace function public.sb_set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Enable RLS on all tables (required for security)
alter table public.sb_sessions enable row level security;
alter table public.sb_stories enable row level security;
alter table public.sb_actions enable row level security;

-- Permissive policies for single-user mode (no auth required)
-- sb_sessions policies
create policy "Allow all access to sb_sessions" on public.sb_sessions
  for all using (true) with check (true);

-- sb_stories policies
create policy "Allow all access to sb_stories" on public.sb_stories
  for all using (true) with check (true);

-- sb_actions policies
create policy "Allow all access to sb_actions" on public.sb_actions
  for all using (true) with check (true);