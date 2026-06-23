import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, X, Check, Users, ChevronDown } from 'lucide-react';
import { getStudents, getSections, createStudent, updateStudent, deleteStudent } from '../lib/database';
import type { Student, Section } from '../lib/types';

export function StudentsManager() {
  const [students, setStudents] = useState<Student[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSection, setSelectedSection] = useState<string>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRollNumber, setEditRollNumber] = useState('');
  const [editName, setEditName] = useState('');
  const [editSectionId, setEditSectionId] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRollNumber, setNewRollNumber] = useState('');
  const [newName, setNewName] = useState('');
  const [newSectionId, setNewSectionId] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSections();
  }, []);

  async function loadSections() {
    try {
      const data = await getSections();
      setSections(data);
      if (data.length > 0) {
        setNewSectionId(data[0].id);
      }
      await loadStudents();
    } catch (error) {
      console.error('Error loading sections:', error);
      setLoading(false);
    }
  }

  async function loadStudents() {
    try {
      const data = await getStudents(selectedSection === 'all' ? undefined : selectedSection);
      setStudents(data);
    } catch (error) {
      console.error('Error loading students:', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (sections.length > 0) {
      loadStudents();
    }
  }, [selectedSection]);

  async function handleAddStudent() {
    if (!newRollNumber.trim() || !newName.trim() || !newSectionId) return;
    setSaving(true);
    try {
      const student = await createStudent(newRollNumber.trim(), newName.trim(), newSectionId);
      if (selectedSection === 'all' || selectedSection === newSectionId) {
        setStudents([...students, student]);
      }
      setNewRollNumber('');
      setNewName('');
      if (sections.length > 0) {
        setNewSectionId(sections[0].id);
      }
      setShowAddForm(false);
    } catch (error) {
      console.error('Error creating student:', error);
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateStudent(id: string) {
    if (!editRollNumber.trim() || !editName.trim() || !editSectionId) return;
    setSaving(true);
    try {
      const updated = await updateStudent(id, editRollNumber.trim(), editName.trim(), editSectionId);
      setStudents(students.map((s) => (s.id === id ? updated : s)));
      setEditingId(null);
    } catch (error) {
      console.error('Error updating student:', error);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteStudent(id: string) {
    if (!confirm('Are you sure you want to delete this student?')) return;
    try {
      await deleteStudent(id);
      setStudents(students.filter((s) => s.id !== id));
    } catch (error) {
      console.error('Error deleting student:', error);
    }
  }

  function startEditing(student: Student) {
    setEditingId(student.id);
    setEditRollNumber(student.roll_number);
    setEditName(student.name);
    setEditSectionId(student.section_id);
  }

  function getSectionName(sectionId: string) {
    return sections.find((s) => s.id === sectionId)?.name || '-';
  }

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
          <h1 className="text-2xl font-bold text-slate-800">Students</h1>
          <p className="text-slate-500 mt-1">Manage student records</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="appearance-none bg-white border border-slate-300 rounded-lg px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Sections</option>
              {sections.map((section) => (
                <option key={section.id} value={section.id}>
                  Section {section.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" size={16} />
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={20} />
            Add Student
          </button>
        </div>
      </div>

      {showAddForm && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h3 className="font-medium text-slate-800 mb-3">New Student</h3>
          <div className="flex flex-wrap gap-3">
            <input
              type="text"
              value={newRollNumber}
              onChange={(e) => setNewRollNumber(e.target.value)}
              placeholder="Roll Number"
              className="w-40 border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyDown={(e) => e.key === 'Enter' && handleAddStudent()}
            />
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Student Name"
              className="flex-1 min-w-[200px] border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyDown={(e) => e.key === 'Enter' && handleAddStudent()}
            />
            <div className="relative">
              <select
                value={newSectionId}
                onChange={(e) => setNewSectionId(e.target.value)}
                className="appearance-none bg-white border border-slate-300 rounded-lg px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {sections.map((section) => (
                  <option key={section.id} value={section.id}>
                    Section {section.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" size={16} />
            </div>
            <button
              onClick={handleAddStudent}
              disabled={saving || !newRollNumber.trim() || !newName.trim()}
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

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {students.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <Users className="mx-auto mb-3 opacity-50" size={48} />
            <p>No students yet. Add your first student to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Roll No</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Section</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Created</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {students.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      {editingId === student.id ? (
                        <input
                          type="text"
                          value={editRollNumber}
                          onChange={(e) => setEditRollNumber(e.target.value)}
                          className="border border-slate-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 w-24"
                          autoFocus
                        />
                      ) : (
                        <span className="font-mono font-medium text-slate-800">{student.roll_number}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {editingId === student.id ? (
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="border border-slate-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
                        />
                      ) : (
                        <span className="text-slate-800">{student.name}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {editingId === student.id ? (
                        <select
                          value={editSectionId}
                          onChange={(e) => setEditSectionId(e.target.value)}
                          className="appearance-none bg-white border border-slate-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {sections.map((section) => (
                            <option key={section.id} value={section.id}>
                              {section.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-slate-500">{getSectionName(student.section_id)}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">{new Date(student.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {editingId === student.id ? (
                          <>
                            <button
                              onClick={() => handleUpdateStudent(student.id)}
                              disabled={saving}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                            >
                              <Check size={18} />
                            </button>
                            <button onClick={() => setEditingId(null)} className="p-1.5 text-slate-500 hover:bg-slate-100 rounded transition-colors">
                              <X size={18} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => startEditing(student)} className="p-1.5 text-slate-500 hover:bg-slate-100 rounded transition-colors">
                              <Pencil size={18} />
                            </button>
                            <button onClick={() => handleDeleteStudent(student.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors">
                              <Trash2 size={18} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
