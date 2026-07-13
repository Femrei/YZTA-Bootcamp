/*
# Auth'u Devre Dışı Bırak — Anon Erişim

## Değişiklikler
1. entries ve tasks tablolarında user_id nullable yapıldı, DEFAULT kaldırıldı
2. Tüm RLS politikaları anon+authenticated, USING(true) olarak güncellendi
3. profiles tablosu RLS politikaları anon erişime açıldı
4. auth.users FK kısıtlaması kaldırıldı (user_id nullable)

## Neden
Uygulama artık login gerektirmiyor — tek kullanıcı/tek cihaz senaryosu.
*/

-- entries: user_id nullable, default yok
ALTER TABLE entries ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE entries ALTER COLUMN user_id DROP DEFAULT;
ALTER TABLE entries DROP CONSTRAINT IF EXISTS entries_user_id_fkey;

-- tasks: user_id nullable, default yok
ALTER TABLE tasks ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE tasks ALTER COLUMN user_id DROP DEFAULT;
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_user_id_fkey;

-- profiles: id nullable yapıldı (artık auth.users'a bağlı değil)
-- profiles tablosunu bırakıyoruz, ayarlar için kullanılacak ama RLS anon'a açılacak

-- ============================================================ ENTRIES RLS
DROP POLICY IF EXISTS "select_own_entries" ON entries;
CREATE POLICY "select_all_entries" ON entries FOR SELECT
    TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_entries" ON entries;
CREATE POLICY "insert_all_entries" ON entries FOR INSERT
    TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_own_entries" ON entries;
CREATE POLICY "update_all_entries" ON entries FOR UPDATE
    TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_own_entries" ON entries;
CREATE POLICY "delete_all_entries" ON entries FOR DELETE
    TO anon, authenticated USING (true);

-- ============================================================ TASKS RLS
DROP POLICY IF EXISTS "select_own_tasks" ON tasks;
CREATE POLICY "select_all_tasks" ON tasks FOR SELECT
    TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_tasks" ON tasks;
CREATE POLICY "insert_all_tasks" ON tasks FOR INSERT
    TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_own_tasks" ON tasks;
CREATE POLICY "update_all_tasks" ON tasks FOR UPDATE
    TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_own_tasks" ON tasks;
CREATE POLICY "delete_all_tasks" ON tasks FOR DELETE
    TO anon, authenticated USING (true);

-- ============================================================ PROFILES RLS
DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_all_profiles" ON profiles FOR SELECT
    TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_all_profiles" ON profiles FOR INSERT
    TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_all_profiles" ON profiles FOR UPDATE
    TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_own_profile" ON profiles;
CREATE POLICY "delete_all_profiles" ON profiles FOR DELETE
    TO anon, authenticated USING (true);