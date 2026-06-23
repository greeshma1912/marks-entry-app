export interface Section {
  id: string;
  name: string;
  created_at: string;
}

export interface Subject {
  id: string;
  name: string;
  code: string | null;
  created_at: string;
}

export interface Student {
  id: string;
  roll_number: string;
  name: string;
  section_id: string;
  created_at: string;
}

export interface Exam {
  id: string;
  name: string;
  exam_type: 'mid' | 'final' | 'quiz' | 'assignment';
  total_marks: number;
  created_at: string;
}

export interface ExamSubject {
  id: string;
  exam_id: string;
  subject_id: string;
  section_id: string;
  num_questions: number;
  max_marks_per_question: number;
  created_at: string;
  subject?: Subject;
  exam?: Exam;
  section?: Section;
}

export interface Mark {
  id: string;
  exam_subject_id: string;
  student_id: string;
  question_number: number;
  marks_obtained: number | null;
  is_absent: boolean;
  entry_mode: 'manual' | 'voice';
  created_at: string;
  updated_at: string;
}

export interface VoiceAnalytics {
  id: string;
  exam_subject_id: string | null;
  total_voice_entries: number;
  total_manual_entries: number;
  successful_voice_entries: number;
  failed_voice_entries: number;
  average_time_per_student: number | null;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: 'admin' | 'instructor';
  created_at: string;
  updated_at: string;
}

export interface AuthState {
  user: UserProfile | null;
  loading: boolean;
  error: string | null;
}

export interface StudentWithMarks extends Student {
  marks: (Mark | null)[];
  total: number | null;
}

export type EntryMode = 'manual' | 'voice';

export interface VoiceRecognitionResult {
  success: boolean;
  values: (number | 'AB')[];
  error?: string;
}
