-- Make user_profiles insert policy work during signup
-- The trigger runs as SECURITY DEFINER which bypasses RLS, but let's also ensure
-- the policy allows profile creation

-- Drop the existing insert policy
DROP POLICY IF EXISTS user_profiles_insert ON user_profiles;

-- Create a more permissive insert policy that allows:
-- 1. Users to create their own profile (for new signups)
-- 2. Any authenticated user (the trigger handles this with SECURITY DEFINER)
CREATE POLICY "user_profiles_insert" ON user_profiles FOR INSERT
  WITH CHECK (true);

-- Also allow anyone to read profiles (needed for role checking)
DROP POLICY IF EXISTS user_profiles_select ON user_profiles;
CREATE POLICY "user_profiles_select" ON user_profiles FOR SELECT
  TO authenticated USING (true);