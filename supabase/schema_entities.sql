-- Travel Guide normalized schema for Supabase (Postgres)
-- Creates tables for Trips, Checklist, Expenses, Itinerary (Days + Activities)
-- Includes indexes and permissive RLS policies for quick start.

-- Extensions (uncomment if not already enabled)
-- create extension if not exists pgcrypto;

-- Optional enum for currencies used by the app
do $$ begin
  if not exists (select 1 from pg_type where typname = 'currency_code') then
    create type public.currency_code as enum ('THB','USD','JPY');
  end if;
end $$;

-- Trips (logical container for a journey)
create table if not exists public.trips (
  id bigserial primary key,
  title text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Checklist items
create table if not exists public.checklist (
  id bigserial primary key,
  trip_id bigint not null references public.trips(id) on delete cascade,
  text text not null,
  checked boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists checklist_trip_id_idx on public.checklist(trip_id);

-- Expenses
create table if not exists public.expenses (
  id bigserial primary key,
  trip_id bigint not null references public.trips(id) on delete cascade,
  item text not null,
  amount numeric(12,2) not null check (amount >= 0),
  currency public.currency_code not null default 'THB',
  category text not null check (category in ('Food','Hotel','Transport','Shopping','Activity','Other')),
  date date not null,
  bill_photo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists expenses_trip_id_idx on public.expenses(trip_id);
create index if not exists expenses_date_idx on public.expenses(date);

-- Itinerary Days
create table if not exists public.itinerary_days (
  id bigserial primary key,
  trip_id bigint not null references public.trips(id) on delete cascade,
  title text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists itinerary_days_trip_id_idx on public.itinerary_days(trip_id);

-- Itinerary Activities
create table if not exists public.itinerary_activities (
  id bigserial primary key,
  day_id bigint not null references public.itinerary_days(id) on delete cascade,
  title text not null,
  description text,
  cost numeric(12,2) not null default 0,
  currency public.currency_code not null default 'THB',
  category text not null default 'Activity',
  map_link text,
  arrive_time time,
  leave_time time,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists itinerary_activities_day_id_idx on public.itinerary_activities(day_id);

-- Updated_at triggers
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end$$;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_checklist_updated_at') then
    create trigger trg_checklist_updated_at before update on public.checklist
    for each row execute procedure public.set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'trg_expenses_updated_at') then
    create trigger trg_expenses_updated_at before update on public.expenses
    for each row execute procedure public.set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'trg_days_updated_at') then
    create trigger trg_days_updated_at before update on public.itinerary_days
    for each row execute procedure public.set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'trg_activities_updated_at') then
    create trigger trg_activities_updated_at before update on public.itinerary_activities
    for each row execute procedure public.set_updated_at();
  end if;
end $$;

-- RLS: Permissive demo policies (allow anon read/write). Replace with auth.uid() policies for real apps.
alter table public.trips enable row level security;
alter table public.checklist enable row level security;
alter table public.expenses enable row level security;
alter table public.itinerary_days enable row level security;
alter table public.itinerary_activities enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'trips' and policyname = 'allow_all_trips') then
    create policy allow_all_trips on public.trips for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'checklist' and policyname = 'allow_all_checklist') then
    create policy allow_all_checklist on public.checklist for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'expenses' and policyname = 'allow_all_expenses') then
    create policy allow_all_expenses on public.expenses for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'itinerary_days' and policyname = 'allow_all_days') then
    create policy allow_all_days on public.itinerary_days for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'itinerary_activities' and policyname = 'allow_all_activities') then
    create policy allow_all_activities on public.itinerary_activities for all using (true) with check (true);
  end if;
end $$;

-- Seed a demo trip if missing
insert into public.trips (id, title)
values (1, 'Demo Trip')
on conflict (id) do nothing;

-- CRUD EXAMPLES ----------------------------------------------

-- Checklist: Create
-- insert into public.checklist (trip_id, text, checked, sort_order)
-- values (1, 'Passport', false, 1) returning *;

-- Checklist: Update
-- update public.checklist set checked = true where id = 1 and trip_id = 1 returning *;

-- Checklist: Upsert by id
-- insert into public.checklist (id, trip_id, text, checked, sort_order)
-- values (10, 1, 'Power bank', false, 2)
-- on conflict (id) do update set text = excluded.text, checked = excluded.checked, sort_order = excluded.sort_order, updated_at = now()
-- returning *;

-- Checklist: Delete
-- delete from public.checklist where id = 10 and trip_id = 1;

-- Expenses: Create
-- insert into public.expenses (trip_id, item, amount, currency, category, date, bill_photo)
-- values (1, 'Ramen', 1200, 'JPY', 'Food', '2025-01-02', null) returning *;

-- Expenses: Update amount
-- update public.expenses set amount = 1500 where id = 1 and trip_id = 1 returning *;

-- Expenses: Upsert by id
-- insert into public.expenses (id, trip_id, item, amount, currency, category, date)
-- values (20, 1, 'Skytree Ticket', 2100, 'JPY', 'Activity', '2025-01-02')
-- on conflict (id) do update set item = excluded.item, amount = excluded.amount, currency = excluded.currency, category = excluded.category, date = excluded.date, updated_at = now()
-- returning *;

-- Expenses: Delete
-- delete from public.expenses where id = 20 and trip_id = 1;

-- Itinerary Day: Create
-- insert into public.itinerary_days (trip_id, title, sort_order)
-- values (1, 'Day 1 - Tokyo', 1) returning *;

-- Itinerary Activity: Create
-- insert into public.itinerary_activities (day_id, title, description, cost, currency, category, map_link, arrive_time, leave_time, sort_order)
-- values (1, 'Sensoji Temple', 'Visit Tokyo''s oldest temple', 500, 'JPY', 'Activity', null, '09:00', '10:00', 1) returning *;

-- Itinerary Activity: Update
-- update public.itinerary_activities set cost = 700 where id = 1 returning *;

-- Itinerary Activity: Upsert by id
-- insert into public.itinerary_activities (id, day_id, title, description, cost, currency, category, arrive_time, leave_time, sort_order)
-- values (30, 1, 'Tokyo Skytree', 'View Tokyo from above', 2100, 'JPY', 'Activity', '14:00', '16:00', 2)
-- on conflict (id) do update set title = excluded.title, description = excluded.description, cost = excluded.cost, currency = excluded.currency, category = excluded.category, arrive_time = excluded.arrive_time, leave_time = excluded.leave_time, sort_order = excluded.sort_order, updated_at = now()
-- returning *;

-- Itinerary Activity: Delete
-- delete from public.itinerary_activities where id = 30;

-- Helper view: expense summary in THB (requires conversion in app if needed)
-- create or replace view public.expense_summary as
-- select trip_id, category, sum(amount) as total_amount, currency
-- from public.expenses
-- group by trip_id, category, currency;
