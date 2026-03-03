import React from 'react';
import { Student, HomeworkRecord } from '../types';
import { Users, CheckCircle, XCircle, Percent } from 'lucide-react';

interface Props {
  students: Student[];
  records: HomeworkRecord[];
  onNavigate: (tab: string) => void;
}

export default function Dashboard({ students, records, onNavigate }: Props) {
  const today = new Date().toISOString().split('T')[0];
  const todayRecord = records.find(r => r.date === today);
  
  const totalStudents = students.length;
  let submitted = 0;
  let missed = 0;

  if (todayRecord) {
    students.forEach(s => {
      if (todayRecord.submissions[s.id]) {
        submitted++;
      } else {
        missed++;
      }
    });
  } else {
    missed = totalStudents;
  }
  
  const isTrackedToday = !!todayRecord;
  if (!isTrackedToday) {
    submitted = 0;
    missed = 0;
  }

  const missRatio = totalStudents > 0 && isTrackedToday ? Math.round((missed / totalStudents) * 100) : 0;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">ড্যাশবোর্ড (আজকের সারাংশ)</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<Users className="w-8 h-8 text-blue-500" />} title="মোট ছাত্র" value={totalStudents} />
        <StatCard icon={<CheckCircle className="w-8 h-8 text-green-500" />} title="আজ জমা দিয়েছে" value={isTrackedToday ? submitted : '-'} />
        <StatCard icon={<XCircle className="w-8 h-8 text-red-500" />} title="আজ জমা দেয়নি" value={isTrackedToday ? missed : '-'} />
        <StatCard icon={<Percent className="w-8 h-8 text-orange-500" />} title="না দেওয়ার হার" value={isTrackedToday ? `${missRatio}%` : '-'} />
      </div>

      {!isTrackedToday && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mt-6 rounded-r-lg">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-yellow-800">
                আজকের হোমওয়ার্ক এখনও আপডেট করা হয়নি। 
                <button onClick={() => onNavigate('homework')} className="ml-2 font-bold underline text-yellow-900 hover:text-yellow-700">
                  এখনই আপডেট করুন
                </button>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, title, value }: { icon: React.ReactNode, title: string, value: string | number }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 flex items-center space-x-4 border border-gray-100">
      <div className="p-3 bg-gray-50 rounded-xl">
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p className="text-2xl font-semibold text-gray-900">{value}</p>
      </div>
    </div>
  );
}
