-- Ensure user_profiles can be created during signup
-- The trigger runs as SECURITY DEFINER which should work, but let's ensure RLS is properly configured

-- First, let's check and recreate the policies cleanly
DROP POLICY IF EXISTS user_profiles_insert ON user_profiles;
DROP POLICY IF EXISTS user_profiles_insert_own ON user_profiles;
DROP POLICY IF EXISTS user_profiles_select ON user_profiles;
DROP POLICY IF EXISTS user_profiles_update_own ON user_profiles;

-- Grant necessary permissions
GRANT ALL ON user_profiles TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Create simple policies
-- Allow anyone to read profiles (needed for role checks in is_admin function)
CREATE POLICY "user_profiles_select" ON user_profiles FOR SELECT
  USING (true);

-- Allow insert - the trigger is SECURITY DEFINER so it bypasses RLS
-- but if client needs to insert, allow it
CREATE POLICY "user_profiles_insert" ON user_profiles FOR INSERT
  WITH CHECK (true);

-- Allow users to update their own profile
CREATE POLICY "user_profiles_update_own" ON user_profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Verify the trigger function is correct
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'instructor')
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log the error but don't fail user creation
  RAISE NOTICE 'Failed to create user profile: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;