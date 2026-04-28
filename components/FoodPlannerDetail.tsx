'use client';

import { useState, useEffect, useMemo } from 'react';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { doc, getDoc, collection, query, onSnapshot, setDoc, deleteDoc } from 'firebase/firestore';
import { ArrowLeft, GripVertical, Trash2, Calendar as CalendarIcon, ArrowUp, ArrowDown } from 'lucide-react';
import { addDays, format, startOfMonth, startOfWeek, endOfMonth, endOfWeek, isSameMonth, isSameDay, isWithinInterval, addHours, startOfDay, differenceInDays } from 'date-fns';

interface FoodItem {
  id: string;
  name: string;
  measurement: string;
  portions: number;
  daysPerPortion: number;
  createdAt: number;
}

interface MealSequence {
  id: string; // `${foodItemId}-${portionIndex}`
  foodItemId: string;
  portionIndex: number;
  // startOffset dynamically calculated
}

export default function FoodPlannerDetail({ listId, onBack }: { listId: string, onBack: () => void }) {
  const [listData, setListData] = useState<any>(null);
  const [items, setItems] = useState<FoodItem[]>([]);
  const [sequence, setSequence] = useState<MealSequence[]>([]);
  const [view, setView] = useState<'items' | 'calendar'>('items');

  // New Item Form
  const [newName, setNewName] = useState('');
  const [newMeasurement, setNewMeasurement] = useState('Portions');
  const [newPortions, setNewPortions] = useState('');
  const [newDaysPerPortion, setNewDaysPerPortion] = useState('');

  useEffect(() => {
    const fetchList = async () => {
      try {
        const d = await getDoc(doc(db, 'foodLists', listId));
        if (d.exists()) setListData(d.data());
      } catch (e) {
        handleFirestoreError(e, OperationType.GET, 'foodLists');
      }
    };
    fetchList();

    const q = query(collection(db, 'foodLists', listId, 'items'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const itms: FoodItem[] = [];
      snapshot.forEach(doc => {
        itms.push({ id: doc.id, ...doc.data() } as FoodItem);
      });
      setItems(itms);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'foodItems');
    });

    return () => unsubscribe();
  }, [listId]);

  // When items change, ensure sequence is updated (add new portions)
  useEffect(() => {
    const t = setTimeout(() => {
      setSequence(prev => {
        const existingIds = new Set(prev.map(p => p.id));
        const newSeq = [...prev];
        items.forEach(item => {
          for (let i = 0; i < item.portions; i++) {
            const id = `${item.id}-${i}`;
            if (!existingIds.has(id)) {
              newSeq.push({ id, foodItemId: item.id, portionIndex: i });
            }
          }
        });
        // Remove any sequence items that no longer exist
        const validFoodItemIds = new Set(items.map(i => i.id));
        return newSeq.filter(s => validFoodItemIds.has(s.foodItemId));
      });
    }, 0);
    return () => clearTimeout(t);
  }, [items]);

  const handleAddItem = async () => {
    if (!newName || !newPortions || !newDaysPerPortion) return;
    try {
      const itemRef = doc(collection(db, 'foodLists', listId, 'items'));
      await setDoc(itemRef, {
        name: newName,
        measurement: newMeasurement,
        portions: parseFloat(newPortions),
        daysPerPortion: parseFloat(newDaysPerPortion),
        createdAt: Date.now()
      });
      setNewName('');
      setNewPortions('');
      setNewDaysPerPortion('');
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'foodItems');
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    try {
      await deleteDoc(doc(db, 'foodLists', listId, 'items', itemId));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, 'foodItems');
    }
  };

  const moveSequence = (index: number, direction: 'up' | 'down') => {
    const newSeq = [...sequence];
    if (direction === 'up' && index > 0) {
      [newSeq[index - 1], newSeq[index]] = [newSeq[index], newSeq[index - 1]];
    } else if (direction === 'down' && index < newSeq.length - 1) {
      [newSeq[index + 1], newSeq[index]] = [newSeq[index], newSeq[index + 1]];
    }
    setSequence(newSeq);
  };

  // Calculate timeline
  const timeline = useMemo(() => {
    if (!listData) return [];
    let currentOffsetHrs = 0;
    const tl = sequence.map((seq) => {
      const item = items.find(i => i.id === seq.foodItemId);
      if (!item) return null;
      
      const durationHrs = item.daysPerPortion * 24;
      const start = addHours(new Date(listData.startDate), currentOffsetHrs);
      currentOffsetHrs += durationHrs;
      const end = addHours(new Date(listData.startDate), currentOffsetHrs);

      return {
        ...seq,
        item,
        start,
        end,
        durationDays: item.daysPerPortion
      };
    }).filter(Boolean);
    return tl;
  }, [sequence, items, listData]);

  const totalDaysCovered = timeline.length > 0 ? Object.values(timeline)[timeline.length - 1]!.end : null;

  const renderCalendar = () => {
     if (!listData) return null;
     const startDate = startOfDay(new Date(listData.startDate));
     const endDate = totalDaysCovered ? totalDaysCovered : startDate;

     // Let's generate 2 months of calendar or just enough to cover the dates
     const monthStart = startOfMonth(startDate);
     const monthEnd = endOfMonth(addDays(endDate, 14)); // Show a bit of buffer
     const calStartDate = startOfWeek(monthStart);
     const calEndDate = endOfWeek(monthEnd);

     const days = [];
     let day = calStartDate;
     while (day <= calEndDate) {
       days.push(day);
       day = addDays(day, 1);
     }

     return (
       <div className="grid grid-cols-7 gap-1 mt-6">
         {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
           <div key={d} className="text-center font-semibold text-xs text-gray-500 py-2">{d}</div>
         ))}
         {days.map((d, i) => {
           const isCurrentMonth = isSameMonth(d, monthStart) || isSameMonth(d, monthEnd);
           // Check if this day falls within our food lifespan coverage
           // For partial days, we'll light it up if any part of the day covers it
           // A day is covered if d is between startDate and endDate
           const isCovered = d >= startDate && d <= endDate;
           
           // Find which items fall on this day for tooltip or coloring
           const itemsOnDay = timeline.filter(t => t && ((d >= startOfDay(t.start) && d <= t.end) || isSameDay(d, t.start)));
           const isStart = isSameDay(d, startDate);

           return (
             <div 
               key={i} 
               className={`h-16 border rounded p-1 flex flex-col ${!isCurrentMonth ? 'bg-[#080808]' : 'bg-[#111]'} ${isCovered ? 'border-[#5856d6]/60' : 'border-[#222]'}`}
             >
               <span className={`text-[10px] tracking-[1px] flex items-center justify-center ${isCovered ? 'text-[#7876f2] font-bold' : 'text-gray-500'} ${isStart ? 'bg-[#5856d6] text-white rounded-full w-4 h-4' : ''}`}>
                 {format(d, 'd')}
               </span>
               <div className="mt-auto flex flex-wrap gap-1 overflow-hidden h-6 items-end p-0.5">
                 {itemsOnDay.map((evt, idx) => (
                   <div key={idx} className="w-1.5 h-1.5 rounded-full bg-[#5856d6]" title={evt?.item.name}></div>
                 ))}
               </div>
             </div>
           )
         })}
       </div>
     );
  };


  if (!listData) return <div className="py-12 text-center text-gray-500 text-[12px] font-bold tracking-[2px] uppercase">Loading plan...</div>;

  return (
    <div className="text-white min-h-full py-6">
      <div className="flex items-center justify-between mb-8">
        <button onClick={onBack} className="self-start sm:self-auto flex items-center px-4 py-2 border border-[#333] rounded-[20px] text-[10px] tracking-[2px] uppercase font-bold hover:bg-[#222] transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </button>
      </div>

      <div className="bg-[#111] border border-[#222] rounded-lg p-6 mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between">
           <div>
             <h2 className="text-[32px] sm:text-[40px] font-black leading-none italic tracking-tighter uppercase uppercase mb-2">{listData.name}</h2>
             <p className="text-[10px] tracking-[2px] font-bold uppercase text-gray-500 flex items-center">
               <CalendarIcon className="w-3 h-3 mr-1.5"/> Start Date: {format(new Date(listData.startDate), 'PPP')}
             </p>
           </div>
           {totalDaysCovered && (
             <div className="mt-4 md:mt-0 p-4 rounded-lg bg-[#5856d6]/10 border border-[#5856d6]/30 text-right pr-6">
               <p className="text-[10px] uppercase font-bold tracking-[2px] mb-1 text-[#7876f2]">Food Lasts Until</p>
               <p className="text-2xl font-bold text-[#5856d6]">{format(totalDaysCovered, 'PPP (h:mm a)')}</p>
             </div>
           )}
        </div>
      </div>

      <div className="flex space-x-2 mb-8">
        <button 
          onClick={() => setView('items')}
          className={`px-4 py-2 rounded-[20px] text-[10px] tracking-[2px] font-bold uppercase transition-colors ${view === 'items' ? 'bg-white text-black border border-white' : 'bg-transparent text-gray-400 border border-[#333] hover:text-white'}`}
        >
          Manage Items & Sequence
        </button>
        <button 
          onClick={() => setView('calendar')}
          className={`px-4 py-2 rounded-[20px] text-[10px] tracking-[2px] font-bold uppercase transition-colors ${view === 'calendar' ? 'bg-white text-black border border-white' : 'bg-transparent text-gray-400 border border-[#333] hover:text-white'}`}
        >
          Calendar View
        </button>
      </div>

      {view === 'items' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Add & List Items */}
          <div className="bg-[#111] rounded-lg border border-[#222] overflow-hidden">
             <div className="p-4 border-b border-[#222] bg-[#080808] font-bold text-[10px] tracking-[2px] uppercase text-gray-400">1. Pantry Inventory</div>
             <div className="p-6 border-b border-[#222] bg-[#111]">
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <input type="text" placeholder="Food Name (e.g., Rice)" value={newName} onChange={e => setNewName(e.target.value)} className="w-full bg-[#080808] border border-[#333] text-white rounded px-3 py-2 text-sm outline-none focus:border-[#555] transition-colors" />
                  <input type="text" placeholder="Measurement (e.g., kgs)" value={newMeasurement} onChange={e => setNewMeasurement(e.target.value)} className="w-full bg-[#080808] border border-[#333] text-white rounded px-3 py-2 text-sm outline-none focus:border-[#555] transition-colors" />
                </div>
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <input type="number" placeholder="Total Portions (e.g., 4)" value={newPortions} onChange={e => setNewPortions(e.target.value)} className="w-full bg-[#080808] border border-[#333] text-white rounded px-3 py-2 text-sm outline-none focus:border-[#555] transition-colors" />
                  <input type="number" step="0.5" placeholder="Days per portion (e.g., 1.5)" value={newDaysPerPortion} onChange={e => setNewDaysPerPortion(e.target.value)} className="w-full bg-[#080808] border border-[#333] text-white rounded px-3 py-2 text-sm outline-none focus:border-[#555] transition-colors" />
                </div>
                <button onClick={handleAddItem} className="w-full bg-[#34c759] text-black py-3 rounded-[20px] font-bold text-[12px] tracking-[2px] uppercase hover:bg-[#2eb350] transition-colors">Add to Inventory</button>
             </div>
             <div>
                {items.length === 0 ? (
                  <p className="text-gray-500 p-8 text-center text-sm">No items. Add food above.</p>
                ) : (
                  items.map(item => (
                    <div key={item.id} className="p-4 border-b border-[#222] flex justify-between items-center text-sm hover:bg-[#1a1a1a] transition-colors">
                      <div>
                        <p className="font-bold text-white text-base">{item.name}</p>
                        <p className="text-[10px] tracking-[2px] uppercase font-bold text-gray-500 mt-1">{item.portions} portions ({item.daysPerPortion} days each)</p>
                      </div>
                      <button onClick={() => handleDeleteItem(item.id)} className="text-gray-500 p-2 hover:text-[#ff3b30] transition-colors">
                        <Trash2 className="w-5 h-5"/>
                      </button>
                    </div>
                  ))
                )}
             </div>
          </div>

          {/* Sequence Editor */}
          <div className="bg-[#111] rounded-lg border border-[#222] overflow-hidden flex flex-col max-h-[800px]">
             <div className="p-4 border-b border-[#222] bg-[#080808] font-bold text-[10px] tracking-[2px] uppercase text-gray-400 flex justify-between items-center">
               <span>2. Shuffle & Timeline</span>
               <span className="text-[10px] font-normal tracking-normal normal-case text-gray-500">Order your portions below</span>
             </div>
             <div className="overflow-y-auto p-4 space-y-3 flex-1">
                {timeline.length === 0 ? (
                  <p className="text-gray-500 text-center text-sm mt-10">Add items to generate timeline blocks.</p>
                ) : (
                  timeline.map((evt, idx) => (
                    <div key={evt!.id} className="flex items-center gap-4 bg-[#080808] border border-[#333] rounded-lg p-4 hover:border-[#555] transition-colors">
                       <div className="flex flex-col gap-2">
                         <button onClick={() => moveSequence(idx, 'up')} disabled={idx === 0} className="text-gray-500 hover:text-white disabled:opacity-30 transition-colors">
                           <ArrowUp className="w-4 h-4"/>
                         </button>
                         <button onClick={() => moveSequence(idx, 'down')} disabled={idx === timeline.length - 1} className="text-gray-500 hover:text-white disabled:opacity-30 transition-colors">
                           <ArrowDown className="w-4 h-4"/>
                         </button>
                       </div>
                       <div className="flex-1">
                         <p className="font-bold text-white text-base">
                           {evt!.item.name} 
                           <span className="text-[10px] tracking-[1px] uppercase bg-[#5856d6] text-white px-2 py-0.5 rounded ml-3">Portion {evt!.portionIndex + 1}</span>
                         </p>
                         <p className="text-[10px] tracking-[2px] uppercase font-bold text-gray-500 mt-2 flex items-center">
                           {format(evt!.start, 'MMM d, h:mm a')} <ArrowLeft className="w-3 h-3 mx-2 rotate-180 text-gray-600" /> {format(evt!.end, 'MMM d, h:mm a')}
                         </p>
                       </div>
                       <div className="text-[10px] tracking-[2px] uppercase font-bold mt-1.5 text-gray-400 text-right">
                         <span className="block text-2xl font-light text-white leading-none mb-1">{evt!.item.daysPerPortion}</span>
                         Days
                       </div>
                    </div>
                  ))
                )}
             </div>
          </div>
        </div>
      ) : (
        <div className="bg-[#111] rounded-lg border border-[#222] p-6">
          <h3 className="text-xl font-bold mb-2">Calendar Projection</h3>
          <p className="text-[10px] tracking-[2px] uppercase font-bold text-gray-500 mb-6">Visual progression of your food supply across the month.</p>
          {renderCalendar()}

          <div className="mt-8">
            <h4 className="font-bold text-white mb-4 flex items-center">Planned Schedule</h4>
            <div className="space-y-4 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-[#333] before:to-transparent">
              {timeline.map((evt, idx) => (
                <div key={idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  <div className="flex items-center justify-center w-5 h-5 rounded-full border border-[#111] bg-[#5856d6] text-white shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow"></div>
                  <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-1.25rem)] bg-[#080808] border border-[#333] p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-bold text-white">{evt!.item.name}</h4>
                      <span className="text-[10px] tracking-[2px] uppercase font-bold text-[#5856d6]">{format(evt!.start, 'MMM d')}</span>
                    </div>
                    <p className="text-[10px] tracking-[1px] uppercase font-bold text-gray-500">
                      Lasts {evt!.durationDays} day(s) until {format(evt!.end, 'h:mm a, MMM d')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
