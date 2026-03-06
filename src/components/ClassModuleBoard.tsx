import React, { useState } from 'react';
import { ClassModule } from '../types';
import { BookOpen, Plus, Trash2, Calendar, ExternalLink } from 'lucide-react';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface Props {
  modules: ClassModule[];
  role: 'admin' | 'student';
}

export default function ClassModuleBoard({ modules, role }: Props) {
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [link, setLink] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !db) return;

    const newModule: ClassModule = {
      id: Date.now().toString(),
      title: title.trim(),
      description: description.trim(),
      link: link.trim(),
      date: new Date().toLocaleDateString('bn-BD', { day: 'numeric', month: 'long', year: 'numeric' }),
      timestamp: Date.now()
    };

    try {
      await setDoc(doc(db, 'modules', newModule.id), newModule);
      setTitle('');
      setDescription('');
      setLink('');
      setIsAdding(false);
    } catch (error: any) {
      console.error("Error adding module:", error);
      alert("মডিউল যোগ করা যায়নি! Firebase Rules চেক করুন। Error: " + error.message);
    }
  };

  const confirmDelete = async () => {
    if (deleteConfirmId && db) {
      try {
        await deleteDoc(doc(db, 'modules', deleteConfirmId));
        setDeleteConfirmId(null);
      } catch (error: any) {
        console.error("Error deleting module:", error);
        alert("মডিউল মুছে ফেলা যায়নি! Firebase Rules চেক করুন। Error: " + error.message);
      }
    }
  };

  return (
    <div className="space-y-6">
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-2xl shadow-xl max-w-sm w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-2">নিশ্চিত করুন</h3>
            <p className="text-gray-600 mb-6">আপনি কি নিশ্চিত যে এই মডিউলটি মুছে ফেলতে চান?</p>
            <div className="flex justify-end space-x-3">
              <button onClick={() => setDeleteConfirmId(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">বাতিল</button>
              <button onClick={confirmDelete} className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-xl transition-colors">মুছে ফেলুন</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center">
          <BookOpen className="w-6 h-6 mr-2 text-blue-600" />
          ক্লাস মডিউল
        </h2>
        {role === 'admin' && !isAdding && (
          <button 
            onClick={() => setIsAdding(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors flex items-center shadow-sm font-medium"
          >
            <Plus className="w-5 h-5 mr-1" /> নতুন মডিউল
          </button>
        )}
      </div>

      {isAdding && role === 'admin' && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-blue-100 mb-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
          <h3 className="text-lg font-bold text-gray-800 mb-4">নতুন ক্লাস মডিউল যোগ করুন</h3>
          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">মডিউলের নাম/শিরোনাম</label>
              <input 
                type="text" 
                placeholder="যেমন: লেকচার ১ - নিউটনিয়ান বলবিদ্যা" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">বিস্তারিত বিবরণ</label>
              <textarea 
                placeholder="মডিউলের বিস্তারিত বিবরণ লিখুন..." 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all min-h-[100px] resize-y"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">লিংক (ঐচ্ছিক)</label>
              <input 
                type="url" 
                placeholder="যেমন: ড্রাইভ লিংক বা ভিডিও লিংক" 
                value={link}
                onChange={(e) => setLink(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
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
                className="px-5 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-xl transition-colors font-medium shadow-sm"
              >
                সেভ করুন
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {modules.length === 0 ? (
          <div className="col-span-full bg-white p-10 rounded-2xl shadow-sm border border-gray-100 text-center">
            <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">কোনো মডিউল নেই</h3>
            <p className="text-gray-500">বর্তমানে কোনো ক্লাস মডিউল যোগ করা হয়নি।</p>
          </div>
        ) : (
          modules.map(module => (
            <div key={module.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative overflow-hidden group flex flex-col h-full">
              <div className="absolute top-0 left-0 w-1 h-full bg-blue-400"></div>
              
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-lg font-bold text-gray-900 pr-8">{module.title}</h3>
                {role === 'admin' && (
                  <button 
                    onClick={() => setDeleteConfirmId(module.id)}
                    className="text-gray-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 flex-shrink-0"
                    title="মুছে ফেলুন"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
              
              <p className="text-gray-600 text-sm whitespace-pre-wrap mb-4 flex-grow">{module.description}</p>
              
              <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-50">
                <div className="flex items-center text-xs text-gray-500 font-medium">
                  <Calendar className="w-3.5 h-3.5 mr-1.5 text-blue-500" />
                  {module.date}
                </div>
                
                {module.link && (
                  <a 
                    href={module.link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center text-xs font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                    লিংক খুলুন
                  </a>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
