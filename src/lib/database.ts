import { supabase } from './supabase';
import type { Section, Subject, Student, Exam, ExamSubject, Mark, StudentWithMarks, VoiceAnalytics } from './types';

// Sections
export async function getSections(): Promise<Section[]> {
  const { data, error } = await supabase.from('sections').select('*').order('name');
  if (error) throw error;
  return data;
}

export async function createSection(name: string): Promise<Section> {
  const { data, error } = await supabase.from('sections').insert({ name }).select().single();
  if (error) throw error;
  return data;
}

export async function updateSection(id: string, name: string): Promise<Section> {
  const { data, error } = await supabase.from('sections').update({ name }).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteSection(id: string): Promise<void> {
  const { error } = await supabase.from('sections').delete().eq('id', id);
  if (error) throw error;
}

// Subjects
export async function getSubjects(): Promise<Subject[]> {
  const { data, error } = await supabase.from('subjects').select('*').order('name');
  if (error) throw error;
  return data;
}

export async function createSubject(name: string, code?: string): Promise<Subject> {
  const { data, error } = await supabase.from('subjects').insert({ name, code }).select().single();
  if (error) throw error;
  return data;
}

export async function updateSubject(id: string, name: string, code?: string): Promise<Subject> {
  const { data, error } = await supabase.from('subjects').update({ name, code }).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteSubject(id: string): Promise<void> {
  const { error } = await supabase.from('subjects').delete().eq('id', id);
  if (error) throw error;
}

// Students
export async function getStudents(sectionId?: string): Promise<Student[]> {
  let query = supabase.from('students').select('*').order('roll_number');
  if (sectionId) query = query.eq('section_id', sectionId);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function createStudent(rollNumber: string, name: string, sectionId: string): Promise<Student> {
  const { data, error } = await supabase
    .from('students')
    .insert({ roll_number: rollNumber, name, section_id: sectionId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateStudent(id: string, rollNumber: string, name: string, sectionId: string): Promise<Student> {
  const { data, error } = await supabase
    .from('students')
    .update({ roll_number: rollNumber, name, section_id: sectionId })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteStudent(id: string): Promise<void> {
  const { error } = await supabase.from('students').delete().eq('id', id);
  if (error) throw error;
}

// Exams
export async function getExams(): Promise<Exam[]> {
  const { data, error } = await supabase.from('exams').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function createExam(name: string, examType: Exam['exam_type'], totalMarks: number): Promise<Exam> {
  const { data, error } = await supabase.from('exams').insert({ name, exam_type: examType, total_marks: totalMarks }).select().single();
  if (error) throw error;
  return data;
}

export async function updateExam(id: string, name: string, examType: Exam['exam_type'], totalMarks: number): Promise<Exam> {
  const { data, error } = await supabase
    .from('exams')
    .update({ name, exam_type: examType, total_marks: totalMarks })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteExam(id: string): Promise<void> {
  const { error } = await supabase.from('exams').delete().eq('id', id);
  if (error) throw error;
}

// Exam Subjects
export async function getExamSubjects(): Promise<ExamSubject[]> {
  const { data, error } = await supabase
    .from('exam_subjects')
    .select('*, subject:subjects(*), exam:exams(*), section:sections(*)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function getExamSubjectById(id: string): Promise<ExamSubject | null> {
  const { data, error } = await supabase
    .from('exam_subjects')
    .select('*, subject:subjects(*), exam:exams(*), section:sections(*)')
    .eq('id', id)
    .single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}

export async function createExamSubject(examId: string, subjectId: string, sectionId: string, numQuestions: number, maxMarksPerQuestion: number): Promise<ExamSubject> {
  const { data, error } = await supabase
    .from('exam_subjects')
    .insert({ exam_id: examId, subject_id: subjectId, section_id: sectionId, num_questions: numQuestions, max_marks_per_question: maxMarksPerQuestion })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateExamSubject(id: string, numQuestions: number, maxMarksPerQuestion: number): Promise<ExamSubject> {
  const { data, error } = await supabase
    .from('exam_subjects')
    .update({ num_questions: numQuestions, max_marks_per_question: maxMarksPerQuestion })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteExamSubject(id: string): Promise<void> {
  const { error } = await supabase.from('exam_subjects').delete().eq('id', id);
  if (error) throw error;
}

// Marks
export async function getMarks(examSubjectId: string): Promise<Mark[]> {
  const { data, error } = await supabase.from('marks').select('*').eq('exam_subject_id', examSubjectId);
  if (error) throw error;
  return data;
}

export async function getStudentsWithMarks(examSubjectId: string): Promise<StudentWithMarks[]> {
  const examSubject = await getExamSubjectById(examSubjectId);
  if (!examSubject) return [];

  const [students, marks] = await Promise.all([getStudents(examSubject.section_id), getMarks(examSubjectId)]);

  const marksByStudent: Record<string, Record<number, Mark>> = {};
  for (const mark of marks) {
    if (!marksByStudent[mark.student_id]) marksByStudent[mark.student_id] = {};
    marksByStudent[mark.student_id][mark.question_number] = mark;
  }

  return students.map((student) => {
    const studentMarks: (Mark | null)[] = [];
    let total = 0;
    let hasMarks = false;

    for (let q = 1; q <= examSubject.num_questions; q++) {
      const mark = marksByStudent[student.id]?.[q] || null;
      studentMarks.push(mark);
      if (mark && !mark.is_absent && mark.marks_obtained !== null) {
        total += mark.marks_obtained;
        hasMarks = true;
      } else if (mark?.is_absent) {
        hasMarks = true;
      }
    }

    return {
      ...student,
      marks: studentMarks,
      total: hasMarks ? total : null,
    };
  });
}

export async function upsertMark(
  examSubjectId: string,
  studentId: string,
  questionNumber: number,
  marksObtained: number | null,
  isAbsent: boolean,
  entryMode: 'manual' | 'voice'
): Promise<Mark> {
  const { data, error } = await supabase
    .from('marks')
    .upsert(
      {
        exam_subject_id: examSubjectId,
        student_id: studentId,
        question_number: questionNumber,
        marks_obtained: marksObtained,
        is_absent: isAbsent,
        entry_mode: entryMode,
      },
      { onConflict: 'exam_subject_id,student_id,question_number' }
    )
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function upsertMarks(
  examSubjectId: string,
  studentId: string,
  marksData: Array<{ questionNumber: number; marksObtained: number | null; isAbsent: boolean }>,
  entryMode: 'manual' | 'voice'
): Promise<Mark[]> {
  const inserts = marksData.map((m) => ({
    exam_subject_id: examSubjectId,
    student_id: studentId,
    question_number: m.questionNumber,
    marks_obtained: m.marksObtained,
    is_absent: m.isAbsent,
    entry_mode: entryMode,
  }));

  const { data, error } = await supabase.from('marks').upsert(inserts, { onConflict: 'exam_subject_id,student_id,question_number' }).select();
  if (error) throw error;
  return data;
}

// Voice Analytics
export async function getVoiceAnalytics(examSubjectId: string): Promise<VoiceAnalytics | null> {
  const { data, error } = await supabase.from('voice_analytics').select('*').eq('exam_subject_id', examSubjectId).single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}

export async function updateVoiceAnalytics(examSubjectId: string, updates: Partial<VoiceAnalytics>): Promise<VoiceAnalytics> {
  const existing = await getVoiceAnalytics(examSubjectId);

  if (existing) {
    const { data, error } = await supabase
      .from('voice_analytics')
      .update({
        ...updates,
        total_voice_entries: updates.total_voice_entries ?? existing.total_voice_entries,
        total_manual_entries: updates.total_manual_entries ?? existing.total_manual_entries,
        successful_voice_entries: updates.successful_voice_entries ?? existing.successful_voice_entries,
        failed_voice_entries: updates.failed_voice_entries ?? existing.failed_voice_entries,
      })
      .eq('id', existing.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  } else {
    const { data, error } = await supabase
      .from('voice_analytics')
      .insert({ exam_subject_id: examSubjectId, ...updates })
      .select()
      .single();
    if (error) throw error;
    return data;
  }
}

export async function getOverallAnalytics(): Promise<VoiceAnalytics[]> {
  const { data, error } = await supabase.from('voice_analytics').select('*');
  if (error) throw error;
  return data;
}
