import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Users, BookOpenCheck, BarChart3, Menu, X, Lock, User, LogOut, Bell, BookOpen, Shield, FileText } from 'lucide-react';
import { Student, HomeworkRecord, Notice, ClassModule, TeamRule, Exam } from './types';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import Dashboard from './components/Dashboard';
import StudentManager from './components/StudentManager';
import HomeworkTracker from './components/HomeworkTracker';
import Reports from './components/Reports';
import NoticeBoard from './components/NoticeBoard';
import ClassModuleBoard from './components/ClassModuleBoard';
import TeamRulesBoard from './components/TeamRulesBoard';
import ExamTracker from './components/ExamTracker';

const ADMIN_PASSWORD = 'B12ACS';

export default function App() {
  const [role, setRole] = useState<'admin' | 'student' | null>(() => {
    const savedRole = localStorage.getItem('hw_role') as 'admin' | 'student' | null;
    if (savedRole === 'admin') {
      const token = localStorage.getItem('hw_admin_token');
      if (token !== ADMIN_PASSWORD) {
        localStorage.removeItem('hw_role');
        localStorage.removeItem('hw_admin_token');
        return null;
      }
    }
    return savedRole;
  });
  const [pin, setPin] = useState('');
  const [loginError, setLoginError] = useState('');
  const [studentRoll, setStudentRoll] = useState('');
  const [studentLoginError, setStudentLoginError] = useState('');

  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const [students, setStudents] = useState<Student[]>([]);
  const [records, setRecords] = useState<HomeworkRecord[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [modules, setModules] = useState<ClassModule[]>([]);
  const [rules, setRules] = useState<TeamRule[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);

  useEffect(() => {
    if (role) {
      localStorage.setItem('hw_role', role);
    } else {
      localStorage.removeItem('hw_role');
    }
  }, [role]);

  useEffect(() => {
    if (!db) return;

    const unsubStudents = onSnapshot(collection(db, 'students'), (snapshot) => {
      const studentsData = snapshot.docs.map(doc => doc.data() as Student);
      setStudents(studentsData);
    }, (error) => {
      console.error("Firestore error (students):", error);
    });

    return () => unsubStudents();
  }, []);

  useEffect(() => {
    if (!db || !role) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const unsubRecords = onSnapshot(collection(db, 'records'), (snapshot) => {
      const recordsData = snapshot.docs.map(doc => doc.data() as HomeworkRecord);
      setRecords(recordsData);
      setIsLoading(false);
    }, (error) => {
      console.error("Firestore error (records):", error);
      setIsLoading(false);
    });

    const unsubNotices = onSnapshot(collection(db, 'notices'), (snapshot) => {
      const noticesData = snapshot.docs.map(doc => doc.data() as Notice);
      setNotices(noticesData.sort((a, b) => b.timestamp - a.timestamp));
    }, (error) => {
      console.error("Firestore error (notices):", error);
    });

    const unsubModules = onSnapshot(collection(db, 'modules'), (snapshot) => {
      const modulesData = snapshot.docs.map(doc => doc.data() as ClassModule);
      setModules(modulesData.sort((a, b) => b.timestamp - a.timestamp));
    }, (error) => {
      console.error("Firestore error (modules):", error);
    });

    const unsubRules = onSnapshot(collection(db, 'rules'), (snapshot) => {
      const rulesData = snapshot.docs.map(doc => doc.data() as TeamRule);
      setRules(rulesData.sort((a, b) => a.timestamp - b.timestamp));
    }, (error) => {
      console.error("Firestore error (rules):", error);
    });

    const unsubExams = onSnapshot(collection(db, 'exams'), (snapshot) => {
      const examsData = snapshot.docs.map(doc => doc.data() as Exam);
      setExams(examsData.sort((a, b) => b.timestamp - a.timestamp));
    }, (error) => {
      console.error("Firestore error (exams):", error);
    });

    return () => {
      unsubRecords();
      unsubNotices();
      unsubModules();
      unsubRules();
      unsubExams();
    };
  }, [role]);

  if (!db) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full border border-gray-100 text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Firebase Setup Required</h1>
          <p className="text-gray-600 mb-4">
            আপনার অ্যাপটি ডাটাবেসের সাথে কানেক্ট করা নেই। দয়া করে <b>.env</b> ফাইলে Firebase কনফিগারেশন যুক্ত করুন।
          </p>
        </div>
      </div>
    );
  }

  const handleStudentLogin = () => {
    if (!studentRoll.trim()) {
      setStudentLoginError('দয়া করে আপনার রোল নম্বর দিন!');
      return;
    }
    
    const studentExists = students.some(s => s.roll === studentRoll.trim());
    
    if (studentExists) {
      setRole('student');
      setActiveTab('dashboard');
    } else {
      setStudentLoginError('এই রোল নম্বরটি তালিকায় পাওয়া যায়নি!');
    }
  };

  // --- Login Screen ---
  if (!role) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full border border-gray-100">
          <div className="text-center mb-8">
            <div className="bg-indigo-100 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner">
              <BookOpenCheck className="w-10 h-10 text-indigo-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Homework Tracker</h1>
            <p className="text-gray-500 mt-2 text-sm">আপনার অ্যাকাউন্ট টাইপ নির্বাচন করুন</p>
          </div>

          <div className="space-y-5">
            {/* Admin Login */}
            <div className="border border-gray-200 p-5 rounded-2xl bg-gray-50/50">
              <h3 className="font-semibold flex items-center text-gray-800 mb-4">
                <Lock className="w-4 h-4 mr-2 text-indigo-600" /> শিক্ষক / অ্যাডমিন
              </h3>
              <div className="flex flex-col space-y-3">
                <input 
                  type="password" 
                  placeholder="অ্যাডমিন পাসওয়ার্ড দিন" 
                  value={pin}
                  onChange={(e) => {setPin(e.target.value); setLoginError('');}}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if(pin === ADMIN_PASSWORD) {
                        setRole('admin');
                        localStorage.setItem('hw_admin_token', ADMIN_PASSWORD);
                      }
                      else setLoginError('ভুল পাসওয়ার্ড!');
                    }
                  }}
                />
                <button 
                  onClick={() => {
                    if(pin === ADMIN_PASSWORD) {
                      setRole('admin');
                      localStorage.setItem('hw_admin_token', ADMIN_PASSWORD);
                    }
                    else setLoginError('ভুল পাসওয়ার্ড!');
                  }}
                  className="w-full bg-indigo-600 text-white px-4 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors font-medium shadow-sm"
                >
                  লগইন করুন
                </button>
              </div>
              {loginError && <p className="text-red-500 text-sm mt-3 text-center font-medium">{loginError}</p>}
            </div>

            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-gray-200"></div>
              <span className="flex-shrink-0 mx-4 text-gray-400 text-sm">অথবা</span>
              <div className="flex-grow border-t border-gray-200"></div>
            </div>

            {/* Student Login */}
            <div className="border border-gray-200 p-5 rounded-2xl bg-gray-50/50">
              <h3 className="font-semibold flex items-center text-gray-800 mb-4">
                <User className="w-4 h-4 mr-2 text-emerald-600" /> ছাত্র
              </h3>
              <div className="flex flex-col space-y-3">
                <input 
                  type="text" 
                  placeholder="আপনার রোল নম্বর দিন" 
                  value={studentRoll}
                  onChange={(e) => {setStudentRoll(e.target.value); setStudentLoginError('');}}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleStudentLogin();
                    }
                  }}
                />
                <button 
                  onClick={handleStudentLogin}
                  className="w-full bg-emerald-600 text-white px-4 py-2.5 rounded-xl hover:bg-emerald-700 transition-colors font-medium shadow-sm"
                >
                  লগইন করুন
                </button>
              </div>
              {studentLoginError && <p className="text-red-500 text-sm mt-3 text-center font-medium">{studentLoginError}</p>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;
  }

  const allNavItems = [
    { id: 'dashboard', label: 'ড্যাশবোর্ড', icon: <LayoutDashboard className="w-5 h-5" />, roles: ['admin', 'student'] },
    { id: 'notices', label: 'নোটিশ', icon: <Bell className="w-5 h-5" />, roles: ['admin', 'student'] },
    { id: 'modules', label: 'ক্লাস মডিউল', icon: <BookOpen className="w-5 h-5" />, roles: ['admin', 'student'] },
    { id: 'rules', label: 'টিমের নিয়মকানুন', icon: <Shield className="w-5 h-5" />, roles: ['admin', 'student'] },
    { id: 'exams', label: 'পরীক্ষা', icon: <FileText className="w-5 h-5" />, roles: ['admin', 'student'] },
    { id: 'students', label: 'ছাত্র', icon: <Users className="w-5 h-5" />, roles: ['admin'] },
    { id: 'homework', label: 'হোমওয়ার্ক', icon: <BookOpenCheck className="w-5 h-5" />, roles: ['admin'] },
    { id: 'reports', label: 'রিপোর্ট', icon: <BarChart3 className="w-5 h-5" />, roles: ['admin', 'student'] },
  ];

  const navItems = allNavItems.filter(item => item.roles.includes(role));

  const handleLogout = () => {
    setRole(null);
    setPin('');
    setStudentRoll('');
    setActiveTab('dashboard');
    localStorage.removeItem('hw_admin_token');
    localStorage.removeItem('hw_role');
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard students={students} records={records} onNavigate={setActiveTab} />;
      case 'notices':
        return <NoticeBoard notices={notices} role={role} />;
      case 'modules':
        return <ClassModuleBoard modules={modules} role={role} />;
      case 'rules':
        return <TeamRulesBoard rules={rules} role={role} />;
      case 'exams':
        return <ExamTracker students={students} exams={exams} role={role} />;
      case 'students':
        return role === 'admin' ? <StudentManager students={students} /> : null;
      case 'homework':
        return role === 'admin' ? <HomeworkTracker students={students} records={records} /> : null;
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
        
        <div className="px-6 py-4 bg-indigo-950/50 border-b border-indigo-800/50 flex items-center justify-between">
          <span className="text-sm font-medium text-indigo-200">
            {role === 'admin' ? 'অ্যাডমিন মোড' : 'স্টুডেন্ট মোড (Read-only)'}
          </span>
          {role === 'admin' ? <Lock className="w-4 h-4 text-indigo-400" /> : <User className="w-4 h-4 text-emerald-400" />}
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
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
        
        <div className="p-4 border-t border-indigo-800/50">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-indigo-950 text-indigo-200 hover:text-white hover:bg-red-600/80 rounded-xl transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">লগআউট করুন</span>
          </button>
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
