import { ReactNode } from 'react';
import { LayoutDashboard, Users, BookOpen, GraduationCap, Mic, BarChart3, Menu, X, LogOut, Shield, UserCircle } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../lib/auth';

interface NavItem {
  id: string;
  label: string;
  icon: ReactNode;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
  { id: 'sections', label: 'Sections', icon: <Users size={20} />, adminOnly: true },
  { id: 'subjects', label: 'Subjects', icon: <BookOpen size={20} />, adminOnly: true },
  { id: 'students', label: 'Students', icon: <Users size={20} />, adminOnly: true },
  { id: 'exams', label: 'Exams', icon: <GraduationCap size={20} />, adminOnly: true },
  { id: 'marks', label: 'Marks Entry', icon: <Mic size={20} /> },
  { id: 'reports', label: 'Reports', icon: <BarChart3 size={20} /> },
];

interface LayoutProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  children: ReactNode;
}

export function Layout({ currentPage, onNavigate, children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, signOut, isAdmin } = useAuth();

  const filteredNavItems = navItems.filter(item => !item.adminOnly || isAdmin);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile header */}
      <header className="lg:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <button onClick={() => setSidebarOpen(true)} className="p-2 hover:bg-slate-100 rounded-lg">
          <Menu size={24} />
        </button>
        <h1 className="font-semibold text-slate-800">Marks Entry System</h1>
        <div className="flex items-center gap-2">
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full capitalize">
            {user?.role}
          </span>
        </div>
      </header>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-white border-r border-slate-200 z-50 transform transition-transform duration-300 lg:translate-x-0 flex flex-col ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg p-1.5">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-lg font-bold text-slate-800">Marks Entry</h1>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="p-2 hover:bg-slate-100 rounded-lg lg:hidden">
            <X size={20} />
          </button>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {filteredNavItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                onNavigate(item.id);
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                currentPage === item.id
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* User section */}
        <div className="border-t border-slate-200 p-3">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="flex-shrink-0">
              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <span className="text-white text-sm font-semibold">
                  {user?.full_name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800 truncate">{user?.full_name || 'User'}</p>
              <div className="flex items-center gap-1.5">
                {isAdmin ? (
                  <Shield className="h-3 w-3 text-blue-600" />
                ) : (
                  <UserCircle className="h-3 w-3 text-slate-400" />
                )}
                <span className="text-xs text-slate-500 capitalize">{user?.role}</span>
              </div>
            </div>
          </div>
          <button
            onClick={signOut}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
          >
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="lg:pl-64">
        <div className="p-4 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
