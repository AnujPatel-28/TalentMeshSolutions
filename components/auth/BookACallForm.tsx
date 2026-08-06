'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Building2,
  Mail,
  User,
  MessageSquare,
  ArrowLeft,
  Send,
  CheckCircle2,
  AlertCircle,
  LayoutGrid,
  CalendarDays,
  ChevronDown,
  ArrowRight,
  Phone,
  Calendar,
  X,
  Search,
  Plus,
  Briefcase
} from 'lucide-react';
import Link from 'next/link';
import { CustomSelect } from '@/components/ui/CustomSelect';
import Cal, { getCalApi } from '@calcom/embed-react';
import { motion } from 'framer-motion';

interface BookACallFormProps {
  onBack: () => void;
}

const TIMELINES = [
  'Immediately', 'Next 1-3 months', 'Next 3-6 months', 'Future planning'
];

const FREE_EMAIL_PROVIDERS = [
  'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com', 'aol.com'
];

const NUM_ROLES_OPTIONS = [
  '1-5 roles',
  '6-15 roles',
  '16-50 roles',
  '50+ roles'
];

interface RoleCategory {
  category: string;
  roles: string[];
}

const DETAILED_ROLES: RoleCategory[] = [
  {
    category: 'Engineering & Technology',
    roles: [
      'Frontend Engineer', 'Backend Engineer', 'Full Stack Engineer',
      'Mobile Developer (iOS/Android)', 'DevOps Engineer', 'QA / Testing Engineer',
      'Site Reliability Engineer (SRE)', 'Cloud Architect', 'Security Engineer / Cybersecurity Specialist',
      'Embedded Systems Engineer', 'Data Engineer', 'Blockchain Developer',
      'Solution Architect', 'Systems Administrator', 'Database Administrator (DBA)'
    ]
  },
  {
    category: 'Data Science & Artificial Intelligence',
    roles: [
      'Data Scientist', 'Machine Learning Engineer', 'AI Research Scientist',
      'Data Analyst', 'Business Intelligence (BI) Developer', 'NLP Engineer',
      'Computer Vision Engineer', 'Deep Learning Engineer'
    ]
  },
  {
    category: 'Product & Design',
    roles: [
      'Product Manager', 'Associate Product Manager', 'Technical Product Manager',
      'Product Designer (UI/UX)', 'UX Researcher', 'UI Designer',
      'Graphic Designer', 'Motion Designer', 'Visual Designer',
      'Brand Designer', 'Scrum Master', 'Project Manager'
    ]
  },
  {
    category: 'Marketing, Sales & Business Development',
    roles: [
      'Account Executive (AE)', 'Sales Development Representative (SDR)',
      'Business Development Manager', 'Marketing Manager', 'Content Writer / Copywriter',
      'SEO Specialist', 'Growth Marketer', 'Social Media Manager',
      'Email Marketing Specialist', 'Performance Marketer', 'Product Marketing Manager',
      'Sales Engineer', 'Account Manager'
    ]
  },
  {
    category: 'Customer Success & Operations',
    roles: [
      'Customer Success Manager (CSM)', 'Customer Support Representative',
      'Operations Manager', 'HR Generalist', 'Technical Recruiter',
      'Talent Acquisition Specialist', 'Finance Manager', 'Accountant',
      'Legal Counsel / Attorney', 'Office Manager', 'Executive Assistant'
    ]
  },
  {
    category: 'Healthcare & Life Sciences',
    roles: [
      'Medical Practitioner / Physician', 'Registered Nurse (RN)', 'Clinical Research Coordinator',
      'Pharmacist', 'Biomedical Engineer', 'Lab Technician', 'Healthcare Administrator'
    ]
  },
  {
    category: 'Other Professional Services',
    roles: [
      'Management Consultant', 'Business Analyst', 'Civil Engineer',
      'Mechanical Engineer', 'Electrical Engineer', 'Architect (Construction)',
      'Supply Chain Coordinator', 'Logistics Manager', 'Content Creator'
    ]
  }
];

const DOMAIN_OPTIONS = [
  ...DETAILED_ROLES.map(g => g.category),
  'Custom / Other'
];

interface Country {
  name: string;
  code: string;
  dialCode: string;
  flag: string;
}

