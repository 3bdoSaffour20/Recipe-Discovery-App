# Recipe Discovery

A responsive recipe platform built with React and Vite, powered by the live
[TheMealDB](https://www.themealdb.com/) API. Search thousands of recipes,
filter by category or ingredient, and save favorites to your device.

## Local setup

```bash
npm install
```

1. **Create `.env.local`** next to `package.json` and add your Supabase values:

   ```bash
   VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   VITE_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_OR_PUBLISHABLE_KEY
   ```

   Both come from *Supabase → Project Settings → API*.

   - Use the **anon / publishable key**. It is public by design and is
     protected by Row Level Security.
   - **Never** put the **service-role key** in `.env.local`, in React code, in
     `.env` or in Git. It bypasses every permission in the database and must
     never reach the browser.
   - The `VITE_` prefix is mandatory — Vite only exposes variables that have
     it. `SUPABASE_URL`, `SUPABASE_KEY` or `REACT_APP_*` are not read.
   - `.env.local` is already git-ignored, so the key never leaves your machine.

   > **Restart the dev server after changing `.env.local`** — `Ctrl + C`, then
   > `npm run dev`. Vite reads environment variables when the server *starts*;
   > refreshing the browser is not enough.

2. **Run the database SQL** (see [Database](#database) below).

3. **Enable Google / Facebook** and add the callback URL
   (see [Sign-in providers](#sign-in-providers)).

4. **Start the app:**

   ```bash
   npm run dev
   ```

   Vite opens `http://localhost:5173/` in your default browser automatically —
   no URL to copy. To test on a phone on the same network use
   `npm run dev -- --host`; plain `npm run dev` stays on localhost.

Recipes, search, categories and favourites need **no** configuration. Accounts,
ratings and comments switch on as soon as the Supabase steps above are done —
until then the sign-in screens and the review section explain exactly what is
missing.

```bash
npm run build    # production build into dist/
npm run preview  # serve the production build
```

## Scripts

| Script                    | What it does                                                          |
| ------------------------- | --------------------------------------------------------------------- |
| `npm run dev`             | Vite dev server with hot reload — opens `http://localhost:5173/` once, on start |
| `npm run build`           | Production build                                                      |
| `npm run preview`         | Serves `dist/` for local verification                                 |
| `npm run optimize:assets` | Re-generates the responsive image variants from `Images/` and `Icons/` |
| `npm run smoke:api`       | Runs the pure helpers and the live API through 27 checks             |
| `npm run check:classnames`| Flags `className`s in JSX with no matching CSS rule                   |
| `npm run check:legacy`   | Confirms nothing was lost when the old app was moved to `legacy/`      |
| `npm run verify`          | Drives the built app in Chrome: routes, overflow, touch targets, a11y |
| `npm run audit:design`    | Asserts the rendered design against the brief: gradient, hero, tiles |
| `npm run screenshots`     | Captures reference screenshots to `screenshots/`                      |

`verify` and `audit:design` expect a server on `http://localhost:4173`, so run
`npm run build && npm run preview` first. Set `BASE_URL` to point them
somewhere else, and `CHROME_PATH` if Chrome or Edge is not in a standard
location.

## How it fits together

```
src/
  components/   presentation: navbar, cards, search, shared states
  context/      auth session, toast messages, cached rating statistics
  hooks/        data fetching, favorites, media queries, focus and scroll
  pages/        one module per route, all code-split except Home
  services/     the only place that talks to TheMealDB or Supabase
  styles/       plain CSS, mobile-first, one file per concern
  utils/        pure helpers: ingredients, instructions, URLs, text
```

## Supabase (accounts, ratings and comments)

Search, categories, favourites and the country flags all work with no
configuration. Accounts, recipe ratings and comments need a free
[Supabase](https://supabase.com/) project.

Everything Supabase — sign-in *and* reviews — runs through **one client**,
`src/services/supabase.js`. `authService.js` and `reviewService.js` both
`import { supabase } from './supabase'`; no component ever calls
`createClient()` itself, so authentication and the review queries can never
disagree about who is signed in.

### 1. Create a project and add the keys

Create a project at supabase.com, open *Project Settings → API* and copy:

| Supabase value           | Goes into `.env.local`        |
| ------------------------ | ----------------------------- |
| Project URL              | `VITE_SUPABASE_URL`           |
| anon / publishable key   | `VITE_SUPABASE_ANON_KEY`      |

**Public key only.** The anon/publishable key is designed to ship to browsers;
Row Level Security is what protects the data. The **service-role key** must
never appear in `.env.local`, in `src/`, in any `.env` committed to Git, or in
browser JavaScript — it bypasses every permission in the database.

Restart the dev server after changing the file — `Ctrl + C`, then
`npm run dev`. Vite reads environment variables **only when the server
starts**; reloading the browser is not enough.

### 2. Database

Open *SQL Editor* and run the script below (the same file lives at
`supabase/migrations/20261006090000_recipe_reviews.sql`). It is idempotent —
every object is guarded or replaced — so it is safe to run again.

```sql
-- Recipe Discovery — accounts, ratings and comments
create extension if not exists "pgcrypto";

/* profiles ---------------------------------------------------------------- */

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
  on public.profiles for select using (true);

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
  on public.profiles for insert with check (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id) with check (auth.uid() = id);

-- Creates the profile automatically for email *and* OAuth sign-ups.
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

/* recipe_reviews — one row per user per recipe ----------------------------- */

create table if not exists public.recipe_reviews (
  id uuid primary key default gen_random_uuid(),
  -- TheMealDB's `idMeal`
  recipe_id text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  rating numeric(2, 1) not null check (rating >= 1.0 and rating <= 5.0),
  comment text check (comment is null or char_length(comment) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- One review per person per recipe: a second rating updates, never duplicates.
  constraint recipe_reviews_recipe_user_unique unique (recipe_id, user_id)
);

create index if not exists recipe_reviews_recipe_id_idx
  on public.recipe_reviews (recipe_id);

create index if not exists recipe_reviews_user_id_idx
  on public.recipe_reviews (user_id);

alter table public.recipe_reviews enable row level security;

drop policy if exists "Reviews are readable by everyone" on public.recipe_reviews;
create policy "Reviews are readable by everyone"
  on public.recipe_reviews for select using (true);

drop policy if exists "Users can insert their own review" on public.recipe_reviews;
create policy "Users can insert their own review"
  on public.recipe_reviews for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update their own review" on public.recipe_reviews;
create policy "Users can update their own review"
  on public.recipe_reviews for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own review" on public.recipe_reviews;
create policy "Users can delete their own review"
  on public.recipe_reviews for delete using (auth.uid() = user_id);

/* recipe_ratings — average + count per recipe ------------------------------ */

create or replace view public.recipe_ratings
with (security_invoker = on) as
select
  recipe_id,
  round(avg(rating)::numeric, 1) as average_rating,
  count(*)::integer as rating_count
from public.recipe_reviews
group by recipe_id;

/* Grants ------------------------------------------------------------------ */

grant usage on schema public to anon, authenticated;
grant select on public.profiles, public.recipe_reviews, public.recipe_ratings
  to anon, authenticated;
grant insert, update, delete on public.profiles
  to authenticated;
grant insert, update, delete on public.recipe_reviews
  to authenticated;
```

What you get:

| Object            | Details                                                                            |
| ----------------- | ---------------------------------------------------------------------------------- |
| `profiles`        | `id` = `auth.users.id`, full name, avatar, provider — created automatically on sign-up |
| `recipe_reviews`  | `id` PK · `recipe_id` text (TheMealDB `idMeal`) · `user_id` FK → `auth.users(id)` · `rating numeric(2,1)` with `CHECK (1.0–5.0)` — decimals such as **4.7** are stored as-is · `comment` ≤ 500 chars · `UNIQUE (recipe_id, user_id)` · `created_at` / `updated_at` |
| `recipe_ratings`  | view with `AVG(rating)` + `COUNT(*)` per recipe, `security_invoker = on`            |
| RLS               | public `SELECT`; `INSERT`/`UPDATE`/`DELETE` only for the signed-in owner, checked against `auth.uid()` — a `user_id` sent by the browser is never trusted |

### 3. Sign-in providers

**Email and password** work with no extra setup. If you want sign-ups to work
without confirming an email, turn *Authentication → Providers → Email →
Confirm email* off; otherwise the registration screen asks people to open the
link we send and the profile row is created by the database trigger.

**Google**

1. *Authentication → Providers → Google*: enable it and paste the client ID and
   secret from the Google Cloud console.
2. Add the callback URL below to Google's *Authorized redirect URIs*.

**Facebook**

1. *Authentication → Providers → Facebook*: enable it and paste the app ID and
   secret from developers.facebook.com.
2. Add the same callback URL to Facebook's *Valid OAuth Redirect URIs*.

**Callback URL** — *Authentication → URL Configuration → Redirect URLs*.
Development (Vite serves from the root while `npm run dev` runs):

```
http://localhost:5173/auth/callback
```

Production — the callback is `<origin> + <Vite base> + /auth/callback`:

```
https://YOUR-DOMAIN/Recipe-Discovery-App/auth/callback
https://YOUR-DOMAIN/auth/callback
```

Use whichever matches how the build is served: the first when it lives in a
sub-path (the current `base: '/Recipe-Discovery-App/'` in `vite.config.js`),
the second if you deploy at the domain root (set `base: '/'` there). Add the
origin to the provider consoles too (*Authorized JavaScript origins* /
*Site URL*). The app carries `?from=/recipe/52772` so people land back on the
recipe they were rating.

### 4. What each state looks like

The app checks the real state instead of a hard-coded flag — configuration is
read from `import.meta.env` (`isSupabaseConfigured`), and
`checkSupabaseConnection()` probes the session and the table separately:

| State                                   | What you see                                                                                 |
| --------------------------------------- | -------------------------------------------------------------------------------------------- |
| `VITE_*` variables missing or template  | "Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local and restart the development server." |
| connected, table not created            | "The review database table has not been created yet…"                                        |
| connected, grants / RLS wrong           | "You are connected to Supabase, but database permissions need to be configured."             |
| network problem                         | "Unable to connect to the review service. Please try again."                                 |
| everything works                        | **no warning anywhere** — sign in, rate and comment                                           |

A signed-in user with valid keys never sees a configuration message, and a
database problem is never blamed on missing keys.

### 5. The two flows

```text
Authentication:  Navbar Login → /login → Google / Facebook / Email
                 → Supabase → /auth/callback waits for the session
                 → profile loaded/created → back to /recipe/52772
                 → rating + comments enabled

Development:     npm run dev → Vite starts → browser opens by itself
                 → http://localhost:5173/
```

An unauthenticated visitor can browse, read ratings and read comments. The
first attempt to rate or comment opens a dialog offering **Login** and
**Register**, both carrying `?redirect=/recipe/52772` so signing in returns to
the same recipe.

### How the data is protected

Row level security is enforced in the database, not in React: reads are
public, and a write only succeeds when `auth.uid()` matches the row's
`user_id`. The client never stores a credential — Supabase holds the session
(in `sessionStorage`, cleared when the tab closes), and `src/services/` is the
only layer that talks to it (`supabase.js` for the one shared client,
`authService.js` for accounts, `reviewService.js` for reviews).

In development the console prints a `Supabase Diagnostics` group showing
*whether* the URL, the key and a session exist — never the values, never a
token, and never in a production build.

### Notes on a few decisions

**One place for the network.** `src/services/mealApi.js` owns every request. It
caches responses for five minutes, collapses duplicate concurrent requests into
one, and retries transient failures.

**The API returns two different shapes.** A category listing returns a summary
with a thumbnail and no ingredients; only a lookup by id returns the full
record. `getMealDetails` upgrades a summary automatically, otherwise detail
pages render empty until a refresh.

**`latest.php` is anonymous.** TheMealDB lists it as a random endpoint, but it
returns the same placeholder record every time. `getRandomMeal` falls back to a
real search instead, so the button always produces a different dish.

**Instructions are structured, not prose.** Most records separate steps with
line breaks rather than numbers, so `splitInstructions` treats a newline as a
step boundary and only adds numbering when the source text already had markers.
For the same reason `normalizeMeal` keeps newlines in `strInstructions`; the UI
splits the text, rather than storing it as one paragraph.

**No CSS framework.** Styles are plain CSS driven by custom properties in
`src/styles/tokens.css`, which keeps the dark navy and purple palette in one
place and the initial CSS small.

## Accessibility

Semantic landmarks and a skip link, one `h1` per page, visible focus rings,
44px touch targets on phones, a focus-trapped mobile drawer that restores focus
when it closes, `prefers-reduced-motion` support, and alt text on every image.
Loading, empty and error states are announced rather than shown silently.

## Assets

`Images/` and `Icons/` hold the original artwork. `npm run optimize:assets`
renders responsive WebP/JPEG pairs into `src/assets/*/generated/`, which
`src/assets/media.js` exposes to the components. Re-run it after changing a
source image.

## Legacy

The previous static implementation is preserved in `legacy/`, unmodified.
