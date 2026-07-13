/*
# CarbOn — Karbon Ayak İzi Koçu Veritabanı Şeması

## Genel Bakış
CarbOn uygulamasinin tum veritabani altyapisi. Kullanicilar karbon ayak izini
takip eder, icgoruler eder ve YZ kocundan oneriler alir.

## Yeni Tablolar
1. profiles — kullanici profili (auth.users FK, daily_budget_kg)
2. entries — karbon kayitlari (transport/electricity, co2_kg)
3. tasks — koc ajaninin yesil gorevleri

## Guvenlik
- RLS etkin, authenticated-only, owner-scoped (auth.uid() = user_id)
- Her tablo icin 4 politika (CRUD)
- user_id DEFAULT auth.uid()

## Indeksler
- entries(user_id, entry_date), tasks(user_id, task_date)

## Trigger
- Yeni kayit olunca profiles tablosu otomatik doldurulur
*/

-- ============================================================ PROFILES
CREATE TABLE IF NOT EXISTS profiles (
    id               uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    daily_budget_kg  real NOT NULL DEFAULT 15.0,
    created_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
    TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
    TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
    TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "delete_own_profile" ON profiles;
CREATE POLICY "delete_own_profile" ON profiles FOR DELETE
    TO authenticated USING (auth.uid() = id);

-- ============================================================ ENTRIES
CREATE TABLE IF NOT EXISTS entries (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    entry_date  date NOT NULL,
    category    text NOT NULL,
    subtype     text NOT NULL,
    amount      real NOT NULL,
    unit        text NOT NULL,
    co2_kg      real NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_entries_user_date ON entries (user_id, entry_date);

ALTER TABLE entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_entries" ON entries;
CREATE POLICY "select_own_entries" ON entries FOR SELECT
    TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_entries" ON entries;
CREATE POLICY "insert_own_entries" ON entries FOR INSERT
    TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_entries" ON entries;
CREATE POLICY "update_own_entries" ON entries FOR UPDATE
    TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_entries" ON entries;
CREATE POLICY "delete_own_entries" ON entries FOR DELETE
    TO authenticated USING (auth.uid() = user_id);

-- ============================================================ TASKS
CREATE TABLE IF NOT EXISTS tasks (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    text        text NOT NULL,
    done        boolean NOT NULL DEFAULT false,
    task_date   date NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tasks_user_date ON tasks (user_id, task_date);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_tasks" ON tasks;
CREATE POLICY "select_own_tasks" ON tasks FOR SELECT
    TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_tasks" ON tasks;
CREATE POLICY "insert_own_tasks" ON tasks FOR INSERT
    TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_tasks" ON tasks;
CREATE POLICY "update_own_tasks" ON tasks FOR UPDATE
    TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_tasks" ON tasks;
CREATE POLICY "delete_own_tasks" ON tasks FOR DELETE
    TO authenticated USING (auth.uid() = user_id);

-- ============================================================ TRIGGER
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, daily_budget_kg, created_at)
    VALUES (NEW.id, 15.0, now())
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();