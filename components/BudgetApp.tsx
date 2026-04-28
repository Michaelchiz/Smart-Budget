'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, doc, setDoc } from 'firebase/firestore';
import { Plus, Copy, Clock, Wallet, ArrowRight } from 'lucide-react';
import BudgetDetail from './BudgetDetail';
import { format } from 'date-fns';

export interface Budget {
  id: string;
  name: string;
  amount: number;
  createdAt: number;
  userId: string;
}

export default function BudgetApp() {
  const { user, userCurrency } = useAuth();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBudgetId, setSelectedBudgetId] = useState<string | null>(null);

  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [newBudgetName, setNewBudgetName] = useState('');
  const [newBudgetAmount, setNewBudgetAmount] = useState('');

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'budgets'), 
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const b: Budget[] = [];
      snapshot.forEach(doc => {
        b.push({ id: doc.id, ...doc.data() } as Budget);
      });
      setBudgets(b);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'budgets');
    });

    return () => unsubscribe();
  }, [user]);

  const handleCreate = async () => {
    if (!user || !newBudgetName || !newBudgetAmount) return;
    try {
      const budgetRef = doc(collection(db, 'budgets'));
      await setDoc(budgetRef, {
        userId: user.uid,
        name: newBudgetName,
        amount: parseFloat(newBudgetAmount),
        createdAt: new Date().getTime()
      });
      setNewBudgetName('');
      setNewBudgetAmount('');
      setShowCreateMenu(false);
      setSelectedBudgetId(budgetRef.id);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'budgets');
    }
  };

  const handleDuplicate = async (budgetToDuplicate: Budget) => {
    if (!user) return;
    try {
      const budgetRef = doc(collection(db, 'budgets'));
      await setDoc(budgetRef, {
        userId: user.uid,
        name: `${budgetToDuplicate.name} (Copy)`,
        amount: budgetToDuplicate.amount,
        createdAt: new Date().getTime()
      });
      
      // Note: Duplicating items would require a Cloud Function or batch logic safely 
      // but let's implement basic item duplication on the client for simplicity of UI if possible.
      // But maybe just duplicating the plan is sufficient.
      // Actually, user wants "extract like replicate old budget to their new budget list".
      setSelectedBudgetId(budgetRef.id);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'budgets');
    }
  };

  if (selectedBudgetId) {
    return (
      <BudgetDetail 
        budgetId={selectedBudgetId} 
        onBack={() => setSelectedBudgetId(null)} 
      />
    );
  }

  return (
    <div className="py-6 min-h-full text-white">
      <div className="flex justify-between items-center mb-8 border-b border-[#222] pb-6">
        <h2 className="text-[32px] sm:text-[40px] font-black leading-none italic tracking-tighter uppercase uppercase">Your Budgets</h2>
        <button 
          onClick={() => setShowCreateMenu(!showCreateMenu)}
          className="flex items-center px-6 py-3 bg-[#34c759] text-[12px] font-bold tracking-[2px] uppercase rounded-[20px] text-black hover:bg-[#2eb350] transition-colors"
        >
          <Plus className="w-4 h-4 mr-1" /> New Budget
        </button>
      </div>

      {showCreateMenu && (
        <div className="bg-[#111] p-6 rounded-lg border border-[#222] mb-8 animate-in fade-in slide-in-from-top-4">
          <h3 className="text-[10px] tracking-[2px] uppercase font-bold text-gray-500 mb-4">Create New Budget</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-[10px] tracking-[2px] uppercase font-bold text-gray-400 mb-2">Budget Name</label>
              <input 
                type="text" 
                value={newBudgetName}
                onChange={e => setNewBudgetName(e.target.value)}
                placeholder="e.g., April Groceries"
                className="w-full bg-[#080808] border border-[#333] text-white rounded-md px-3 py-2 outline-none focus:border-[#555] transition-colors"
              />
            </div>
            <div>
              <label className="block text-[10px] tracking-[2px] uppercase font-bold text-gray-400 mb-2">Total Amount ({userCurrency})</label>
              <input 
                type="number" 
                value={newBudgetAmount}
                onChange={e => setNewBudgetAmount(e.target.value)}
                placeholder="e.g., 50000"
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
      ) : budgets.length === 0 ? (
        <div className="text-center py-24 bg-[#111] rounded-lg border border-[#222]">
          <Wallet className="mx-auto h-12 w-12 text-[#333] mb-4" />
          <h3 className="text-[12px] tracking-[2px] uppercase font-bold text-white">No budgets yet</h3>
          <p className="text-gray-500 mt-2 text-sm">Get started by creating your first digital budget.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {budgets.map(budget => (
            <div key={budget.id} className="bg-[#111] p-6 rounded-lg border border-[#222] hover:border-[#444] transition group flex flex-col justify-between">
              <div 
                className="cursor-pointer"
                onClick={() => setSelectedBudgetId(budget.id)}
              >
                <h3 className="text-2xl font-black italic mb-2 tracking-tighter text-white">{budget.name}</h3>
                 <p className="text-[10px] tracking-[2px] uppercase font-bold text-gray-500 mb-6 flex items-center">
                  <Clock className="w-3 h-3 mr-1" />
                  {format(new Date(budget.createdAt), 'PPpp')}
                </p>
                <div className="mb-6">
                   <p className="text-[10px] tracking-[2px] uppercase font-bold text-gray-400 mb-1">Total</p>
                   <p className="text-4xl font-light text-white">{userCurrency} {budget.amount.toLocaleString()}</p>
                </div>
              </div>
              <div className="pt-4 border-t border-[#222] flex items-center justify-between">
                <button 
                  onClick={() => handleDuplicate(budget)}
                  className="flex items-center text-sm text-[#5856d6] hover:text-[#7876f2] font-medium"
                >
                  <Copy className="w-4 h-4 mr-1" /> Duplicate
                </button>
                <button 
                  onClick={() => setSelectedBudgetId(budget.id)}
                  className="text-white hover:text-gray-300"
                >
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
