import React, { useState } from 'react';
import { Student } from '../types';
import { Plus, Trash2, Edit2, X, Check, Search } from 'lucide-react';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface Props {
  students: Student[];
}

export default function StudentManager({ students }: Props) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [roll, setRoll] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !roll.trim() || !db) return;
    
    const newStudent: Student = {
      id: Date.now().toString(),
      name: name.trim(),
      roll: roll.trim()
    };
    
    try {
      await setDoc(doc(db, 'students', newStudent.id), newStudent);
      setName('');
      setRoll('');
      setIsAdding(false);
    } catch (error: any) {
      console.error("Error adding student:", error);
      alert("ছাত্র যোগ করা যায়নি! Firebase Rules চেক করুন। Error: " + error.message);
    }
  };

  const handleEdit = (student: Student) => {
    setEditingId(student.id);
    setName(student.name);
    setRoll(student.roll);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !roll.trim() || !editingId || !db) return;
    
    try {
      const updatedStudent = students.find(s => s.id === editingId);
      if (updatedStudent) {
        await setDoc(doc(db, 'students', editingId), { ...updatedStudent, name: name.trim(), roll: roll.trim() });
      }
      setEditingId(null);
      setName('');
      setRoll('');
    } catch (error: any) {
      console.error("Error updating student:", error);
      alert("তথ্য আপডেট করা যায়নি! Firebase Rules চেক করুন। Error: " + error.message);
    }
  };

  const handleDelete = (id: string) => {
    setDeleteConfirmId(id);
  };

  const confirmDelete = async () => {
    if (deleteConfirmId && db) {
      try {
        await deleteDoc(doc(db, 'students', deleteConfirmId));
        setDeleteConfirmId(null);
      } catch (error: any) {
        console.error("Error deleting student:", error);
        alert("ছাত্র মুছে ফেলা যায়নি! Firebase Rules চেক করুন। Error: " + error.message);
      }
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setName('');
    setRoll('');
    setIsAdding(false);
  };

  const filteredStudents = students.filter(student => 
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    student.roll.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-2xl shadow-xl max-w-sm w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-2">নিশ্চিত করুন</h3>
            <p className="text-gray-600 mb-6">আপনি কি নিশ্চিত যে এই ছাত্রের তথ্য মুছে ফেলতে চান? এটি আর ফিরে পাওয়া যাবে না।</p>
            <div className="flex justify-end space-x-3">
              <button onClick={() => setDeleteConfirmId(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">বাতিল</button>
              <button onClick={confirmDelete} className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-xl transition-colors">মুছে ফেলুন</button>
            </div>
          </div>
        </div>
      )}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800">ছাত্রের তালিকা</h2>
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
          {!isAdding && !editingId && (
            <button 
              onClick={() => setIsAdding(true)}
              className="flex items-center justify-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 transition-colors shadow-sm w-full sm:w-auto whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>নতুন যোগ করুন</span>
            </button>
          )}
        </div>
      </div>

      {(isAdding || editingId) && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">{editingId ? 'তথ্য সম্পাদনা' : 'নতুন ছাত্র যোগ করুন'}</h3>
          <form onSubmit={editingId ? handleUpdate : handleAdd} className="flex flex-col sm:flex-row gap-4">
            <input
              type="text"
              placeholder="রোল নম্বর"
              value={roll}
              onChange={(e) => setRoll(e.target.value)}
              className="px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none w-full sm:w-1/3"
              required
            />
            <input
              type="text"
              placeholder="ছাত্রের নাম"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none w-full sm:w-2/3"
              required
            />
            <div className="flex space-x-2">
              <button type="submit" className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl hover:bg-emerald-700 flex items-center justify-center w-full sm:w-auto transition-colors">
                <Check className="w-4 h-4 mr-1.5" /> সেভ
              </button>
              <button type="button" onClick={cancelEdit} className="bg-gray-100 text-gray-700 px-5 py-2.5 rounded-xl hover:bg-gray-200 flex items-center justify-center w-full sm:w-auto transition-colors">
                <X className="w-4 h-4 mr-1.5" /> বাতিল
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="p-4 font-semibold text-gray-600">রোল</th>
                <th className="p-4 font-semibold text-gray-600">নাম</th>
                <th className="p-4 font-semibold text-gray-600 text-right">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-gray-500">কোনো ছাত্রের তথ্য পাওয়া যায়নি।</td>
                </tr>
              ) : (
                filteredStudents.sort((a, b) => a.roll.localeCompare(b.roll, undefined, {numeric: true})).map(student => (
                  <tr key={student.id} className="border-b border-gray-50 hover:bg-gray-50/80 transition-colors">
                    <td className="p-4 text-gray-800 font-mono text-sm">{student.roll}</td>
                    <td className="p-4 text-gray-800 font-medium">{student.name}</td>
                    <td className="p-4 flex justify-end space-x-2">
                      <button onClick={() => handleEdit(student)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="সম্পাদনা">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(student.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="মুছুন">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
