-- Create table to store a single document of travel data
create table if not exists public.travel_data (
  id bigint primary key,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Enable RLS and allow anon read/write for demo purposes
alter table public.travel_data enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'allow_anon_select_travel') then
    create policy allow_anon_select_travel on public.travel_data for select using (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'allow_anon_insert_travel') then
    create policy allow_anon_insert_travel on public.travel_data for insert with check (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'allow_anon_update_travel') then
    create policy allow_anon_update_travel on public.travel_data for update using (true);
  end if;
end $$;

-- Seed a default row with id=1 if missing
insert into public.travel_data (id, payload)
values (1, '{}'::jsonb)
on conflict (id) do nothing;
