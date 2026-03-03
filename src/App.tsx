import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Users, BookOpenCheck, BarChart3, Menu, X } from 'lucide-react';
import { Student, HomeworkRecord } from './types';
import Dashboard from './components/Dashboard';
import StudentManager from './components/StudentManager';
import HomeworkTracker from './components/HomeworkTracker';
import Reports from './components/Reports';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const [students, setStudents] = useState<Student[]>(() => {
    const saved = localStorage.getItem('hw_students');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [records, setRecords] = useState<HomeworkRecord[]>(() => {
    const saved = localStorage.getItem('hw_records');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('hw_students', JSON.stringify(students));
  }, [students]);

  useEffect(() => {
    localStorage.setItem('hw_records', JSON.stringify(records));
  }, [records]);

  const navItems = [
    { id: 'dashboard', label: 'ড্যাশবোর্ড', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'students', label: 'ছাত্র', icon: <Users className="w-5 h-5" /> },
    { id: 'homework', label: 'হোমওয়ার্ক', icon: <BookOpenCheck className="w-5 h-5" /> },
    { id: 'reports', label: 'রিপোর্ট', icon: <BarChart3 className="w-5 h-5" /> },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard students={students} records={records} onNavigate={setActiveTab} />;
      case 'students':
        return <StudentManager students={students} setStudents={setStudents} />;
      case 'homework':
        return <HomeworkTracker students={students} records={records} setRecords={setRecords} />;
      case 'reports':
        return <Reports students={students} records={records} />;
      default:
        return <Dashboard students={students} records={records} onNavigate={setActiveTab} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row font-sans">
      {/* Mobile Header */}
      <div className="md:hidden bg-indigo-900 text-white p-4 flex justify-between items-center shadow-md z-20 relative">
        <h1 className="text-xl font-bold flex items-center">
          <BookOpenCheck className="w-6 h-6 mr-2 text-indigo-300" />
          Homework Tracker
        </h1>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2">
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar */}
      <div className={`
        fixed md:static inset-y-0 left-0 transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0 transition duration-200 ease-in-out z-30
        w-64 bg-indigo-900 text-white flex flex-col shadow-xl md:shadow-none
      `}>
        <div className="p-6 hidden md:flex items-center border-b border-indigo-800/50">
          <div className="bg-indigo-800 p-2 rounded-xl mr-3">
            <BookOpenCheck className="w-6 h-6 text-indigo-200" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">Homework<br/>Tracker</h1>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-2 mt-16 md:mt-0">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setIsMobileMenuOpen(false);
              }}
              className={`w-full flex items-center space-x-3 px-4 py-3.5 rounded-xl transition-all ${
                activeTab === item.id 
                  ? 'bg-indigo-600 text-white shadow-md' 
                  : 'text-indigo-200 hover:bg-indigo-800 hover:text-white'
              }`}
            >
              {item.icon}
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>
        
        <div className="p-4 border-t border-indigo-800/50 text-center text-indigo-300/60 text-xs">
          শিক্ষকদের জন্য সহজ সমাধান
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden h-screen">
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-[#f8fafc] p-4 md:p-8">
          <div className="max-w-5xl mx-auto">
            {renderContent()}
          </div>
        </main>
      </div>
      
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 md:hidden backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </div>
  );
}
