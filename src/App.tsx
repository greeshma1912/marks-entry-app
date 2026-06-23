import { useState } from 'react';
import { AuthProvider, useAuth } from './lib/auth';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { SectionsManager } from './components/SectionsManager';
import { SubjectsManager } from './components/SubjectsManager';
import { StudentsManager } from './components/StudentsManager';
import { ExamsManager } from './components/ExamsManager';
import { MarksEntry } from './components/MarksEntry';
import { Reports } from './components/Reports';
import { LoginPage } from './components/Auth';

function AppContent() {
  const { user, loading, isAdmin } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="h-16 w-16 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin mx-auto" />
            <div className="h-12 w-12 rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin mx-auto absolute top-2 left-1/2 -translate-x-1/2" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
          </div>
          <p className="mt-4 text-slate-600 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  function renderPage() {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'sections':
        return isAdmin ? <SectionsManager /> : <Dashboard />;
      case 'subjects':
        return isAdmin ? <SubjectsManager /> : <Dashboard />;
      case 'students':
        return isAdmin ? <StudentsManager /> : <Dashboard />;
      case 'exams':
        return isAdmin ? <ExamsManager /> : <Dashboard />;
      case 'marks':
        return <MarksEntry />;
      case 'reports':
        return <Reports />;
      default:
        return <Dashboard />;
    }
  }

  return (
    <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
      {renderPage()}
    </Layout>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
