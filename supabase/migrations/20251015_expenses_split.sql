-- Add split fields to expenses
alter table public.expenses
  add column if not exists paid_by text,
  add column if not exists participants text[] default '{}'::text[];

