import React, { useState, useEffect } from 'react';
import { Student, Exam } from '../types';
import { FileText, Plus, Trash2, Eye, EyeOff, Save, CheckCircle2, XCircle, AlertTriangle, Search, Star, Copy, Download, FileSpreadsheet } from 'lucide-react';
import { doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
// @ts-ignore
import html2pdf from 'html2pdf.js';

interface ExamCardProps {
  exam: Exam;
  allExams: Exam[];
  students: Student[];
  role: string;
}

const ExamCard: React.FC<ExamCardProps> = ({ exam, allExams, students, role }) => {
  const [marks, setMarks] = useState<Record<string, number | null>>(exam.marks || {});
  const [isModified, setIsModified] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isExportingSheets, setIsExportingSheets] = useState(false);

  const totalStudents = students.length;
  const presentStudents = students.filter(s => marks[s.id] !== null && marks[s.id] !== undefined).length;
  const absentStudents = totalStudents - presentStudents;

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.roll.toLowerCase().includes(searchQuery.toLowerCase())
  ).sort((a, b) => a.roll.localeCompare(b.roll, undefined, {numeric: true}));

  const presentStudentsList = filteredStudents.filter(s => marks[s.id] !== null && marks[s.id] !== undefined);
  const absentStudentsList = filteredStudents.filter(s => marks[s.id] === null || marks[s.id] === undefined);

  const passedStudentsList = presentStudentsList.filter(s => marks[s.id] !== null && marks[s.id]! >= 1);
  const failedStudentsList = presentStudentsList.filter(s => marks[s.id] === 0);

  const exportToGoogleSheets = async () => {
    setIsExportingSheets(true);
    
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    
    if (!clientId) {
      alert('Google OAuth কনফিগার করা নেই। দয়া করে Netlify/Vercel এর Environment Variables এ VITE_GOOGLE_CLIENT_ID সেট করুন।');
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
          
          const passed = passedStudentsList.map(s => ({ roll: s.roll, name: s.name, mark: marks[s.id] }));
          const failed = failedStudentsList.map(s => ({ roll: s.roll, name: s.name }));
          const absent = absentStudentsList.map(s => ({ roll: s.roll, name: s.name }));

          try {
            const { createOrUpdateSpreadsheet } = await import('../utils/googleSheets');
            
            const passedData = [
              ['রোল', 'নাম', 'প্রাপ্ত স্টার'],
              ...passed.map((s: any) => [s.roll, s.name, `${s.mark}★`])
            ];

            const failedData = [
              ['রোল', 'নাম', 'প্রাপ্ত স্টার'],
              ...failed.map((s: any) => [s.roll, s.name, '০★'])
            ];

            const absentData = [
              ['রোল', 'নাম'],
              ...absent.map((s: any) => [s.roll, s.name])
            ];

            const sheets = [
              { title: 'পাস করেছে', data: passedData },
              { title: 'ফেল করেছে', data: failedData },
              { title: 'অনুপস্থিত', data: absentData }
            ];

            const data = await createOrUpdateSpreadsheet(
              token,
              `পরীক্ষার ফলাফল - ${exam.title} (${exam.date})`,
              sheets,
              exam.spreadsheetId
            );

            if (!exam.spreadsheetId && db) {
              await updateDoc(doc(db, 'exams', exam.id), {
                spreadsheetId: data.spreadsheetId,
                spreadsheetUrl: data.url
              });
            }
            alert(exam.spreadsheetId ? 'সফলভাবে গুগল শিট আপডেট হয়েছে!' : 'সফলভাবে গুগল শিট তৈরি হয়েছে!');
            window.open(data.url, '_blank');
          } catch (err: any) {
            console.error(err);
            alert('গুগল শিট তৈরি/আপডেট করতে সমস্যা হয়েছে: ' + err.message);
          } finally {
            setIsExportingSheets(false);
          }
        },
      });
      
      client.requestAccessToken({prompt: 'consent'});
    } catch (error) {
      console.error('Error initiating OAuth:', error);
      alert('গুগল কানেক্ট করতে সমস্যা হয়েছে।');
      setIsExportingSheets(false);
    }
  };

  useEffect(() => {
    setMarks(exam.marks || {});
    setIsModified(false);
  }, [exam.marks]);

  const handleMarkChange = (studentId: string, value: number | null) => {
    const newMarks = { ...marks };
    newMarks[studentId] = value;
    setMarks(newMarks);
    setIsModified(true);
  };

  const handleSave = async () => {
    if (!db) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'exams', exam.id), { marks });
      setIsModified(false);
    } catch (error: any) {
      alert("মার্কস সেভ করা যায়নি! Error: " + error.message);
    }
    setIsSaving(false);
  };

  const handleTogglePublish = async () => {
    if (!db) return;
    try {
      await updateDoc(doc(db, 'exams', exam.id), { isPublished: !exam.isPublished });
    } catch (error: any) {
      alert("পাবলিশ স্ট্যাটাস আপডেট করা যায়নি! Error: " + error.message);
    }
  };

  const handleDelete = async () => {
    if (!db) return;
    try {
      await deleteDoc(doc(db, 'exams', exam.id));
    } catch (error: any) {
      alert("পরীক্ষা মুছে ফেলা যায়নি! Error: " + error.message);
    }
  };

  const downloadTxt = () => {
    let content = `পরীক্ষার ফলাফল - ${exam.title}\n`;
    content += `তারিখ: ${exam.date}\n\n`;
    
    content += `পাস করেছে (${passedStudentsList.length} জন):\n`;
    content += `----------------------------------------\n`;
    passedStudentsList.forEach(s => {
      const mark = marks[s.id];
      content += `রোল: ${s.roll} - ${s.name} (প্রাপ্ত স্টার: ${mark}★)\n`;
    });
    
    content += `\nফেল করেছে (${failedStudentsList.length} জন):\n`;
    content += `----------------------------------------\n`;
    failedStudentsList.forEach(s => {
      content += `রোল: ${s.roll} - ${s.name} (প্রাপ্ত স্টার: ০★)\n`;
    });
    
    content += `\nঅনুপস্থিত (${absentStudentsList.length} জন):\n`;
    content += `----------------------------------------\n`;
    absentStudentsList.forEach(s => {
      content += `রোল: ${s.roll} - ${s.name}\n`;
    });

    const blob = new Blob(['\uFEFF' + content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `exam_${exam.title}_${exam.date}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadPdf = () => {
    const element = document.createElement('div');
    element.innerHTML = `
      <div style="font-family: sans-serif; padding: 40px; color: #1f2937;">
        <h2 style="text-align: center; color: #4f46e5; margin-bottom: 5px; font-size: 24px;">পরীক্ষার ফলাফল</h2>
        <h3 style="text-align: center; color: #374151; margin-bottom: 5px; font-size: 18px;">${exam.title}</h3>
        <p style="text-align: center; color: #6b7280; margin-bottom: 30px; font-size: 16px;">তারিখ: ${exam.date}</p>
        
        <div style="margin-bottom: 30px;">
          <h3 style="color: #059669; border-bottom: 2px solid #059669; padding-bottom: 8px; margin-bottom: 15px; font-size: 18px;">
            পাস করেছে (${passedStudentsList.length} জন)
          </h3>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background-color: #f3f4f6;">
                <th style="padding: 10px; text-align: left; border: 1px solid #e5e7eb; width: 80px;">রোল</th>
                <th style="padding: 10px; text-align: left; border: 1px solid #e5e7eb;">নাম</th>
                <th style="padding: 10px; text-align: center; border: 1px solid #e5e7eb; width: 120px;">প্রাপ্ত স্টার</th>
              </tr>
            </thead>
            <tbody>
              ${passedStudentsList.length > 0 ? passedStudentsList.map(s => {
                const mark = marks[s.id];
                return `
                <tr>
                  <td style="padding: 8px 10px; border: 1px solid #e5e7eb; font-family: monospace;">${s.roll}</td>
                  <td style="padding: 8px 10px; border: 1px solid #e5e7eb;">${s.name}</td>
                  <td style="padding: 8px 10px; border: 1px solid #e5e7eb; text-align: center; font-weight: bold; color: #059669;">${mark}★</td>
                </tr>
              `}).join('') : `<tr><td colspan="3" style="padding: 10px; text-align: center; border: 1px solid #e5e7eb; color: #6b7280;">কেউ পাস করেনি</td></tr>`}
            </tbody>
          </table>
        </div>

        <div style="margin-bottom: 30px;">
          <h3 style="color: #dc2626; border-bottom: 2px solid #dc2626; padding-bottom: 8px; margin-bottom: 15px; font-size: 18px;">
            ফেল করেছে (${failedStudentsList.length} জন)
          </h3>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background-color: #f3f4f6;">
                <th style="padding: 10px; text-align: left; border: 1px solid #e5e7eb; width: 80px;">রোল</th>
                <th style="padding: 10px; text-align: left; border: 1px solid #e5e7eb;">নাম</th>
                <th style="padding: 10px; text-align: center; border: 1px solid #e5e7eb; width: 120px;">প্রাপ্ত স্টার</th>
              </tr>
            </thead>
            <tbody>
              ${failedStudentsList.length > 0 ? failedStudentsList.map(s => `
                <tr>
                  <td style="padding: 8px 10px; border: 1px solid #e5e7eb; font-family: monospace;">${s.roll}</td>
                  <td style="padding: 8px 10px; border: 1px solid #e5e7eb;">${s.name}</td>
                  <td style="padding: 8px 10px; border: 1px solid #e5e7eb; text-align: center; font-weight: bold; color: #dc2626;">০★</td>
                </tr>
              `).join('') : `<tr><td colspan="3" style="padding: 10px; text-align: center; border: 1px solid #e5e7eb; color: #6b7280;">কেউ ফেল করেনি</td></tr>`}
            </tbody>
          </table>
        </div>

        <div>
          <h3 style="color: #6b7280; border-bottom: 2px solid #6b7280; padding-bottom: 8px; margin-bottom: 15px; font-size: 18px;">
            অনুপস্থিত (${absentStudentsList.length} জন)
          </h3>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background-color: #f3f4f6;">
                <th style="padding: 10px; text-align: left; border: 1px solid #e5e7eb; width: 80px;">রোল</th>
                <th style="padding: 10px; text-align: left; border: 1px solid #e5e7eb;">নাম</th>
              </tr>
            </thead>
            <tbody>
              ${absentStudentsList.length > 0 ? absentStudentsList.map(s => `
                <tr>
                  <td style="padding: 8px 10px; border: 1px solid #e5e7eb; font-family: monospace;">${s.roll}</td>
                  <td style="padding: 8px 10px; border: 1px solid #e5e7eb;">${s.name}</td>
                </tr>
              `).join('') : `<tr><td colspan="2" style="padding: 10px; text-align: center; border: 1px solid #e5e7eb; color: #6b7280;">সবাই উপস্থিত ছিল</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>
    `;

    const opt = {
      margin:       10,
      filename:     `exam_${exam.title}_${exam.date}.pdf`,
      image:        { type: 'jpeg' as const, quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
    };

    html2pdf().set(opt).from(element).save();
  };

  const renderStudentRow = (student: Student) => {
    const studentMark = marks[student.id];
    const isPresent = studentMark !== null && studentMark !== undefined;

    return (
      <tr key={student.id} className="border-b border-gray-50 hover:bg-gray-50/80 transition-colors">
        <td className="p-3 text-gray-800 font-mono text-sm">{student.roll}</td>
        <td className="p-3 text-gray-800 font-medium">{student.name}</td>
        <td className="p-3 text-center">
          {role === 'admin' ? (
            <button
              onClick={() => handleMarkChange(student.id, isPresent ? null : 0)}
              className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border transition-colors ${
                isPresent
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                  : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
              }`}
            >
              {isPresent ? <><CheckCircle2 className="w-3 h-3 mr-1" /> উপস্থিত</> : <><XCircle className="w-3 h-3 mr-1" /> অনুপস্থিত</>}
            </button>
          ) : (
            <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border ${
              isPresent
                ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                : 'bg-red-50 text-red-700 border-red-100'
            }`}>
              {isPresent ? <><CheckCircle2 className="w-3 h-3 mr-1" /> উপস্থিত</> : <><XCircle className="w-3 h-3 mr-1" /> অনুপস্থিত</>}
            </span>
          )}
        </td>
        <td className="p-3 text-center">
          {isPresent ? (
            studentMark !== null && studentMark >= 1 ? (
              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">পাস</span>
            ) : (
              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-bold bg-red-100 text-red-700 border border-red-200">ফেল</span>
            )
          ) : (
            <span className="text-gray-400">-</span>
          )}
        </td>
        <td className="p-3 text-center">
          {isPresent ? (
            role === 'admin' ? (
              <div className="flex items-center justify-center space-x-1">
                {[1, 2, 3].map(star => (
                  <button
                    key={star}
                    onClick={() => handleMarkChange(student.id, star)}
                    className={`focus:outline-none transition-colors ${studentMark !== null && studentMark >= star ? 'text-amber-400' : 'text-gray-200 hover:text-amber-200'}`}
                    title={`${star} Star`}
                  >
                    <Star className={`w-6 h-6 ${studentMark !== null && studentMark >= star ? 'fill-current' : ''}`} />
                  </button>
                ))}
                <button
                  onClick={() => handleMarkChange(student.id, 0)}
                  className={`ml-2 px-2 py-1 text-xs font-bold rounded-md border transition-colors ${studentMark === 0 ? 'bg-red-100 text-red-700 border-red-200' : 'bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100'}`}
                  title="0 Star"
                >
                  0
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-center space-x-1">
                {studentMark === 0 ? (
                  <span className="text-red-500 font-bold text-sm px-2 py-1 bg-red-50 rounded-md border border-red-100">০ স্টার</span>
                ) : (
                  <div className="flex">
                    {[1, 2, 3].map(star => (
                      <Star key={star} className={`w-5 h-5 ${studentMark !== null && studentMark >= star ? 'text-amber-400 fill-current' : 'text-gray-200'}`} />
                    ))}
                  </div>
                )}
              </div>
            )
          ) : (
            <span className="text-gray-400">-</span>
          )}
        </td>
      </tr>
    );
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
      <div className="p-5 bg-gray-50/50 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h3 className="text-lg font-bold text-gray-900">{exam.title}</h3>
            {role === 'admin' && (
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center ${exam.isPublished ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                {exam.isPublished ? <><Eye className="w-3 h-3 mr-1"/> পাবলিশড</> : <><EyeOff className="w-3 h-3 mr-1"/> ড্রাফট</>}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500">তারিখ: {exam.date} | মার্কিং: <span className="font-bold text-gray-700">৩ স্টার সিস্টেম</span></p>
          <p className="text-xs text-gray-500 mt-1">উপস্থিত: {presentStudents} জন (পাস: {passedStudentsList.length}, ফেল: {failedStudentsList.length}) | অনুপস্থিত: {absentStudents} জন</p>
        </div>

        {role === 'admin' && (
          <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap sm:flex-nowrap">
            {exam.spreadsheetUrl && (
              <a 
                href={exam.spreadsheetUrl} 
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
              className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-50"
              title={exam.spreadsheetId ? "Google Sheets আপডেট করুন" : "Google Sheets এ এক্সপোর্ট করুন"}
            >
              <FileSpreadsheet className="w-5 h-5" />
            </button>
            <button 
              onClick={downloadTxt}
              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="TXT ডাউনলোড করুন"
            >
              <FileText className="w-5 h-5" />
            </button>
            <button 
              onClick={downloadPdf}
              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="PDF ডাউনলোড করুন"
            >
              <Download className="w-5 h-5" />
            </button>
            <button
              onClick={handleTogglePublish}
              className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center ${exam.isPublished ? 'bg-amber-50 text-amber-700 hover:bg-amber-100' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}
            >
              {exam.isPublished ? <><EyeOff className="w-4 h-4 mr-1.5"/> আনপাবলিশ</> : <><Eye className="w-4 h-4 mr-1.5"/> পাবলিশ করুন</>}
            </button>
            {deleteConfirm ? (
              <div className="flex items-center gap-1">
                <button onClick={handleDelete} className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700">নিশ্চিত</button>
                <button onClick={() => setDeleteConfirm(false)} className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300">বাতিল</button>
              </div>
            ) : (
              <button onClick={() => setDeleteConfirm(true)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                <Trash2 className="w-5 h-5" />
              </button>
            )}
          </div>
        )}
      </div>

      <div className="p-4 border-b border-gray-100 bg-white">
        <div className="relative max-w-md">
          <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="নাম বা রোল দিয়ে খুঁজুন..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        {passedStudentsList.length > 0 && (
          <div className="mb-6">
            <div className="bg-emerald-50 px-4 py-2 border-y border-emerald-100">
              <h4 className="font-bold text-emerald-800 flex items-center">
                <CheckCircle2 className="w-4 h-4 mr-2" />
                যারা পাস করেছে ({passedStudentsList.length})
              </h4>
            </div>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white border-b border-gray-100">
                  <th className="p-3 font-semibold text-gray-600 w-20">রোল</th>
                  <th className="p-3 font-semibold text-gray-600">নাম</th>
                  <th className="p-3 font-semibold text-gray-600 text-center w-32">অবস্থা</th>
                  <th className="p-3 font-semibold text-gray-600 text-center w-24">ফলাফল</th>
                  <th className="p-3 font-semibold text-gray-600 text-center w-48">প্রাপ্ত স্টার</th>
                </tr>
              </thead>
              <tbody>
                {passedStudentsList.map(renderStudentRow)}
              </tbody>
            </table>
          </div>
        )}

        {failedStudentsList.length > 0 && (
          <div className="mb-6">
            <div className="bg-red-50 px-4 py-2 border-y border-red-100">
              <h4 className="font-bold text-red-800 flex items-center">
                <AlertTriangle className="w-4 h-4 mr-2" />
                যারা ফেল করেছে ({failedStudentsList.length})
              </h4>
            </div>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white border-b border-gray-100">
                  <th className="p-3 font-semibold text-gray-600 w-20">রোল</th>
                  <th className="p-3 font-semibold text-gray-600">নাম</th>
                  <th className="p-3 font-semibold text-gray-600 text-center w-32">অবস্থা</th>
                  <th className="p-3 font-semibold text-gray-600 text-center w-24">ফলাফল</th>
                  <th className="p-3 font-semibold text-gray-600 text-center w-48">প্রাপ্ত স্টার</th>
                </tr>
              </thead>
              <tbody>
                {failedStudentsList.map(renderStudentRow)}
              </tbody>
            </table>
          </div>
        )}

        {absentStudentsList.length > 0 && (
          <div className="mb-6">
            <div className="bg-gray-50 px-4 py-2 border-y border-gray-200">
              <h4 className="font-bold text-gray-700 flex items-center">
                <XCircle className="w-4 h-4 mr-2" />
                যারা পরীক্ষা দেয়নি ({absentStudentsList.length})
              </h4>
            </div>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white border-b border-gray-100">
                  <th className="p-3 font-semibold text-gray-600 w-20">রোল</th>
                  <th className="p-3 font-semibold text-gray-600">নাম</th>
                  <th className="p-3 font-semibold text-gray-600 text-center w-32">অবস্থা</th>
                  <th className="p-3 font-semibold text-gray-600 text-center w-24">ফলাফল</th>
                  <th className="p-3 font-semibold text-gray-600 text-center w-48">প্রাপ্ত স্টার</th>
                </tr>
              </thead>
              <tbody>
                {absentStudentsList.map(renderStudentRow)}
              </tbody>
            </table>
          </div>
        )}
        
        {filteredStudents.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            কোনো শিক্ষার্থী পাওয়া যায়নি
          </div>
        )}
      </div>
      
      {role === 'admin' && isModified && (
        <div className="p-4 bg-indigo-50 border-t border-indigo-100 flex justify-between items-center">
          <span className="text-sm text-indigo-700 flex items-center"><AlertTriangle className="w-4 h-4 mr-1.5"/> আপনি কিছু পরিবর্তন করেছেন যা সেভ করা হয়নি।</span>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 transition-colors flex items-center font-medium shadow-sm disabled:opacity-50"
          >
            <Save className="w-4 h-4 mr-1.5" /> {isSaving ? 'সেভ হচ্ছে...' : 'সেভ করুন'}
          </button>
        </div>
      )}
    </div>
  );
};

interface Props {
  students: Student[];
  exams: Exam[];
  role: 'admin' | 'student';
}

export default function ExamTracker({ students, exams, role }: Props) {
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date || !db) return;

    const newExam: Exam = {
      id: Date.now().toString(),
      title: title.trim(),
      date: date,
      totalMarks: 3,
      isPublished: false,
      marks: {},
      timestamp: Date.now()
    };

    try {
      await setDoc(doc(db, 'exams', newExam.id), newExam);
      setTitle('');
      setDate('');
      setIsAdding(false);
    } catch (error: any) {
      alert("পরীক্ষা যোগ করা যায়নি! Error: " + error.message);
    }
  };

  const visibleExams = role === 'admin' ? exams : exams.filter(e => e.isPublished);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center">
          <FileText className="w-6 h-6 mr-2 text-indigo-600" />
          পরীক্ষার ফলাফল
        </h2>
        {role === 'admin' && !isAdding && (
          <button 
            onClick={() => setIsAdding(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 transition-colors flex items-center shadow-sm font-medium"
          >
            <Plus className="w-5 h-5 mr-1" /> নতুন পরীক্ষা
          </button>
        )}
      </div>

      {isAdding && role === 'admin' && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-indigo-100 mb-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
          <h3 className="text-lg font-bold text-gray-800 mb-4">নতুন পরীক্ষা যোগ করুন</h3>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">পরীক্ষার নাম</label>
                <input 
                  type="text" 
                  placeholder="যেমন: সাপ্তাহিক পরীক্ষা ১" 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">তারিখ</label>
                <input 
                  type="date" 
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  required
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 pt-2">
              <button 
                type="button" 
                onClick={() => setIsAdding(false)}
                className="px-5 py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors font-medium"
              >
                বাতিল
              </button>
              <button 
                type="submit"
                className="px-5 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl transition-colors font-medium shadow-sm"
              >
                তৈরি করুন
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-6">
        {visibleExams.length === 0 ? (
          <div className="bg-white p-10 rounded-2xl shadow-sm border border-gray-100 text-center">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">কোনো পরীক্ষা নেই</h3>
            <p className="text-gray-500">বর্তমানে কোনো পরীক্ষার ফলাফল যোগ করা হয়নি।</p>
          </div>
        ) : (
          visibleExams.map(exam => (
            <ExamCard key={exam.id} exam={exam} allExams={exams} students={students} role={role} />
          ))
        )}
      </div>
    </div>
  );
}
