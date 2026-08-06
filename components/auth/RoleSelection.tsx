'use client';

import React, { useState } from 'react';
import { UserRound, Building2, ArrowRight, TrendingUp, Briefcase, ArrowLeft, CalendarDays, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

interface RoleSelectionProps {
  onSelect: (role: 'candidate' | 'recruiter', variant?: 'call' | 'application') => void;
}

const RoleSelection: React.FC<RoleSelectionProps> = ({ onSelect }) => {
  const [showRecruiterOptions, setShowRecruiterOptions] = useState(false);

  if (showRecruiterOptions) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col items-center justify-center w-full max-w-4xl mx-auto px-4 py-8"
      >
        <button
          onClick={() => setShowRecruiterOptions(false)}
          aria-label="Back to main role selection"
          className="flex items-center gap-2 text-slate-200 font-semibold hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded-lg transition-colors mb-6 self-start group drop-shadow-sm active:scale-95"
        >
          <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
          <span>Back to main selection</span>
        </button>

        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-5xl font-extrabold text-white mb-3 tracking-tight drop-shadow-lg">
            How would you like to hire?
          </h1>
          <p className="text-slate-200 text-base md:text-lg max-w-md mx-auto font-medium drop-shadow-sm">
            Select the solution that fits your company size and needs
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
          {/* Book a Call Card */}
          <button
            onClick={() => onSelect('recruiter', 'call')}
            aria-label="Book a discovery call"
            className="group relative flex flex-col items-start text-left p-6 md:p-7 rounded-3xl bg-white border border-slate-100 hover:border-blue-500 hover:shadow-[0_25px_60px_-15px_rgba(0,123,255,0.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 active:scale-[0.98] transition-all duration-300 overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
              <CalendarDays size={100} />
            </div>
            
            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mb-5 group-hover:scale-110 transition-transform duration-300">
              <CalendarDays size={24} />
            </div>
            
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 mb-2">Book a discovery call</h2>
            <p className="text-slate-600 text-sm md:text-base leading-relaxed mb-6 flex-grow">
              New to TalentMesh? Schedule a 15-min call to see how our intelligent talent sourcing can transform your hiring.
            </p>
            
            <div className="flex items-center gap-2 font-bold text-blue-600 group-hover:gap-4 transition-all">
              <span>Schedule call</span>
              <ArrowRight size={20} />
            </div>
          </button>

          {/* Apply for Access Card */}
          <button
            onClick={() => onSelect('recruiter', 'application')}
            aria-label="Apply for access to recruiter ecosystem"
            className="group relative flex flex-col items-start text-left p-6 md:p-7 rounded-3xl bg-white border border-slate-100 hover:border-blue-600 hover:shadow-[0_25px_60px_-15px_rgba(0,123,255,0.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 active:scale-[0.98] transition-all duration-300 overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
              <Briefcase size={100} />
            </div>
            
            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mb-5 group-hover:scale-110 transition-transform duration-300">
              <Briefcase size={24} />
            </div>
            
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 mb-2">Apply for access</h2>
            <p className="text-slate-600 text-sm md:text-base leading-relaxed mb-6 flex-grow">
              Ready to start hiring? Submit your details to request an invitation to our exclusive recruiter ecosystem.
            </p>
            
            <div className="flex items-center gap-2 font-bold text-blue-600 group-hover:gap-4 transition-all">
              <span>Start application</span>
              <ArrowRight size={20} />
            </div>
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col items-center justify-center w-full max-w-4xl mx-auto px-4 py-8"
    >
      <div className="text-center mb-10">
        <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-3 tracking-tight drop-shadow-lg">
          Join <span className="bg-gradient-to-r from-amber-200 via-amber-400 to-orange-500 bg-clip-text text-transparent filter drop-shadow-[0_4px_24px_rgba(251,191,36,0.4)]">TalentMesh</span>
        </h1>
        <p className="text-slate-200 text-base md:text-lg max-w-md mx-auto font-medium drop-shadow-sm">
          Choose the path that best describes your current journey
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
        {/* Candidate Card */}
        <motion.button
          whileHover={{ y: -6 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          onClick={() => onSelect('candidate')}
          aria-label="Create candidate profile"
          className="group relative flex flex-col items-start text-left p-6 md:p-7 rounded-3xl bg-white border border-slate-100 hover:border-blue-500 hover:shadow-[0_25px_60px_-15px_rgba(0,123,255,0.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 transition-all duration-300 overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
            <TrendingUp size={100} />
          </div>
          
          <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mb-5 group-hover:scale-110 transition-transform duration-300">
            <UserRound size={24} />
          </div>
          
          <h2 className="text-xl md:text-2xl font-bold text-slate-900 mb-2">I&apos;m a candidate</h2>
          <p className="text-slate-600 text-sm md:text-base leading-relaxed mb-6 flex-grow">
            Create your profile and get matched with top opportunities tailored to your skills and career goals.
          </p>
          
          <div className="flex items-center gap-2 font-bold text-blue-600 group-hover:gap-4 transition-all">
            <span>Create candidate profile</span>
            <ArrowRight size={20} />
          </div>
        </motion.button>

        {/* Recruiter Card */}
        <motion.button
          whileHover={{ y: -6 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          onClick={() => setShowRecruiterOptions(true)}
          aria-label="Explore hiring options for recruiters"
          className="group relative flex flex-col items-start text-left p-6 md:p-7 rounded-3xl bg-white border border-slate-100 hover:border-blue-500 hover:shadow-[0_25px_60px_-15px_rgba(0,123,255,0.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 transition-all duration-300 overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
            <Briefcase size={100} />
          </div>
          
          <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mb-5 group-hover:scale-110 transition-transform duration-300">
            <Building2 size={24} />
          </div>
          
          <h2 className="text-xl md:text-2xl font-bold text-slate-900 mb-2">I&apos;m hiring</h2>
          <p className="text-slate-600 text-sm md:text-base leading-relaxed mb-6 flex-grow">
            Tell us your hiring needs and get access to curated talent. We help you find the perfect fit faster.
          </p>
          
          <div className="flex items-center gap-2 font-bold text-blue-600 group-hover:gap-4 transition-all">
            <span>Explore hiring options</span>
            <ArrowRight size={20} />
          </div>
        </motion.button>
      </div>

      <div className="mt-8 text-center text-slate-200 text-sm font-medium drop-shadow-sm">
        Already have an account? <a href="/login" className="text-blue-400 font-bold hover:underline ml-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-1 rounded">Log in</a>
      </div>
    </motion.div>
  );
};

export default RoleSelection;
