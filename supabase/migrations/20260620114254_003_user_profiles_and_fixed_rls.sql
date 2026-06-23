-- User profiles table to store role information
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'instructor' CHECK (role IN ('admin', 'instructor')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles
CREATE POLICY "user_profiles_select" ON user_profiles FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "user_profiles_insert" ON user_profiles FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "user_profiles_update_own" ON user_profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Trigger to automatically create user profile on signup
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Update the RLS policies to require authentication

-- Drop existing permissive policies
DROP POLICY IF EXISTS sections_select ON sections;
DROP POLICY IF EXISTS sections_insert ON sections;
DROP POLICY IF EXISTS sections_update ON sections;
DROP POLICY IF EXISTS sections_delete ON sections;

DROP POLICY IF EXISTS subjects_select ON subjects;
DROP POLICY IF EXISTS subjects_insert ON subjects;
DROP POLICY IF EXISTS subjects_update ON subjects;
DROP POLICY IF EXISTS subjects_delete ON subjects;

DROP POLICY IF EXISTS students_select ON students;
DROP POLICY IF EXISTS students_insert ON students;
DROP POLICY IF EXISTS students_update ON students;
DROP POLICY IF EXISTS students_delete ON students;

DROP POLICY IF EXISTS exams_select ON exams;
DROP POLICY IF EXISTS exams_insert ON exams;
DROP POLICY IF EXISTS exams_update ON exams;
DROP POLICY IF EXISTS exams_delete ON exams;

DROP POLICY IF EXISTS exam_subjects_select ON exam_subjects;
DROP POLICY IF EXISTS exam_subjects_insert ON exam_subjects;
DROP POLICY IF EXISTS exam_subjects_update ON exam_subjects;
DROP POLICY IF EXISTS exam_subjects_delete ON exam_subjects;

DROP POLICY IF EXISTS marks_select ON marks;
DROP POLICY IF EXISTS marks_insert ON marks;
DROP POLICY IF EXISTS marks_update ON marks;
DROP POLICY IF EXISTS marks_delete ON marks;

DROP POLICY IF EXISTS voice_analytics_select ON voice_analytics;
DROP POLICY IF EXISTS voice_analytics_insert ON voice_analytics;
DROP POLICY IF EXISTS voice_analytics_update ON voice_analytics;
DROP POLICY IF EXISTS voice_analytics_delete ON voice_analytics;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Helper function to check if user is authenticated
CREATE OR REPLACE FUNCTION is_authenticated()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN auth.uid() IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Sections: Everyone can read, only admin can modify
CREATE POLICY "sections_select" ON sections FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "sections_insert" ON sections FOR INSERT
  TO authenticated WITH CHECK (is_admin());
CREATE POLICY "sections_update" ON sections FOR UPDATE
  TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "sections_delete" ON sections FOR DELETE
  TO authenticated USING (is_admin());

-- Subjects: Everyone can read, only admin can modify
CREATE POLICY "subjects_select" ON subjects FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "subjects_insert" ON subjects FOR INSERT
  TO authenticated WITH CHECK (is_admin());
CREATE POLICY "subjects_update" ON subjects FOR UPDATE
  TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "subjects_delete" ON subjects FOR DELETE
  TO authenticated USING (is_admin());

-- Students: Everyone can read, only admin can modify
CREATE POLICY "students_select" ON students FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "students_insert" ON students FOR INSERT
  TO authenticated WITH CHECK (is_admin());
CREATE POLICY "students_update" ON students FOR UPDATE
  TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "students_delete" ON students FOR DELETE
  TO authenticated USING (is_admin());

-- Exams: Everyone can read, only admin can modify
CREATE POLICY "exams_select" ON exams FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "exams_insert" ON exams FOR INSERT
  TO authenticated WITH CHECK (is_admin());
CREATE POLICY "exams_update" ON exams FOR UPDATE
  TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "exams_delete" ON exams FOR DELETE
  TO authenticated USING (is_admin());

-- Exam Subjects: Everyone can read, only admin can modify
CREATE POLICY "exam_subjects_select" ON exam_subjects FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "exam_subjects_insert" ON exam_subjects FOR INSERT
  TO authenticated WITH CHECK (is_admin());
CREATE POLICY "exam_subjects_update" ON exam_subjects FOR UPDATE
  TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "exam_subjects_delete" ON exam_subjects FOR DELETE
  TO authenticated USING (is_admin());

-- Marks: Everyone can read and update (instructors enter marks)
CREATE POLICY "marks_select" ON marks FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "marks_insert" ON marks FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "marks_update" ON marks FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "marks_delete" ON marks FOR DELETE
  TO authenticated USING (is_admin());

-- Voice Analytics: Everyone can read and modify
CREATE POLICY "voice_analytics_select" ON voice_analytics FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "voice_analytics_insert" ON voice_analytics FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "voice_analytics_update" ON voice_analytics FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "voice_analytics_delete" ON voice_analytics FOR DELETE
  TO authenticated USING (is_admin());

-- Trigger to update user_profiles updated_at
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();