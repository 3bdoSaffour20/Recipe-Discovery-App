-- ==========================================================================
-- Recipe Discovery — repair review writes (RLS, grants, upsert key)
--
-- Run this after `20261006090000_recipe_reviews.sql` if rating/comment writes
-- fail. It is idempotent: every policy is dropped before being recreated, and
-- the unique key is only added when it is missing.
--
-- Notes:
--   * `recipe_ratings` is a VIEW, not a table. It must never receive an INSERT
--     policy — it is only read, and it already inherits `recipe_reviews` RLS
--     through `security_invoker = on`.
--   * The app writes with
--       upsert(..., { onConflict: 'recipe_id,user_id' })
--     which requires a UNIQUE constraint or unique index on those two columns.
-- ==========================================================================

-- 1. Row Level Security ------------------------------------------------------

alter table public.recipe_reviews enable row level security;

-- Reads stay public so every visitor sees the ratings and comments.
drop policy if exists "Reviews are readable by everyone" on public.recipe_reviews;
create policy "Reviews are readable by everyone"
  on public.recipe_reviews
  for select
  to anon, authenticated
  using (true);

-- The payload's `user_id` must match the signed-in user. It is never trusted
-- from the browser: RLS rejects any other value.
drop policy if exists "Users can insert their own review" on public.recipe_reviews;
create policy "Users can insert their own review"
  on public.recipe_reviews
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

-- The upsert path needs UPDATE as well as INSERT for a second rating/comment.
drop policy if exists "Users can update their own review" on public.recipe_reviews;
create policy "Users can update their own review"
  on public.recipe_reviews
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own review" on public.recipe_reviews;
create policy "Users can delete their own review"
  on public.recipe_reviews
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- 2. Grants ------------------------------------------------------------------

grant usage on schema public to anon, authenticated;
grant select on public.recipe_reviews to anon, authenticated;
grant insert, update, delete on public.recipe_reviews to authenticated;

-- The aggregate view is read-only for clients.
grant select on public.recipe_ratings to anon, authenticated;

-- 3. Upsert key --------------------------------------------------------------

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.recipe_reviews'::regclass
      and contype = 'u'
      and conname = 'recipe_reviews_recipe_user_unique'
  ) and not exists (
    select 1
    from pg_index i
    join pg_class c on c.oid = i.indexrelid
    where i.indrelid = 'public.recipe_reviews'::regclass
      and i.indisunique
      and c.relname = 'recipe_reviews_recipe_user_unique_idx'
  ) then
    create unique index recipe_reviews_recipe_user_unique_idx
      on public.recipe_reviews (recipe_id, user_id);
  end if;
end
$$;

-- 4. Schema sanity check -----------------------------------------------------

do $$
declare
  recipe_id_type text;
begin
  select data_type
    into recipe_id_type
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'recipe_reviews'
    and column_name = 'recipe_id';

  if recipe_id_type is null then
    raise exception
      'public.recipe_reviews.recipe_id is missing. Run 20261006090000_recipe_reviews.sql first.';
  elsif recipe_id_type not in ('text', 'character varying') then
    raise notice
      'recipe_reviews.recipe_id is %; TheMealDB ids are strings, so convert this column to text.',
      recipe_id_type;
  end if;
end
$$;

-- 5. Reload the Data API schema cache ----------------------------------------

notify pgrst, 'reload schema';
