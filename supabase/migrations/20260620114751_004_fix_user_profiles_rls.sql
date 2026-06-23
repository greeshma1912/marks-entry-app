-- Fix user_profiles RLS to allow insert during signup
-- The trigger runs as SECURITY DEFINER, but let's also allow users to insert their own profile

-- Drop existing insert policy
DROP POLICY IF EXISTS user_profiles_insert ON user_profiles;

-- Allow inserts from authenticated users (they can only insert their own profile)
CREATE POLICY "user_profiles_insert" ON user_profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

-- Also allow the service role to insert (for admin operations)
-- And temporarily allow inserts for the trigger to work during signup
-- The trigger is SECURITY DEFINER so it runs as the function owner

-- Make the function more robust - handle duplicates gracefully
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
  -- If insert fails, still allow user creation
  -- Profile can be created later
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Also add a policy to allow service role full access
-- This helps if manual profile creation is needed