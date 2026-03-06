import React, { useState, useEffect } from 'react';
import { Student, HomeworkRecord } from '../types';
import { Calendar as CalendarIcon, CheckCircle2, XCircle, Search, Trash2 } from 'lucide-react';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface Props {
  students: Student[];
  records: HomeworkRecord[];
}

export default function HomeworkTracker({ students, records }: Props) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [currentSubmissions, setCurrentSubmissions] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeleteSuccess, setShowDeleteSuccess] = useState(false);

  useEffect(() => {
    const record = records.find(r => r.date === date);
    if (record) {
      setCurrentSubmissions(record.submissions);
    } else {
      const initial: Record<string, boolean> = {};
      students.forEach(s => {
        initial[s.id] = false;
      });
      setCurrentSubmissions(initial);
    }
  }, [date, records, students]);

  const toggleSubmission = (studentId: string, status: boolean) => {
    setCurrentSubmissions(prev => ({
      ...prev,
      [studentId]: status
    }));
  };

  const handleSave = async () => {
    if (!db) return;
    const newRecord: HomeworkRecord = {
      date,
      submissions: currentSubmissions
    };

    try {
      await setDoc(doc(db, 'records', date), newRecord);
      
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error: any) {
      console.error("Error saving record:", error);
      alert("হোমওয়ার্ক সেভ করা যায়নি! Firebase Rules চেক করুন। Error: " + error.message);
    }
  };

  const confirmDeleteRecord = async () => {
    if (!db) return;
    try {
      await deleteDoc(doc(db, 'records', date));
      setShowDeleteConfirm(false);
      setShowDeleteSuccess(true);
      setTimeout(() => setShowDeleteSuccess(false), 3000);
      
      const initial: Record<string, boolean> = {};
      students.forEach(s => {
        initial[s.id] = false;
      });
      setCurrentSubmissions(initial);
    } catch (error: any) {
      console.error("Error deleting record:", error);
      alert("রেকর্ড মুছে ফেলা যায়নি! Firebase Rules চেক করুন। Error: " + error.message);
    }
  };

  const recordExists = records.some(r => r.date === date);
  const submittedCount = Object.values(currentSubmissions).filter(Boolean).length;
  const missedCount = students.length - submittedCount;

  const filteredStudents = students.filter(student => 
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    student.roll.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const submittedStudents = filteredStudents.filter(s => currentSubmissions[s.id]).sort((a, b) => a.roll.localeCompare(b.roll, undefined, {numeric: true}));
  const notSubmittedStudents = filteredStudents.filter(s => !currentSubmissions[s.id]).sort((a, b) => a.roll.localeCompare(b.roll, undefined, {numeric: true}));

  return (
    <div className="space-y-6">
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-2xl shadow-xl max-w-sm w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-2">নিশ্চিত করুন</h3>
            <p className="text-gray-600 mb-6">আপনি কি নিশ্চিত যে এই দিনের ({date}) রেকর্ড মুছে ফেলতে চান?</p>
            <div className="flex justify-end space-x-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">বাতিল</button>
              <button onClick={confirmDeleteRecord} className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-xl transition-colors">মুছে ফেলুন</button>
            </div>
          </div>
        </div>
      )}
      {showSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl flex items-center shadow-sm">
          <CheckCircle2 className="w-5 h-5 mr-2" />
          হোমওয়ার্ক আপডেট সফলভাবে সেভ করা হয়েছে!
        </div>
      )}
      {showDeleteSuccess && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center shadow-sm">
          <Trash2 className="w-5 h-5 mr-2" />
          এই দিনের রেকর্ড সফলভাবে মুছে ফেলা হয়েছে!
        </div>
      )}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800">হোমওয়ার্ক ট্র্যাকার</h2>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="নাম বা রোল দিয়ে খুঁজুন..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 w-full border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm"
            />
          </div>
          <div className="flex items-center space-x-2 bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100 w-full sm:w-auto">
            <CalendarIcon className="w-5 h-5 text-indigo-500" />
            <input 
              type="date" 
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="outline-none text-gray-700 bg-transparent font-medium w-full"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 bg-gray-50/50 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-sm text-gray-600 flex space-x-4">
            <span>মোট ছাত্র: <strong className="text-gray-900">{students.length}</strong></span>
            <span>জমা দিয়েছে: <strong className="text-emerald-600">{submittedCount}</strong></span>
            <span>দেয়নি: <strong className="text-red-600">{missedCount}</strong></span>
          </div>
          <div className="flex space-x-2 w-full sm:w-auto">
            {recordExists && (
              <button 
                onClick={() => setShowDeleteConfirm(true)}
                className="bg-red-100 text-red-700 px-4 py-2 rounded-xl hover:bg-red-200 transition-colors text-sm font-medium shadow-sm flex items-center justify-center w-full sm:w-auto"
              >
                <Trash2 className="w-4 h-4 mr-1.5" /> মুছুন
              </button>
            )}
            <button 
              onClick={handleSave}
              className="bg-indigo-600 text-white px-6 py-2 rounded-xl hover:bg-indigo-700 transition-colors text-sm font-medium shadow-sm w-full sm:w-auto"
            >
              সেভ করুন
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-gray-100">
          {/* Not Submitted Column */}
          <div className="p-4 bg-red-50/30">
            <h3 className="font-bold text-red-700 mb-4 flex items-center text-lg">
              <XCircle className="w-5 h-5 mr-2" /> 
              জমা দেয়নি ({notSubmittedStudents.length})
            </h3>
            <div className="space-y-3">
              {notSubmittedStudents.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-4">সবাই জমা দিয়েছে!</p>
              ) : (
                notSubmittedStudents.map(student => (
                  <div key={student.id} className="bg-white p-3 rounded-xl border border-red-100 shadow-sm flex items-center justify-between hover:shadow-md transition-all">
                    <div>
                      <span className="text-xs font-mono bg-gray-100 text-gray-600 px-2 py-1 rounded-md mr-2">রোল: {student.roll}</span>
                      <span className="font-medium text-gray-800">{student.name}</span>
                    </div>
                    <button 
                      onClick={() => toggleSubmission(student.id, true)}
                      className="flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-50 text-gray-600 hover:bg-emerald-100 hover:text-emerald-700 border border-gray-200 hover:border-emerald-200 transition-all"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-1.5" /> জমা নিন
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Submitted Column */}
          <div className="p-4 bg-emerald-50/30">
            <h3 className="font-bold text-emerald-700 mb-4 flex items-center text-lg">
              <CheckCircle2 className="w-5 h-5 mr-2" /> 
              জমা দিয়েছে ({submittedStudents.length})
            </h3>
            <div className="space-y-3">
              {submittedStudents.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-4">কেউ জমা দেয়নি!</p>
              ) : (
                submittedStudents.map(student => (
                  <div key={student.id} className="bg-white p-3 rounded-xl border border-emerald-100 shadow-sm flex items-center justify-between hover:shadow-md transition-all">
                    <div>
                      <span className="text-xs font-mono bg-gray-100 text-gray-600 px-2 py-1 rounded-md mr-2">রোল: {student.roll}</span>
                      <span className="font-medium text-gray-800">{student.name}</span>
                    </div>
                    <button 
                      onClick={() => toggleSubmission(student.id, false)}
                      className="flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-emerald-50 text-emerald-700 hover:bg-red-100 hover:text-red-700 border border-emerald-200 hover:border-red-200 transition-all"
                    >
                      <XCircle className="w-4 h-4 mr-1.5" /> বাতিল করুন
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
