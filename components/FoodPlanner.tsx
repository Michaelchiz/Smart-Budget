'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { collection, query, where, orderBy, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { Plus, Calendar as CalendarIcon, Clock } from 'lucide-react';
import { format } from 'date-fns';
import FoodPlannerDetail from './FoodPlannerDetail';

export interface FoodList {
  id: string;
  name: string;
  startDate: number;
  userId: string;
  createdAt: number;
}

export default function FoodPlanner() {
  const { user } = useAuth();
  const [lists, setLists] = useState<FoodList[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);

  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newStartDate, setNewStartDate] = useState('');

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'foodLists'), 
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fl: FoodList[] = [];
      snapshot.forEach(doc => {
        fl.push({ id: doc.id, ...doc.data() } as FoodList);
      });
      setLists(fl);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'foodLists');
    });

    return () => unsubscribe();
  }, [user]);

  const handleCreate = async () => {
    if (!user || !newListName || !newStartDate) return;
    try {
      const listRef = doc(collection(db, 'foodLists'));
      await setDoc(listRef, {
        userId: user.uid,
        name: newListName,
        startDate: new Date(newStartDate).getTime(),
        createdAt: Date.now()
      });
      setNewListName('');
      setNewStartDate('');
      setShowCreateMenu(false);
      setSelectedListId(listRef.id);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'foodLists');
    }
  };

  if (selectedListId) {
    return (
      <FoodPlannerDetail 
        listId={selectedListId} 
        onBack={() => setSelectedListId(null)} 
      />
    );
  }

  return (
    <div className="py-6 min-h-full text-white">
      <div className="flex justify-between items-center mb-8 border-b border-[#222] pb-6">
        <h2 className="text-[32px] sm:text-[40px] font-black leading-none italic tracking-tighter uppercase uppercase">Pantry Plans</h2>
        <button 
          onClick={() => setShowCreateMenu(!showCreateMenu)}
          className="flex items-center px-6 py-3 bg-[#34c759] text-[12px] font-bold tracking-[2px] uppercase rounded-[20px] text-black hover:bg-[#2eb350] transition-colors"
        >
          <Plus className="w-4 h-4 mr-1" /> New Plan
        </button>
      </div>

      {showCreateMenu && (
        <div className="bg-[#111] p-6 rounded-lg border border-[#222] mb-8 animate-in fade-in slide-in-from-top-4">
          <h3 className="text-[10px] tracking-[2px] uppercase font-bold text-gray-500 mb-4">Create New Pantry Plan</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-[10px] tracking-[2px] uppercase font-bold text-gray-400 mb-2">Plan Name</label>
              <input 
                type="text" 
                value={newListName}
                onChange={e => setNewListName(e.target.value)}
                placeholder="e.g., May Groceries Lifespan"
                className="w-full bg-[#080808] border border-[#333] text-white rounded-md px-3 py-2 outline-none focus:border-[#555] transition-colors"
              />
            </div>
            <div>
              <label className="block text-[10px] tracking-[2px] uppercase font-bold text-gray-400 mb-2">Start Date</label>
              <input 
                type="date" 
                value={newStartDate}
                onChange={e => setNewStartDate(e.target.value)}
                className="w-full bg-[#080808] border border-[#333] text-white rounded-md px-3 py-2 outline-none focus:border-[#555] transition-colors"
              />
            </div>
          </div>
          <div className="flex justify-end space-x-3">
             <button onClick={() => setShowCreateMenu(false)} className="px-6 py-3 border border-[#333] rounded-[20px] text-[12px] font-bold tracking-[2px] uppercase text-white hover:bg-[#222] transition-colors">Cancel</button>
             <button onClick={handleCreate} className="px-6 py-3 bg-white text-black text-[12px] font-bold tracking-[2px] uppercase rounded-[20px] hover:bg-gray-200 transition-colors">Save</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-gray-500 text-[12px] font-bold tracking-[2px] uppercase">Loading...</div>
      ) : lists.length === 0 ? (
        <div className="text-center py-24 bg-[#111] rounded-lg border border-[#222]">
          <CalendarIcon className="mx-auto h-12 w-12 text-[#333] mb-4" />
          <h3 className="text-[12px] tracking-[2px] uppercase font-bold text-white">No plans yet</h3>
          <p className="text-gray-500 mt-2 text-sm">Start predicting how long your food will last.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {lists.map(list => (
            <div 
              key={list.id} 
              className="bg-[#111] p-6 rounded-lg border border-[#222] hover:border-[#444] cursor-pointer transition group"
              onClick={() => setSelectedListId(list.id)}
            >
              <h3 className="text-2xl font-black italic mb-4 tracking-tighter text-white">{list.name}</h3>
              <div className="flex items-center text-[10px] tracking-[2px] uppercase font-bold text-[#5856d6] mb-3">
                <CalendarIcon className="w-3 h-3 mr-1.5" />
                Starts: {format(new Date(list.startDate), 'PPP')}
              </div>
              <div className="flex items-center text-[10px] tracking-[2px] uppercase text-gray-500 font-bold">
                <Clock className="w-3 h-3 mr-1.5" />
                Created: {format(new Date(list.createdAt), 'PP')}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
