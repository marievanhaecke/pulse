-- ============================================================
-- SPORT MLK - Schéma Supabase
-- ============================================================

-- Extension pour générer des UUID
create extension if not exists "uuid-ossp";

-- ============================================================
-- TABLE: profiles (étend auth.users)
-- ============================================================
create table public.profiles (
  id          uuid references auth.users(id) on delete cascade primary key,
  email       text not null,
  full_name   text not null default '',
  role        text not null default 'adherent'
                check (role in ('admin', 'coach', 'adherent')),
  phone       text,
  avatar_url  text,
  stripe_customer_id text unique,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ============================================================
-- TABLE: courses (modèles de cours récurrents)
-- ============================================================
create table public.courses (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  description      text,
  location         text,
  duration_minutes int  not null default 60,
  day_of_week      int  check (day_of_week between 0 and 6), -- 0=dim, 1=lun ... 6=sam
  time_of_day      time,
  is_recurring     boolean not null default true,
  color            text not null default '#4f46e5',
  is_active        boolean not null default true,
  created_at       timestamptz not null default now()
);

-- ============================================================
-- TABLE: sessions (séances réelles)
-- ============================================================
create table public.sessions (
  id         uuid primary key default gen_random_uuid(),
  course_id  uuid references public.courses(id) on delete set null,
  title      text not null,      -- copie du nom du cours (ou override)
  location   text,
  date       date not null,
  start_time time not null,
  end_time   time not null,
  color      text not null default '#4f46e5',
  status     text not null default 'scheduled'
               check (status in ('scheduled', 'cancelled', 'completed')),
  notes      text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- TABLE: session_coaches (N:N sessions <-> coaches)
-- ============================================================
create table public.session_coaches (
  session_id uuid references public.sessions(id) on delete cascade,
  coach_id   uuid references public.profiles(id) on delete cascade,
  primary key (session_id, coach_id)
);

-- ============================================================
-- TABLE: bookings (réservations adhérents)
-- ============================================================
create table public.bookings (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid references public.sessions(id) on delete cascade not null,
  user_id    uuid references public.profiles(id) on delete cascade not null,
  status     text not null default 'confirmed'
               check (status in ('confirmed', 'cancelled')),
  created_at timestamptz not null default now(),
  unique (session_id, user_id)
);

-- ============================================================
-- TABLE: memberships (abonnements/cotisations)
-- ============================================================
create table public.memberships (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid references public.profiles(id) on delete cascade not null,
  type                    text not null check (type in ('session', 'monthly', 'yearly')),
  status                  text not null default 'pending'
                            check (status in ('active', 'cancelled', 'expired', 'pending', 'past_due')),
  stripe_subscription_id  text unique,
  stripe_checkout_session_id text,
  sessions_remaining      int,  -- uniquement pour type='session'
  start_date              date,
  end_date                date,
  amount_cents            int not null,
  currency                text not null default 'eur',
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

-- ============================================================
-- TABLE: payments (historique paiements)
-- ============================================================
create table public.payments (
  id                       uuid primary key default gen_random_uuid(),
  user_id                  uuid references public.profiles(id) on delete set null,
  membership_id            uuid references public.memberships(id) on delete set null,
  amount_cents             int not null,
  currency                 text not null default 'eur',
  stripe_payment_intent_id text,
  stripe_invoice_id        text,
  stripe_checkout_session_id text,
  status                   text not null default 'pending'
                             check (status in ('pending', 'succeeded', 'failed', 'refunded')),
  description              text,
  created_at               timestamptz not null default now()
);

-- ============================================================
-- TABLE: settings (configuration de l'association)
-- ============================================================
create table public.settings (
  key   text primary key,
  value text not null
);

-- Valeurs par défaut
insert into public.settings (key, value) values
  ('association_name',    'MLK Sport'),
  ('price_session_cents', '1200'),
  ('price_monthly_cents', '4500'),
  ('price_yearly_cents',  '40000'),
  ('stripe_price_monthly', ''),
  ('stripe_price_yearly',  '');

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Créer un profil automatiquement à chaque inscription
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Mettre à jour updated_at automatiquement
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.handle_updated_at();

create trigger memberships_updated_at
  before update on public.memberships
  for each row execute procedure public.handle_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

alter table public.profiles    enable row level security;
alter table public.courses     enable row level security;
alter table public.sessions    enable row level security;
alter table public.session_coaches enable row level security;
alter table public.bookings    enable row level security;
alter table public.memberships enable row level security;
alter table public.payments    enable row level security;
alter table public.settings    enable row level security;

-- Helper: role de l'utilisateur connecté
create or replace function public.get_my_role()
returns text language sql stable security definer as $$
  select role from public.profiles where id = auth.uid()
$$;

-- PROFILES
create policy "Lecture profil propre" on public.profiles
  for select using (id = auth.uid());

create policy "Admin voit tout" on public.profiles
  for select using (get_my_role() = 'admin');

create policy "Modifier son profil" on public.profiles
  for update using (id = auth.uid());

create policy "Admin modifie tout" on public.profiles
  for update using (get_my_role() = 'admin');

-- COURSES (tout le monde peut lire, admin/coach peuvent écrire)
create policy "Lecture cours" on public.courses
  for select using (true);

create policy "Admin gère les cours" on public.courses
  for all using (get_my_role() in ('admin', 'coach'));

-- SESSIONS
create policy "Lecture sessions" on public.sessions
  for select using (true);

create policy "Admin/Coach gère les séances" on public.sessions
  for all using (get_my_role() in ('admin', 'coach'));

-- SESSION COACHES
create policy "Lecture session_coaches" on public.session_coaches
  for select using (true);

create policy "Admin/Coach gère session_coaches" on public.session_coaches
  for all using (get_my_role() in ('admin', 'coach'));

-- BOOKINGS
create policy "Voir ses réservations" on public.bookings
  for select using (user_id = auth.uid() or get_my_role() in ('admin', 'coach'));

create policy "Créer une réservation" on public.bookings
  for insert with check (user_id = auth.uid());

create policy "Annuler sa réservation" on public.bookings
  for update using (user_id = auth.uid() or get_my_role() = 'admin');

create policy "Admin supprime" on public.bookings
  for delete using (get_my_role() = 'admin');

-- MEMBERSHIPS
create policy "Voir son abonnement" on public.memberships
  for select using (user_id = auth.uid() or get_my_role() = 'admin');

create policy "Créer abonnement" on public.memberships
  for insert with check (user_id = auth.uid() or get_my_role() = 'admin');

create policy "Admin gère abonnements" on public.memberships
  for all using (get_my_role() = 'admin');

-- PAYMENTS
create policy "Voir ses paiements" on public.payments
  for select using (user_id = auth.uid() or get_my_role() = 'admin');

create policy "Admin gère paiements" on public.payments
  for all using (get_my_role() = 'admin');

-- SETTINGS (admin uniquement en écriture, tous en lecture)
create policy "Lecture settings" on public.settings
  for select using (true);

create policy "Admin modifie settings" on public.settings
  for all using (get_my_role() = 'admin');

-- ============================================================
-- INDEXES
-- ============================================================
create index idx_sessions_date         on public.sessions(date);
create index idx_sessions_course       on public.sessions(course_id);
create index idx_bookings_session      on public.bookings(session_id);
create index idx_bookings_user         on public.bookings(user_id);
create index idx_memberships_user      on public.memberships(user_id);
create index idx_memberships_status    on public.memberships(status);
create index idx_payments_user         on public.payments(user_id);
create index idx_session_coaches_coach on public.session_coaches(coach_id);