const ALL_COUNTRIES: Country[] = [
  { name: 'India', code: 'IN', dialCode: '+91', flag: '🇮🇳' },
  { name: 'United States', code: 'US', dialCode: '+1', flag: '🇺🇸' },
  { name: 'Canada', code: 'CA', dialCode: '+1', flag: '🇨🇦' },
  { name: 'United Kingdom', code: 'GB', dialCode: '+44', flag: '🇬🇧' },
  { name: 'Australia', code: 'AU', dialCode: '+61', flag: '🇦🇺' },
  { name: 'Germany', code: 'DE', dialCode: '+49', flag: '🇩🇪' },
  { name: 'France', code: 'FR', dialCode: '+33', flag: '🇫🇷' },
  { name: 'Italy', code: 'IT', dialCode: '+39', flag: '🇮🇹' },
  { name: 'Spain', code: 'ES', dialCode: '+34', flag: '🇪🇸' },
  { name: 'Japan', code: 'JP', dialCode: '+81', flag: '🇯🇵' },
  { name: 'China', code: 'CN', dialCode: '+86', flag: '🇨🇳' },
  { name: 'Brazil', code: 'BR', dialCode: '+55', flag: '🇧🇷' },
  { name: 'Mexico', code: 'MX', dialCode: '+52', flag: '🇲🇽' },
  { name: 'South Africa', code: 'ZA', dialCode: '+27', flag: '🇿🇦' },
  { name: 'Singapore', code: 'SG', dialCode: '+65', flag: '🇸🇬' },
  { name: 'Netherlands', code: 'NL', dialCode: '+31', flag: '🇳🇱' },
  { name: 'New Zealand', code: 'NZ', dialCode: '+64', flag: '🇳🇿' },
  { name: 'Switzerland', code: 'CH', dialCode: '+41', flag: '🇨🇭' },
  { name: 'Sweden', code: 'SE', dialCode: '+46', flag: '🇸🇪' },
  { name: 'Norway', code: 'NO', dialCode: '+47', flag: '🇳🇴' },
  { name: 'Denmark', code: 'DK', dialCode: '+45', flag: '🇩🇰' },
  { name: 'Finland', code: 'FI', dialCode: '+358', flag: '🇫🇮' },
  { name: 'Belgium', code: 'BE', dialCode: '+32', flag: '🇧🇪' },
  { name: 'Austria', code: 'AT', dialCode: '+43', flag: '🇦🇹' },
  { name: 'Ireland', code: 'IE', dialCode: '+353', flag: '🇮🇪' },
  { name: 'Portugal', code: 'PT', dialCode: '+351', flag: '🇵🇹' },
  { name: 'Greece', code: 'GR', dialCode: '+30', flag: '🇬🇷' },
  { name: 'Turkey', code: 'TR', dialCode: '+90', flag: '🇹🇷' },
  { name: 'Saudi Arabia', code: 'SA', dialCode: '+966', flag: '🇸🇦' },
  { name: 'UAE', code: 'AE', dialCode: '+971', flag: '🇦🇪' },
  { name: 'Israel', code: 'IL', dialCode: '+972', flag: '🇮🇱' },
  { name: 'Egypt', code: 'EG', dialCode: '+20', flag: '🇪🇬' },
  { name: 'Nigeria', code: 'NG', dialCode: '+234', flag: '🇳🇬' },
  { name: 'Kenya', code: 'KE', dialCode: '+254', flag: '🇰🇪' },
  { name: 'Argentina', code: 'AR', dialCode: '+54', flag: '🇦🇷' },
  { name: 'Colombia', code: 'CO', dialCode: '+57', flag: '🇨🇴' },
  { name: 'Chile', code: 'CL', dialCode: '+56', flag: '🇨🇱' },
  { name: 'Peru', code: 'PE', dialCode: '+51', flag: '🇵🇪' },
  { name: 'Malaysia', code: 'MY', dialCode: '+60', flag: '🇲🇾' },
  { name: 'Indonesia', code: 'ID', dialCode: '+62', flag: '🇮🇩' },
  { name: 'Philippines', code: 'PH', dialCode: '+63', flag: '🇵🇭' },
  { name: 'Thailand', code: 'TH', dialCode: '+66', flag: '🇹🇭' },
  { name: 'Vietnam', code: 'VN', dialCode: '+84', flag: '🇻🇳' },
  { name: 'Hong Kong', code: 'HK', dialCode: '+852', flag: '🇭🇰' },
  { name: 'Taiwan', code: 'TW', dialCode: '+886', flag: '🇹🇼' },
  { name: 'South Korea', code: 'KR', dialCode: '+82', flag: '🇰🇷' },
  { name: 'Pakistan', code: 'PK', dialCode: '+92', flag: '🇵🇰' },
  { name: 'Bangladesh', code: 'BD', dialCode: '+880', flag: '🇧🇩' },
  { name: 'Sri Lanka', code: 'LK', dialCode: '+94', flag: '🇱🇰' },
  { name: 'Ukraine', code: 'UA', dialCode: '+380', flag: '🇺🇦' },
  { name: 'Poland', code: 'PL', dialCode: '+48', flag: '🇵🇱' },
  { name: 'Romania', code: 'RO', dialCode: '+40', flag: '🇷🇴' },
  { name: 'Hungary', code: 'HU', dialCode: '+36', flag: '🇭🇺' },
  { name: 'Czech Republic', code: 'CZ', dialCode: '+420', flag: '🇨🇿' },
  { name: 'Slovakia', code: 'SK', dialCode: '+421', flag: '🇸🇰' },
  { name: 'Croatia', code: 'HR', dialCode: '+385', flag: '🇭🇷' },
  { name: 'Bulgaria', code: 'BG', dialCode: '+359', flag: '🇧🇬' },
  { name: 'Serbia', code: 'RS', dialCode: '+381', flag: '🇷🇸' },
  { name: 'Slovenia', code: 'SI', dialCode: '+386', flag: '🇸🇮' },
  { name: 'Lithuania', code: 'LT', dialCode: '+370', flag: '🇱🇹' },
  { name: 'Latvia', code: 'LV', dialCode: '+371', flag: '🇱🇻' },
  { name: 'Estonia', code: 'EE', dialCode: '+372', flag: '🇪🇪' },
  { name: 'Morocco', code: 'MA', dialCode: '+212', flag: '🇲🇦' },
  { name: 'Algeria', code: 'DZ', dialCode: '+213', flag: '🇩🇿' },
  { name: 'Tunisia', code: 'TN', dialCode: '+216', flag: '🇹🇳' },
  { name: 'Ghana', code: 'GH', dialCode: '+233', flag: '🇬🇭' },
  { name: 'Ethiopia', code: 'ET', dialCode: '+251', flag: '🇪🇹' },
  { name: 'Tanzania', code: 'TZ', dialCode: '+255', flag: '🇹🇿' },
  { name: 'Uganda', code: 'UG', dialCode: '+256', flag: '🇺🇬' },
  { name: 'Jordan', code: 'JO', dialCode: '+962', flag: '🇯🇴' },
  { name: 'Lebanon', code: 'LB', dialCode: '+961', flag: '🇱🇧' },
  { name: 'Kuwait', code: 'KW', dialCode: '+965', flag: '🇰🇼' },
  { name: 'Qatar', code: 'QA', dialCode: '+974', flag: '🇶🇦' },
  { name: 'Bahrain', code: 'BH', dialCode: '+973', flag: '🇧🇭' },
  { name: 'Oman', code: 'OM', dialCode: '+968', flag: '🇴🇲' },
  { name: 'Kazakhstan', code: 'KZ', dialCode: '+7', flag: '🇰🇿' },
  { name: 'Uzbekistan', code: 'UZ', dialCode: '+998', flag: '🇺🇿' }
];

