import { useEffect, useState, useCallback, useRef } from 'react';
import { Mic, MicOff, ChevronDown, Check, RotateCcw, Pencil, AlertCircle, CheckCircle, HelpCircle, Keyboard, MessageSquare } from 'lucide-react';
import { getExamSubjects, getStudentsWithMarks, upsertMark, upsertMarks, updateVoiceAnalytics, getVoiceAnalytics, getSections, getExams } from '../lib/database';
import { createSpeechRecognition, parseVoiceInput, isVoiceRecognitionSupported, type ParseDebugInfo } from '../lib/voiceRecognition';
import type { ExamSubject, StudentWithMarks, EntryMode, VoiceAnalytics, Section, Exam } from '../lib/types';

export function MarksEntry() {
  const [sections, setSections] = useState<Section[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [examSubjects, setExamSubjects] = useState<ExamSubject[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [selectedExamSubjectId, setSelectedExamSubjectId] = useState<string>('');
  const [students, setStudents] = useState<StudentWithMarks[]>([]);
  const [activeStudentIndex, setActiveStudentIndex] = useState<number | null>(null);
  const [entryMode, setEntryMode] = useState<EntryMode>('manual');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported] = useState(isVoiceRecognitionSupported);
  const [detectedMarks, setDetectedMarks] = useState<(number | 'AB')[] | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<VoiceAnalytics | null>(null);
  const [editingCell, setEditingCell] = useState<{ studentIndex: number; questionIndex: number } | null>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [rawTranscript, setRawTranscript] = useState<string>('');
  const [parseDebugInfo, setParseDebugInfo] = useState<ParseDebugInfo | null>(null);
  const recognitionRef = useRef<ReturnType<typeof createSpeechRecognition>>(null);
  const startTimeRef = useRef<number>(0);
  const tableRef = useRef<HTMLDivElement>(null);

  const selectedExamSubject = examSubjects.find((es) => es.id === selectedExamSubjectId);

  const filteredExamSubjects = examSubjects.filter((es) => {
    const matchesSection = !selectedSectionId || es.section_id === selectedSectionId;
    const matchesExam = !selectedExamId || es.exam_id === selectedExamId;
    return matchesSection && matchesExam;
  });

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedExamSubjectId) {
      loadStudents();
      loadAnalytics();
    }
  }, [selectedExamSubjectId]);

  useEffect(() => {
    const matching = filteredExamSubjects.map((es) => es.id);
    if (selectedExamSubjectId && !matching.includes(selectedExamSubjectId)) {
      setSelectedExamSubjectId(filteredExamSubjects.length > 0 ? filteredExamSubjects[0].id : '');
    }
  }, [selectedSectionId, selectedExamId, examSubjects]);

  useEffect(() => {
    if (!voiceSupported) return;
    recognitionRef.current = createSpeechRecognition();
  }, [voiceSupported]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && detectedMarks && voiceError === null) {
        handleConfirmMarks();
      }
      if (e.key === 'Escape') {
        if (isListening) stopListening();
        setDetectedMarks(null);
        setVoiceError(null);
      }
      if (e.ctrlKey && e.key === 'r') {
        e.preventDefault();
        if (detectedMarks) {
          handleRetry();
        } else if (!isListening && entryMode === 'voice' && activeStudentIndex !== null) {
          startListening();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [detectedMarks, voiceError, isListening, entryMode, activeStudentIndex]);

  async function loadInitialData() {
    try {
      const [sectionsData, examsData, examSubjectsData] = await Promise.all([
        getSections(),
        getExams(),
        getExamSubjects(),
      ]);
      setSections(sectionsData);
      setExams(examsData);
      setExamSubjects(examSubjectsData);
    } catch (error) {
      console.error('Error loading initial data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadStudents() {
    try {
      const data = await getStudentsWithMarks(selectedExamSubjectId);
      setStudents(data);
      setActiveStudentIndex(null);
    } catch (error) {
      console.error('Error loading students:', error);
    }
  }

  async function loadAnalytics() {
    try {
      const data = await getVoiceAnalytics(selectedExamSubjectId);
      setAnalytics(data);
    } catch (error) {
      console.error('Error loading analytics:', error);
    }
  }

  async function saveMark(studentId: string, questionNumber: number, value: number | null, isAbsent: boolean, mode: EntryMode) {
    try {
      await upsertMark(selectedExamSubjectId, studentId, questionNumber, value, isAbsent, mode);
      await updateVoiceAnalytics(selectedExamSubjectId, {
        total_voice_entries: (analytics?.total_voice_entries || 0) + (mode === 'voice' ? 1 : 0),
        total_manual_entries: (analytics?.total_manual_entries || 0) + (mode === 'manual' ? 1 : 0),
      });
    } catch (error) {
      console.error('Error saving mark:', error);
      throw error;
    }
  }

  async function saveAllMarks(studentId: string, marks: (number | 'AB')[], mode: EntryMode) {
    setSaving(true);
    try {
      const marksData = marks.map((m, i) => ({
        questionNumber: i + 1,
        marksObtained: m === 'AB' ? null : m,
        isAbsent: m === 'AB',
      }));
      await upsertMarks(selectedExamSubjectId, studentId, marksData, mode);
      await loadStudents();
      setDetectedMarks(null);
      setActiveStudentIndex((prev) => (prev !== null && prev < students.length - 1 ? prev + 1 : prev));
      setVoiceError(null);
    } catch (error) {
      console.error('Error saving marks:', error);
    } finally {
      setSaving(false);
    }
  }

  const startListening = useCallback(() => {
    if (!recognitionRef.current || activeStudentIndex === null || !selectedExamSubject) return;

    setVoiceError(null);
    setDetectedMarks(null);
    setRawTranscript('');
    setParseDebugInfo(null);
    startTimeRef.current = Date.now();

    recognitionRef.current.onResult((transcript) => {
      console.log('[MarksEntry] Raw transcript received:', transcript);
      setRawTranscript(transcript);

      const result = parseVoiceInput(transcript, selectedExamSubject.num_questions, selectedExamSubject.max_marks_per_question);

      if (result.debugInfo) {
        setParseDebugInfo(result.debugInfo);
      }

      if (result.success) {
        setDetectedMarks(result.values);
        setIsListening(false);
      } else {
        setVoiceError(result.error || 'No valid marks detected.');
        setIsListening(false);
      }
    });

    recognitionRef.current.onError((error) => {
      setVoiceError(error);
      setIsListening(false);
    });

    recognitionRef.current.onEnd(() => {
      setIsListening(false);
    });

    recognitionRef.current.start();
    setIsListening(true);
  }, [activeStudentIndex, selectedExamSubject]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, []);

  function handleRetry() {
    setDetectedMarks(null);
    setVoiceError(null);
    setRawTranscript('');
    setParseDebugInfo(null);
    startListening();
  }

  async function handleConfirmMarks() {
    if (detectedMarks && activeStudentIndex !== null) {
      await saveAllMarks(students[activeStudentIndex].id, detectedMarks, 'voice');
      await updateVoiceAnalytics(selectedExamSubjectId, {
        total_voice_entries: (analytics?.total_voice_entries || 0) + detectedMarks.length,
        successful_voice_entries: (analytics?.successful_voice_entries || 0) + 1,
        average_time_per_student: analytics?.average_time_per_student
          ? (analytics.average_time_per_student + (Date.now() - startTimeRef.current) / 1000) / 2
          : (Date.now() - startTimeRef.current) / 1000,
      });
      await loadAnalytics();
    }
  }

  function handleManualEdit() {
    if (activeStudentIndex !== null && detectedMarks) {
      const student = students[activeStudentIndex];
      const newMarks: (number | 'AB')[] = detectedMarks.map((m, i) => {
        const existing = student.marks[i];
        if (existing) {
          return existing.is_absent ? 'AB' : existing.marks_obtained || 0;
        }
        return m;
      });
      setDetectedMarks(newMarks);
    }
    setVoiceError(null);
    setDetectedMarks(null);
  }

  async function handleCellEdit(studentIndex: number, questionIndex: number, value: string) {
    const student = students[studentIndex];
    const numValue = value.toUpperCase() === 'AB' || value === '-' ? null : parseFloat(value);
    const isAbsent = value.toUpperCase() === 'AB' || value === '-';

    if (!isAbsent && numValue !== null && numValue > (selectedExamSubject?.max_marks_per_question || 10)) {
      return;
    }

    try {
      await saveMark(student.id, questionIndex + 1, numValue, isAbsent, 'manual');
      await loadStudents();
    } catch (error) {
      console.error('Error saving:', error);
    }
    setEditingCell(null);
  }

  function getCellDisplayValue(mark: { marks_obtained: number | null; is_absent: boolean } | null, detected?: number | 'AB') {
    if (detected !== undefined) {
      return detected === 'AB' ? 'AB' : detected.toString();
    }
    if (!mark) return '';
    if (mark.is_absent) return 'AB';
    return mark.marks_obtained?.toString() ?? '';
  }

  function getCellBgColor(mark: { marks_obtained: number | null; is_absent: boolean } | null, isActiveRow: boolean, detected?: number | 'AB') {
    if (isActiveRow) return 'bg-blue-50';
    if (mark?.is_absent) return 'bg-amber-50';
    if (mark?.marks_obtained !== null && mark?.marks_obtained !== undefined) return 'bg-emerald-50';
    return 'bg-white';
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (examSubjects.length === 0) {
    return (
      <div className="text-center py-16">
        <AlertCircle className="mx-auto mb-4 text-slate-300" size={48} />
        <h2 className="text-xl font-semibold text-slate-600 mb-2">No Exam Subjects Configured</h2>
        <p className="text-slate-500">Please create exams and link subjects to sections first.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Marks Entry</h1>
          <p className="text-slate-500 mt-1">Enter marks for students using manual or voice input</p>
        </div>
        <button onClick={() => setShowShortcuts(!showShortcuts)} className="flex items-center gap-2 text-slate-600 hover:text-slate-800 transition-colors">
          <Keyboard size={20} />
          <span className="text-sm">Keyboard Shortcuts</span>
        </button>
      </div>

      {showShortcuts && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <h3 className="font-semibold text-blue-800 mb-2">Keyboard Shortcuts</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm text-blue-700">
            <div><kbd className="bg-blue-100 px-2 py-0.5 rounded">Enter</kbd> Confirm marks</div>
            <div><kbd className="bg-blue-100 px-2 py-0.5 rounded">Esc</kbd> Cancel / Stop listening</div>
            <div><kbd className="bg-blue-100 px-2 py-0.5 rounded">Ctrl+R</kbd> Retry voice input</div>
            <div><kbd className="bg-blue-100 px-2 py-0.5 rounded">Tab</kbd> Navigate cells</div>
            <div><kbd className="bg-blue-100 px-2 py-0.5 rounded">Arrow Keys</kbd> Navigate grid</div>
          </div>
        </div>
      )}

      {/* Selection Panel */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-600">Section</label>
            <div className="relative">
              <select
                value={selectedSectionId}
                onChange={(e) => {
                  setSelectedSectionId(e.target.value);
                }}
                className="appearance-none bg-white border border-slate-300 rounded-lg px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[120px]"
              >
                <option value="">All Sections</option>
                {sections.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" size={16} />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-600">Exam</label>
            <div className="relative">
              <select
                value={selectedExamId}
                onChange={(e) => {
                  setSelectedExamId(e.target.value);
                }}
                className="appearance-none bg-white border border-slate-300 rounded-lg px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[150px]"
              >
                <option value="">All Exams</option>
                {exams.map((exam) => (
                  <option key={exam.id} value={exam.id}>
                    {exam.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" size={16} />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-600">Subject</label>
            <div className="relative">
              <select
                value={selectedExamSubjectId}
                onChange={(e) => setSelectedExamSubjectId(e.target.value)}
                disabled={filteredExamSubjects.length === 0}
                className="appearance-none bg-white border border-slate-300 rounded-lg px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px] disabled:bg-slate-100 disabled:cursor-not-allowed"
              >
                {filteredExamSubjects.length === 0 ? (
                  <option value="">No subjects available</option>
                ) : (
                  filteredExamSubjects.map((es) => (
                    <option key={es.id} value={es.id}>
                      {es.subject?.name} ({es.section?.name}) - {es.exam?.name}
                    </option>
                  ))
                )}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" size={16} />
            </div>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">Entry Mode:</span>
            <div className="flex border border-slate-300 rounded-lg overflow-hidden">
              <button
                onClick={() => setEntryMode('manual')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  entryMode === 'manual' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Pencil size={16} className="inline mr-1" /> Manual
              </button>
              <button
                onClick={() => setEntryMode('voice')}
                disabled={!voiceSupported}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  entryMode === 'voice' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
                } disabled:opacity-50`}
              >
                <Mic size={16} className="inline mr-1" /> Voice
              </button>
            </div>
          </div>
        </div>

        {selectedExamSubject && (
          <div className="mt-3 flex items-center gap-4 text-sm text-slate-500">
            <span>Questions: {selectedExamSubject.num_questions}</span>
            <span>Max Marks/Q: {selectedExamSubject.max_marks_per_question}</span>
            <span>Total Marks: {selectedExamSubject.num_questions * selectedExamSubject.max_marks_per_question}</span>
          </div>
        )}
      </div>

      {/* Voice Entry Panel */}
      {entryMode === 'voice' && (
        <div className="bg-gradient-to-r from-teal-50 to-cyan-50 rounded-xl border border-teal-200 p-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={isListening ? stopListening : startListening}
                disabled={activeStudentIndex === null}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
                  isListening
                    ? 'bg-red-500 text-white hover:bg-red-600'
                    : 'bg-teal-600 text-white hover:bg-teal-700'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isListening ? (
                  <>
                    <MicOff size={24} className="animate-pulse" />
                    <span>Stop Listening</span>
                  </>
                ) : (
                  <>
                    <Mic size={24} />
                    <span>Start Listening</span>
                  </>
                )}
              </button>
              {activeStudentIndex !== null && (
                <div className="text-slate-700">
                  <span className="text-sm">Active Student:</span>
                  <span className="ml-2 font-medium">{students[activeStudentIndex]?.name}</span>
                  <span className="ml-2 text-slate-500">({students[activeStudentIndex]?.roll_number})</span>
                </div>
              )}
            </div>
            {!voiceSupported && (
              <div className="text-amber-700 text-sm flex items-center gap-2">
                <AlertCircle size={16} />
                Voice entry is not supported in this browser.
              </div>
            )}
          </div>

          {isListening && (
            <div className="mt-4 flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                <span className="text-slate-700 font-medium">Listening...</span>
              </div>
              <span className="text-slate-500 text-sm">Speak marks for {selectedExamSubject?.num_questions || 0} questions (e.g., "8 9 7 10 8")</span>
            </div>
          )}

          {/* Raw Transcript Display */}
          {rawTranscript && !isListening && (
            <div className="mt-4 bg-slate-100 rounded-xl border border-slate-200 p-3">
              <div className="flex items-center gap-2 text-slate-600 text-sm">
                <MessageSquare size={16} />
                <span className="font-medium">Raw Speech:</span>
                <span className="font-mono text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">"{rawTranscript}"</span>
              </div>
              {parseDebugInfo && (
                <div className="mt-2 text-xs text-slate-500">
                  <span>Tokens: [{parseDebugInfo.tokens.join(', ')}]</span>
                </div>
              )}
            </div>
          )}

          {/* Detection Preview */}
          {detectedMarks && !isListening && (
            <div className="mt-4 bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-slate-800">Recognized Marks - Please Confirm</h3>
                <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
                  Total: {detectedMarks.reduce((sum, m) => sum + (m === 'AB' ? 0 : m), 0)}
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mb-4">
                {detectedMarks.map((m, i) => (
                  <div key={i} className="flex flex-col items-center bg-slate-100 rounded-lg px-4 py-2">
                    <span className="text-xs text-slate-500">Q{i + 1}</span>
                    <span className={`text-lg font-bold ${m === 'AB' ? 'text-amber-600' : 'text-slate-800'}`}>
                      {m === 'AB' ? 'AB' : m}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleConfirmMarks}
                  disabled={saving}
                  className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
                >
                  <Check size={18} />
                  {saving ? 'Saving...' : 'Confirm'} <kbd className="bg-emerald-700 px-2 py-0.5 rounded text-xs">Enter</kbd>
                </button>
                <button
                  onClick={handleRetry}
                  className="flex items-center gap-2 bg-amber-100 text-amber-700 px-5 py-2.5 rounded-lg hover:bg-amber-200 transition-colors"
                >
                  <RotateCcw size={18} />
                  Retry <kbd className="bg-amber-200 px-2 py-0.5 rounded text-xs">Ctrl+R</kbd>
                </button>
                <button
                  onClick={handleManualEdit}
                  className="flex items-center gap-2 bg-slate-100 text-slate-700 px-5 py-2.5 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  <Pencil size={18} />
                  Edit Manually
                </button>
              </div>
            </div>
          )}

          {voiceError && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="text-red-500 mt-0.5" size={20} />
                <div className="flex-1">
                  <p className="font-medium text-red-800">Recognition Error</p>
                  <p className="text-red-600 text-sm mt-1">{voiceError}</p>
                  {rawTranscript && (
                    <p className="text-red-500 text-xs mt-2">
                      Raw speech: <span className="font-mono bg-red-100 px-1 rounded">"{rawTranscript}"</span>
                    </p>
                  )}
                  {parseDebugInfo && parseDebugInfo.detectedMarks.length > 0 && (
                    <p className="text-red-500 text-xs mt-1">
                      Detected: [{parseDebugInfo.detectedMarks.join(', ')}] (Expected: {parseDebugInfo.expectedCount})
                    </p>
                  )}
                </div>
                <button onClick={handleRetry} className="flex items-center gap-1 bg-red-100 text-red-700 px-3 py-1.5 rounded-lg text-sm hover:bg-red-200 transition-colors">
                  <RotateCcw size={14} />
                  Retry
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Marks Entry Grid */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden" ref={tableRef}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-100 border-b-2 border-slate-200">
              <tr>
                <th className="sticky left-0 bg-slate-100 px-4 py-3 text-left font-semibold text-slate-700 min-w-[140px]">Student</th>
                {Array.from({ length: selectedExamSubject?.num_questions || 5 }).map((_, i) => (
                  <th key={i} className="px-3 py-3 text-center font-semibold text-slate-700 min-w-[60px]">
                    Q{i + 1}
                    <span className="block text-xs font-normal text-slate-400">/{selectedExamSubject?.max_marks_per_question}</span>
                  </th>
                ))}
                <th className="px-4 py-3 text-right font-semibold text-slate-700 min-w-[80px]">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {students.length === 0 ? (
                <tr>
                  <td colSpan={(selectedExamSubject?.num_questions || 5) + 2} className="text-center py-12 text-slate-500">
                    No students found for this section.
                  </td>
                </tr>
              ) : (
                students.map((student, studentIndex) => (
                  <tr
                    key={student.id}
                    onClick={() => setActiveStudentIndex(studentIndex)}
                    className={`cursor-pointer transition-colors ${
                      activeStudentIndex === studentIndex
                        ? 'bg-blue-50 ring-2 ring-blue-300 ring-inset'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="sticky left-0 px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            activeStudentIndex === studentIndex ? 'bg-blue-500' : 'bg-slate-300'
                          }`}
                        />
                        <div>
                          <div className="font-medium text-slate-800">{student.name}</div>
                          <div className="text-xs text-slate-500">{student.roll_number}</div>
                        </div>
                      </div>
                    </td>
                    {student.marks.map((mark, questionIndex) => {
                      const detected = activeStudentIndex === studentIndex ? detectedMarks?.[questionIndex] : undefined;
                      const displayValue = getCellDisplayValue(mark, detected);
                      const isEditing = editingCell?.studentIndex === studentIndex && editingCell?.questionIndex === questionIndex;

                      return (
                        <td
                          key={questionIndex}
                          className={`px-3 py-2 text-center ${getCellBgColor(mark, activeStudentIndex === studentIndex, detected)}`}
                          onClick={(e) => {
                            if (entryMode === 'manual') {
                              e.stopPropagation();
                              setEditingCell({ studentIndex, questionIndex });
                            }
                          }}
                        >
                          {isEditing ? (
                            <input
                              type="text"
                              defaultValue={displayValue}
                              autoFocus
                              className="w-12 text-center border border-blue-400 rounded px-1 py-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              onBlur={(e) => handleCellEdit(studentIndex, questionIndex, e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleCellEdit(studentIndex, questionIndex, e.currentTarget.value);
                                }
                                if (e.key === 'Escape') {
                                  setEditingCell(null);
                                }
                                if (e.key === 'Tab') {
                                  e.preventDefault();
                                  if (e.shiftKey) {
                                    setEditingCell({ studentIndex: studentIndex, questionIndex: questionIndex - 1 < 0 ? (selectedExamSubject?.num_questions || 5) - 1 : questionIndex - 1 });
                                  } else {
                                    setEditingCell({ studentIndex: studentIndex, questionIndex: (questionIndex + 1) % (selectedExamSubject?.num_questions || 5) });
                                  }
                                }
                              }}
                            />
                          ) : (
                            <span
                              className={`inline-block w-12 text-center ${
                                detected !== undefined
                                  ? 'font-bold text-blue-700'
                                  : mark?.is_absent
                                  ? 'text-amber-600 font-medium'
                                  : mark?.marks_obtained !== null
                                  ? 'text-slate-700 font-medium'
                                  : 'text-slate-300'
                              }`}
                            >
                              {displayValue || '-'}
                            </span>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-4 py-3 text-right">
                      <span className="font-semibold text-slate-700">
                        {student.total !== null ? student.total : '-'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between text-sm text-slate-500">
        <div>
          {students.length} students |{' '}
          {students.filter((s) => s.total !== null).length} evaluated
        </div>
        {entryMode === 'voice' && (
          <div className="flex items-center gap-4">
            <span>Voice entries: {analytics?.total_voice_entries || 0}</span>
            <span>Manual entries: {analytics?.total_manual_entries || 0}</span>
          </div>
        )}
      </div>
    </div>
  );
}
