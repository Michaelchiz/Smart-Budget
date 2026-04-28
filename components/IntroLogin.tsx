'use client';

import { useAuth } from '@/lib/auth';
import { Wallet, CalendarRange, ShoppingBag, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';

export default function IntroLogin() {
  const { signIn } = useAuth();

  return (
    <div className="min-h-screen bg-[#080808] text-white">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <div className="text-center">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-[72px] font-black tracking-[-3px] leading-[0.9] sm:text-[90px] md:text-[110px]"
          >
            <span className="block xl:inline">DIGITAL BUDGET & </span>
            <span className="block text-[#5856d6] xl:inline">PANTRY PLANNER</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-3 max-w-md mx-auto text-base text-gray-400 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl"
          >
            Replace your traditional paper budget with our smart digital calculator. Plus, predict how long your food will last and spread out your meals on a calendar.
          </motion.p>
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-5 max-w-md mx-auto sm:flex sm:justify-center md:mt-8"
          >
            <div className="rounded-md shadow-none flex justify-center mt-4">
              <button
                onClick={signIn}
                className="flex items-center justify-center px-8 py-3 border border-[#333] text-[12px] font-bold tracking-[2px] uppercase rounded-[20px] text-black bg-white hover:bg-gray-200 md:py-4 md:px-10 transition-colors"
              >
                Sign In with Google <ArrowRight className="ml-2 w-5 h-5" />
              </button>
            </div>
          </motion.div>
        </div>

        <div className="mt-24 grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-3">
          <div className="text-center">
             <div className="flex items-center justify-center h-12 w-12 rounded-full border border-[#333] bg-[#111] text-white mx-auto">
               <Wallet className="h-6 w-6" />
             </div>
             <h3 className="mt-6 text-[10px] text-gray-500 tracking-[2px] uppercase font-bold">Digital Budgeting</h3>
             <p className="mt-2 text-base text-gray-300">
               Throw away your pen and paper. Enter your budget, add items, and let the inbuilt calculator do the math for you.
             </p>
          </div>

          <div className="text-center">
             <div className="flex items-center justify-center h-12 w-12 rounded-full border border-[#333] bg-[#111] text-white mx-auto">
               <ShoppingBag className="h-6 w-6" />
             </div>
             <h3 className="mt-6 text-[10px] text-gray-500 tracking-[2px] uppercase font-bold">Market Mode</h3>
             <p className="mt-2 text-base text-gray-300">
               While shopping, check off items you&apos;ve picked up. The total dynamically updates to keep your spending in check.
             </p>
          </div>

          <div className="text-center">
             <div className="flex items-center justify-center h-12 w-12 rounded-full border border-[#333] bg-[#111] text-white mx-auto">
               <CalendarRange className="h-6 w-6" />
             </div>
             <h3 className="mt-6 text-[10px] text-gray-500 tracking-[2px] uppercase font-bold">Food Lifespan</h3>
             <p className="mt-2 text-base text-gray-300">
               Add quantities, portions, and estimated days. View visually on a calendar how long your pantry will last.
             </p>
          </div>
        </div>
      </main>
    </div>
  );
}
