"use client";
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import styles from '../../../shared-dashboard.module.css';
import { useAuth } from '@/lib/auth/AuthContext';
import { insforge, invokeFunction } from '@/lib/insforge';
import type { UserProfile, CandidateProfile, WorkExperience, EducationEntry } from '@/types/user';
import Toast from '@/components/ui/Toast';
import { getPublicStorageUrl } from '@/lib/utils/storage-url';
import { CustomSelect } from '@/components/ui/CustomSelect';

const INDIAN_CITIES = [
  'Bengaluru, Karnataka',
  'Chennai, Tamil Nadu',
  'Delhi, NCT',
  'Hyderabad, Telangana',
  'Mumbai, Maharashtra',
  'Pune, Maharashtra',
  'Noida, Uttar Pradesh',
  'Gurgaon, Haryana',
  'Kolkata, West Bengal',
  'Ahmedabad, Gujarat',
  'Surat, Gujarat',
  'Vadodara, Gujarat',
  'Rajkot, Gujarat',
  'Jaipur, Rajasthan',
  'Jodhpur, Rajasthan',
  'Udaipur, Rajasthan',
  'Kota, Rajasthan',
  'Ajmer, Rajasthan',
  'Lucknow, Uttar Pradesh',
  'Kanpur, Uttar Pradesh',
  'Agra, Uttar Pradesh',
  'Varanasi, Uttar Pradesh',
  'Prayagraj, Uttar Pradesh',
  'Ghaziabad, Uttar Pradesh',
  'Meerut, Uttar Pradesh',
  'Bhopal, Madhya Pradesh',
  'Indore, Madhya Pradesh',
  'Gwalior, Madhya Pradesh',
  'Jabalpur, Madhya Pradesh',
  'Ujjain, Madhya Pradesh',
  'Patna, Bihar',
  'Gaya, Bihar',
  'Bhagalpur, Bihar',
  'Muzaffarpur, Bihar',
  'Ranchi, Jharkhand',
  'Jamshedpur, Jharkhand',
  'Dhanbad, Jharkhand',
  'Bokaro, Jharkhand',
  'Bhubaneswar, Odisha',
  'Cuttack, Odisha',
  'Rourkela, Odisha',
  'Puri, Odisha',
  'Guwahati, Assam',
  'Dibrugarh, Assam',
  'Silchar, Assam',
  'Jorhat, Assam',
  'Srinagar, Jammu & Kashmir',
  'Jammu, Jammu & Kashmir',
  'Shimla, Himachal Pradesh',
  'Dharamshala, Himachal Pradesh',
  'Mandi, Himachal Pradesh',
  'Chandigarh',
  'Ludhiana, Punjab',
  'Amritsar, Punjab',
  'Jalandhar, Punjab',
  'Patiala, Punjab',
  'Dehradun, Uttarakhand',
  'Haridwar, Uttarakhand',
  'Haldwani, Uttarakhand',
  'Raipur, Chhattisgarh',
  'Bhilai, Chhattisgarh',
  'Bilaspur, Chhattisgarh',
  'Panaji, Goa',
  'Margao, Goa',
  'Mormugao, Goa',
  'Kochi, Kerala',
  'Thiruvananthapuram, Kerala',
  'Kozhikode, Kerala',
  'Thrissur, Kerala',
  'Coimbatore, Tamil Nadu',
  'Madurai, Tamil Nadu',
  'Salem, Tamil Nadu',
  'Tiruchirappalli, Tamil Nadu',
  'Tiruppur, Tamil Nadu',
  'Vijayawada, Andhra Pradesh',
  'Visakhapatnam, Andhra Pradesh',
  'Guntur, Andhra Pradesh',
  'Tirupati, Andhra Pradesh',
  'Kurnool, Andhra Pradesh',
  'Warangal, Telangana',
  'Karimnagar, Telangana',
  'Nizamabad, Telangana',
  'Nagpur, Maharashtra',
  'Nashik, Maharashtra',
  'Thane, Maharashtra',
  'Aurangabad, Maharashtra',
  'Kolhapur, Maharashtra',
  'Solapur, Maharashtra',
  'Amravati, Maharashtra',
  'Imphal, Manipur',
  'Shillong, Meghalaya',
  'Aizawl, Mizoram',
  'Kohima, Nagaland',
  'Gangtok, Sikkim',
  'Agartala, Tripura',
  'Port Blair, Andaman & Nicobar',
  'Itanagar, Arunachal Pradesh'
];

const EXPERIENCE_OPTIONS = [
  { label: 'Fresher (No Experience)', value: '0' },
  { label: '1 Year', value: '1' },
  { label: '2 Years', value: '2' },
  { label: '3 Years', value: '3' },
  { label: '4 Years', value: '4' },
  { label: '5 Years', value: '5' },
  { label: '6 Years', value: '6' },
  { label: '7 Years', value: '7' },
  { label: '8 Years', value: '8' },
  { label: '9 Years', value: '9' },
  { label: '10+ Years', value: '10' }
];

import JobPreferencesSection from './components/JobPreferencesSection';
import SkillsSection from './components/SkillsSection';
import ExperienceTimeline from './components/ExperienceTimeline';
import EducationSection from './components/EducationSection';
import SocialLinksSection from './components/SocialLinksSection';
import ResumePreviewModal from './components/ResumePreviewModal';
import StickyActionBar from './components/StickyActionBar';
import AvatarPreviewModal from './components/AvatarPreviewModal';

