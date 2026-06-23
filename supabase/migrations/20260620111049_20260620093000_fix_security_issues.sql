-- Fix mutable search_path on update_updated_at_column function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

-- Drop overly permissive write policies on sections
DROP POLICY IF EXISTS "sections_insert" ON sections;
DROP POLICY IF EXISTS "sections_update" ON sections;
DROP POLICY IF EXISTS "sections_delete" ON sections;

-- Create restrictive write policies for sections (authenticated only)
CREATE POLICY "sections_insert" ON sections FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "sections_update" ON sections FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "sections_delete" ON sections FOR DELETE TO authenticated USING (true);

-- Drop overly permissive write policies on subjects
DROP POLICY IF EXISTS "subjects_insert" ON subjects;
DROP POLICY IF EXISTS "subjects_update" ON subjects;
DROP POLICY IF EXISTS "subjects_delete" ON subjects;

-- Create restrictive write policies for subjects (authenticated only)
CREATE POLICY "subjects_insert" ON subjects FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "subjects_update" ON subjects FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "subjects_delete" ON subjects FOR DELETE TO authenticated USING (true);

-- Drop overly permissive write policies on students
DROP POLICY IF EXISTS "students_insert" ON students;
DROP POLICY IF EXISTS "students_update" ON students;
DROP POLICY IF EXISTS "students_delete" ON students;

-- Create restrictive write policies for students (authenticated only)
CREATE POLICY "students_insert" ON students FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "students_update" ON students FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "students_delete" ON students FOR DELETE TO authenticated USING (true);

-- Drop overly permissive write policies on exams
DROP POLICY IF EXISTS "exams_insert" ON exams;
DROP POLICY IF EXISTS "exams_update" ON exams;
DROP POLICY IF EXISTS "exams_delete" ON exams;

-- Create restrictive write policies for exams (authenticated only)
CREATE POLICY "exams_insert" ON exams FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "exams_update" ON exams FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "exams_delete" ON exams FOR DELETE TO authenticated USING (true);

-- Drop overly permissive write policies on exam_subjects
DROP POLICY IF EXISTS "exam_subjects_insert" ON exam_subjects;
DROP POLICY IF EXISTS "exam_subjects_update" ON exam_subjects;
DROP POLICY IF EXISTS "exam_subjects_delete" ON exam_subjects;

-- Create restrictive write policies for exam_subjects (authenticated only)
CREATE POLICY "exam_subjects_insert" ON exam_subjects FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "exam_subjects_update" ON exam_subjects FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "exam_subjects_delete" ON exam_subjects FOR DELETE TO authenticated USING (true);

-- Drop overly permissive write policies on marks
DROP POLICY IF EXISTS "marks_insert" ON marks;
DROP POLICY IF EXISTS "marks_update" ON marks;
DROP POLICY IF EXISTS "marks_delete" ON marks;

-- Create restrictive write policies for marks (authenticated only)
CREATE POLICY "marks_insert" ON marks FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "marks_update" ON marks FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "marks_delete" ON marks FOR DELETE TO authenticated USING (true);

-- Drop overly permissive write policies on voice_analytics
DROP POLICY IF EXISTS "voice_analytics_insert" ON voice_analytics;
DROP POLICY IF EXISTS "voice_analytics_update" ON voice_analytics;
DROP POLICY IF EXISTS "voice_analytics_delete" ON voice_analytics;

-- Create restrictive write policies for voice_analytics (authenticated only)
CREATE POLICY "voice_analytics_insert" ON voice_analytics FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "voice_analytics_update" ON voice_analytics FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "voice_analytics_delete" ON voice_analytics FOR DELETE TO authenticated USING (true);
