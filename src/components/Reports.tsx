import React, { useState } from 'react';
import { Student, HomeworkRecord } from '../types';
import { Search } from 'lucide-react';

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
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-gray-100">
                <th className="p-4 font-semibold text-gray-600 w-24">রোল</th>
                <th className="p-4 font-semibold text-gray-600">নাম</th>
                <th className="p-4 font-semibold text-gray-600 text-center">জমা দিয়েছে</th>
                <th className="p-4 font-semibold text-gray-600 text-center">দেয়নি</th>
                <th className="p-4 font-semibold text-gray-600 text-center">না দেওয়ার হার</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500">কোনো তথ্য পাওয়া যায়নি।</td>
                </tr>
              ) : (
                filteredStudents.sort((a, b) => a.roll.localeCompare(b.roll, undefined, {numeric: true})).map(student => {
                  const stats = getStudentStats(student.id);
                  return (
                    <tr key={student.id} className="border-b border-gray-50 hover:bg-gray-50/80 transition-colors">
                      <td className="p-4 text-gray-800 font-mono text-sm">{student.roll}</td>
                      <td className="p-4 text-gray-800 font-medium">{student.name}</td>
                      <td className="p-4 text-center text-emerald-600 font-medium">{stats.submitted} বার</td>
                      <td className="p-4 text-center text-red-600 font-medium">{stats.missed} বার</td>
                      <td className="p-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          stats.missRatio >= 50 ? 'bg-red-100 text-red-800' : 
                          stats.missRatio >= 20 ? 'bg-amber-100 text-amber-800' : 
                          'bg-emerald-100 text-emerald-800'
                        }`}>
                          {stats.missRatio}%
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
