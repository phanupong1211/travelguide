-- Trip members for cross-device sync of names
create table if not exists public.trip_members (
  id bigserial primary key,
  trip_id bigint not null references public.trips(id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.trip_members enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'trip_members' and policyname = 'allow_all_trip_members') then
    create policy allow_all_trip_members on public.trip_members for all using (true) with check (true);
  end if;
end $$;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end$$;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_trip_members_updated_at') then
    create trigger trg_trip_members_updated_at before update on public.trip_members
    for each row execute procedure public.set_updated_at();
  end if;
end $$;

