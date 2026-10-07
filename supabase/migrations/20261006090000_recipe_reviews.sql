-- ==========================================================================
-- Recipe Discovery — accounts, ratings and comments
--
-- Run this once in the Supabase SQL editor (or `supabase db push`).
-- It is idempotent: every object is created with an IF NOT EXISTS guard or
-- replaced, so re-running it is safe.
-- ==========================================================================

-- gen_random_uuid() ships with pgcrypto; Supabase has it enabled already,
-- but creating it explicitly keeps the script portable.
create extension if not exists "pgcrypto";

/* -------------------------------------------------------------------------- */
/* profiles                                                                    */
/* -------------------------------------------------------------------------- */

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  avatar_url text,
  provider text not null default 'email',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Profiles are readable by everyone" on public.profiles;
create policy "Profiles are readable by everyone"
  on public.profiles
  for select
  using (true);

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
  on public.profiles
  for insert
  with check (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Keeps a profile row in step with the account, including sign-ups that
-- arrive through Google or Facebook, without any client round trip.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url, provider, updated_at)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(coalesce(new.email, ''), '@', 1),
      'Recipe lover'
    ),
    coalesce(
      new.raw_user_meta_data ->> 'avatar_url',
      new.raw_user_meta_data ->> 'picture'
    ),
    coalesce(new.app_metadata ->> 'provider', 'email'),
    now()
  )
  on conflict (id) do update
    set full_name = excluded.full_name,
        avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
        updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

/* -------------------------------------------------------------------------- */
/* recipe_reviews — one row per user per recipe                                */
/* -------------------------------------------------------------------------- */

create table if not exists public.recipe_reviews (
  id uuid primary key default gen_random_uuid(),
  -- TheMealDB's `idMeal`, so a review belongs to exactly one recipe across
  -- the whole collection without importing recipe content.
  recipe_id text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  rating numeric(2, 1) not null check (rating >= 1.0 and rating <= 5.0),
  comment text check (comment is null or char_length(comment) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- One review per person per recipe: a second rating is an update, never a
  -- duplicate. The app upserts on this conflict.
  constraint recipe_reviews_recipe_user_unique unique (recipe_id, user_id)
);

create index if not exists recipe_reviews_recipe_id_idx
  on public.recipe_reviews (recipe_id);

create index if not exists recipe_reviews_user_id_idx
  on public.recipe_reviews (user_id);

alter table public.recipe_reviews enable row level security;

-- Reads are public: averages and comments are part of the page.
drop policy if exists "Reviews are readable by everyone" on public.recipe_reviews;
create policy "Reviews are readable by everyone"
  on public.recipe_reviews
  for select
  using (true);

-- Writes require a session and can only ever touch the caller's own row;
-- `user_id` in the payload is checked against `auth.uid()`, never trusted
-- from the client.
drop policy if exists "Users can insert their own review" on public.recipe_reviews;
create policy "Users can insert their own review"
  on public.recipe_reviews
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own review" on public.recipe_reviews;
create policy "Users can update their own review"
  on public.recipe_reviews
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own review" on public.recipe_reviews;
create policy "Users can delete their own review"
  on public.recipe_reviews
  for delete
  using (auth.uid() = user_id);

/* -------------------------------------------------------------------------- */
/* recipe_ratings — average + count per recipe                                 */
/* -------------------------------------------------------------------------- */

-- The card grid, the recipe page and the "sort by rating" control all need
-- the same aggregate. Computing it in the database keeps a 48-card grid at
-- one round trip. `security_invoker` makes the view run with the reader's
-- rights, so it can never become a back door around RLS.
create or replace view public.recipe_ratings
with (security_invoker = on) as
select
  recipe_id,
  round(avg(rating)::numeric, 1) as average_rating,
  count(*)::integer as rating_count
from public.recipe_reviews
group by recipe_id;

/* -------------------------------------------------------------------------- */
/* Grants                                                                      */
/* -------------------------------------------------------------------------- */

grant usage on schema public to anon, authenticated;
grant select on public.profiles, public.recipe_reviews, public.recipe_ratings
  to anon, authenticated;
grant insert, update, delete on public.profiles
  to authenticated;
grant insert, update, delete on public.recipe_reviews
  to authenticated;