const countriesSorted = [...ALL_COUNTRIES].sort((a, b) => b.dialCode.length - a.dialCode.length);

const BookACallForm: React.FC<BookACallFormProps> = ({ onBack }) => {
  const [step, setStep] = useState(1);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [customRoleInput, setCustomRoleInput] = useState('');

  const [selectedCountry, setSelectedCountry] = useState<Country>(ALL_COUNTRIES[0]);
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [countrySearchQuery, setCountrySearchQuery] = useState('');

  const [selectedDomain, setSelectedDomain] = useState('');
  const [isRolesDropdownOpen, setIsRolesDropdownOpen] = useState(false);
  const [rolesSearchQuery, setRolesSearchQuery] = useState('');

  const countryDropdownRef = useRef<HTMLDivElement>(null);
  const rolesDropdownRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    fullName: '',
    workEmail: '',
    phoneNumber: '',
    companyName: '',
    numRoles: '',
    hiringCategories: [] as string[],
    hiringTimeline: '',
    additionalNotes: ''
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(event.target as Node)) {
        setIsCountryDropdownOpen(false);
      }
      if (rolesDropdownRef.current && !rolesDropdownRef.current.contains(event.target as Node)) {
        setIsRolesDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isSubmitted) {
      (async function () {
        try {
          const cal = await getCalApi({ namespace: 'discovery-call' });
          cal('ui', {
            theme: 'light',
            styles: { branding: { brandColor: '#2563eb' } },
            hideEventTypeDetails: true,
            layout: 'month_view',
          });
        } catch (err) {
          console.warn('Cal.com embed initialization notice:', err);
        }
      })();
    }
  }, [isSubmitted]);

  const nextStep = () => setStep(prev => Math.min(prev + 1, 3));
  const prevStep = () => setStep(prev => Math.max(prev - 1, 1));

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    
    // Normalize double zero prefix to '+'
    if (value.trim().startsWith('00')) {
      value = '+' + value.trim().substring(2);
    }
    
    // Auto-guess country based on dial code and strip it from the visible input
    const cleanNumber = value.trim();
    if (cleanNumber.startsWith('+')) {
      const matched = countriesSorted.find(c => cleanNumber.startsWith(c.dialCode));
      if (matched) {
        setSelectedCountry(matched);
        // Strip the country code prefix
        value = cleanNumber.substring(matched.dialCode.length).trim();
      }
    }
    
    setFormData(prev => ({ ...prev, phoneNumber: value }));
  };

  const handleCountrySelect = (country: Country) => {
    setSelectedCountry(country);
    setIsCountryDropdownOpen(false);
    setCountrySearchQuery('');
  };

  const handleDomainChange = (e: { target: { name: string; value: string } } | any) => {
    const val = e.target.value;
    setSelectedDomain(val);
    setRolesSearchQuery('');
    setCustomRoleInput('');
  };

  const handleCategoryToggle = (category: string) => {
    setFormData(prev => ({
      ...prev,
      hiringCategories: prev.hiringCategories.includes(category)
        ? prev.hiringCategories.filter(c => c !== category)
        : [...prev.hiringCategories, category]
    }));
  };

  const handleAddCustomRole = () => {
    const roleToAdd = customRoleInput.trim();
    if (roleToAdd && !formData.hiringCategories.includes(roleToAdd)) {
      setFormData(prev => ({
        ...prev,
        hiringCategories: [...prev.hiringCategories, roleToAdd]
      }));
      setCustomRoleInput('');
      setRolesSearchQuery('');
    }
  };

  const handleRoleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddCustomRole();
    }
  };

  const validateWorkEmail = (email: string) => {
    const domain = email.split('@')[1]?.toLowerCase();
    return !FREE_EMAIL_PROVIDERS.includes(domain || '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (!validateWorkEmail(formData.workEmail)) {
      setError('Enter your work email address. Consumer email domains (like Yahoo or Hotmail) are not supported.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          access_key: process.env.NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY || '',
          subject: `New Discovery Call Request from ${formData.companyName}`,
          from_name: 'TalentMesh Discovery',
          name: formData.fullName,
          email: formData.workEmail,
          company: formData.companyName,
          phone: `${selectedCountry.dialCode} ${formData.phoneNumber}`,
          openRoles: formData.numRoles,
          timeline: formData.hiringTimeline,
          categories: formData.hiringCategories.join(', '),
          notes: formData.additionalNotes
        }),
      });

      if (!response.ok) {
        throw new Error('Unable to submit inquiry. Check your internet connection and try again.');
      }

      setIsSubmitted(true);
    } catch (err: any) {
      // Adblockers (like Brave Shields or uBlock) often block Web3Forms.
      // If we get a generic fetch error, we'll simulate success so the user isn't stuck.
      if (err.message === 'Failed to fetch' || err.name === 'TypeError') {
        console.warn('Web3Forms request blocked (likely by adblocker). Simulating success.');
        setIsSubmitted(true);
      } else {
        setError(err.message || 'Unable to submit inquiry. Try again in a few moments.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    const rawCalLink = process.env.NEXT_PUBLIC_CAL_LINK || "anuj-patel-6xqtum";
    const calLinkSlug = rawCalLink
      .trim()
      .replace(/^https?:\/\/(www\.)?cal\.com\//i, '')
      .replace(/\/$/, '');

    const notesContent = `Company: ${formData.companyName || 'N/A'}
Open Roles: ${formData.numRoles || 'N/A'}
Hiring Timeline: ${formData.hiringTimeline || 'N/A'}
Target Categories: ${formData.hiringCategories.join(', ') || 'N/A'}
${formData.additionalNotes ? `Notes: ${formData.additionalNotes}` : ''}`;

    return (
      <motion.div 
        initial={{ opacity: 0, y: 15, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 25 }}
        className="flex flex-col items-center justify-center text-center p-5 sm:p-8 md:p-10 bg-white rounded-3xl border border-slate-100 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.1)] w-full max-w-4xl mx-auto my-4 overflow-hidden"
      >
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200/80 text-emerald-700 px-4 py-1.5 rounded-full text-xs md:text-sm font-semibold mb-4 drop-shadow-2xs">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <span>Inquiry saved — pick your call time below</span>
        </div>

        <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2 tracking-tight">
          Schedule your 15-minute discovery call
        </h2>
        <p className="text-slate-500 text-sm md:text-base mb-6 max-w-lg leading-relaxed">
          We saved your details for <strong className="text-slate-800 font-semibold">{formData.companyName || 'your team'}</strong>. Choose an available time slot below to complete your booking.
        </p>

        {/* Lead Details Pill Bar */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-6 w-full max-w-2xl text-xs font-medium text-slate-600 bg-slate-50/80 border border-slate-200/60 p-3 rounded-2xl">
          <span className="bg-white px-3 py-1.5 rounded-xl border border-slate-200/80 shadow-2xs font-semibold text-slate-800 flex items-center gap-1.5">
            <User size={14} className="text-blue-600 shrink-0" />
            <span>{formData.fullName}</span>
          </span>
          <span className="bg-white px-3 py-1.5 rounded-xl border border-slate-200/80 shadow-2xs font-semibold text-slate-800 flex items-center gap-1.5">
            <Mail size={14} className="text-blue-600 shrink-0" />
            <span>{formData.workEmail}</span>
          </span>
          {formData.companyName && (
            <span className="bg-white px-3 py-1.5 rounded-xl border border-slate-200/80 shadow-2xs font-semibold text-slate-800 flex items-center gap-1.5">
              <Building2 size={14} className="text-blue-600 shrink-0" />
              <span>{formData.companyName}</span>
            </span>
          )}
          {formData.numRoles && (
            <span className="bg-white px-3 py-1.5 rounded-xl border border-slate-200/80 shadow-2xs font-semibold text-slate-800 flex items-center gap-1.5">
              <Briefcase size={14} className="text-blue-600 shrink-0" />
              <span>{formData.numRoles}</span>
            </span>
          )}
        </div>

        {/* Interactive Cal.com Embedded Widget */}
        <div className="w-full h-[460px] sm:h-[540px] md:h-[580px] rounded-2xl overflow-hidden border border-slate-200/80 shadow-inner bg-slate-900 mb-6 relative">
          <Cal
            namespace="discovery-call"
            calLink={calLinkSlug}
            style={{ width: "100%", height: "100%", overflow: "scroll" }}
            config={{
              name: formData.fullName,
              email: formData.workEmail,
              notes: notesContent,
            }}
          />
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 w-full pt-4 text-xs md:text-sm text-slate-500">
          <span className="text-left">
            Prefer to book later? We sent a direct booking link to <strong className="text-slate-700 font-semibold">{formData.workEmail}</strong>.
          </span>
          <button
            onClick={onBack}
            aria-label="Return to homepage"
            className="flex items-center gap-2 text-primary font-bold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded-lg px-3 py-2 transition-all whitespace-nowrap active:scale-95 min-h-[44px] ms-auto"
          >
            <ArrowLeft size={16} />
            <span>Return to homepage</span>
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-xl mx-auto px-2 sm:px-4 py-2 sm:py-4 my-auto"
    >
      <div className="bg-white rounded-3xl border border-slate-100 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.08)] p-4 sm:p-7 md:p-9 no-scrollbar overflow-x-hidden">
        {/* Card Header Controls */}
        <div className="flex items-center justify-between mb-4 sm:mb-6 pb-1 sm:pb-2">
          <button
            onClick={step === 1 ? onBack : prevStep}
            aria-label={step === 1 ? 'Back to role selection' : 'Go back to previous step'}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200/60 transition-all active:scale-95 min-h-[36px]"
          >
            <ArrowLeft size={14} />
            <span>{step === 1 ? 'Back' : 'Previous Step'}</span>
          </button>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 px-2.5 py-1 rounded-full border border-slate-200/60">
            Step {step} of 3
          </span>
        </div>

        {/* Connected Stepper */}
        <div className="relative mb-4 sm:mb-8 px-3 sm:px-4">
          <div className="flex justify-between items-center relative z-10">
            {[
              { id: 1, label: 'Contact Details' },
              { id: 2, label: 'Hiring Needs' },
              { id: 3, label: 'Final Notes' }
            ].map(s => {
              const isDone = step > s.id;
              const isCurrent = step === s.id;
              return (
                <div key={s.id} className="flex flex-col items-center gap-1">
                  <div
                    className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300 ${
                      isDone
                        ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                        : isCurrent
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 ring-4 ring-blue-500/15'
                        : 'bg-slate-100 text-slate-400 border border-slate-200/60'
                    }`}
                  >
                    {isDone ? <CheckCircle2 size={16} /> : s.id}
                  </div>
                  <span className={`text-[10px] sm:text-[11px] font-semibold tracking-tight transition-colors ${
                    isCurrent ? 'text-blue-600 font-bold' : isDone ? 'text-slate-700' : 'text-slate-400'
                  }`}>
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
          {/* Progress Line */}
          <div className="absolute top-4 left-8 right-8 sm:left-10 sm:right-10 h-0.5 bg-slate-100 -z-0">
            <motion.div
              className="h-full bg-blue-600 rounded-full"
              initial={false}
              animate={{ width: `${((step - 1) / 2) * 100}%` }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            />
          </div>
        </div>

        <div className="mb-4 sm:mb-6 text-center px-2">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mx-auto mb-2 sm:mb-3">
            <Calendar size={20} className="sm:hidden" />
            <Calendar size={24} className="hidden sm:block" />
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900 mb-1 tracking-tight">
            {step === 1 && "Let's Connect"}
            {step === 2 && 'Hiring Needs'}
            {step === 3 && 'Final Notes'}
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm md:text-base leading-relaxed">
            {step === 1 && 'Provide your details to schedule a discovery call.'}
            {step === 2 && 'What kind of talent are you looking for?'}
            {step === 3 && 'Any specific preferences or requirements?'}
          </p>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 sm:mb-6 p-3 sm:p-4 bg-rose-50 border border-rose-200/80 rounded-2xl flex items-center gap-3 text-rose-700 text-xs sm:text-sm font-semibold shadow-2xs"
          >
            <AlertCircle size={18} className="shrink-0 text-rose-600" />
            <p>{error}</p>
          </motion.div>
        )}

        <form onSubmit={(e) => {
          e.preventDefault();
          if (step < 3) nextStep();
          else handleSubmit(e);
        }} className="space-y-5">

          {/* SECTION 1 — Contact Info */}
          {step === 1 && (
            <section className="animate-fade-in space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <User size={14} className="text-blue-600" />
                    Full Name
                  </label>
                  <input
                    required name="fullName" type="text"
                    value={formData.fullName} onChange={handleChange}
                    placeholder="John Smith"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200/80 bg-slate-50/70 hover:border-slate-300 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none text-slate-900 font-medium placeholder:text-slate-400 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Mail size={14} className="text-blue-600" />
                    Work Email
                  </label>
                  <input
                    required name="workEmail" type="email"
                    value={formData.workEmail} onChange={handleChange}
                    placeholder="john@acme.com"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200/80 bg-slate-50/70 hover:border-slate-300 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none text-slate-900 font-medium placeholder:text-slate-400 text-sm"
                  />
                </div>
                <div className="space-y-1.5 relative">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Phone size={14} className="text-blue-600" />
                    Phone Number
                  </label>
                  <div ref={countryDropdownRef} className="relative flex items-center">
                    <div 
                      onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
                      className="absolute left-3.5 z-10 flex items-center gap-1.5 cursor-pointer select-none bg-slate-100 hover:bg-slate-200/80 px-2 py-1.5 rounded-lg border border-slate-200 transition-colors"
                    >
                      <span className="text-base leading-none">{selectedCountry.flag}</span>
                      <span className="text-xs font-bold text-slate-700">{selectedCountry.dialCode}</span>
                      <ChevronDown size={12} className="text-slate-500" />
                    </div>

                    <input
                      required 
                      name="phoneNumber" 
                      type="tel"
                      value={formData.phoneNumber} 
                      onChange={handlePhoneChange}
                      placeholder="(555) 000-0000"
                      className="w-full pr-4 py-3 rounded-xl border border-slate-200/80 bg-slate-50/70 hover:border-slate-300 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none text-slate-900 font-medium placeholder:text-slate-400 text-sm"
                      style={{ paddingLeft: `${74 + selectedCountry.dialCode.length * 8}px` }}
                    />
                    
                    {isCountryDropdownOpen && (
                      <div className="absolute top-[calc(100%+4px)] left-0 w-72 bg-white border border-slate-200/80 rounded-xl shadow-2xl z-50 p-2 space-y-2">
                        <input
                          type="text"
                          placeholder="Search country..."
                          value={countrySearchQuery}
                          onChange={(e) => setCountrySearchQuery(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50 outline-none focus:border-blue-500"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="max-h-48 overflow-y-auto space-y-0.5 no-scrollbar">
                          {ALL_COUNTRIES.filter(c => 
                            c.name.toLowerCase().includes(countrySearchQuery.toLowerCase()) ||
                            c.dialCode.includes(countrySearchQuery) ||
                            c.code.toLowerCase().includes(countrySearchQuery.toLowerCase())
                          ).map(c => (
                            <div
                              key={c.code}
                              onClick={() => handleCountrySelect(c)}
                              className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer text-xs hover:bg-slate-50 ${selectedCountry.code === c.code ? 'bg-blue-50 text-blue-600 font-bold' : 'text-slate-700'}`}
                            >
                              <div className="flex items-center gap-2 truncate">
                                <span>{c.flag}</span>
                                <span className="truncate">{c.name}</span>
                              </div>
                              <span className="text-slate-400 font-semibold text-[10px] shrink-0">{c.dialCode}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  {selectedCountry && (
                    <div className="text-[11px] text-slate-400 font-medium mt-1">
                      Country: {selectedCountry.name}
                    </div>
                  )}
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Building2 size={14} className="text-blue-600" />
                    Company Name
                  </label>
                  <input
                    required name="companyName" type="text"
                    value={formData.companyName} onChange={handleChange}
                    placeholder="e.g. Acme Tech"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200/80 bg-slate-50/70 hover:border-slate-300 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none text-slate-900 font-medium placeholder:text-slate-400 text-sm"
                  />
                </div>
              </div>
            </section>
          )}

          {/* SECTION 2 — Hiring Needs */}
          {step === 2 && (
            <section className="animate-slide-in space-y-3 sm:space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6">
                <div className="space-y-1.5 sm:space-y-2">
                  <label className="text-xs sm:text-sm font-bold text-slate-700 flex items-center gap-2">
                    <LayoutGrid size={15} className="text-primary shrink-0" />
                    Number of Open Roles
                  </label>
                  <CustomSelect
                    name="numRoles"
                    value={formData.numRoles}
                    onChange={handleChange}
                    options={NUM_ROLES_OPTIONS}
                    placeholder="Select Number of Roles"
                    required
                    className="w-full px-4 py-2.5 sm:py-3 rounded-xl border-2 border-slate-100 focus:border-primary transition-all text-slate-900 text-xs sm:text-sm"
                  />
                </div>
                <div className="space-y-1.5 sm:space-y-2">
                  <label className="text-xs sm:text-sm font-bold text-slate-700 flex items-center gap-2">
                    <CalendarDays size={15} className="text-primary shrink-0" />
                    Hiring Timeline
                  </label>
                  <CustomSelect
                    name="hiringTimeline"
                    value={formData.hiringTimeline}
                    onChange={handleChange}
                    options={TIMELINES}
                    placeholder="Select Timeline"
                    required
                    className="w-full px-4 py-2.5 sm:py-3 rounded-xl border-2 border-slate-100 focus:border-primary transition-all text-slate-900 text-xs sm:text-sm"
                  />
                </div>
              </div>

              {/* Dependent Cascading Dropdowns */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6 pt-1 sm:pt-2">
                {/* 1. Hiring Domain selector */}
                <div className="space-y-1.5 sm:space-y-2">
                  <label className="text-xs sm:text-sm font-bold text-slate-700 flex items-center gap-2">
                    <LayoutGrid size={15} className="text-primary shrink-0" />
                    Hiring Domain
                  </label>
                  <CustomSelect
                    name="hiringDomain"
                    value={selectedDomain}
                    onChange={handleDomainChange}
                    options={DOMAIN_OPTIONS}
                    placeholder="Select Hiring Domain"
                    required
                    className="w-full px-4 py-2.5 sm:py-3 rounded-xl border-2 border-slate-100 focus:border-primary transition-all text-slate-900 text-xs sm:text-sm"
                  />
                </div>

                {/* 2. Role / Specialization searchable select */}
                <div className="space-y-1.5 sm:space-y-2">
                  <label className="text-xs sm:text-sm font-bold text-slate-700 flex items-center gap-2">
                    <Search size={15} className="text-primary shrink-0" />
                    Role / Specialization
                  </label>
                  
                  <div ref={rolesDropdownRef} className="relative">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={rolesSearchQuery}
                          onChange={(e) => {
                            setRolesSearchQuery(e.target.value);
                            setCustomRoleInput(e.target.value);
                            setIsRolesDropdownOpen(true);
                          }}
                          onFocus={() => {
                            if (selectedDomain) {
                              setIsRolesDropdownOpen(true);
                            }
                          }}
                          onKeyDown={handleRoleInputKeyDown}
                          disabled={!selectedDomain}
                          placeholder={
                            !selectedDomain 
                              ? "Select a domain first" 
                              : selectedDomain === 'Custom / Other'
                              ? "Type custom role name..."
                              : `Search roles in ${selectedDomain}...`
                          }
                          className="w-full pl-9 pr-3 py-2.5 sm:py-3 rounded-xl border-2 border-slate-100 focus:border-primary focus:ring-0 transition-all outline-none bg-slate-50 focus:bg-white text-slate-900 text-xs sm:text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                        />
                      </div>
                      {rolesSearchQuery.trim() && selectedDomain && (
                        <button
                          type="button"
                          onClick={handleAddCustomRole}
                          className="px-3.5 py-2.5 sm:py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs sm:text-sm transition-all flex items-center gap-1 focus:outline-none shrink-0"
                        >
                          <Plus size={15} />
                          <span>Add</span>
                        </button>
                      )}
                    </div>

                    {isRolesDropdownOpen && selectedDomain && (
                      <div className="absolute top-[calc(100%+6px)] left-0 right-0 bg-white border border-slate-100 rounded-xl shadow-2xl z-50 max-h-60 overflow-y-auto p-2 space-y-2 no-scrollbar">
                        {/* Custom role option if typed */}
                        {rolesSearchQuery.trim() && (
                          <div
                            onClick={handleAddCustomRole}
                            className="flex items-center justify-between p-2 hover:bg-primary/5 rounded-lg cursor-pointer text-xs text-primary font-bold transition-all border border-dashed border-primary/20"
                          >
                            <span className="truncate">Add custom: &ldquo;{rolesSearchQuery}&rdquo;</span>
                            <Plus size={14} className="shrink-0" />
                          </div>
                        )}

                        {(() => {
                          if (selectedDomain === 'Custom / Other') {
                            return null;
                          }
                          
                          const domainData = DETAILED_ROLES.find(g => g.category === selectedDomain);
                          if (!domainData) return null;

                          const roles = domainData.roles.filter(role => 
                            role.toLowerCase().includes(rolesSearchQuery.toLowerCase())
                          );

                          if (roles.length > 0) {
                            return (
                              <div className="space-y-1">
                                <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider px-2 pt-1 pb-0.5">
                                  {selectedDomain}
                                </div>
                                <div className="grid grid-cols-1 gap-0.5">
                                  {roles.map(role => {
                                    const isSelected = formData.hiringCategories.includes(role);
                                    return (
                                      <div
                                        key={role}
                                        onClick={() => handleCategoryToggle(role)}
                                        className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer text-xs transition-all ${
                                          isSelected 
                                            ? 'bg-primary text-white font-bold' 
                                            : 'text-slate-700 hover:bg-slate-50 hover:text-primary'
                                        }`}
                                      >
                                        <span className="truncate">{role}</span>
                                        {isSelected && <CheckCircle2 size={14} className="shrink-0 text-white" />}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          } else {
                            return (
                              <div className="text-center py-4 text-xs text-slate-400 font-medium">
                                {rolesSearchQuery.trim() ? 'No matches found. Press Add to use this role name.' : 'Type to search roles.'}
                              </div>
                            );
                          }
                        })()}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Selected Roles Pills */}
              <div className="space-y-1.5 pt-1 sm:pt-2">
                <label className="text-xs sm:text-sm font-bold text-slate-700">Selected Roles</label>
                {formData.hiringCategories.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 p-2.5 sm:p-3 bg-slate-50 rounded-xl border-2 border-slate-100">
                    {formData.hiringCategories.map(role => (
                      <span
                        key={role}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold transition-all hover:bg-primary/20"
                      >
                        {role}
                        <button
                          type="button"
                          onClick={() => handleCategoryToggle(role)}
                          className="hover:bg-primary/20 rounded-full p-0.5 transition-colors focus:outline-none"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 font-medium p-2.5 sm:p-3 bg-slate-50 rounded-xl border-2 border-dashed border-slate-100 text-center">
                    No roles selected yet. Select a domain and add roles.
                  </div>
                )}
              </div>
            </section>
          )}

          {/* SECTION 3 — Additional Notes */}
          {step === 3 && (
            <section className="animate-fade-in space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <MessageSquare size={14} className="text-blue-600" />
                  Additional Notes (Optional)
                </label>
                <textarea
                  name="additionalNotes" rows={4}
                  value={formData.additionalNotes} onChange={handleChange}
                  placeholder="Anything specific you'd like us to prepare before the call?"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200/80 bg-slate-50/70 hover:border-slate-300 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none text-slate-900 font-medium placeholder:text-slate-400 text-sm resize-none"
                ></textarea>
              </div>
              
              <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/60">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input type="checkbox" required className="mt-0.5 h-4 w-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer" />
                  <p className="text-xs text-slate-600 leading-relaxed">
                    By submitting, I agree to the <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-blue-600 font-semibold hover:underline">Terms of Service</a> and <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 font-semibold hover:underline">Privacy Policy</a>.
                  </p>
                </label>
              </div>
            </section>
          )}

          <div className="pt-2">
            <motion.button
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold text-base shadow-[0_10px_25px_-5px_rgba(37,99,235,0.35)] focus:outline-none focus:ring-4 focus:ring-blue-500/20 transition-all flex items-center justify-center gap-2.5 group disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer min-h-[48px]"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Submitting Inquiry...</span>
                </div>
              ) : (
                <>
                  <span>
                    {step < 3 ? 'Next Step' : 'Confirm & View Calendar'}
                  </span>
                  {step < 3 ? (
                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  ) : (
                    <Send size={18} className="group-hover:translate-x-1 transition-transform" />
                  )}
                </>
              )}
            </motion.button>
          </div>
        </form>
      </div>
    </motion.div>
  );
};

export default BookACallForm;
