'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import BudgetApp from './BudgetApp';
import FoodPlanner from './FoodPlanner';
import SettingsModal from './SettingsModal';
import { LogOut, Settings, Wallet, CalendarDays } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Dashboard() {
  const { user, logOut, userCurrency, userCountry } = useAuth();
  const [activeTab, setActiveTab] = useState<'budget' | 'food'>('budget');
  const [showSettings, setShowSettings] = useState(false);

  return (
    <div className="min-h-screen bg-[#080808]">
      <nav className="bg-[#1a1a1a] border-b border-[#222]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <span className="text-xl font-black italic tracking-tighter text-white">DBP.</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-[10px] tracking-[2px] uppercase font-bold text-gray-500 hidden sm:block">
                Location: <span className="text-white">{userCountry} / {userCurrency}</span>
              </span>
              <button 
                onClick={() => setShowSettings(true)}
                className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-[#333] transition-colors"
              >
                <Settings className="w-5 h-5" />
              </button>
              <button 
                onClick={logOut}
                className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-[#333] transition-colors"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <div className="border-b border-[#1a1a1a] pb-6 flex justify-between items-center">
          <h1 className="text-4xl font-black italic uppercase hidden sm:block tracking-tighter">APP DASHBOARD</h1>
          <nav className="flex space-x-2">
            <button
              onClick={() => setActiveTab('budget')}
              className={`
                text-[12px] px-3 py-1.5 border rounded-[20px] font-bold tracking-[1px] uppercase flex items-center transition-colors
                ${activeTab === 'budget' 
                  ? 'bg-white text-black border-white' 
                  : 'bg-transparent text-gray-400 border-[#333] hover:text-white'}
              `}
            >
              <Wallet className="w-3 h-3 mr-2" />
              Budget
            </button>
            <button
              onClick={() => setActiveTab('food')}
              className={`
                text-[12px] px-3 py-1.5 border rounded-[20px] font-bold tracking-[1px] uppercase flex items-center transition-colors
                ${activeTab === 'food' 
                  ? 'bg-white text-black border-white' 
                  : 'bg-transparent text-gray-400 border-[#333] hover:text-white'}
              `}
            >
              <CalendarDays className="w-3 h-3 mr-2" />
              Lifespan
            </button>
          </nav>
        </div>

        <div className="mt-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'budget' ? <BudgetApp /> : <FoodPlanner />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
}
