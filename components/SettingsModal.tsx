'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { X } from 'lucide-react';

export default function SettingsModal({ onClose }: { onClose: () => void }) {
  const { user, userCurrency, userCountry } = useAuth();
  const [currency, setCurrency] = useState(userCurrency);
  const [country, setCountry] = useState(userCountry);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        country,
        currency
        // Assuming we rely on reloading or auth listener to refresh context
      });
      window.location.reload(); // Quick way to refresh context
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'users');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-[#111] border border-[#222] rounded-lg shadow-2xl max-w-md w-full p-6 relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        
        <h2 className="text-sm tracking-[2px] text-gray-500 uppercase font-bold mb-6">Settings</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-[10px] tracking-[2px] font-bold text-gray-400 uppercase mb-1">Country</label>
            <input 
              type="text"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full bg-[#080808] border border-[#333] text-white rounded-md px-3 py-2 outline-none focus:border-[#555] transition-colors"
              placeholder="e.g. Malawi"
            />
          </div>
          
          <div>
            <label className="block text-[10px] tracking-[2px] font-bold text-gray-400 uppercase mb-1">Currency Code</label>
            <input 
              type="text"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full bg-[#080808] border border-[#333] text-white rounded-md px-3 py-2 outline-none focus:border-[#555] transition-colors"
              placeholder="e.g. MWK"
            />
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-white text-black text-[12px] font-bold tracking-[2px] uppercase py-3 rounded-[20px] hover:bg-gray-200 disabled:opacity-50 transition-colors mt-6"
          >
            {saving ? 'Saving...' : 'Save and Apply'}
          </button>
        </div>
      </div>
    </div>
  );
}
