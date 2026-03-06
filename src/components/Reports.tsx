import React, { useState } from 'react';
import { Student, HomeworkRecord } from '../types';
import { Search, CheckCircle2, AlertTriangle } from 'lucide-react';

interface Props {
  students: Student[];
  records: HomeworkRecord[];
}

export default function Reports({ students, records }: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const totalDays = records.length;

  const getStudentStats = (studentId: string) => {
    let submitted = 0;
    let missed = 0;

    records.forEach(record => {
      if (record.submissions[studentId]) {
        submitted++;
      } else {
        missed++;
      }
    });

    const missRatio = totalDays > 0 ? Math.round((missed / totalDays) * 100) : 0;

    return { submitted, missed, missRatio };
  };

  const filteredStudents = students.filter(student => 
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    student.roll.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const studentStats = filteredStudents.map(student => ({
    ...student,
    ...getStudentStats(student.id)
  }));

  const regularStudents = studentStats.filter(s => s.missRatio < 20).sort((a, b) => a.roll.localeCompare(b.roll, undefined, {numeric: true}));
  const irregularStudents = studentStats.filter(s => s.missRatio >= 20).sort((a, b) => a.roll.localeCompare(b.roll, undefined, {numeric: true}));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800">পারফরম্যান্স রিপোর্ট</h2>
        <div className="relative w-full sm:w-64">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="নাম বা রোল দিয়ে খুঁজুন..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          />
        </div>
      </div>
      
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-5 bg-gray-50/50 border-b border-gray-100">
          <p className="text-sm text-gray-600">মোট ট্র্যাক করা দিন: <span className="font-bold text-indigo-600 text-lg ml-1">{totalDays}</span></p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-gray-100">
          {/* Irregular Column */}
          <div className="p-4 bg-red-50/30">
            <h3 className="font-bold text-red-700 mb-4 flex items-center text-lg">
              <AlertTriangle className="w-5 h-5 mr-2" /> 
              অনিয়মিত ছাত্র ({irregularStudents.length})
            </h3>
            <p className="text-xs text-red-600/80 mb-4">যাদের না দেওয়ার হার ২০% বা তার বেশি</p>
            <div className="space-y-3">
              {irregularStudents.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-4">সবাই নিয়মিত!</p>
              ) : (
                irregularStudents.map(student => (
                  <div key={student.id} className="bg-white p-3 rounded-xl border border-red-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:shadow-md transition-all">
                    <div>
                      <span className="text-xs font-mono bg-gray-100 text-gray-600 px-2 py-1 rounded-md mr-2">রোল: {student.roll}</span>
                      <span className="font-medium text-gray-800">{student.name}</span>
                    </div>
                    <div className="flex items-center space-x-3 text-sm">
                      <div className="text-center">
                        <span className="block text-xs text-gray-500">দেয়নি</span>
                        <span className="font-bold text-red-600">{student.missed}</span>
                      </div>
                      <div className="text-center">
                        <span className="block text-xs text-gray-500">হার</span>
                        <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${student.missRatio >= 50 ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>
                          {student.missRatio}%
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Regular Column */}
          <div className="p-4 bg-emerald-50/30">
            <h3 className="font-bold text-emerald-700 mb-4 flex items-center text-lg">
              <CheckCircle2 className="w-5 h-5 mr-2" /> 
              নিয়মিত ছাত্র ({regularStudents.length})
            </h3>
            <p className="text-xs text-emerald-600/80 mb-4">যাদের না দেওয়ার হার ২০% এর কম</p>
            <div className="space-y-3">
              {regularStudents.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-4">কেউ নিয়মিত নয়!</p>
              ) : (
                regularStudents.map(student => (
                  <div key={student.id} className="bg-white p-3 rounded-xl border border-emerald-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:shadow-md transition-all">
                    <div>
                      <span className="text-xs font-mono bg-gray-100 text-gray-600 px-2 py-1 rounded-md mr-2">রোল: {student.roll}</span>
                      <span className="font-medium text-gray-800">{student.name}</span>
                    </div>
                    <div className="flex items-center space-x-3 text-sm">
                      <div className="text-center">
                        <span className="block text-xs text-gray-500">দিয়েছে</span>
                        <span className="font-bold text-emerald-600">{student.submitted}</span>
                      </div>
                      <div className="text-center">
                        <span className="block text-xs text-gray-500">হার</span>
                        <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-emerald-100 text-emerald-800">
                          {student.missRatio}%
                        </span>
                      </div>
                    </div>
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
