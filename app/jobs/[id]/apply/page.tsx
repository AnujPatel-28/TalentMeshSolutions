'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import styles from './apply.module.css';
import { useAuth } from '@/lib/auth/AuthContext';
import { insforge, invokeFunction } from '@/lib/insforge';

const Ico = {
  Upload: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>,
  Check: () => <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>,
  File: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>,
};

function JobApplyPageContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (job?.title && typeof window !== 'undefined') {
      document.title = `Apply for ${job.title} | TalentMesh`;
    }
  }, [job]);
  
  // Form State
  const [formData, setFormData] = useState({
    fullName: user?.name || '',
    email: user?.email || '',
    phone: '',
    coverLetter: '',
    portfolioUrl: ''
  });
  const [resume, setResume] = useState<File | null>(null);
  const [existingResumes, setExistingResumes] = useState<any[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      fetchResumes();
    }
  }, [user]);

  const fetchResumes = async () => {
    try {
      const { data } = await insforge.database
        .from('candidate_resumes')
        .select('*')
        .eq('candidate_id', user?.id)
        .order('created_at', { ascending: false });
      
      if (data && data.length > 0) {
        setExistingResumes(data);
        const defaultResume = data.find((r: any) => r.is_default) || data[0];
        setSelectedResumeId(defaultResume.id);
      }
    } catch (err) {
      console.error('Error fetching resumes:', err);
    }
  };

  useEffect(() => {
    async function fetchJob() {
      try {
        const { data, error } = await invokeFunction('jobs-id', {
          method: 'GET',
          queries: { id: Array.isArray(params.id) ? params.id[0] : params.id }
        });
        if (!error) {
          setJob(data?.job || data);
        }
      } catch (err) {
        console.error('Fetch error:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchJob();
  }, [params.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const isUploadingNew = !selectedResumeId || selectedResumeId === 'new';
    if (isUploadingNew && !resume) {
      alert('Please upload your resume.');
      return;
    }

    setSubmitting(true);
    try {
      let finalResumeUrl = '';
      let finalResumeId = selectedResumeId;

      if (!selectedResumeId || selectedResumeId === 'new') {
        // 1. Upload Resume
        if (!resume) throw new Error('Please upload a resume.');
        const path = `${user?.id || 'anonymous'}/${Date.now()}_${resume.name}`;
        const { data: uploadData, error: uploadError } = await (insforge.storage
          .from('resumes') as any)
          .upload(path, resume, { contentType: resume.type || 'application/pdf' });
        
        if (uploadError) throw uploadError;
        finalResumeUrl = uploadData?.url || '';

        // Save to candidate_resumes as well to keep it in history
        const { data: newResume, error: saveError } = await insforge.database
          .from('candidate_resumes')
          .insert([{
            candidate_id: user?.id,
            label: `Application Resume - ${new Date().toLocaleDateString()}`,
            file_url: finalResumeUrl,
            file_name: resume.name,
            file_size_bytes: resume.size,
            is_default: existingResumes.length === 0
          }])
          .select()
          .single();
        
        if (!saveError && newResume) {
          finalResumeId = newResume.id;
        }
      } else {
        const selected = existingResumes.find(r => r.id === selectedResumeId);
        finalResumeUrl = selected?.file_url;
      }

      // 2. Detect Referral
      const referralCode = searchParams.get('ref');
      let referralId = null;
      if (referralCode) {
        const { data: refData } = await insforge.database
          .from('referrals')
          .select('id')
          .eq('referral_code', referralCode)
          .single();
        referralId = refData?.id;
      }

      // 3. Submit Application
      const { error: applyError } = await invokeFunction('candidate-applications', {
        method: 'POST',
        body: {
          jobId: params.id,
          fullName: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          coverLetter: formData.coverLetter,
          portfolioUrl: formData.portfolioUrl,
          resumeUrl: finalResumeUrl,
          resumeId: finalResumeId,
          appliedViaReferralId: referralId
        }
      });

      if (applyError) throw applyError;

      // Resume usage count (upload_count) is now automatically handled via database trigger.

      setSubmitted(true);
    } catch (err: any) {
      console.error('Submission error:', err);
      alert(err.message || 'Failed to submit application. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className={styles.page}><p style={{ textAlign: 'center' }}>Loading...</p></div>;
  if (!job) return <div className={styles.page}><p style={{ textAlign: 'center' }}>Job not found.</p></div>;

  if (submitted) {
    return (
      <main className={styles.page}>
        <div className={styles.container}>
          <div className={styles.formCard}>
            <div className={styles.successCard}>
              <div className={styles.successIcon}><Ico.Check /></div>
              <h1 className={styles.title}>Application Submitted!</h1>
              <p className={styles.subtitle}>
                Your application for <strong>{job.title}</strong> at <strong>{job.company_profiles?.company_name}</strong> has been sent.
              </p>
              <p className={styles.subtitle} style={{ marginTop: '1rem' }}>
                We've sent a confirmation email to {formData.email}.
              </p>
              <Link href="/dashboard/candidate" className={styles.backLink}>
                Go to Dashboard →
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <div className={styles.formCard}>
          <div className={styles.header}>
            <h1 className={styles.title}>Apply for {job.title}</h1>
            <p className={styles.subtitle}>{job.company_profiles?.company_name} · {job.location}</p>
          </div>

          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.field}>
              <label className={styles.label}>Full Name</label>
              <input 
                type="text" 
                required 
                className={styles.input} 
                value={formData.fullName}
                onChange={e => setFormData({...formData, fullName: e.target.value})}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Email Address</label>
              <input 
                type="email" 
                required 
                className={styles.input} 
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Phone Number</label>
              <input 
                type="tel" 
                required 
                placeholder="+91"
                className={styles.input} 
                value={formData.phone}
                onChange={e => setFormData({...formData, phone: e.target.value})}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Which resume would you like to use?</label>
              
              {existingResumes.length > 0 ? (
                <div className={styles.resumeSelector}>
                  {existingResumes.map(r => (
                    <label key={r.id} className={styles.resumeOption}>
                      <input 
                        type="radio" 
                        name="resume_id" 
                        value={r.id}
                        checked={selectedResumeId === r.id}
                        onChange={() => setSelectedResumeId(r.id)}
                      />
                      <div className={styles.resumeInfo}>
                        <span className={styles.resumeLabel}>{r.label}</span>
                        <span className={styles.resumeFile}>{r.file_name}</span>
                      </div>
                    </label>
                  ))}
                  <label className={styles.resumeOption}>
                    <input 
                      type="radio" 
                      name="resume_id" 
                      value="new"
                      checked={selectedResumeId === 'new'}
                      onChange={() => setSelectedResumeId('new')}
                    />
                    <div className={styles.resumeInfo}>
                      <span className={styles.resumeLabel}>Upload a new resume version</span>
                    </div>
                  </label>
                </div>
              ) : null}

              {(existingResumes.length === 0 || selectedResumeId === 'new') && (
                <>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    style={{ display: 'none' }} 
                    accept=".pdf"
                    onChange={async e => {
                      const file = e.target.files?.[0] || null;
                      if (file) {
                        const ext = '.' + file.name.split('.').pop()?.toLowerCase();
                        if (ext !== '.pdf') {
                          alert('Only PDF resumes are supported.');
                          if (fileInputRef.current) fileInputRef.current.value = '';
                          return;
                        }
                        if (file.type !== 'application/pdf') {
                          alert('Only PDF resumes are supported.');
                          if (fileInputRef.current) fileInputRef.current.value = '';
                          return;
                        }
                        const bytes = new Uint8Array(await file.slice(0, 5).arrayBuffer());
                        const isPdf =
                          bytes[0] === 0x25 &&
                          bytes[1] === 0x50 &&
                          bytes[2] === 0x44 &&
                          bytes[3] === 0x46 &&
                          bytes[4] === 0x2D;
                        if (!isPdf) {
                          alert('Only PDF resumes are supported.');
                          if (fileInputRef.current) fileInputRef.current.value = '';
                          return;
                        }
                        setResume(file);
                      } else {
                        setResume(null);
                      }
                    }}
                  />
                  {!resume ? (
                    <div className={styles.uploadArea} onClick={() => fileInputRef.current?.click()}>
                      <div className={styles.uploadIcon}><Ico.Upload /></div>
                      <span className={styles.uploadText}>Click to upload your resume</span>
                      <span className={styles.uploadHint}>Max file size: 5MB (PDF only)</span>
                    </div>
                  ) : (
                    <div className={styles.fileInfo}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <Ico.File />
                        <span className={styles.fileName}>{resume.name}</span>
                      </div>
                      <button type="button" className={styles.removeFile} onClick={() => setResume(null)}>Remove</button>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Cover Letter (Optional)</label>
              <textarea 
                className={styles.textarea} 
                placeholder="Why are you a good fit for this role?"
                value={formData.coverLetter}
                onChange={e => setFormData({...formData, coverLetter: e.target.value})}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Portfolio Link (Optional)</label>
              <input 
                type="url" 
                placeholder="https://yourportfolio.com"
                className={styles.input} 
                value={formData.portfolioUrl}
                onChange={e => setFormData({...formData, portfolioUrl: e.target.value})}
              />
            </div>

            <button type="submit" className={styles.submitBtn} disabled={submitting}>
              {submitting ? 'Submitting Application...' : 'Submit Application'}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}

export default function JobApplyPage() {
  return (
    <Suspense fallback={<div className={styles.page}><p style={{ textAlign: 'center' }}>Loading application...</p></div>}>
      <JobApplyPageContent />
    </Suspense>
  );
}
