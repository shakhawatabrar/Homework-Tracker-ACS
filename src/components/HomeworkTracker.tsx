import React, { useState, useEffect } from 'react';
import { Student, HomeworkRecord } from '../types';
import { Calendar as CalendarIcon, CheckCircle2, XCircle, Search, Trash2, Copy, Download, FileText, FileSpreadsheet } from 'lucide-react';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
// @ts-ignore
import html2pdf from 'html2pdf.js';
import toast from 'react-hot-toast';

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
  const [isExportingSheets, setIsExportingSheets] = useState(false);
  const [showBulkInput, setShowBulkInput] = useState(false);
  const [bulkRolls, setBulkRolls] = useState('');

  const record = records.find(r => r.date === date);

  useEffect(() => {
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

  const filteredStudents = students.filter(student => 
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    student.roll.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const submittedStudents = filteredStudents.filter(s => currentSubmissions[s.id]).sort((a, b) => a.roll.localeCompare(b.roll, undefined, {numeric: true}));
  const notSubmittedStudents = filteredStudents.filter(s => !currentSubmissions[s.id]).sort((a, b) => a.roll.localeCompare(b.roll, undefined, {numeric: true}));

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
          
          const submitted = submittedStudents.map(s => ({ roll: s.roll, name: s.name }));
          const notSubmitted = notSubmittedStudents.map(s => ({ roll: s.roll, name: s.name }));

          try {
            const { createOrUpdateSpreadsheet } = await import('../utils/googleSheets');
            
            const submittedData = [
              ['রোল', 'নাম'],
              ...submitted.map((s: any) => [s.roll, s.name])
            ];

            const notSubmittedData = [
              ['রোল', 'নাম'],
              ...notSubmitted.map((s: any) => [s.roll, s.name])
            ];

            const sheets = [
              { title: 'জমা দিয়েছে', data: submittedData },
              { title: 'জমা দেয়নি', data: notSubmittedData }
            ];

            const data = await createOrUpdateSpreadsheet(
              token,
              `হোমওয়ার্ক রিপোর্ট - ${date}`,
              sheets,
              record?.spreadsheetId
            );

            if (!record?.spreadsheetId && db) {
              await setDoc(doc(db, 'records', date), {
                date,
                submissions: currentSubmissions,
                timestamp: Date.now(),
                spreadsheetId: data.spreadsheetId,
                spreadsheetUrl: data.url
              }, { merge: true });
            }
            toast.success(record?.spreadsheetId ? 'সফলভাবে গুগল শিট আপডেট হয়েছে!' : 'সফলভাবে গুগল শিট তৈরি হয়েছে!');
            window.open(data.url, '_blank');
          } catch (err: any) {
            console.error(err);
            toast.error('গুগল শিট তৈরি/আপডেট করতে সমস্যা হয়েছে: ' + err.message);
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

  const handleBulkSubmit = () => {
    if (!bulkRolls.trim()) {
      toast.error('রোল নাম্বার লিখুন');
      return;
    }

    // Split by comma, space, or newline and clean up
    const rolls = bulkRolls
      .split(/[\n, ]+/)
      .map(r => r.trim())
      .filter(r => r.length > 0);

    if (rolls.length === 0) {
      toast.error('সঠিক রোল নাম্বার পাওয়া যায়নি');
      return;
    }

    let matchCount = 0;
    const newSubmissions = { ...currentSubmissions };

    rolls.forEach(roll => {
      // Find student by roll (case-insensitive)
      const student = students.find(s => s.roll.toLowerCase() === roll.toLowerCase());
      if (student) {
        newSubmissions[student.id] = true;
        matchCount++;
      }
    });

    setCurrentSubmissions(newSubmissions);
    setBulkRolls('');
    setShowBulkInput(false);
    
    if (matchCount > 0) {
      toast.success(`${matchCount} জন স্টুডেন্টকে 'জমা দিয়েছে' হিসেবে মার্ক করা হয়েছে!`);
    } else {
      toast.error('কোনো স্টুডেন্টের রোল নাম্বার মেলেনি!');
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

  const downloadTxt = () => {
    let content = `হোমওয়ার্ক রিপোর্ট - তারিখ: ${date}\n\n`;
    
    content += `জমা দিয়েছে (${submittedStudents.length} জন):\n`;
    content += `----------------------------------------\n`;
    submittedStudents.forEach(s => {
      content += `রোল: ${s.roll} - ${s.name}\n`;
    });
    
    content += `\nজমা দেয়নি (${notSubmittedStudents.length} জন):\n`;
    content += `----------------------------------------\n`;
    notSubmittedStudents.forEach(s => {
      content += `রোল: ${s.roll} - ${s.name}\n`;
    });

    const blob = new Blob(['\uFEFF' + content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `homework_${date}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadPdf = () => {
    const element = document.createElement('div');
    element.innerHTML = `
      <div style="font-family: sans-serif; padding: 40px; color: #1f2937;">
        <h2 style="text-align: center; color: #4f46e5; margin-bottom: 5px; font-size: 24px;">হোমওয়ার্ক রিপোর্ট</h2>
        <p style="text-align: center; color: #6b7280; margin-bottom: 30px; font-size: 16px;">তারিখ: ${date}</p>
        
        <div style="margin-bottom: 30px;">
          <h3 style="color: #059669; border-bottom: 2px solid #059669; padding-bottom: 8px; margin-bottom: 15px; font-size: 18px;">
            জমা দিয়েছে (${submittedStudents.length} জন)
          </h3>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background-color: #f3f4f6;">
                <th style="padding: 10px; text-align: left; border: 1px solid #e5e7eb; width: 80px;">রোল</th>
                <th style="padding: 10px; text-align: left; border: 1px solid #e5e7eb;">নাম</th>
              </tr>
            </thead>
            <tbody>
              ${submittedStudents.length > 0 ? submittedStudents.map(s => `
                <tr>
                  <td style="padding: 8px 10px; border: 1px solid #e5e7eb; font-family: monospace;">${s.roll}</td>
                  <td style="padding: 8px 10px; border: 1px solid #e5e7eb;">${s.name}</td>
                </tr>
              `).join('') : `<tr><td colspan="2" style="padding: 10px; text-align: center; border: 1px solid #e5e7eb; color: #6b7280;">কেউ জমা দেয়নি</td></tr>`}
            </tbody>
          </table>
        </div>

        <div>
          <h3 style="color: #dc2626; border-bottom: 2px solid #dc2626; padding-bottom: 8px; margin-bottom: 15px; font-size: 18px;">
            জমা দেয়নি (${notSubmittedStudents.length} জন)
          </h3>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background-color: #f3f4f6;">
                <th style="padding: 10px; text-align: left; border: 1px solid #e5e7eb; width: 80px;">রোল</th>
                <th style="padding: 10px; text-align: left; border: 1px solid #e5e7eb;">নাম</th>
              </tr>
            </thead>
            <tbody>
              ${notSubmittedStudents.length > 0 ? notSubmittedStudents.map(s => `
                <tr>
                  <td style="padding: 8px 10px; border: 1px solid #e5e7eb; font-family: monospace;">${s.roll}</td>
                  <td style="padding: 8px 10px; border: 1px solid #e5e7eb;">${s.name}</td>
                </tr>
              `).join('') : `<tr><td colspan="2" style="padding: 10px; text-align: center; border: 1px solid #e5e7eb; color: #6b7280;">সবাই জমা দিয়েছে</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>
    `;

    const opt = {
      margin:       10,
      filename:     `homework_${date}.pdf`,
      image:        { type: 'jpeg' as const, quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
    };

    html2pdf().set(opt).from(element).save();
  };

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
          <button 
            onClick={() => setShowBulkInput(!showBulkInput)}
            className="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-xl hover:bg-indigo-100 transition-colors text-sm font-medium shadow-sm flex items-center justify-center w-full sm:w-auto border border-indigo-200"
          >
            <FileText className="w-4 h-4 mr-1.5" /> একসাথে মার্ক করুন
          </button>
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

      {showBulkInput && (
        <div className="bg-indigo-50/50 border border-indigo-100 p-4 rounded-2xl shadow-sm animate-in fade-in slide-in-from-top-4 duration-200">
          <h3 className="text-sm font-bold text-indigo-800 mb-2 flex items-center">
            <CheckCircle2 className="w-4 h-4 mr-1.5" />
            যারা জমা দিয়েছে তাদের রোল নাম্বার দিন
          </h3>
          <p className="text-xs text-indigo-600 mb-3">
            কমা (,), স্পেস ( ) অথবা নতুন লাইনে রোল নাম্বারগুলো লিখুন।
          </p>
          <textarea
            value={bulkRolls}
            onChange={(e) => setBulkRolls(e.target.value)}
            placeholder="যেমন: B121015, B121017, B121018..."
            className="w-full h-24 p-3 border border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm mb-3 resize-none"
          />
          <div className="flex justify-end space-x-2">
            <button 
              onClick={() => {
                setShowBulkInput(false);
                setBulkRolls('');
              }}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors text-sm font-medium"
            >
              বাতিল
            </button>
            <button 
              onClick={handleBulkSubmit}
              className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl transition-colors text-sm font-medium shadow-sm"
            >
              অটো মার্ক করুন
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 bg-gray-50/50 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-sm text-gray-600 flex space-x-4">
            <span>মোট ছাত্র: <strong className="text-gray-900">{students.length}</strong></span>
            <span>জমা দিয়েছে: <strong className="text-emerald-600">{submittedCount}</strong></span>
            <span>দেয়নি: <strong className="text-red-600">{missedCount}</strong></span>
          </div>
          <div className="flex flex-wrap gap-2 w-full sm:w-auto items-center">
            {record?.spreadsheetUrl && (
              <a 
                href={record.spreadsheetUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs text-emerald-600 hover:text-emerald-700 underline mr-2"
              >
                শিট দেখুন
              </a>
            )}
            <button 
              onClick={exportToGoogleSheets}
              disabled={isExportingSheets}
              className="bg-emerald-100 text-emerald-700 px-4 py-2 rounded-xl hover:bg-emerald-200 transition-colors text-sm font-medium shadow-sm flex items-center justify-center flex-1 sm:flex-none disabled:opacity-50 disabled:cursor-not-allowed"
              title={record?.spreadsheetId ? "গুগল শিট আপডেট করুন" : "গুগল শিটে এক্সপোর্ট করুন"}
            >
              <FileSpreadsheet className="w-4 h-4 mr-1.5" /> 
              {isExportingSheets ? 'তৈরি হচ্ছে...' : (record?.spreadsheetId ? 'আপডেট শিট' : 'শিট')}
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
            {recordExists && (
              <button 
                onClick={() => setShowDeleteConfirm(true)}
                className="bg-red-100 text-red-700 px-4 py-2 rounded-xl hover:bg-red-200 transition-colors text-sm font-medium shadow-sm flex items-center justify-center flex-1 sm:flex-none"
              >
                <Trash2 className="w-4 h-4 mr-1.5" /> মুছুন
              </button>
            )}
            <button 
              onClick={handleSave}
              className="bg-indigo-600 text-white px-6 py-2 rounded-xl hover:bg-indigo-700 transition-colors text-sm font-medium shadow-sm flex-1 sm:flex-none"
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