/* ─── Profile Icons ─── */
const IC = {
  mail: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>,
  phone: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>,
  mapPin: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>,
  chevronRight: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>,
  pdf: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>,
  eye: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>,
  checkCircle: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: '#166534' }}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>,
  edit: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
};

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [originalProfile, setOriginalProfile] = useState<UserProfile | null>(null);
  const [resumes, setResumes] = useState<any[]>([]);

  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({ avatar: 0, resume: 0 });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const resumeInputRef = useRef<HTMLInputElement>(null);

  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(null);
  const [selectedAvatarPreviewUrl, setSelectedAvatarPreviewUrl] = useState<string | null>(null);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [optimisticAvatarUrl, setOptimisticAvatarUrl] = useState<string | null>(null);

  const [isLocationDropdownOpen, setIsLocationDropdownOpen] = useState(false);
  const [locationSearchQuery, setLocationSearchQuery] = useState('');

  const cp = useMemo((): CandidateProfile => {
    return profile?.candidate_profiles || {
      id: profile?.id || '',
      profile_strength: 0,
      skills: [],
      preferred_locations: [],
      experience_years: 0,
      work_history: [],
      education: [],
      job_types: [],
      salary_min: undefined,
      salary_max: undefined,
      currency: 'INR',
      open_to_remote: true,
      is_visible: true,
      resume_url: undefined,
      linkedin_url: undefined,
      github_url: undefined,
      portfolio_url: undefined,
      headline: ''
    };
  }, [profile]);

  const isDirty = useMemo(() => {
    return JSON.stringify(profile) !== JSON.stringify(originalProfile);
  }, [profile, originalProfile]);

  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  // Education History extraction from JSONB
  const educationHistory = useMemo(() => {
    if (!profile || !profile.candidate_profiles) return [];
    const eduRaw = profile.candidate_profiles.education;
    if (!eduRaw) return [];
    if (Array.isArray(eduRaw)) return eduRaw;
    return (eduRaw as any).history || [];
  }, [profile]);

  // Certificates list extraction from JSONB
  const certificatesList = useMemo(() => {
    if (!profile || !profile.candidate_profiles) return [];
    const eduRaw = profile.candidate_profiles.education;
    if (!eduRaw || Array.isArray(eduRaw)) return [];
    return (eduRaw as any).certificates || [];
  }, [profile]);

  const updateCandidateField = async (fields: Partial<CandidateProfile>) => {
    if (!profile || !profile.candidate_profiles) return;
    const updatedCp = { ...profile.candidate_profiles, ...fields } as CandidateProfile;
    const updatedProfile = { ...profile, candidate_profiles: updatedCp };
    setProfile(updatedProfile);
    setOriginalProfile(JSON.parse(JSON.stringify(updatedProfile)));

    try {
      const { error } = await insforge.database
        .from('candidate_profiles')
        .update(fields)
        .eq('id', profile.id);
      if (error) throw error;
      setToast({ message: 'Saved successfully!', type: 'success' });
      await refreshUser(true);
    } catch (err: any) {
      console.error(err);
      setToast({ message: err.message || 'Failed to save details', type: 'error' });
    }
  };

  const updateEducationHistory = async (eduList: EducationEntry[]) => {
    if (!profile || !profile.candidate_profiles) return;
    const currentEduRaw = profile.candidate_profiles.education;
    const currentCertificates = currentEduRaw && !Array.isArray(currentEduRaw)
      ? (currentEduRaw as any).certificates || []
      : [];

    const dbValue = {
      history: eduList,
      certificates: currentCertificates
    };

    const updatedCp = { ...profile.candidate_profiles, education: dbValue as any } as CandidateProfile;
    const updatedProfile = { ...profile, candidate_profiles: updatedCp };
    setProfile(updatedProfile);
    setOriginalProfile(JSON.parse(JSON.stringify(updatedProfile)));

    try {
      const { error } = await insforge.database
        .from('candidate_profiles')
        .update({ education: dbValue })
        .eq('id', profile.id);
      if (error) throw error;
      setToast({ message: 'Education saved successfully!', type: 'success' });
      await refreshUser(true);
    } catch (err: any) {
      console.error(err);
      setToast({ message: err.message || 'Failed to save education', type: 'error' });
    }
  };

  const updateCertificates = async (certsList: any[]) => {
    if (!profile || !profile.candidate_profiles) return;
    const currentEduRaw = profile.candidate_profiles.education;
    const currentHistory = currentEduRaw
      ? (Array.isArray(currentEduRaw) ? currentEduRaw : (currentEduRaw as any).history || [])
      : [];

    const dbValue = {
      history: currentHistory,
      certificates: certsList
    };

    const updatedCp = { ...profile.candidate_profiles, education: dbValue as any } as CandidateProfile;
    const updatedProfile = { ...profile, candidate_profiles: updatedCp };
    setProfile(updatedProfile);
    setOriginalProfile(JSON.parse(JSON.stringify(updatedProfile)));

    try {
      const { error } = await insforge.database
        .from('candidate_profiles')
        .update({ education: dbValue })
        .eq('id', profile.id);
      if (error) throw error;
      setToast({ message: 'Certificates saved successfully!', type: 'success' });
      await refreshUser(true);
    } catch (err: any) {
      console.error(err);
      setToast({ message: err.message || 'Failed to save certificates', type: 'error' });
    }
  };

  const fetchProfile = useCallback(async () => {
    if (!user?.id) return;
    try {
      setIsLoading(true);
      setHasError(false);

      const { data, error } = await insforge.database
        .from('profiles')
        .select(`
          id, name, email, avatar_url, phone, location, bio, role,
          candidate_profiles(
            id, profile_strength, skills, preferred_locations, experience_years,
            work_history, education, job_types, salary_min, salary_max,
            currency, open_to_remote, is_visible, resume_url, primary_resume_id,
            linkedin_url, github_url, portfolio_url, headline, updated_at
          )
        `)
        .eq('id', user.id)
        .single();

      if (error) throw error;
      if (data) {
        const rawProfile = data as any;
        const normalized: UserProfile = {
          ...rawProfile,
          about: rawProfile.bio || '',
          candidate_profiles: Array.isArray(rawProfile.candidate_profiles)
            ? rawProfile.candidate_profiles[0]
            : rawProfile.candidate_profiles
        };
        setProfile(normalized);
        setOriginalProfile(JSON.parse(JSON.stringify(normalized)));

        // Fetch candidate resumes
        try {
          const { data: resumesList, error: resumesErr } = await insforge.database
            .from('candidate_resumes')
            .select('*')
            .eq('candidate_id', user.id);
          if (!resumesErr && resumesList) {
            setResumes(resumesList);
          }
        } catch (resErr) {
          console.warn('Failed to load candidate resumes:', resErr);
        }
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    const handleBack = (e: Event) => {
      if (isEditing) {
        e.preventDefault();
        setProfile(JSON.parse(JSON.stringify(originalProfile)));
        setIsEditing(false);
      }
    };
    window.addEventListener('app:back', handleBack);
    return () => window.removeEventListener('app:back', handleBack);
  }, [isEditing, originalProfile]);

  const handleSave = async () => {
    if (!profile) return;
    setIsSaving(true);
    try {
      const { candidate_profiles, ...userPart } = profile;
      if (!candidate_profiles) {
        throw new Error('Candidate profile details not found');
      }

      const { error: userErr } = await insforge.database
        .from('profiles')
        .update({
          name: userPart.name,
          location: userPart.location,
          phone: userPart.phone,
          bio: userPart.about || ''
        })
        .eq('id', userPart.id);

      if (userErr) throw userErr;

      const { error: candErr } = await insforge.database
        .from('candidate_profiles')
        .update({
          headline: candidate_profiles.headline,
          experience_years: candidate_profiles.experience_years,
          skills: candidate_profiles.skills,
          preferred_locations: candidate_profiles.preferred_locations,
          job_types: candidate_profiles.job_types,
          salary_min: candidate_profiles.salary_min,
          salary_max: candidate_profiles.salary_max,
          currency: candidate_profiles.currency,
          open_to_remote: candidate_profiles.open_to_remote,
          linkedin_url: candidate_profiles.linkedin_url,
          github_url: candidate_profiles.github_url,
          portfolio_url: candidate_profiles.portfolio_url
        })
        .eq('id', candidate_profiles.id);

      if (candErr) throw candErr;

      setOriginalProfile(JSON.parse(JSON.stringify(profile)));
      setIsEditing(false);
      setToast({ message: 'Profile updated successfully!', type: 'success' });
      await refreshUser(true);
    } catch (err: any) {
      console.error(err);
      setToast({ message: err.message || 'Failed to save profile', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setProfile(JSON.parse(JSON.stringify(originalProfile)));
    setIsEditing(false);
  };

  const handleToggleVisibility = async () => {
    if (!profile) return;
    const nextVal = !((profile.candidate_profiles as any)?.is_visible ?? true);

    setProfile({
      ...profile,
      candidate_profiles: {
        ...profile.candidate_profiles,
        is_visible: nextVal
      } as any
    });

    try {
      await insforge.database
        .from('candidate_profiles')
        .update({ is_visible: nextVal })
        .eq('id', profile.id);

      setToast({ message: nextVal ? 'Your profile is now visible to recruiters.' : 'Your profile is hidden from searches.', type: 'info' });
    } catch (e) {
      console.error(e);
    }
  };

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    if (file.size > 5 * 1024 * 1024) {
      setToast({ message: 'File is too large. Max size is 5MB.', type: 'error' });
      return;
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setToast({ message: 'Unsupported file type. Please upload a JPEG, PNG, or WebP image.', type: 'error' });
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setSelectedAvatarFile(file);
    setSelectedAvatarPreviewUrl(previewUrl);
    setIsAvatarModalOpen(true);
  };

  const handleAvatarSave = async (croppedBlob: Blob) => {
    if (!selectedAvatarFile || !profile) return;
    
    // Create optimistic preview URL from the cropped blob
    const optimisticUrl = URL.createObjectURL(croppedBlob);
    setOptimisticAvatarUrl(optimisticUrl);
    setIsAvatarModalOpen(false); // Close modal instantly
    setIsUploadingAvatar(true);

    try {
      const fileName = `${profile.id}_${Date.now()}.jpg`;

      const { error } = await insforge.storage
        .from('avatars')
        .upload(fileName, croppedBlob);

      if (error) throw error;

      const { error: dbErr } = await insforge.database
        .from('profiles')
        .update({ avatar_url: fileName })
        .eq('id', profile.id);

      if (dbErr) throw dbErr;

      setProfile(prev => prev ? { ...prev, avatar_url: fileName } : null);
      setToast({ message: 'Avatar updated successfully!', type: 'success' });
      
      setSelectedAvatarFile(null);
      if (selectedAvatarPreviewUrl) {
        URL.revokeObjectURL(selectedAvatarPreviewUrl);
        setSelectedAvatarPreviewUrl(null);
      }
      
      await refreshUser(true);
    } catch (err: any) {
      console.error(err);
      setToast({ message: 'Upload failed: ' + err.message, type: 'error' });
      // Revert optimistic update on failure
      setOptimisticAvatarUrl(null);
      URL.revokeObjectURL(optimisticUrl);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleAvatarCancel = () => {
    setIsAvatarModalOpen(false);
    setSelectedAvatarFile(null);
    if (selectedAvatarPreviewUrl) {
      URL.revokeObjectURL(selectedAvatarPreviewUrl);
      setSelectedAvatarPreviewUrl(null);
    }
    if (avatarInputRef.current) {
      avatarInputRef.current.value = '';
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'resume') => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    try {
      // Validate file type
      const bytes = new Uint8Array(await file.slice(0, 5).arrayBuffer());
      const isPdf =
        bytes[0] === 0x25 &&
        bytes[1] === 0x50 &&
        bytes[2] === 0x44 &&
        bytes[3] === 0x46 &&
        bytes[4] === 0x2d;
      if (!isPdf) {
        setToast({ message: 'Only PDF resumes are supported.', type: 'error' });
        return;
      }

      const path = `${profile.id}/${Date.now()}_${file.name}`;
      const { data: uploadData, error: uploadErr } = await (insforge.storage.from('resumes') as any).upload(path, file, { contentType: file.type || 'application/pdf' });
      if (uploadErr) throw uploadErr;

      const fileUrl = uploadData?.url || '';
      const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;

      // Set all other resumes for this candidate to not default
      await insforge.database
        .from('candidate_resumes')
        .update({ is_default: false })
        .eq('candidate_id', profile.id);

      // Insert new resume record
      const { data: insertedData, error: insertErr } = await insforge.database
        .from('candidate_resumes')
        .insert([{
          candidate_id: profile.id,
          label: baseName,
          file_url: fileUrl,
          file_name: file.name,
          file_size_bytes: file.size,
          is_default: true
        }])
        .select()
        .single();

      if (insertErr) throw insertErr;

      // Sync with candidate_profiles
      const { error: dbErr } = await insforge.database
        .from('candidate_profiles')
        .update({ 
          resume_url: fileUrl,
          primary_resume_id: insertedData.id
        })
        .eq('id', profile.id);
      if (dbErr) throw dbErr;

      setProfile(prev => prev ? { 
        ...prev, 
        candidate_profiles: { 
          ...prev.candidate_profiles, 
          resume_url: fileUrl,
          primary_resume_id: insertedData.id
        } as CandidateProfile 
      } : null);

      setToast({ message: 'Resume uploaded successfully!', type: 'success' });
      await refreshUser(true);
    } catch (err: any) {
      console.error(err);
      setToast({ message: 'Upload failed: ' + err.message, type: 'error' });
    }
  };

  const extractStoragePath = (urlOrPath: string): string => {
    if (!urlOrPath) return '';
    if (urlOrPath.startsWith('http://') || urlOrPath.startsWith('https://')) {
      try {
        const url = new URL(urlOrPath);
        const pathParts = url.pathname.split('/objects/');
        if (pathParts.length > 1) {
          return decodeURIComponent(pathParts[1]);
        }
      } catch (e) {
        console.warn('Failed to parse URL in extractStoragePath:', e);
      }
    }
    return urlOrPath;
  };

  const handlePreviewOpen = async () => {
    if (!cp.resume_url && !cp.primary_resume_id) return;
    try {
      // Prefer the resume-proxy approach (same as ResumeManager) for primary resumes
      // This handles all URL encoding / special characters in filenames properly
      if (cp.primary_resume_id) {
        const token = typeof window !== 'undefined' ? window.sessionStorage.getItem('tm_token') : null;
        const targetUrl = `${window.location.origin}/api/v1/remote/functions/resume-proxy?resumeId=${cp.primary_resume_id}&accessType=viewed`;
        const response = await fetch(targetUrl, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        });
        if (!response.ok) throw new Error(`Resume proxy returned ${response.status}`);
        const blob = await response.blob();
        const url = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
        setPreviewBlobUrl(url);
        setIsPreviewOpen(true);
        return;
      }

      // Fallback: download via storage SDK for legacy resume_url
      const storagePath = extractStoragePath(cp.resume_url!);
      if (!storagePath) {
        setToast({ message: 'Resume path is invalid.', type: 'error' });
        return;
      }
      const { data, error } = await insforge.storage
        .from('resumes')
        .download(storagePath);
      if (error) throw error;
      const url = URL.createObjectURL(data as Blob);
      setPreviewBlobUrl(url);
      setIsPreviewOpen(true);
    } catch (err: any) {
      console.error('Failed to preview resume:', err);
      setToast({
        message: 'Resume file not found in storage. Please upload a new resume.',
        type: 'error'
      });
    }
  };

  const handlePreviewClose = () => {
    setIsPreviewOpen(false);
    if (previewBlobUrl) {
      URL.revokeObjectURL(previewBlobUrl);
      setPreviewBlobUrl(null);
    }
  };

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        width: '100%',
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '2rem 1.5rem',
        gap: '24px',
        fontFamily: 'Inter, system-ui, sans-serif'
      }}>
        <style>{`
          @keyframes sk-pulse {
            0%, 100% { opacity: 0.6; }
            50% { opacity: 1; }
          }
          .sk-pulse {
            animation: sk-pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
            background-color: #e2e8f0;
          }
        `}</style>

        {/* Left Sidebar Skeleton (320px) */}
        <div style={{ width: '320px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Main profile summary card skeleton */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e5ea', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
            <div className="sk-pulse" style={{ width: '80px', height: '80px', borderRadius: '50%' }} />
            <div className="sk-pulse" style={{ width: '60%', height: '18px', borderRadius: '4px' }} />
            <div className="sk-pulse" style={{ width: '85%', height: '14px', borderRadius: '4px' }} />
            <div className="sk-pulse" style={{ width: '40%', height: '12px', borderRadius: '4px' }} />
            <div className="sk-pulse" style={{ width: '50%', height: '24px', borderRadius: '12px', marginTop: '4px' }} />
          </div>

          {/* Contact details skeleton */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e5ea', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="sk-pulse" style={{ width: '16px', height: '16px', borderRadius: '4px' }} />
              <div className="sk-pulse" style={{ width: '70%', height: '12px', borderRadius: '4px' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="sk-pulse" style={{ width: '16px', height: '16px', borderRadius: '4px' }} />
              <div className="sk-pulse" style={{ width: '50%', height: '12px', borderRadius: '4px' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="sk-pulse" style={{ width: '16px', height: '16px', borderRadius: '4px' }} />
              <div className="sk-pulse" style={{ width: '40%', height: '12px', borderRadius: '4px' }} />
            </div>
          </div>

          {/* Status banner skeleton */}
          <div className="sk-pulse" style={{ width: '100%', height: '48px', borderRadius: '8px' }} />

          {/* Resume Section skeleton */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e5ea', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="sk-pulse" style={{ width: '40%', height: '14px', borderRadius: '4px', marginBottom: '4px' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #e2e5ea', borderRadius: '8px', padding: '12px' }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', width: '80%' }}>
                <div className="sk-pulse" style={{ width: '24px', height: '24px', borderRadius: '4px' }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '70%' }}>
                  <div className="sk-pulse" style={{ width: '100%', height: '12px', borderRadius: '4px' }} />
                  <div className="sk-pulse" style={{ width: '60%', height: '10px', borderRadius: '4px' }} />
                </div>
              </div>
              <div className="sk-pulse" style={{ width: '18px', height: '18px', borderRadius: '4px' }} />
            </div>
          </div>
        </div>

        {/* Right Main Content Skeleton */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Header Card skeleton */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e5ea', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="sk-pulse" style={{ width: '30%', height: '20px', borderRadius: '4px' }} />
            <div className="sk-pulse" style={{ width: '100%', height: '60px', borderRadius: '8px' }} />
          </div>

          {/* Skills Card skeleton */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e5ea', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="sk-pulse" style={{ width: '25%', height: '20px', borderRadius: '4px' }} />
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="sk-pulse" style={{ width: `${40 + (i % 3) * 20}px`, height: '28px', borderRadius: '9999px' }} />
              ))}
            </div>
          </div>

          {/* Experience & Education skeletons */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e5ea', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="sk-pulse" style={{ width: '35%', height: '20px', borderRadius: '4px', marginBottom: '8px' }} />
            {[1, 2].map(i => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderBottom: i === 1 ? '1px solid #f1f5f9' : 'none', paddingBottom: i === 1 ? '16px' : '0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div className="sk-pulse" style={{ width: '40%', height: '14px', borderRadius: '4px' }} />
                  <div className="sk-pulse" style={{ width: '20%', height: '12px', borderRadius: '4px' }} />
                </div>
                <div className="sk-pulse" style={{ width: '30%', height: '12px', borderRadius: '4px' }} />
                <div className="sk-pulse" style={{ width: '90%', height: '32px', borderRadius: '6px', marginTop: '4px' }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (hasError || !profile) {
    return (
      <div style={{ padding: '4rem 2rem', textAlign: 'center', fontFamily: 'sans-serif' }}>
        <h2>Unable to load profile</h2>
        <button onClick={fetchProfile} style={{ marginTop: '1rem', padding: '0.5rem 1rem', cursor: 'pointer' }}>Retry</button>
      </div>
    );
  }

  const initials = profile.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div style={{ width: '100%', minHeight: '100vh', backgroundColor: '#ffffff', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {isEditing ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '800px', margin: '2rem auto', padding: '0 2rem 2rem' }}>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--tm-text-primary)', borderBottom: '1px solid #E2E5EA', paddingBottom: '8px' }}>Edit Contact Info</h2>

            {/* Avatar upload section inside edit mode */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '0.5rem', background: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div
                style={{
                  width: 80, height: 80, borderRadius: '50%',
                  backgroundColor: '#EFF6FF', color: '#007BFF',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '24px', fontWeight: 700, border: '2px solid #BFDBFE',
                  overflow: 'hidden', position: 'relative',
                  flexShrink: 0
                }}
              >
                {optimisticAvatarUrl || profile?.avatar_url ? (
                  <img src={optimisticAvatarUrl || getPublicStorageUrl('avatars', profile.avatar_url)} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  initials
                )}
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  style={{
                    padding: '8px 16px', background: '#007BFF', border: 'none',
                    borderRadius: '8px', color: '#ffffff', fontSize: '13px',
                    fontWeight: 600, cursor: 'pointer', transition: 'background 0.15s'
                  }}
                  onMouseOver={e => e.currentTarget.style.background = '#006AE6'}
                  onMouseOut={e => e.currentTarget.style.background = '#007BFF'}
                >
                  Upload new photo
                </button>
                <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#64748b', lineHeight: 1.4 }}>
                  Allowed JPG, PNG or WebP. Max size of 5MB.
                </p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--tm-text-secondary)', display: 'block', marginBottom: '6px' }}>Display Name</label>
                <input
                  type="text"
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  style={{ width: '100%', padding: '0.625rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--tm-text-secondary)', display: 'block', marginBottom: '6px' }}>Phone Number</label>
                <input
                  type="text"
                  value={profile.phone || ''}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  style={{ width: '100%', padding: '0.625rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
                />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--tm-text-secondary)', display: 'block', marginBottom: '6px' }}>Location</label>
                <input
                  type="text"
                  value={profile.location || ''}
                  onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                  style={{ width: '100%', padding: '0.625rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
                />
              </div>
            </div>
          </div>

          <JobPreferencesSection
            preferredLocations={cp.preferred_locations}
            jobTypes={cp.job_types}
            salaryMin={cp.salary_min}
            salaryMax={cp.salary_max}
            currency={cp.currency}
            openToRemote={cp.open_to_remote}
            isEditing={true}
            onUpdate={(prefs: any) => setProfile({
              ...profile,
              candidate_profiles: { ...cp, ...prefs } as CandidateProfile
            })}
          />

          <SkillsSection
            skills={cp.skills}
            isEditing={true}
            onUpdate={(skills: any) => setProfile({
              ...profile,
              candidate_profiles: { ...cp, skills } as CandidateProfile
            })}
            headline={cp.headline || ''}
          />

          <StickyActionBar
            isEditing={isEditing}
            candidateName={profile.name}
            completionScore={cp.profile_strength ?? 0}
            isSaving={isSaving}
            isDirty={isDirty}
            onSave={handleSave}
            onCancel={handleCancel}
            onEditToggle={handleCancel}
          />
        </div>
      ) : (
        /* Static view — Indeed-style layout */
        <div style={{ maxWidth: '640px', margin: '2.5rem auto', padding: '0 2rem', display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Top Block: Name and Avatar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#12263A', margin: 0, letterSpacing: '-0.02em' }}>
                {profile.name}
              </h1>
              <button
                onClick={() => setIsEditing(true)}
                style={{
                  alignSelf: 'flex-start',
                  padding: '8px 16px',
                  backgroundColor: '#007BFF',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'background-color 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                onMouseOver={e => e.currentTarget.style.backgroundColor = '#006AE6'}
                onMouseOut={e => e.currentTarget.style.backgroundColor = '#007BFF'}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                Edit Profile
              </button>
            </div>

            {/* Avatar circle */}
            <div
              style={{
                width: 52, height: 52, borderRadius: '50%',
                backgroundColor: '#007BFF', color: '#ffffff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '18px', fontWeight: 700, flexShrink: 0,
                cursor: 'pointer', overflow: 'hidden'
              }}
              onClick={() => avatarInputRef.current?.click()}
              title="Change avatar"
            >
              {optimisticAvatarUrl || profile?.avatar_url ? (
                <img src={optimisticAvatarUrl || getPublicStorageUrl('avatars', profile.avatar_url)} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                initials
              )}
            </div>
          </div>

          {/* Contact details — each row with icon + value + optional chevron */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderBottom: '1px solid #e2e5ea', paddingBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#12263A', fontSize: '14px' }}>
              <span style={{ color: '#6B7280' }}>{IC.mail}</span>
              <span>{profile.email}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#12263A', fontSize: '14px' }}>
              <span style={{ color: '#6B7280' }}>{IC.phone}</span>
              <span>{profile.phone || 'Add phone number'}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#12263A', fontSize: '14px' }}>
              <span style={{ color: '#6B7280' }}>{IC.mapPin}</span>
              <span>{profile.location || 'India'}</span>
            </div>
          </div>

          {/* Status banner */}
          <div
            onClick={handleToggleVisibility}
            style={{
              width: '100%',
              backgroundColor: cp.is_visible !== false ? '#E7F7EE' : '#F2F3F4',
              border: `1px solid ${cp.is_visible !== false ? '#A7F3D0' : '#E2E5EA'}`,
              borderRadius: '8px',
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              userSelect: 'none'
            }}
          >
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              {IC.checkCircle}
              <span style={{ fontSize: '14px', fontWeight: 700, color: cp.is_visible !== false ? '#157A45' : '#475569' }}>
                {cp.is_visible !== false ? 'Employers can find you' : 'Profile hidden from employers'}
              </span>
            </div>
            <span style={{ color: cp.is_visible !== false ? '#157A45' : '#6B7280' }}>{IC.chevronRight}</span>
          </div>

          {/* Resume Section */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--tm-text-primary)', margin: 0 }}>
              Resumes
            </h2>

            {resumes.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {resumes.map((resume) => {
                  const isPrimary = resume.id === cp.primary_resume_id || resume.is_default;
                  return (
                    <div
                      key={resume.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        border: isPrimary ? '1.5px solid #10b981' : '1px solid var(--tm-border)',
                        backgroundColor: isPrimary ? '#f0fdf4' : 'transparent',
                        borderRadius: '8px',
                        padding: '12px 16px'
                      }}
                    >
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        {IC.pdf}
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span
                            style={{
                              fontSize: '14px',
                              fontWeight: 600,
                              color: 'var(--tm-text-primary)',
                              cursor: 'pointer',
                              textDecoration: 'underline'
                            }}
                            onClick={async () => {
                              try {
                                const token = typeof window !== 'undefined' ? window.sessionStorage.getItem('tm_token') : null;
                                const targetUrl = `${window.location.origin}/api/v1/remote/functions/resume-proxy?resumeId=${resume.id}&accessType=viewed`;
                                const response = await fetch(targetUrl, {
                                  headers: token ? { 'Authorization': `Bearer ${token}` } : {},
                                });
                                if (!response.ok) throw new Error(`Proxy status ${response.status}`);
                                const blob = await response.blob();
                                const url = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
                                setPreviewBlobUrl(url);
                                setIsPreviewOpen(true);
                              } catch (err) {
                                console.error(err);
                                setToast({ message: 'Failed to preview this resume.', type: 'error' });
                              }
                            }}
                          >
                            {resume.label || resume.file_name}
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--tm-text-secondary)' }}>
                            {isPrimary ? '⭐ Primary & Default • ' : ''}
                            Uploaded: {new Date(resume.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button
                          onClick={async () => {
                            try {
                              const token = typeof window !== 'undefined' ? window.sessionStorage.getItem('tm_token') : null;
                              const targetUrl = `${window.location.origin}/api/v1/remote/functions/resume-proxy?resumeId=${resume.id}&accessType=viewed`;
                              const response = await fetch(targetUrl, {
                                headers: token ? { 'Authorization': `Bearer ${token}` } : {},
                              });
                              if (!response.ok) throw new Error(`Proxy status ${response.status}`);
                              const blob = await response.blob();
                              const url = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
                              setPreviewBlobUrl(url);
                              setIsPreviewOpen(true);
                            } catch (err) {
                              console.error(err);
                              setToast({ message: 'Failed to preview this resume.', type: 'error' });
                            }
                          }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tm-text-secondary)', padding: '4px' }}
                          title="View PDF"
                        >
                          {IC.eye}
                        </button>
                        {!isPrimary && (
                          <button
                            onClick={async () => {
                              try {
                                const { error: dbErr } = await insforge.database
                                  .from('candidate_profiles')
                                  .update({
                                    resume_url: resume.file_url,
                                    primary_resume_id: resume.id
                                  })
                                  .eq('id', profile.id);
                                if (dbErr) throw dbErr;

                                // Update default status in candidate_resumes via RPC or manual updates
                                await insforge.database
                                  .from('candidate_resumes')
                                  .update({ is_default: false })
                                  .eq('candidate_id', profile.id);

                                await insforge.database
                                  .from('candidate_resumes')
                                  .update({ is_default: true })
                                  .eq('id', resume.id);

                                setToast({ message: 'Primary resume updated successfully!', type: 'success' });
                                fetchProfile();
                              } catch (err: any) {
                                setToast({ message: 'Failed to set primary resume: ' + err.message, type: 'error' });
                              }
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              color: '#6b7280',
                              fontSize: '11px',
                              fontWeight: 600,
                              padding: '2px 6px',
                              borderRadius: '4px',
                              backgroundColor: '#f3f4f6'
                            }}
                            title="Set as Primary"
                          >
                            Set Primary
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : cp.resume_url ? (
              // Fallback for legacy resume_url structure
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                border: '1px solid var(--tm-border)',
                borderRadius: '8px',
                padding: '16px'
              }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  {IC.pdf}
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--tm-text-primary)', cursor: 'pointer', textDecoration: 'underline' }} onClick={handlePreviewOpen}>
                      {profile.name.replace(/\s+/g, '_')}_Resume.pdf
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--tm-text-secondary)' }}>
                      Uploaded: {cp.updated_at ? new Date(cp.updated_at).toLocaleDateString() : 'Recently'}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={handlePreviewOpen}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tm-text-secondary)', padding: '4px' }}
                    title="View PDF"
                  >
                    {IC.eye}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{
                border: '1px dashed var(--tm-border)',
                borderRadius: '8px',
                padding: '24px',
                textAlign: 'center'
              }}>
                <input
                  type="file"
                  ref={resumeInputRef}
                  style={{ display: 'none' }}
                  accept=".pdf"
                  onChange={(e) => handleFileUpload(e, 'resume')}
                />
                <button
                  onClick={() => resumeInputRef.current?.click()}
                  style={{ background: 'var(--tm-accent)', color: 'var(--white)', border: 'none', padding: '0.5rem 1.5rem', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '14px' }}
                >
                  Upload Resume (PDF)
                </button>
              </div>
            )}

            {resumes.length < 5 && (
              <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'flex-end' }}>
                <input
                  type="file"
                  ref={resumeInputRef}
                  style={{ display: 'none' }}
                  accept=".pdf"
                  onChange={(e) => handleFileUpload(e, 'resume')}
                />
                <button
                  onClick={() => resumeInputRef.current?.click()}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--tm-accent)',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  + Add another resume
                </button>
              </div>
            )}
          </div>

          {/* Skills Showcase Section */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--tm-text-primary)', margin: '0 0 4px' }}>
              Skills Showcase
            </h2>
            <SkillsSection
              skills={cp.skills}
              isEditing={false}
              onUpdate={() => {}}
              headline={cp.headline || ''}
            />
          </div>

          {/* Improve your job matches */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#12263A', margin: '0 0 4px' }}>
              Improve your job matches
            </h2>

            {/* ─── Accordion 1: Qualifications ─── */}
            <AccordionSection
              title="Qualifications"
              desc="Highlight your professional headline, skills, work experience, education, and certificates."
              icon="🎓"
              isOpen={expandedSection === 'qualifications'}
              onToggle={() => setExpandedSection(expandedSection === 'qualifications' ? null : 'qualifications')}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* Headline */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569', display: 'block' }}>Professional Headline</label>
                  <input
                    type="text"
                    placeholder="e.g. Senior Software Engineer | React & Node.js Developer"
                    value={profile.candidate_profiles?.headline || ''}
                    onChange={(e) => updateCandidateField({ headline: e.target.value })}
                    style={{ width: '100%', padding: '0.625rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '14px', boxSizing: 'border-box' }}
                  />
                </div>

                {/* Skills Section */}
                <SkillsSection
                  skills={profile.candidate_profiles?.skills}
                  isEditing={true}
                  onUpdate={(skills) => updateCandidateField({ skills })}
                  headline={profile.candidate_profiles?.headline || ''}
                />

                {/* Work Experience Section */}
                <ExperienceTimeline
                  experience={profile.candidate_profiles?.work_history}
                  isEditing={true}
                  onUpdate={(work_history) => updateCandidateField({ work_history })}
                />

                {/* Education History Section */}
                <EducationSection
                  education={educationHistory}
                  isEditing={true}
                  onUpdate={(eduList) => updateEducationHistory(eduList)}
                  location={profile.location}
                />

                {/* Certificates Section */}
                <CertificatesSection
                  certificates={certificatesList}
                  onUpdate={(certs) => updateCertificates(certs)}
                />
              </div>
            </AccordionSection>

            {/* ─── Accordion 2: Job Preferences ─── */}
            <AccordionSection
              title="Job preferences"
              desc="Save desired pay, location preferences, remote flexibility, and job types."
              icon="💼"
              isOpen={expandedSection === 'preferences'}
              onToggle={() => setExpandedSection(expandedSection === 'preferences' ? null : 'preferences')}
            >
              <JobPreferencesSection
                preferredLocations={profile.candidate_profiles?.preferred_locations}
                jobTypes={profile.candidate_profiles?.job_types}
                salaryMin={profile.candidate_profiles?.salary_min}
                salaryMax={profile.candidate_profiles?.salary_max}
                currency={profile.candidate_profiles?.currency}
                openToRemote={profile.candidate_profiles?.open_to_remote}
                isEditing={true}
                onUpdate={(prefs) => updateCandidateField(prefs)}
              />
            </AccordionSection>

            {/* ─── Accordion 3: Social & Web Links ─── */}
            <AccordionSection
              title="Social & Web Links"
              desc="Link your LinkedIn, GitHub, and portfolio websites."
              icon="🔗"
              isOpen={expandedSection === 'links'}
              onToggle={() => setExpandedSection(expandedSection === 'links' ? null : 'links')}
            >
              <SocialLinksSection
                linkedinUrl={profile.candidate_profiles?.linkedin_url}
                githubUrl={profile.candidate_profiles?.github_url}
                portfolioUrl={profile.candidate_profiles?.portfolio_url}
                isEditing={true}
                onUpdate={(links) => updateCandidateField(links)}
              />
            </AccordionSection>
          </div>

          {/* Footer copyright */}
          <p style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center', margin: '1rem 0 2rem' }}>
            © 2026 TalentMesh · Cookies, Privacy and Terms
          </p>
        </div>
      )}

      {previewBlobUrl && (
        <ResumePreviewModal
          isOpen={isPreviewOpen}
          onClose={handlePreviewClose}
          resumeUrl={previewBlobUrl}
        />
      )}

      {isAvatarModalOpen && (
        <AvatarPreviewModal
          isOpen={isAvatarModalOpen}
          imageSrc={selectedAvatarPreviewUrl}
          fileName={selectedAvatarFile?.name || ''}
          fileSize={selectedAvatarFile?.size || 0}
          isSaving={isUploadingAvatar}
          onSave={handleAvatarSave}
          onCancel={handleAvatarCancel}
        />
      )}

      <input
        type="file"
        ref={avatarInputRef}
        style={{ display: 'none' }}
        accept="image/jpeg,image/png,image/webp"
        onChange={handleAvatarSelect}
      />
    </div>
  );
}

// ─── Custom Accordion Panel Component ───
function AccordionSection({ title, desc, icon, isOpen, onToggle, children }: any) {
  return (
    <div style={{
      background: '#ffffff',
      border: '1px solid #e2e5ea',
      borderRadius: '12px',
      overflow: 'hidden',
      transition: 'box-shadow 0.2s',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)'
    }}>
      <div
        onClick={onToggle}
        style={{
          padding: '1.25rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          userSelect: 'none',
          backgroundColor: isOpen ? '#f8fafc' : '#ffffff',
          transition: 'background-color 0.15s'
        }}
        onMouseOver={e => { if (!isOpen) e.currentTarget.style.backgroundColor = '#f8fafc' }}
        onMouseOut={e => { if (!isOpen) e.currentTarget.style.backgroundColor = '#ffffff' }}
      >
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <span style={{ fontSize: '20px' }}>{icon}</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'left' }}>
            <span style={{ fontSize: '14px', fontWeight: 700, color: '#12263A' }}>{title}</span>
            <span style={{ fontSize: '12px', color: '#6B7280' }}>{desc}</span>
          </div>
        </div>
        <span style={{
          color: '#6B7280',
          transform: isOpen ? 'rotate(180deg)' : 'none',
          transition: 'transform 0.2s',
          display: 'flex',
          alignItems: 'center'
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
        </span>
      </div>

      {isOpen && (
        <div style={{
          padding: '1.5rem',
          borderTop: '1px solid #e2e5ea',
          animation: 'fadeInAccordion 0.25s ease-out',
          textAlign: 'left'
        }}>
          <style>{`
            @keyframes fadeInAccordion {
              from { opacity: 0; transform: translateY(-4px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `}</style>
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Custom Certificates & Licenses Component ───
interface Certificate {
  id: string;
  name: string;
  issuer: string;
  issueDate: string;
  credentialId?: string;
  credentialUrl?: string;
}

function CertificatesSection({ certificates = [], onUpdate }: { certificates: Certificate[], onUpdate: (certs: Certificate[]) => void }) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formState, setFormState] = useState<Certificate>({ id: '', name: '', issuer: '', issueDate: '', credentialId: '', credentialUrl: '' });
  const [errors, setErrors] = useState<{ name?: string; issuer?: string }>({});

  const handleOpenAdd = () => {
    setFormState({ id: Math.random().toString(36).substring(2, 9), name: '', issuer: '', issueDate: '', credentialId: '', credentialUrl: '' });
    setEditingId(null);
    setShowForm(true);
  };

  const handleOpenEdit = (cert: Certificate) => {
    setFormState({ ...cert });
    setEditingId(cert.id);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    const nextList = certificates.filter(c => c.id !== id);
    onUpdate(nextList);
  };

  const handleSave = () => {
    const errs: any = {};
    if (!formState.name.trim()) errs.name = 'Certificate name is required';
    if (!formState.issuer.trim()) errs.issuer = 'Issuing organization is required';

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    let nextList = [...certificates];
    if (editingId) {
      nextList = nextList.map(c => c.id === editingId ? formState : c);
    } else {
      nextList.push(formState);
    }

    onUpdate(nextList);
    setShowForm(false);
    setEditingId(null);
    setFormState({ id: '', name: '', issuer: '', issueDate: '', credentialId: '', credentialUrl: '' });
    setErrors({});
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderTop: '1px dashed #e2e5ea', paddingTop: '1.5rem', marginTop: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>📜</span>
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#12263A', margin: 0 }}>Certificates & Licenses</h3>
        </div>
        {!showForm && (
          <button
            type="button"
            onClick={handleOpenAdd}
            style={{ padding: '6px 14px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '6px', color: '#007BFF', fontSize: '12px', fontWeight: 600, cursor: 'pointer', outline: 'none' }}
          >
            + Add Certificate
          </button>
        )}
      </div>

      {certificates.length === 0 && !showForm ? (
        <div style={{ padding: '1.5rem', textAlign: 'center', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '8px' }}>
          <span style={{ fontSize: '13px', color: '#64748b' }}>No certificates or licenses added yet.</span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {certificates.map(cert => (
            editingId === cert.id && showForm ? (
              <div key={cert.id} style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: '#f8fafc', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>Name *</label>
                    <input type="text" value={formState.name} onChange={e => setFormState({ ...formState, name: e.target.value })} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '13px', boxSizing: 'border-box' }} />
                    {errors.name && <span style={{ fontSize: '11px', color: '#ef4444', display: 'block', marginTop: '2px' }}>{errors.name}</span>}
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>Issuer *</label>
                    <input type="text" value={formState.issuer} onChange={e => setFormState({ ...formState, issuer: e.target.value })} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '13px', boxSizing: 'border-box' }} />
                    {errors.issuer && <span style={{ fontSize: '11px', color: '#ef4444', display: 'block', marginTop: '2px' }}>{errors.issuer}</span>}
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>Issue Date (MM/YYYY)</label>
                    <input type="text" placeholder="e.g. 05/2026" value={formState.issueDate} onChange={e => setFormState({ ...formState, issueDate: e.target.value })} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '13px', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>Credential ID</label>
                    <input type="text" value={formState.credentialId} onChange={e => setFormState({ ...formState, credentialId: e.target.value })} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '13px', boxSizing: 'border-box' }} />
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>Credential URL</label>
                    <input type="text" placeholder="e.g. https://..." value={formState.credentialUrl} onChange={e => setFormState({ ...formState, credentialUrl: e.target.value })} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '13px', boxSizing: 'border-box' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '10px' }}>
                  <button type="button" onClick={() => { setShowForm(false); setEditingId(null); }} style={{ padding: '6px 14px', background: '#e2e8f0', border: 'none', borderRadius: '6px', color: '#475569', fontSize: '12px', cursor: 'pointer' }}>Cancel</button>
                  <button type="button" onClick={handleSave} style={{ padding: '6px 16px', background: '#007BFF', border: 'none', borderRadius: '6px', color: '#ffffff', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}>Save</button>
                </div>
              </div>
            ) : (
              <div key={cert.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ textAlign: 'left' }}>
                  <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#12263A' }}>{cert.name}</h4>
                  <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>
                    {cert.issuer} {cert.issueDate ? `• Issued ${cert.issueDate}` : ''}
                  </p>
                  {cert.credentialId && <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#94a3b8' }}>Credential ID: {cert.credentialId}</p>}
                  {cert.credentialUrl && (
                    <a href={cert.credentialUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: '12px', color: '#007BFF', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '4px', fontWeight: 500 }}>
                      View Credential <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
                    </a>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button type="button" onClick={() => handleOpenEdit(cert)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '4px' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                  </button>
                  <button type="button" onClick={() => handleDelete(cert.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '4px' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18m-2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                  </button>
                </div>
              </div>
            )
          ))}
        </div>
      )}

      {showForm && !editingId && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: '#f8fafc', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', marginTop: '4px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>Name *</label>
              <input type="text" value={formState.name} onChange={e => setFormState({ ...formState, name: e.target.value })} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '13px', boxSizing: 'border-box' }} />
              {errors.name && <span style={{ fontSize: '11px', color: '#ef4444', display: 'block', marginTop: '2px' }}>{errors.name}</span>}
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>Issuer *</label>
              <input type="text" value={formState.issuer} onChange={e => setFormState({ ...formState, issuer: e.target.value })} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '13px', boxSizing: 'border-box' }} />
              {errors.issuer && <span style={{ fontSize: '11px', color: '#ef4444', display: 'block', marginTop: '2px' }}>{errors.issuer}</span>}
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>Issue Date (MM/YYYY)</label>
              <input type="text" placeholder="e.g. 05/2026" value={formState.issueDate} onChange={e => setFormState({ ...formState, issueDate: e.target.value })} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '13px', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>Credential ID</label>
              <input type="text" value={formState.credentialId} onChange={e => setFormState({ ...formState, credentialId: e.target.value })} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '13px', boxSizing: 'border-box' }} />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>Credential URL</label>
              <input type="text" placeholder="e.g. https://..." value={formState.credentialUrl} onChange={e => setFormState({ ...formState, credentialUrl: e.target.value })} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '13px', boxSizing: 'border-box' }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '10px' }}>
            <button type="button" onClick={() => setShowForm(false)} style={{ padding: '6px 14px', background: '#e2e8f0', border: 'none', borderRadius: '6px', color: '#475569', fontSize: '12px', cursor: 'pointer' }}>Cancel</button>
            <button type="button" onClick={handleSave} style={{ padding: '6px 16px', background: '#007BFF', border: 'none', borderRadius: '6px', color: '#ffffff', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}>Save</button>
          </div>
        </div>
      )}
    </div>
  );
}
