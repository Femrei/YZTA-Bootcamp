-- profiles.id artık auth.users'a bağlı değil (auth kapalı, anon profil)
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE profiles ALTER COLUMN id DROP DEFAULT;
ALTER TABLE profiles ALTER COLUMN id SET DEFAULT gen_random_uuid();
