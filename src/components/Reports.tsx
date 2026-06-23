import { useEffect, useState } from 'react';
import { ChevronDown, BarChart2, Mic, HandMetal, TrendingUp, Clock, CheckCircle, XCircle } from 'lucide-react';
import { getExamSubjects, getStudentsWithMarks, getOverallAnalytics } from '../lib/database';
import type { ExamSubject, StudentWithMarks, VoiceAnalytics } from '../lib/types';

export function Reports() {
  const [examSubjects, setExamSubjects] = useState<ExamSubject[]>([]);
  const [selectedExamSubjectId, setSelectedExamSubjectId] = useState<string>('');
  const [students, setStudents] = useState<StudentWithMarks[]>([]);
  const [allAnalytics, setAllAnalytics] = useState<VoiceAnalytics[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedExamSubjectId) {
      loadStudents();
    }
  }, [selectedExamSubjectId]);

  async function loadData() {
    try {
      const [esData, analyticsData] = await Promise.all([getExamSubjects(), getOverallAnalytics()]);
      setExamSubjects(esData);
      setAllAnalytics(analyticsData);
      if (esData.length > 0) {
        setSelectedExamSubjectId(esData[0].id);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadStudents() {
    try {
      const data = await getStudentsWithMarks(selectedExamSubjectId);
      setStudents(data);
    } catch (error) {
      console.error('Error loading students:', error);
    }
  }

  const selectedExamSubject = examSubjects.find((es) => es.id === selectedExamSubjectId);
  const currentAnalytics = allAnalytics.find((a) => a.exam_subject_id === selectedExamSubjectId);

  const stats = {
    evaluatedCount: students.filter((s) => s.total !== null).length,
    totalStudents: students.length,
    averageScore:
      students.filter((s) => s.total !== null).length > 0
        ? students.filter((s) => s.total !== null).reduce((sum, s) => sum + (s.total || 0), 0) / students.filter((s) => s.total !== null).length
        : 0,
    maxScore: students.reduce((max, s) => Math.max(max, s.total || 0), 0),
    minScore: students.reduce((min, s) => (s.total !== null ? Math.min(min, s.total) : min), Infinity),
    absentCount: students.filter((s) => s.marks.some((m) => m?.is_absent)).length,
  };

  const voiceSuccessRate =
    currentAnalytics && currentAnalytics.total_voice_entries + currentAnalytics.failed_voice_entries > 0
      ? Math.round((currentAnalytics.successful_voice_entries / (currentAnalytics.total_voice_entries + currentAnalytics.failed_voice_entries)) * 100)
      : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Reports</h1>
        <p className="text-slate-500 mt-1">View marks summary and analytics</p>
      </div>

      {/* Selection */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-600">Select Exam Subject</label>
            <div className="relative">
              <select
                value={selectedExamSubjectId}
                onChange={(e) => setSelectedExamSubjectId(e.target.value)}
                className="appearance-none bg-white border border-slate-300 rounded-lg px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[250px]"
              >
                {examSubjects.map((es) => (
                  <option key={es.id} value={es.id}>
                    {es.exam?.name} - {es.subject?.name} ({es.section?.name})
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" size={16} />
            </div>
          </div>
        </div>
      </div>

      {examSubjects.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <BarChart2 className="mx-auto mb-3 opacity-50" size={48} />
          <p>No exam subjects configured yet.</p>
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <TrendingUp className="text-blue-600" size={20} />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Average Score</p>
                  <p className="text-2xl font-bold text-slate-800">{stats.averageScore.toFixed(1)}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-50 rounded-lg">
                  <CheckCircle className="text-emerald-600" size={20} />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Highest Score</p>
                  <p className="text-2xl font-bold text-slate-800">{stats.maxScore}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-100 rounded-lg">
                  <BarChart2 className="text-slate-600" size={20} />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Lowest Score</p>
                  <p className="text-2xl font-bold text-slate-800">{stats.minScore === Infinity ? '-' : stats.minScore}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-50 rounded-lg">
                  <XCircle className="text-amber-600" size={20} />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Absent Students</p>
                  <p className="text-2xl font-bold text-slate-800">{stats.absentCount}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Voice Analytics */}
          {currentAnalytics && (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <Mic size={20} />
                Voice Entry Analytics
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-teal-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-teal-700 mb-1">
                    <Mic size={16} />
                    <span className="text-sm">Voice Entries</span>
                  </div>
                  <p className="text-2xl font-bold text-teal-800">{currentAnalytics.total_voice_entries}</p>
                </div>
                <div className="bg-slate-100 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-slate-600 mb-1">
                    <HandMetal size={16} />
                    <span className="text-sm">Manual Entries</span>
                  </div>
                  <p className="text-2xl font-bold text-slate-800">{currentAnalytics.total_manual_entries}</p>
                </div>
                <div className="bg-emerald-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-emerald-700 mb-1">
                    <CheckCircle size={16} />
                    <span className="text-sm">Success Rate</span>
                  </div>
                  <p className="text-2xl font-bold text-emerald-800">{voiceSuccessRate}%</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-blue-700 mb-1">
                    <Clock size={16} />
                    <span className="text-sm">Avg Time/Student</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-800">
                    {currentAnalytics.average_time_per_student ? `${currentAnalytics.average_time_per_student.toFixed(1)}s` : '-'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Grade Distribution */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-800 mb-4">Grade Distribution</h3>
            <div className="space-y-3">
              {getGradeDistribution(students, selectedExamSubject?.num_questions, selectedExamSubject?.max_marks_per_question).map((grade) => (
                <div key={grade.label} className="flex items-center gap-4">
                  <div className="w-16 text-sm font-medium text-slate-600">{grade.label}</div>
                  <div className="flex-1 bg-slate-100 rounded-full h-6 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${grade.color}`}
                      style={{ width: `${grade.percentage}%` }}
                    />
                  </div>
                  <div className="w-12 text-sm text-slate-600 text-right">{grade.count}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Student Results */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200">
              <h3 className="font-semibold text-slate-800">
                Student Results ({stats.evaluatedCount}/{stats.totalStudents} evaluated)
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Roll No</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Name</th>
                    <th className="text-center px-4 py-3 font-medium text-slate-600">Questions</th>
                    <th className="text-right px-4 py-3 font-medium text-slate-600">Total</th>
                    <th className="text-right px-4 py-3 font-medium text-slate-600">Percentage</th>
                    <th className="text-center px-4 py-3 font-medium text-slate-600">Grade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {students.map((student) => {
                    const percentage =
                      student.total !== null && selectedExamSubject
                        ? (student.total / (selectedExamSubject.num_questions * selectedExamSubject.max_marks_per_question)) * 100
                        : null;
                    const grade = getGrade(percentage);

                    return (
                      <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-mono text-slate-700">{student.roll_number}</td>
                        <td className="px-4 py-3 font-medium text-slate-800">{student.name}</td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex justify-center gap-1">
                            {student.marks.map((m, i) => (
                              <span
                                key={i}
                                className={`w-6 h-6 flex items-center justify-center text-xs rounded ${
                                  m?.is_absent
                                    ? 'bg-amber-100 text-amber-700'
                                    : m?.marks_obtained !== null
                                    ? 'bg-slate-100 text-slate-700'
                                    : 'bg-slate-50 text-slate-400'
                                }`}
                              >
                                {m?.is_absent ? 'A' : m?.marks_obtained ?? '-'}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="font-semibold text-slate-700">{student.total ?? '-'}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {percentage !== null ? (
                            <span className="font-medium text-slate-600">{percentage.toFixed(1)}%</span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {grade ? (
                            <span className={`px-2 py-1 text-xs font-medium rounded ${grade.bgColor} ${grade.textColor}`}>
                              {grade.label}
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function getGradeDistribution(students: StudentWithMarks[], numQuestions?: number, maxPerQuestion?: number) {
  const totalMax = (numQuestions || 5) * (maxPerQuestion || 10);
  const grades = [
    { min: 90, label: 'A+', color: 'bg-emerald-500' },
    { min: 80, label: 'A', color: 'bg-emerald-400' },
    { min: 70, label: 'B+', color: 'bg-blue-400' },
    { min: 60, label: 'B', color: 'bg-blue-300' },
    { min: 50, label: 'C', color: 'bg-amber-400' },
    { min: 40, label: 'D', color: 'bg-orange-400' },
    { min: 0, label: 'F', color: 'bg-red-400' },
  ];

  const graded = students.filter((s) => s.total !== null);

  return grades.map((g) => {
    const count = graded.filter((s) => {
      const pct = ((s.total || 0) / totalMax) * 100;
      return pct >= g.min && (grades.indexOf(g) === 0 || pct < grades[grades.indexOf(g) - 1].min);
    }).length;
    return {
      ...g,
      count,
      percentage: graded.length > 0 ? (count / graded.length) * 100 : 0,
    };
  });
}

function getGrade(percentage: number | null) {
  if (percentage === null) return null;
  if (percentage >= 90) return { label: 'A+', bgColor: 'bg-emerald-100', textColor: 'text-emerald-700' };
  if (percentage >= 80) return { label: 'A', bgColor: 'bg-emerald-50', textColor: 'text-emerald-600' };
  if (percentage >= 70) return { label: 'B+', bgColor: 'bg-blue-100', textColor: 'text-blue-700' };
  if (percentage >= 60) return { label: 'B', bgColor: 'bg-blue-50', textColor: 'text-blue-600' };
  if (percentage >= 50) return { label: 'C', bgColor: 'bg-amber-100', textColor: 'text-amber-700' };
  if (percentage >= 40) return { label: 'D', bgColor: 'bg-orange-100', textColor: 'text-orange-700' };
  return { label: 'F', bgColor: 'bg-red-100', textColor: 'text-red-700' };
}
