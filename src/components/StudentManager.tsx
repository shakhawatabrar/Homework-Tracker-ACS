import React, { useState } from 'react';
import { Student } from '../types';
import { Plus, Trash2, Edit2, X, Check, Search, Download, FileText, FileSpreadsheet } from 'lucide-react';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
// @ts-ignore
import html2pdf from 'html2pdf.js';
import toast from 'react-hot-toast';

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
  const [isExportingSheets, setIsExportingSheets] = useState(false);

  const filteredStudents = students.filter(student => 
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    student.roll.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const exportToGoogleSheets = async () => {
    setIsExportingSheets(true);
    
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    
    if (!clientId) {
      toast.error('Google OAuth কনফিগার করা নেই। দয়া করে Netlify/Vercel এর Environment Variables এ VITE_GOOGLE_CLIENT_ID সেট করুন।');
      setIsExportingSheets(false);
      return;
    }

    try {
      const client = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'https://www.googleapis.com/auth/spreadsheets',
        callback: async (response: any) => {
          if (response.error !== undefined) {
            throw (response);
          }
          
          const token = response.access_token;
          
          try {
            const { createOrUpdateSpreadsheet } = await import('../utils/googleSheets');
            
            const studentData = [
              ['রোল', 'নাম'],
              ...filteredStudents.sort((a, b) => a.roll.localeCompare(b.roll, undefined, {numeric: true})).map((s: any) => [s.roll, s.name])
            ];

            const sheets = [
              { title: 'ছাত্রের তালিকা', data: studentData }
            ];

            const data = await createOrUpdateSpreadsheet(
              token,
              `ছাত্রের তালিকা - ${new Date().toLocaleDateString('en-GB')}`,
              sheets
            );

            toast.success('সফলভাবে গুগল শিট তৈরি হয়েছে!');
            window.open(data.url, '_blank');
          } catch (err: any) {
            console.error(err);
            toast.error('গুগল শিট তৈরি করতে সমস্যা হয়েছে: ' + err.message);
          } finally {
            setIsExportingSheets(false);
          }
        },
      });
      
      client.requestAccessToken({prompt: 'consent'});
    } catch (error) {
      console.error('Error initiating OAuth:', error);
      toast.error('গুগল কানেক্ট করতে সমস্যা হয়েছে।');
      setIsExportingSheets(false);
    }
  };

  const downloadTxt = () => {
    let content = `ছাত্রের তালিকা\n`;
    content += `মোট ছাত্র: ${filteredStudents.length} জন\n`;
    content += `----------------------------------------\n\n`;
    
    filteredStudents.sort((a, b) => a.roll.localeCompare(b.roll, undefined, {numeric: true})).forEach(s => {
      content += `রোল: ${s.roll} - ${s.name}\n`;
    });

    const blob = new Blob(['\uFEFF' + content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `student_list_${new Date().toISOString().split('T')[0]}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadPdf = () => {
    const element = document.createElement('div');
    const sortedStudents = [...filteredStudents].sort((a, b) => a.roll.localeCompare(b.roll, undefined, {numeric: true}));
    
    element.innerHTML = `
      <div style="font-family: sans-serif; padding: 40px; color: #1f2937;">
        <h2 style="text-align: center; color: #4f46e5; margin-bottom: 5px; font-size: 24px;">ছাত্রের তালিকা</h2>
        <p style="text-align: center; color: #6b7280; margin-bottom: 30px; font-size: 16px;">মোট ছাত্র: ${sortedStudents.length} জন</p>
        
        <div style="margin-bottom: 30px;">
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background-color: #f3f4f6;">
                <th style="padding: 10px; text-align: left; border: 1px solid #e5e7eb; width: 80px;">রোল</th>
                <th style="padding: 10px; text-align: left; border: 1px solid #e5e7eb;">নাম</th>
              </tr>
            </thead>
            <tbody>
              ${sortedStudents.length > 0 ? sortedStudents.map(s => `
                <tr>
                  <td style="padding: 8px 10px; border: 1px solid #e5e7eb; font-family: monospace;">${s.roll}</td>
                  <td style="padding: 8px 10px; border: 1px solid #e5e7eb;">${s.name}</td>
                </tr>
              `).join('') : `<tr><td colspan="2" style="padding: 10px; text-align: center; border: 1px solid #e5e7eb; color: #6b7280;">কোনো ছাত্রের তথ্য পাওয়া যায়নি</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>
    `;

    const opt = {
      margin:       10,
      filename:     `student_list_${new Date().toISOString().split('T')[0]}.pdf`,
      image:        { type: 'jpeg' as const, quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
    };

    html2pdf().set(opt).from(element).save();
  };

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
        <div className="p-4 bg-gray-50/50 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-sm text-gray-600 flex space-x-4">
            <span>মোট ছাত্র: <strong className="text-gray-900">{filteredStudents.length}</strong></span>
          </div>
          <div className="flex flex-wrap gap-2 w-full sm:w-auto items-center">
            <button 
              onClick={exportToGoogleSheets}
              disabled={isExportingSheets}
              className="bg-emerald-100 text-emerald-700 px-4 py-2 rounded-xl hover:bg-emerald-200 transition-colors text-sm font-medium shadow-sm flex items-center justify-center flex-1 sm:flex-none disabled:opacity-50 disabled:cursor-not-allowed"
              title="গুগল শিটে এক্সপোর্ট করুন"
            >
              <FileSpreadsheet className="w-4 h-4 mr-1.5" /> 
              {isExportingSheets ? 'তৈরি হচ্ছে...' : 'শিট'}
            </button>
            <button 
              onClick={downloadTxt}
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-xl hover:bg-gray-200 transition-colors text-sm font-medium shadow-sm flex items-center justify-center flex-1 sm:flex-none"
              title="TXT ডাউনলোড করুন"
            >
              <FileText className="w-4 h-4 mr-1.5" /> TXT
            </button>
            <button 
              onClick={downloadPdf}
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-xl hover:bg-gray-200 transition-colors text-sm font-medium shadow-sm flex items-center justify-center flex-1 sm:flex-none"
              title="PDF ডাউনলোড করুন"
            >
              <Download className="w-4 h-4 mr-1.5" /> PDF
            </button>
          </div>
        </div>
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
