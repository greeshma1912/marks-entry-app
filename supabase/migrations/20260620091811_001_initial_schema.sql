-- Sections (Class divisions)
CREATE TABLE sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subjects
CREATE TABLE subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  code TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Students
CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roll_number TEXT NOT NULL,
  name TEXT NOT NULL,
  section_id UUID NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(roll_number, section_id)
);

-- Exams
CREATE TABLE exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  exam_type TEXT NOT NULL CHECK (exam_type IN ('mid', 'final', 'quiz', 'assignment')),
  total_marks INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Exam Subjects (Links exams to subjects with question configuration)
CREATE TABLE exam_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  section_id UUID NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  num_questions INTEGER NOT NULL DEFAULT 5,
  max_marks_per_question INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(exam_id, subject_id, section_id)
);

-- Marks (Student marks for each question)
CREATE TABLE marks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_subject_id UUID NOT NULL REFERENCES exam_subjects(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  question_number INTEGER NOT NULL CHECK (question_number > 0),
  marks_obtained DECIMAL(5,2) CHECK (marks_obtained >= 0),
  is_absent BOOLEAN DEFAULT FALSE,
  entry_mode TEXT DEFAULT 'manual' CHECK (entry_mode IN ('manual', 'voice')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(exam_subject_id, student_id, question_number)
);

-- Voice Analytics
CREATE TABLE voice_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_subject_id UUID REFERENCES exam_subjects(id) ON DELETE SET NULL,
  total_voice_entries INTEGER DEFAULT 0,
  total_manual_entries INTEGER DEFAULT 0,
  successful_voice_entries INTEGER DEFAULT 0,
  failed_voice_entries INTEGER DEFAULT 0,
  average_time_per_student DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE marks ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sections (public read/write for simplicity in demo)
CREATE POLICY "sections_select" ON sections FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "sections_insert" ON sections FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "sections_update" ON sections FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "sections_delete" ON sections FOR DELETE TO anon, authenticated USING (true);

-- RLS Policies for subjects
CREATE POLICY "subjects_select" ON subjects FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "subjects_insert" ON subjects FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "subjects_update" ON subjects FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "subjects_delete" ON subjects FOR DELETE TO anon, authenticated USING (true);

-- RLS Policies for students
CREATE POLICY "students_select" ON students FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "students_insert" ON students FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "students_update" ON students FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "students_delete" ON students FOR DELETE TO anon, authenticated USING (true);

-- RLS Policies for exams
CREATE POLICY "exams_select" ON exams FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "exams_insert" ON exams FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "exams_update" ON exams FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "exams_delete" ON exams FOR DELETE TO anon, authenticated USING (true);

-- RLS Policies for exam_subjects
CREATE POLICY "exam_subjects_select" ON exam_subjects FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "exam_subjects_insert" ON exam_subjects FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "exam_subjects_update" ON exam_subjects FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "exam_subjects_delete" ON exam_subjects FOR DELETE TO anon, authenticated USING (true);

-- RLS Policies for marks
CREATE POLICY "marks_select" ON marks FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "marks_insert" ON marks FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "marks_update" ON marks FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "marks_delete" ON marks FOR DELETE TO anon, authenticated USING (true);

-- RLS Policies for voice_analytics
CREATE POLICY "voice_analytics_select" ON voice_analytics FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "voice_analytics_insert" ON voice_analytics FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "voice_analytics_update" ON voice_analytics FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "voice_analytics_delete" ON voice_analytics FOR DELETE TO anon, authenticated USING (true);

-- Indexes for performance
CREATE INDEX idx_students_section ON students(section_id);
CREATE INDEX idx_exam_subjects_exam ON exam_subjects(exam_id);
CREATE INDEX idx_exam_subjects_subject ON exam_subjects(subject_id);
CREATE INDEX idx_exam_subjects_section ON exam_subjects(section_id);
CREATE INDEX idx_marks_exam_subject ON marks(exam_subject_id);
CREATE INDEX idx_marks_student ON marks(student_id);
CREATE INDEX idx_voice_analytics_exam_subject ON voice_analytics(exam_subject_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_marks_updated_at
  BEFORE UPDATE ON marks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_voice_analytics_updated_at
  BEFORE UPDATE ON voice_analytics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();