import React, { useState } from 'react';
import { Complaint, Student } from '../types';
import { MessageSquareWarning, Send, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import { collection, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';

interface Props {
  complaints: Complaint[];
  role: 'admin' | 'student' | null;
  students: Student[];
}

export default function ComplaintBox({ complaints, role, students }: Props) {
  const [name, setName] = useState('');
  const [roll, setRoll] = useState('');
  const [text, setText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [adminSuccessMsg, setAdminSuccessMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db) return;

    if (!name.trim() || !roll.trim() || !text.trim()) {
      setErrorMsg('সবগুলো ঘর পূরণ করুন!');
      return;
    }

    // Verify student exists
    const studentExists = students.some(
      s => s.roll === roll.trim()
    );

    if (!studentExists) {
      setErrorMsg('এই রোল নম্বরের কোনো শিক্ষার্থী পাওয়া যায়নি!');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');
    
    try {
      await addDoc(collection(db, 'complaints'), {
        studentName: name.trim(),
        studentRoll: roll.trim(),
        text: text.trim(),
        timestamp: Date.now(),
        isRead: false
      });
      
      setName('');
      setRoll('');
      setText('');
      setSuccessMsg('আপনার অভিযোগ সফলভাবে জমা দেওয়া হয়েছে।');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (error: any) {
      setErrorMsg('অভিযোগ জমা দেওয়া যায়নি! Error: ' + error.message);
    }
    
    setIsSubmitting(false);
  };

  const markAsRead = async (id: string, currentStatus: boolean) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, 'complaints', id), { isRead: !currentStatus });
    } catch (error: any) {
      alert('স্ট্যাটাস আপডেট করা যায়নি! Error: ' + error.message);
    }
  };

  const deleteComplaint = (id: string) => {
    setDeleteConfirmId(id);
  };

  const confirmDelete = async () => {
    if (!db || !deleteConfirmId) return;
    try {
      await deleteDoc(doc(db, 'complaints', deleteConfirmId));
      setAdminSuccessMsg('অভিযোগটি সফলভাবে মুছে ফেলা হয়েছে।');
      setTimeout(() => setAdminSuccessMsg(''), 3000);
    } catch (error: any) {
      alert('অভিযোগ মুছে ফেলা যায়নি! Error: ' + error.message);
    }
    setDeleteConfirmId(null);
  };

  if (role === 'student') {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center">
            <MessageSquareWarning className="w-6 h-6 mr-2 text-indigo-600" />
            অভিযোগ বক্স
          </h2>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <p className="text-gray-600 mb-6">
            আপনার কোনো অভিযোগ বা মতামত থাকলে নিচে বিস্তারিত লিখুন। আপনার অভিযোগটি শুধুমাত্র শিক্ষকরা দেখতে পাবেন।
          </p>

          {successMsg && (
            <div className="mb-6 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl flex items-center">
              <CheckCircle2 className="w-5 h-5 mr-2" />
              {successMsg}
            </div>
          )}

          {errorMsg && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center">
              <AlertCircle className="w-5 h-5 mr-2" />
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">আপনার নাম</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="আপনার পুরো নাম"
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">রোল নম্বর</label>
                <input
                  type="text"
                  value={roll}
                  onChange={(e) => setRoll(e.target.value)}
                  placeholder="আপনার রোল নম্বর"
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">অভিযোগ বা মতামত</label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="আপনার অভিযোগ বিস্তারিত লিখুন..."
                rows={5}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                required
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full flex items-center justify-center py-3 px-4 rounded-xl text-white font-medium transition-colors ${
                isSubmitting ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              <Send className="w-5 h-5 mr-2" />
              {isSubmitting ? 'জমা দেওয়া হচ্ছে...' : 'জমা দিন'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Admin View
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center">
          <MessageSquareWarning className="w-6 h-6 mr-2 text-indigo-600" />
          অভিযোগ বক্স ({complaints.length})
        </h2>
      </div>

      {adminSuccessMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl flex items-center">
          <CheckCircle2 className="w-5 h-5 mr-2" />
          {adminSuccessMsg}
        </div>
      )}

      {complaints.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <MessageSquareWarning className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">কোনো অভিযোগ নেই</h3>
          <p className="text-gray-500 mt-1">শিক্ষার্থীদের কোনো অভিযোগ পাওয়া যায়নি।</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {complaints.map((complaint) => (
            <div 
              key={complaint.id} 
              className={`bg-white rounded-2xl shadow-sm border p-5 transition-colors ${
                complaint.isRead ? 'border-gray-100' : 'border-indigo-200 bg-indigo-50/30'
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">{complaint.studentName}</h3>
                  <div className="flex items-center text-sm text-gray-500 mt-1">
                    <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-700 font-medium mr-2">
                      রোল: {complaint.studentRoll}
                    </span>
                    <span>{new Date(complaint.timestamp).toLocaleString('bn-BD')}</span>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => markAsRead(complaint.id, complaint.isRead)}
                    className={`p-2 rounded-lg transition-colors ${
                      complaint.isRead 
                        ? 'text-gray-400 hover:bg-gray-100 hover:text-gray-600' 
                        : 'text-indigo-600 bg-indigo-100 hover:bg-indigo-200'
                    }`}
                    title={complaint.isRead ? "আনরিড করুন" : "রিড করুন"}
                  >
                    <CheckCircle2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => deleteComplaint(complaint.id)}
                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="মুছে ফেলুন"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="bg-gray-50 p-4 rounded-xl text-gray-700 whitespace-pre-wrap">
                {complaint.text}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-xl font-bold text-gray-900 mb-2">অভিযোগ মুছুন</h3>
            <p className="text-gray-600 mb-6">
              আপনি কি নিশ্চিত যে এই অভিযোগটি মুছে ফেলতে চান? এই অ্যাকশনটি বাতিল করা যাবে না।
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors font-medium"
              >
                বাতিল
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors font-medium"
              >
                মুছে ফেলুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
