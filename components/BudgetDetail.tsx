'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { doc, getDoc, collection, query, onSnapshot, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { ArrowLeft, CheckCircle2, Circle, ShoppingBag, Plus, Trash2 } from 'lucide-react';

interface BudgetItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  isChecked: boolean;
  createdAt: number;
}

export default function BudgetDetail({ budgetId, onBack }: { budgetId: string, onBack: () => void }) {
  const { userCurrency } = useAuth();
  const [budget, setBudget] = useState<any>(null);
  const [items, setItems] = useState<BudgetItem[]>([]);
  const [marketMode, setMarketMode] = useState(false);

  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');

  useEffect(() => {
    const fetchBudget = async () => {
      try {
        const d = await getDoc(doc(db, 'budgets', budgetId));
        if (d.exists()) setBudget(d.data());
      } catch (e) {
        handleFirestoreError(e, OperationType.GET, 'budgets');
      }
    };
    fetchBudget();

    const q = query(collection(db, 'budgets', budgetId, 'items'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const itms: BudgetItem[] = [];
      snapshot.forEach(doc => {
        itms.push({ id: doc.id, ...doc.data() } as BudgetItem);
      });
      // Sort by creation generally
      itms.sort((a,b) => a.createdAt - b.createdAt);
      setItems(itms);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'budgetItems');
    });

    return () => unsubscribe();
  }, [budgetId]);

  const handleAddItem = async () => {
    if (!newItemName || !newItemQty || !newItemPrice) return;
    try {
      const itemRef = doc(collection(db, 'budgets', budgetId, 'items'));
      await setDoc(itemRef, {
        name: newItemName,
        quantity: parseFloat(newItemQty),
        price: parseFloat(newItemPrice),
        isChecked: false,
        createdAt: Date.now()
      });
      setNewItemName('');
      setNewItemQty('');
      setNewItemPrice('');
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'budgetItems');
    }
  };

  const toggleCheck = async (item: BudgetItem) => {
    try {
      await updateDoc(doc(db, 'budgets', budgetId, 'items', item.id), {
        isChecked: !item.isChecked
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, 'budgetItems');
    }
  };

  const deleteItem = async (itemId: string) => {
    try {
      await deleteDoc(doc(db, 'budgets', budgetId, 'items', itemId));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, 'budgetItems');
    }
  }

  if (!budget) return <div className="py-12 text-center text-gray-500">Loading budget...</div>;

  const totalUsed = items.reduce((acc, item) => acc + (item.quantity * item.price), 0);
  const remaining = budget.amount - totalUsed;
  const isOverBudget = remaining < 0;

  // In market mode, we can show total checked price vs total items
  const checkedUsed = items.filter(i => i.isChecked).reduce((acc, item) => acc + (item.quantity * item.price), 0);

  return (
    <div className="text-white">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8">
        <button onClick={onBack} className="self-start sm:self-auto flex items-center mb-4 sm:mb-0 px-4 py-2 border border-[#333] rounded-[20px] text-[10px] tracking-[2px] uppercase font-bold hover:bg-[#222] transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Budgets
        </button>
        <button 
          onClick={() => setMarketMode(!marketMode)}
          className={`self-start sm:self-auto flex items-center px-6 py-2 rounded-[20px] text-[10px] tracking-[2px] uppercase font-bold transition-colors ${marketMode ? 'bg-[#5856d6] text-white border-transparent' : 'bg-transparent border border-[#333] text-gray-300 hover:text-white'}`}
        >
          <ShoppingBag className="w-4 h-4 mr-2" />
          {marketMode ? 'Exit Market Mode' : 'Enter Market Mode'}
        </button>
      </div>

      <div className="bg-[#111] border border-[#222] rounded-lg p-6 mb-8 flex flex-col sm:flex-row sm:items-center justify-between">
        <div>
          <h2 className="text-[32px] sm:text-[40px] font-black leading-none italic tracking-tighter uppercase uppercase mb-1">{budget.name}</h2>
          <p className="text-[10px] tracking-[2px] uppercase font-bold text-gray-500 flex items-center">
             Created {new Date(budget.createdAt).toLocaleDateString()}
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-8 mt-6 sm:mt-0">
          <div className="mb-4 sm:mb-0">
             <p className="text-[10px] text-gray-500 uppercase tracking-[2px] font-bold mb-1">Total Budget</p>
             <p className="text-3xl font-light">{userCurrency} {budget.amount.toLocaleString()}</p>
          </div>
          
          <div className={`p-4 rounded-lg border text-right pr-6 ${isOverBudget ? 'bg-[#ff3b30]/10 border-[#ff3b30]/30' : 'bg-[#34c759]/10 border-[#34c759]/30'}`}>
            <p className={`text-[10px] uppercase tracking-[2px] font-bold mb-1 ${isOverBudget ? 'text-[#ff3b30]' : 'text-[#34c759]'}`}>
              Remaining Balance
            </p>
            <p className={`text-3xl font-bold ${isOverBudget ? 'text-[#ff3b30]' : 'text-[#34c759]'}`}>
              {userCurrency} {remaining.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {marketMode && (
        <div className="bg-[#5856d6]/20 border border-[#5856d6]/50 rounded-lg p-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between text-[#7876f2]">
           <span className="mb-2 sm:mb-0 text-sm"><strong>Market Mode:</strong> Tap items to mark them as picked up.</span>
           <span className="font-bold border-t sm:border-t-0 sm:border-l border-[#5856d6]/30 pt-2 sm:pt-0 sm:pl-4">Spent so far: {userCurrency} {checkedUsed.toLocaleString()}</span>
        </div>
      )}

      <div className="bg-[#111] rounded-lg border border-[#222] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="border-b border-[#222] bg-[#080808]">
                {marketMode && <th className="p-4 w-12"></th>}
                <th className="p-4 text-[10px] tracking-[2px] uppercase font-bold text-gray-500">Item</th>
                <th className="p-4 text-[10px] tracking-[2px] uppercase font-bold text-gray-500">Quantity</th>
                <th className="p-4 text-[10px] tracking-[2px] uppercase font-bold text-gray-500">Price ({userCurrency})</th>
                <th className="p-4 text-[10px] tracking-[2px] uppercase font-bold text-gray-500">Total</th>
                {!marketMode && <th className="p-4 w-12 text-center text-[10px] tracking-[2px] uppercase font-bold text-gray-500">Action</th>}
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr 
                  key={item.id} 
                  className={`border-b border-[#222] hover:bg-[#1a1a1a] transition-colors ${item.isChecked && marketMode ? 'bg-[#080808] opacity-50' : ''}`}
                  onClick={() => marketMode && toggleCheck(item)}
                >
                  {marketMode && (
                    <td className="p-4 cursor-pointer">
                      {item.isChecked ? (
                        <CheckCircle2 className="w-5 h-5 text-[#34c759]" />
                      ) : (
                        <Circle className="w-5 h-5 text-gray-500" />
                      )}
                    </td>
                  )}
                  <td className={`p-4 font-bold ${item.isChecked && marketMode ? 'line-through' : ''}`}>{item.name}</td>
                  <td className="p-4 text-gray-300 font-mono">{item.quantity}</td>
                  <td className="p-4 text-gray-300 font-mono">{item.price.toLocaleString()}</td>
                  <td className="p-4 font-bold font-mono">{(item.quantity * item.price).toLocaleString()}</td>
                  {!marketMode && (
                    <td className="p-4 text-center">
                      <button onClick={(e) => { e.stopPropagation(); deleteItem(item.id) }} className="text-gray-500 hover:text-[#ff3b30] transition-colors">
                        <Trash2 className="w-4 h-4 mx-auto" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}

              {!marketMode && (
                <tr className="bg-[#080808] border-t border-[#333]">
                  <td className="p-4">
                    <input 
                      type="text" 
                      placeholder="Item name" 
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                      className="w-full bg-[#111] border border-[#333] text-white rounded px-3 py-2 outline-none focus:border-[#555] transition-colors"
                    />
                  </td>
                  <td className="p-4">
                    <input 
                      type="number" 
                      placeholder="Qty" 
                      value={newItemQty}
                      onChange={(e) => setNewItemQty(e.target.value)}
                      className="w-full bg-[#111] border border-[#333] text-white rounded px-3 py-2 outline-none focus:border-[#555] transition-colors"
                    />
                  </td>
                  <td className="p-4">
                    <input 
                      type="number" 
                      placeholder="Price" 
                      value={newItemPrice}
                      onChange={(e) => setNewItemPrice(e.target.value)}
                      className="w-full bg-[#111] border border-[#333] text-white rounded px-3 py-2 outline-none focus:border-[#555] transition-colors"
                    />
                  </td>
                  <td className="p-4 text-gray-500 text-[10px] tracking-[2px] uppercase font-bold">
                    Auto
                  </td>
                  <td className="p-4 text-center">
                    <button 
                      onClick={handleAddItem}
                      disabled={!newItemName || !newItemQty || !newItemPrice}
                      className="bg-[#34c759] text-black w-full flex justify-center py-2 rounded-[20px] font-bold hover:bg-[#2eb350] disabled:opacity-50 transition-colors"
                    >
                      <Plus className="w-5 h-5 text-black" />
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {items.length === 0 && !marketMode && (
            <div className="text-center py-12 text-gray-500 text-sm">
              No items added yet. Start adding items below!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
