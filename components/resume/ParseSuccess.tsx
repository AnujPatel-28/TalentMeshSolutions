import React from 'react';
import { Sparkles, ArrowRight, CheckCircle, Trophy } from 'lucide-react';

interface ParseSuccessProps {
  onViewProfile: () => void;
  strengthIncrease: number;
}

const ParseSuccess: React.FC<ParseSuccessProps> = ({ onViewProfile, strengthIncrease }) => {
  return (
    <div className="w-full max-w-lg mx-auto bg-white rounded-[2rem] shadow-2xl border border-gray-100 overflow-hidden text-center p-12">
      <div className="relative inline-block mb-8">
        <div className="absolute inset-0 bg-green-400 opacity-20 blur-2xl rounded-full scale-150 animate-pulse" />
        <div className="relative bg-green-500 text-white w-20 h-20 rounded-full flex items-center justify-center mx-auto shadow-xl shadow-green-200">
          <CheckCircle size={40} className="animate-bounce" style={{ animationDuration: '2s' }} />
        </div>
      </div>

      <h2 className="text-3xl font-black text-gray-900 mb-3 italic">Awesome! Profile Updated</h2>
      <p className="text-gray-500 mb-10 max-w-xs mx-auto text-lg leading-relaxed">
        Your professional profile has been enriched with the latest details from your resume.
      </p>

      {/* Progress Increase Card */}
      <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-blue-100 rounded-3xl p-6 mb-10 text-left relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-125 transition-transform duration-500 rotate-12">
            <Trophy size={80} />
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm uppercase tracking-widest mb-4">
            <Sparkles size={16} />
            Achievement Unlocked
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-black text-gray-900">+{strengthIncrease}%</span>
            <span className="text-gray-500 font-medium">Strength Boost</span>
          </div>
          <div className="mt-4 h-3 w-full bg-white rounded-full border border-blue-100 p-0.5 overflow-hidden">
             <div 
               className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-1000 delay-300" 
               style={{ width: '100%' }}
             />
          </div>
          <p className="text-xs text-indigo-500 mt-3 font-semibold">Your profile is now more likely to be discovered by recruiters.</p>
        </div>
      </div>

      <button 
        onClick={onViewProfile}
        className="group w-full py-5 bg-gray-900 hover:bg-black text-white font-black text-lg rounded-2xl shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-3"
      >
        Take me to my Dashboard
        <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
      </button>
      
      <p className="mt-6 text-sm text-gray-400">
        You can further edit your profile anytime.
      </p>
    </div>
  );
};

export default ParseSuccess;
