import React, { useState } from 'react';
import { Notice } from '../types';
import { Bell, Plus, Trash2, Calendar, Clock } from 'lucide-react';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface Props {
  notices: Notice[];
  role: 'admin' | 'student';
}

export default function NoticeBoard({ notices, role }: Props) {
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim() || !db) return;

    const newNotice: Notice = {
      id: Date.now().toString(),
      title: title.trim(),
      content: content.trim(),
      date: new Date().toLocaleDateString('bn-BD', { day: 'numeric', month: 'long', year: 'numeric' }),
      timestamp: Date.now()
    };

    try {
      await setDoc(doc(db, 'notices', newNotice.id), newNotice);
      setTitle('');
      setContent('');
      setIsAdding(false);
    } catch (error: any) {
      console.error("Error adding notice:", error);
      alert("নোটিশ যোগ করা যায়নি! Firebase Rules চেক করুন। Error: " + error.message);
    }
  };

  const confirmDelete = async () => {
    if (deleteConfirmId && db) {
      try {
        await deleteDoc(doc(db, 'notices', deleteConfirmId));
        setDeleteConfirmId(null);
      } catch (error: any) {
        console.error("Error deleting notice:", error);
        alert("নোটিশ মুছে ফেলা যায়নি! Firebase Rules চেক করুন। Error: " + error.message);
      }
    }
  };

  return (
    <div className="space-y-6">
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-2xl shadow-xl max-w-sm w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-2">নিশ্চিত করুন</h3>
            <p className="text-gray-600 mb-6">আপনি কি নিশ্চিত যে এই নোটিশটি মুছে ফেলতে চান?</p>
            <div className="flex justify-end space-x-3">
              <button onClick={() => setDeleteConfirmId(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">বাতিল</button>
              <button onClick={confirmDelete} className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-xl transition-colors">মুছে ফেলুন</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center">
          <Bell className="w-6 h-6 mr-2 text-indigo-600" />
          নোটিশ বোর্ড
        </h2>
        {role === 'admin' && !isAdding && (
          <button 
            onClick={() => setIsAdding(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 transition-colors flex items-center shadow-sm font-medium"
          >
            <Plus className="w-5 h-5 mr-1" /> নতুন নোটিশ
          </button>
        )}
      </div>

      {isAdding && role === 'admin' && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-indigo-100 mb-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
          <h3 className="text-lg font-bold text-gray-800 mb-4">নতুন নোটিশ যোগ করুন</h3>
          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">শিরোনাম</label>
              <input 
                type="text" 
                placeholder="নোটিশের শিরোনাম লিখুন..." 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">বিস্তারিত</label>
              <textarea 
                placeholder="নোটিশের বিস্তারিত বিবরণ লিখুন..." 
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all min-h-[120px] resize-y"
                required
              />
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
                প্রকাশ করুন
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-4">
        {notices.length === 0 ? (
          <div className="bg-white p-10 rounded-2xl shadow-sm border border-gray-100 text-center">
            <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">কোনো নোটিশ নেই</h3>
            <p className="text-gray-500">বর্তমানে কোনো নতুন নোটিশ দেওয়া হয়নি।</p>
          </div>
        ) : (
          notices.map(notice => (
            <div key={notice.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1 h-full bg-indigo-400"></div>
              
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-xl font-bold text-gray-900 pr-8">{notice.title}</h3>
                {role === 'admin' && (
                  <button 
                    onClick={() => setDeleteConfirmId(notice.id)}
                    className="text-gray-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                    title="মুছে ফেলুন"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
              
              <p className="text-gray-700 whitespace-pre-wrap mb-4 leading-relaxed">{notice.content}</p>
              
              <div className="flex items-center text-xs text-gray-500 font-medium bg-gray-50 inline-flex px-3 py-1.5 rounded-lg">
                <Calendar className="w-3.5 h-3.5 mr-1.5 text-indigo-500" />
                {notice.date}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
