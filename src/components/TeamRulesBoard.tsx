import React, { useState } from 'react';
import { TeamRule } from '../types';
import { Shield, Plus, Trash2, CheckCircle, Edit2 } from 'lucide-react';
import { doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import toast from 'react-hot-toast';

interface Props {
  rules: TeamRule[];
  role: 'admin' | 'student';
}

export default function TeamRulesBoard({ rules, role }: Props) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const startEdit = (rule: TeamRule) => {
    setEditingId(rule.id);
    setTitle(rule.title);
    setContent(rule.content);
    setIsAdding(true);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setTitle('');
    setContent('');
    setIsAdding(false);
  };

  const handleAddOrEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim() || !db) return;

    try {
      if (editingId) {
        // Edit existing rule
        const ruleRef = doc(db, 'rules', editingId);
        await updateDoc(ruleRef, {
          title: title.trim(),
          content: content.trim(),
        });
        toast.success('নিয়ম সফলভাবে আপডেট করা হয়েছে!');
      } else {
        // Add new rule
        const newRule: TeamRule = {
          id: Date.now().toString(),
          title: title.trim(),
          content: content.trim(),
          timestamp: Date.now()
        };
        await setDoc(doc(db, 'rules', newRule.id), newRule);
        toast.success('নতুন নিয়ম সফলভাবে যোগ করা হয়েছে!');
      }
      
      cancelEdit();
    } catch (error: any) {
      console.error("Error saving rule:", error);
      toast.error("নিয়ম সেভ করা যায়নি! Error: " + error.message);
    }
  };

  const confirmDelete = async () => {
    if (deleteConfirmId && db) {
      try {
        await deleteDoc(doc(db, 'rules', deleteConfirmId));
        setDeleteConfirmId(null);
        toast.success('নিয়ম সফলভাবে মুছে ফেলা হয়েছে!');
      } catch (error: any) {
        console.error("Error deleting rule:", error);
        toast.error("নিয়ম মুছে ফেলা যায়নি! Error: " + error.message);
      }
    }
  };

  return (
    <div className="space-y-6">
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-2xl shadow-xl max-w-sm w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-2">নিশ্চিত করুন</h3>
            <p className="text-gray-600 mb-6">আপনি কি নিশ্চিত যে এই নিয়মটি মুছে ফেলতে চান?</p>
            <div className="flex justify-end space-x-3">
              <button onClick={() => setDeleteConfirmId(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">বাতিল</button>
              <button onClick={confirmDelete} className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-xl transition-colors">মুছে ফেলুন</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center">
          <Shield className="w-6 h-6 mr-2 text-emerald-600" />
          টিমের নিয়মকানুন
        </h2>
        {role === 'admin' && !isAdding && (
          <button 
            onClick={() => setIsAdding(true)}
            className="bg-emerald-600 text-white px-4 py-2 rounded-xl hover:bg-emerald-700 transition-colors flex items-center shadow-sm font-medium"
          >
            <Plus className="w-5 h-5 mr-1" /> নতুন নিয়ম
          </button>
        )}
      </div>

      {isAdding && role === 'admin' && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-emerald-100 mb-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
          <h3 className="text-lg font-bold text-gray-800 mb-4">{editingId ? 'নিয়ম এডিট করুন' : 'নতুন নিয়ম যোগ করুন'}</h3>
          <form onSubmit={handleAddOrEdit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">নিয়মের শিরোনাম</label>
              <input 
                type="text" 
                placeholder="যেমন: হোমওয়ার্ক জমা দেওয়ার সময়সীমা" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">বিস্তারিত নিয়ম</label>
              <textarea 
                placeholder="নিয়মের বিস্তারিত বিবরণ লিখুন..." 
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all min-h-[100px] resize-y"
                required
              />
            </div>
            <div className="flex justify-end space-x-3 pt-2">
              <button 
                type="button" 
                onClick={cancelEdit}
                className="px-5 py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors font-medium"
              >
                বাতিল
              </button>
              <button 
                type="submit"
                className="px-5 py-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl transition-colors font-medium shadow-sm"
              >
                {editingId ? 'আপডেট করুন' : 'সেভ করুন'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {rules.length === 0 ? (
          <div className="p-10 text-center">
            <Shield className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">কোনো নিয়ম নেই</h3>
            <p className="text-gray-500">বর্তমানে টিমের কোনো নিয়মকানুন যোগ করা হয়নি।</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {rules.map((rule, index) => (
              <div key={rule.id} className="p-5 hover:bg-gray-50/50 transition-colors relative group flex items-start gap-4">
                <div className="flex-shrink-0 mt-1">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">
                    {index + 1}
                  </div>
                </div>
                
                <div className="flex-grow">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="text-lg font-bold text-gray-900 pr-8">{rule.title}</h3>
                    {role === 'admin' && (
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => startEdit(rule)}
                          className="text-emerald-400 hover:text-emerald-600 p-1.5 rounded-lg hover:bg-emerald-50 transition-colors focus:outline-none flex-shrink-0"
                          title="এডিট করুন"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => setDeleteConfirmId(rule.id)}
                          className="text-red-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors focus:outline-none flex-shrink-0"
                          title="মুছে ফেলুন"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    )}
                  </div>
                  <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{rule.content}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
