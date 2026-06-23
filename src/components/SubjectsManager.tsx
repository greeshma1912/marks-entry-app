import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, X, Check, BookOpen } from 'lucide-react';
import { getSubjects, createSubject, updateSubject, deleteSubject } from '../lib/database';
import type { Subject } from '../lib/types';

export function SubjectsManager() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editCode, setEditCode] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCode, setNewCode] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSubjects();
  }, []);

  async function loadSubjects() {
    try {
      const data = await getSubjects();
      setSubjects(data);
    } catch (error) {
      console.error('Error loading subjects:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddSubject() {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      const subject = await createSubject(newName.trim(), newCode.trim() || undefined);
      setSubjects([...subjects, subject]);
      setNewName('');
      setNewCode('');
      setShowAddForm(false);
    } catch (error) {
      console.error('Error creating subject:', error);
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateSubject(id: string) {
    if (!editName.trim()) return;
    setSaving(true);
    try {
      const updated = await updateSubject(id, editName.trim(), editCode.trim() || undefined);
      setSubjects(subjects.map((s) => (s.id === id ? updated : s)));
      setEditingId(null);
    } catch (error) {
      console.error('Error updating subject:', error);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteSubject(id: string) {
    if (!confirm('Are you sure you want to delete this subject?')) return;
    try {
      await deleteSubject(id);
      setSubjects(subjects.filter((s) => s.id !== id));
    } catch (error) {
      console.error('Error deleting subject:', error);
    }
  }

  function startEditing(subject: Subject) {
    setEditingId(subject.id);
    setEditName(subject.name);
    setEditCode(subject.code || '');
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Subjects</h1>
          <p className="text-slate-500 mt-1">Manage course subjects</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} />
          Add Subject
        </button>
      </div>

      {showAddForm && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h3 className="font-medium text-slate-800 mb-3">New Subject</h3>
          <div className="flex gap-3">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Subject name (e.g., Physics, Mathematics)"
              className="flex-1 border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyDown={(e) => e.key === 'Enter' && handleAddSubject()}
            />
            <input
              type="text"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
              placeholder="Code (optional)"
              className="w-40 border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleAddSubject}
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

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {subjects.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <BookOpen className="mx-auto mb-3 opacity-50" size={48} />
            <p>No subjects yet. Create your first subject to get started.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Name</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Code</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Created</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {subjects.map((subject) => (
                <tr key={subject.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    {editingId === subject.id ? (
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="border border-slate-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleUpdateSubject(subject.id);
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        autoFocus
                      />
                    ) : (
                      <span className="font-medium text-slate-800">{subject.name}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {editingId === subject.id ? (
                      <input
                        type="text"
                        value={editCode}
                        onChange={(e) => setEditCode(e.target.value)}
                        className="border border-slate-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 w-24"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleUpdateSubject(subject.id);
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                      />
                    ) : (
                      <span className="text-slate-500">{subject.code || '-'}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500">{new Date(subject.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {editingId === subject.id ? (
                        <>
                          <button
                            onClick={() => handleUpdateSubject(subject.id)}
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
                          <button onClick={() => startEditing(subject)} className="p-1.5 text-slate-500 hover:bg-slate-100 rounded transition-colors">
                            <Pencil size={18} />
                          </button>
                          <button onClick={() => handleDeleteSubject(subject.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors">
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
        )}
      </div>
    </div>
  );
}
