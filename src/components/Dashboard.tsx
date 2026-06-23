import { useEffect, useState } from 'react';
import { Users, BookOpen, GraduationCap, Mic, HandMetal, BarChart2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Stats {
  sections: number;
  subjects: number;
  students: number;
  exams: number;
  voiceEntries: number;
  manualEntries: number;
}

export function Dashboard() {
  const [stats, setStats] = useState<Stats>({
    sections: 0,
    subjects: 0,
    students: 0,
    exams: 0,
    voiceEntries: 0,
    manualEntries: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    try {
      const [sectionsRes, subjectsRes, studentsRes, examsRes, marksRes] = await Promise.all([
        supabase.from('sections').select('id', { count: 'exact', head: true }),
        supabase.from('subjects').select('id', { count: 'exact', head: true }),
        supabase.from('students').select('id', { count: 'exact', head: true }),
        supabase.from('exams').select('id', { count: 'exact', head: true }),
        supabase.from('marks').select('entry_mode'),
      ]);

      let voiceTotal = 0;
      let manualTotal = 0;
      if (marksRes.data) {
        for (const row of marksRes.data) {
          if (row.entry_mode === 'voice') voiceTotal++;
          else if (row.entry_mode === 'manual') manualTotal++;
        }
      }

      setStats({
        sections: sectionsRes.count || 0,
        subjects: subjectsRes.count || 0,
        students: studentsRes.count || 0,
        exams: examsRes.count || 0,
        voiceEntries: voiceTotal,
        manualEntries: manualTotal,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  }

  const statCards = [
    { label: 'Sections', value: stats.sections, icon: <Users className="text-blue-600" size={24} />, bg: 'bg-blue-50' },
    { label: 'Subjects', value: stats.subjects, icon: <BookOpen className="text-emerald-600" size={24} />, bg: 'bg-emerald-50' },
    { label: 'Students', value: stats.students, icon: <Users className="text-purple-600" size={24} />, bg: 'bg-purple-50' },
    { label: 'Exams', value: stats.exams, icon: <GraduationCap className="text-orange-600" size={24} />, bg: 'bg-orange-50' },
    { label: 'Voice Entries', value: stats.voiceEntries, icon: <Mic className="text-teal-600" size={24} />, bg: 'bg-teal-50' },
    { label: 'Manual Entries', value: stats.manualEntries, icon: <HandMetal className="text-rose-600" size={24} />, bg: 'bg-rose-50' },
  ];

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
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-slate-500 mt-1">Overview of your marks entry system</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                <p className="text-3xl font-bold text-slate-800 mt-1">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-lg ${stat.bg}`}>{stat.icon}</div>
            </div>
          </div>
        ))}
      </div>

      {(stats.sections === 0 || stats.subjects === 0) && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
          <h3 className="font-semibold text-amber-800 mb-2">Getting Started</h3>
          <p className="text-amber-700 text-sm">
            Start by creating some Sections and Subjects, then add Students. After that, create an Exam and configure
            Exam Subjects to start entering marks.
          </p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
          <BarChart2 size={20} />
          Quick Stats
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-50 rounded-lg p-4">
            <p className="text-sm text-slate-500">Voice Recognition Success Rate</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">
              {stats.voiceEntries + stats.manualEntries > 0
                ? Math.round((stats.voiceEntries / (stats.voiceEntries + stats.manualEntries)) * 100)
                : 0}
              %
            </p>
          </div>
          <div className="bg-slate-50 rounded-lg p-4">
            <p className="text-sm text-slate-500">Total Entries Made</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{stats.voiceEntries + stats.manualEntries}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
