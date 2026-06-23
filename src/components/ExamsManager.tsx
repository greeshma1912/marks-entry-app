import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, X, Check, GraduationCap, ChevronDown, Settings, Link } from 'lucide-react';
import { getExams, getExamSubjects, createExam, updateExam, deleteExam, createExamSubject, deleteExamSubject, getSections, getSubjects } from '../lib/database';
import type { Exam, ExamSubject, Section, Subject } from '../lib/types';

export function ExamsManager() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [examSubjects, setExamSubjects] = useState<ExamSubject[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState<Exam['exam_type']>('mid');
  const [editTotalMarks, setEditTotalMarks] = useState('100');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<Exam['exam_type']>('mid');
  const [newTotalMarks, setNewTotalMarks] = useState('100');
  const [saving, setSaving] = useState(false);
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [linkExamId, setLinkExamId] = useState('');
  const [linkSubjectId, setLinkSubjectId] = useState('');
  const [linkSectionId, setLinkSectionId] = useState('');
  const [linkNumQuestions, setLinkNumQuestions] = useState('5');
  const [linkMaxMarks, setLinkMaxMarks] = useState('10');
  const [expandedExamId, setExpandedExamId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [examsData, examSubjectsData, sectionsData, subjectsData] = await Promise.all([getExams(), getExamSubjects(), getSections(), getSubjects()]);
      setExams(examsData);
      setExamSubjects(examSubjectsData);
      setSections(sectionsData);
      setSubjects(subjectsData);
      if (examsData.length > 0) setLinkExamId(examsData[0].id);
      if (subjectsData.length > 0) setLinkSubjectId(subjectsData[0].id);
      if (sectionsData.length > 0) setLinkSectionId(sectionsData[0].id);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddExam() {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      const exam = await createExam(newName.trim(), newType, parseInt(newTotalMarks) || 100);
      setExams([exam, ...exams]);
      setNewName('');
      setNewType('mid');
      setNewTotalMarks('100');
      setShowAddForm(false);
    } catch (error) {
      console.error('Error creating exam:', error);
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateExam(id: string) {
    if (!editName.trim()) return;
    setSaving(true);
    try {
      const updated = await updateExam(id, editName.trim(), editType, parseInt(editTotalMarks) || 100);
      setExams(exams.map((e) => (e.id === id ? updated : e)));
      setEditingId(null);
    } catch (error) {
      console.error('Error updating exam:', error);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteExam(id: string) {
    if (!confirm('Are you sure you want to delete this exam? All related marks will also be deleted.')) return;
    try {
      await deleteExam(id);
      setExams(exams.filter((e) => e.id !== id));
      setExamSubjects(examSubjects.filter((es) => es.exam_id !== id));
    } catch (error) {
      console.error('Error deleting exam:', error);
    }
  }

  async function handleLinkSubject() {
    if (!linkExamId || !linkSubjectId || !linkSectionId) return;
    setSaving(true);
    try {
      const es = await createExamSubject(linkExamId, linkSubjectId, linkSectionId, parseInt(linkNumQuestions) || 5, parseInt(linkMaxMarks) || 10);
      const subject = subjects.find((s) => s.id === linkSubjectId);
      const exam = exams.find((e) => e.id === linkExamId);
      const section = sections.find((s) => s.id === linkSectionId);
      setExamSubjects([{ ...es, subject, exam, section }, ...examSubjects]);
      setShowLinkForm(false);
      setLinkNumQuestions('5');
      setLinkMaxMarks('10');
    } catch (error) {
      console.error('Error linking subject:', error);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteExamSubject(id: string) {
    if (!confirm('Are you sure? All marks for this exam-subject will be deleted.')) return;
    try {
      await deleteExamSubject(id);
      setExamSubjects(examSubjects.filter((es) => es.id !== id));
    } catch (error) {
      console.error('Error deleting exam subject:', error);
    }
  }

  function startEditing(exam: Exam) {
    setEditingId(exam.id);
    setEditName(exam.name);
    setEditType(exam.exam_type);
    setEditTotalMarks(exam.total_marks.toString());
  }

  function getExamTypeLabel(type: Exam['exam_type']) {
    return { mid: 'Mid-Term', final: 'Final', quiz: 'Quiz', assignment: 'Assignment' }[type];
  }

  const getExamSubjectsForExam = (examId: string) => examSubjects.filter((es) => es.exam_id === examId);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Exams</h1>
          <p className="text-slate-500 mt-1">Manage exams and configure subjects</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowLinkForm(true)}
            disabled={exams.length === 0 || subjects.length === 0 || sections.length === 0}
            className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
          >
            <Link size={20} />
            Link Subject
          </button>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={20} />
            Add Exam
          </button>
        </div>
      </div>

      {showAddForm && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h3 className="font-medium text-slate-800 mb-3">New Exam</h3>
          <div className="flex flex-wrap gap-3">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Exam name"
              className="flex-1 min-w-[200px] border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyDown={(e) => e.key === 'Enter' && handleAddExam()}
            />
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value as Exam['exam_type'])}
              className="border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="mid">Mid-Term</option>
              <option value="final">Final</option>
              <option value="quiz">Quiz</option>
              <option value="assignment">Assignment</option>
            </select>
            <input
              type="number"
              value={newTotalMarks}
              onChange={(e) => setNewTotalMarks(e.target.value)}
              placeholder="Total Marks"
              className="w-32 border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleAddExam}
              disabled={saving || !newName.trim()}
              className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button onClick={() => setShowAddForm(false)} className="bg-slate-200 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-300 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {showLinkForm && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h3 className="font-medium text-slate-800 mb-3">Link Subject to Exam</h3>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1">
              <label className="text-sm text-slate-600">Exam</label>
              <select value={linkExamId} onChange={(e) => setLinkExamId(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                {exams.map((exam) => (
                  <option key={exam.id} value={exam.id}>
                    {exam.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm text-slate-600">Subject</label>
              <select
                value={linkSubjectId}
                onChange={(e) => setLinkSubjectId(e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm text-slate-600">Section</label>
              <select
                value={linkSectionId}
                onChange={(e) => setLinkSectionId(e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {sections.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm text-slate-600">Questions</label>
              <input
                type="number"
                value={linkNumQuestions}
                onChange={(e) => setLinkNumQuestions(e.target.value)}
                className="w-24 border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="1"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-slate-600">Max/Q</label>
              <input
                type="number"
                value={linkMaxMarks}
                onChange={(e) => setLinkMaxMarks(e.target.value)}
                className="w-24 border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="1"
              />
            </div>
            <button
              onClick={handleLinkSubject}
              disabled={saving}
              className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving...' : 'Link'}
            </button>
            <button onClick={() => setShowLinkForm(false)} className="bg-slate-200 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-300 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {exams.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
          <GraduationCap className="mx-auto mb-3 opacity-50" size={48} />
          <p>No exams yet. Create your first exam to get started.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {exams.map((exam) => (
            <div key={exam.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div
                className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => setExpandedExamId(expandedExamId === exam.id ? null : exam.id)}
              >
                <div className="flex-1">
                  {editingId === exam.id ? (
                    <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="border border-slate-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
                        autoFocus
                      />
                      <select value={editType} onChange={(e) => setEditType(e.target.value as Exam['exam_type'])} className="border border-slate-300 rounded px-2 py-1">
                        <option value="mid">Mid-Term</option>
                        <option value="final">Final</option>
                        <option value="quiz">Quiz</option>
                        <option value="assignment">Assignment</option>
                      </select>
                      <input
                        type="number"
                        value={editTotalMarks}
                        onChange={(e) => setEditTotalMarks(e.target.value)}
                        className="w-24 border border-slate-300 rounded px-2 py-1"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-slate-800">{exam.name}</span>
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">{getExamTypeLabel(exam.exam_type)}</span>
                      <span className="text-slate-500 text-sm">Total: {exam.total_marks}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <ChevronDown
                    size={20}
                    className={`text-slate-400 transition-transform ${expandedExamId === exam.id ? 'rotate-180' : ''}`}
                  />
                  {editingId === exam.id ? (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUpdateExam(exam.id);
                        }}
                        disabled={saving}
                        className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                      >
                        <Check size={18} />
                      </button>
                      <button onClick={(e) => {
                        e.stopPropagation();
                        setEditingId(null);
                      }} className="p-1.5 text-slate-500 hover:bg-slate-100 rounded transition-colors">
                        <X size={18} />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startEditing(exam);
                        }}
                        className="p-1.5 text-slate-500 hover:bg-slate-100 rounded transition-colors"
                      >
                        <Pencil size={18} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteExam(exam.id);
                        }}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </>
                  )}
                </div>
              </div>
              {expandedExamId === exam.id && (
                <div className="border-t border-slate-200 bg-slate-50 p-4">
                  {getExamSubjectsForExam(exam.id).length === 0 ? (
                    <p className="text-center text-slate-500 text-sm py-4">No subjects linked to this exam. Click "Link Subject" to add.</p>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {getExamSubjectsForExam(exam.id).map((es) => (
                        <div key={es.id} className="bg-white rounded-lg border border-slate-200 p-3 flex items-start justify-between">
                          <div>
                            <p className="font-medium text-slate-800">{es.subject?.name}</p>
                            <p className="text-sm text-slate-500">Section {es.section?.name}</p>
                            <p className="text-xs text-slate-400 mt-1">
                              {es.num_questions} questions - Max {es.max_marks_per_question}/Q
                            </p>
                          </div>
                          <button onClick={() => handleDeleteExamSubject(es.id)} className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
