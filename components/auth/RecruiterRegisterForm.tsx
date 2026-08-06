'use client';

import React, { useState } from 'react';
import { Building2, Mail, User, ArrowLeft, ArrowRight, AlertCircle, Lock, Eye, EyeOff } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { signupSchema } from '@/lib/validation/auth';

interface RecruiterRegisterFormProps {
  onBack: () => void;
}

const FREE_EMAIL_PROVIDERS = [
  'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com', 'aol.com', 'gmail.com'
];

/* ── Reusable field wrapper ── */
const Field = ({
  id,
  label,
  children,
  className = ''
}: {
  id?: string;
  label: string;
  children: React.ReactNode;
  className?: string;
}) => (
  <div className={`flex flex-col gap-1.5 ${className}`}>
    <label htmlFor={id} className="text-xs font-semibold text-slate-700">
      {label}
    </label>
    {children}
  </div>
);

/* ── Reusable input base class ── */
const inputCls =
  "w-full px-3.5 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 text-base sm:text-sm placeholder:text-slate-400 transition-all focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 focus:ring-offset-1 hover:border-slate-300 focus:outline-none";

const RecruiterRegisterForm: React.FC<RecruiterRegisterFormProps> = ({ onBack }) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    fullName: '',
    workEmail: '',
    password: '',
    agreeTerms: false,
    agreeProcessing: false,
    agreeAge: false,
    agreeMarketing: false,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const validateWorkEmail = (email: string) =>
    !FREE_EMAIL_PROVIDERS.includes((email.split('@')[1] || '').toLowerCase());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setFieldErrors({});

    const errors: Record<string, string> = {};

    if (!formData.agreeTerms || !formData.agreeProcessing || !formData.agreeAge) {
      errors.consents = 'Please accept all required agreements and confirm your age to continue.';
    }

    if (!validateWorkEmail(formData.workEmail)) {
      errors.workEmail = 'Enter a corporate email address. Personal providers (Gmail, Yahoo, etc.) are not accepted.';
    }

    const consents = {
      terms_of_service: formData.agreeTerms,
      account_processing: formData.agreeProcessing,
      marketing_email: formData.agreeMarketing,
      age_18_plus: formData.agreeAge,
    };

    const validation = signupSchema.safeParse({
      name: formData.fullName,
      email: formData.workEmail,
      password: formData.password,
      role: 'candidate',
      consents,
    });

    if (!validation.success) {
      validation.error.issues.forEach(issue => {
        const path = issue.path[0]?.toString();
        if (path === 'name') errors.fullName = issue.message;
        else if (path === 'email') errors.workEmail = issue.message;
        else if (path) errors[path] = issue.message;
      });
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.workEmail,
          password: formData.password,
          role: 'candidate',
          name: formData.fullName,
          consents,
        }),
      });

      const result = await response.json();

      if (result.error || !response.ok) {
        setError(result.error || 'Unable to create account. Please check your details and try again.');
        setIsLoading(false);
        return;
      }

      if (result.requireEmailVerification) {
        router.push(
          `/signup/verify?email=${encodeURIComponent(formData.workEmail)}&role=recruiter&name=${encodeURIComponent(formData.fullName)}`
        );
        return;
      }

      window.location.assign('/onboarding/recruiter/setup');
    } catch (err: any) {
      setError(err.message || 'Unable to submit registration. Please check your connection and try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      <div className="w-full max-w-md flex flex-col">
        <button
          onClick={onBack}
          type="button"
          aria-label="Go back to role selection"
          className="flex items-center gap-2 text-sm font-medium text-white/90 hover:text-white bg-slate-900/60 hover:bg-slate-900/80 border border-white/15 backdrop-blur-md px-3.5 py-1.5 rounded-xl transition-all mb-3 group w-fit focus-visible:ring-2 focus-visible:ring-blue-400 outline-none shadow-sm"
        >
          <ArrowLeft size={16} aria-hidden="true" className="group-hover:-translate-x-0.5 transition-transform text-white/80 group-hover:text-white" />
          <span>Back</span>
        </button>

        <div className="bg-white/95 backdrop-blur-sm rounded-2xl border border-slate-200/80 shadow-xl shadow-slate-900/5 flex flex-col overflow-hidden">
          <div className="px-6 pt-6 pb-4 border-b border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center mb-3">
              <Building2 size={18} aria-hidden="true" className="text-blue-600" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight [text-wrap:balance]">
              Register as a Recruiter
            </h1>
            <p className="text-xs text-slate-600 mt-1">
              Create your recruiter account to start posting jobs and sourcing talent
            </p>
          </div>

          <div className="px-6 py-5">
            {error && (
              <div
                role="alert"
                aria-live="assertive"
                className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-red-700 text-xs font-medium"
              >
                <AlertCircle size={16} aria-hidden="true" className="shrink-0 mt-0.5 text-red-600" />
                <p>{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <Field id="fullName" label="Full Name *">
                <div className="relative">
                  <User size={15} aria-hidden="true" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                  <input
                    id="fullName"
                    required
                    name="fullName"
                    type="text"
                    autoComplete="name"
                    value={formData.fullName}
                    onChange={handleChange}
                    aria-invalid={!!fieldErrors.fullName}
                    aria-describedby={fieldErrors.fullName ? "fullName-error" : undefined}
                    placeholder="John Smith"
                    className={`${inputCls} pl-10`}
                  />
                </div>
                {fieldErrors.fullName && (
                  <span id="fullName-error" className="text-xs text-red-600 font-medium mt-1 block">
                    {fieldErrors.fullName}
                  </span>
                )}
              </Field>

              <Field id="workEmail" label="Work Email *">
                <div className="relative">
                  <Mail size={15} aria-hidden="true" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                  <input
                    id="workEmail"
                    required
                    name="workEmail"
                    type="email"
                    autoComplete="email"
                    value={formData.workEmail}
                    onChange={handleChange}
                    aria-invalid={!!fieldErrors.workEmail}
                    aria-describedby={fieldErrors.workEmail ? "workEmail-error" : undefined}
                    placeholder="john@acme.com"
                    className={`${inputCls} pl-10`}
                  />
                </div>
                {fieldErrors.workEmail && (
                  <span id="workEmail-error" className="text-xs text-red-600 font-medium mt-1 block">
                    {fieldErrors.workEmail}
                  </span>
                )}
              </Field>

              <Field id="password" label="Password *">
                <div className="relative">
                  <Lock size={15} aria-hidden="true" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                  <input
                    id="password"
                    required
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={formData.password}
                    onChange={handleChange}
                    aria-invalid={!!fieldErrors.password}
                    aria-describedby={fieldErrors.password ? "password-error" : "password-hint"}
                    placeholder="••••••••••••"
                    className={`${inputCls} pl-10 pr-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded p-1"
                  >
                    {showPassword ? (
                      <EyeOff size={16} aria-hidden="true" />
                    ) : (
                      <Eye size={16} aria-hidden="true" />
                    )}
                  </button>
                </div>
                <span id="password-hint" className="text-[11px] text-slate-500 mt-1 block">
                  Must be at least 12 characters
                </span>
                {fieldErrors.password && (
                  <span id="password-error" className="text-xs text-red-600 font-medium mt-1 block">
                    {fieldErrors.password}
                  </span>
                )}
              </Field>

              <div className="flex flex-col gap-2.5 pt-1">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    name="agreeTerms"
                    required
                    checked={formData.agreeTerms}
                    onChange={handleChange}
                    className="mt-0.5 h-4 w-4 text-blue-600 border-slate-300 rounded focus:ring-blue-600 cursor-pointer"
                  />
                  <span className="text-xs text-slate-700 leading-relaxed">
                    I agree to the{' '}
                    <a
                      href="/terms"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline font-medium hover:text-blue-700 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-600 rounded"
                    >
                      Terms of Service
                    </a>
                  </span>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    name="agreeProcessing"
                    required
                    checked={formData.agreeProcessing}
                    onChange={handleChange}
                    className="mt-0.5 h-4 w-4 text-blue-600 border-slate-300 rounded focus:ring-blue-600 cursor-pointer"
                  />
                  <span className="text-xs text-slate-700 leading-relaxed">
                    I consent to TalentMesh processing my personal data to create and operate my account, as described in the{' '}
                    <a
                      href="/privacy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline font-medium hover:text-blue-700 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-600 rounded"
                    >
                      Privacy Policy
                    </a>
                  </span>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    name="agreeAge"
                    required
                    checked={formData.agreeAge}
                    onChange={handleChange}
                    className="mt-0.5 h-4 w-4 text-blue-600 border-slate-300 rounded focus:ring-blue-600 cursor-pointer"
                  />
                  <span className="text-xs text-slate-700 leading-relaxed">
                    I confirm that I am 18 years of age or older
                  </span>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    name="agreeMarketing"
                    checked={formData.agreeMarketing}
                    onChange={handleChange}
                    className="mt-0.5 h-4 w-4 text-blue-600 border-slate-300 rounded focus:ring-blue-600 cursor-pointer"
                  />
                  <span className="text-xs text-slate-700 leading-relaxed">
                    I would like to receive marketing and product update emails from TalentMesh (optional)
                  </span>
                </label>

                {fieldErrors.consents && (
                  <span id="consents-error" className="text-xs text-red-600 font-medium mt-1 block">
                    {fieldErrors.consents}
                  </span>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading || !formData.agreeTerms || !formData.agreeProcessing || !formData.agreeAge}
                className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2.5 transition-all duration-200 shadow-md shadow-blue-200 hover:shadow-lg hover:shadow-blue-200 disabled:opacity-60 disabled:cursor-not-allowed group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Create Account</span>
                    <ArrowRight size={17} aria-hidden="true" className="group-hover:translate-x-0.5 transition-transform" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecruiterRegisterForm;
