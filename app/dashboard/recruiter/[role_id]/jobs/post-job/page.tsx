'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import styles from './postJob.module.css';
import { insforge } from '@/lib/insforge';
import { useAuth } from '@/lib/auth/AuthContext';
import { CustomSelect } from '@/components/ui/CustomSelect';

const JOB_CATEGORIES = [
  'Software Development', 'Design', 'Marketing', 'Sales', 'Customer Support',
  'Product Management', 'Data Science', 'Human Resources', 'Finance', 'Other'
];

const JOB_TYPES = ['Full-time', 'Part-time', 'Contract', 'Freelance', 'Remote'];

const TEMPLATE_PREFILLS: Record<string, { title: string; category: string; description: string; requirements: string }> = {
  'software-engineer': {
    title: 'Software Engineer',
    category: 'Software Development',
    description: 'Build and maintain reliable product experiences across the web application stack.',
    requirements: 'React\nNode.js\nTypeScript\nCloud platforms',
  },
  'product-manager': {
    title: 'Product Manager',
    category: 'Product Management',
    description: 'Own the product roadmap and work closely with engineering, design, and customers.',
    requirements: 'Product strategy\nRoadmapping\nAgile delivery\nUser research',
  },
  'ux-designer': {
    title: 'UX / UI Designer',
    category: 'Design',
    description: 'Create intuitive user experiences for web and mobile products.',
    requirements: 'Figma\nUser testing\nWireframing\nPrototyping',
  },
  'data-scientist': {
    title: 'Data Scientist',
    category: 'Data Science',
    description: 'Build analytical models and surface actionable insights from product data.',
    requirements: 'Python\nSQL\nMachine learning\nData pipelines',
  },
  'sales-rep': {
    title: 'Sales Representative',
    category: 'Sales',
    description: 'Drive revenue through outbound prospecting and thoughtful inbound qualification.',
    requirements: 'CRM\nB2B sales\nProspecting\nNegotiation',
  },
  'devops-engineer': {
    title: 'DevOps Engineer',
    category: 'Software Development',
    description: 'Maintain reliable CI/CD pipelines and secure infrastructure automation.',
    requirements: 'Kubernetes\nTerraform\nCI/CD\nDocker',
  },
};

const INDIAN_CITIES = [
  'Agra, Uttar Pradesh',
  'Ahmedabad, Gujarat',
  'Ajmer, Rajasthan',
  'Allahabad (Prayagraj), Uttar Pradesh',
  'Amritsar, Punjab',
  'Anantnag, Jammu & Kashmir',
  'Asansol, West Bengal',
  'Aurangabad (Chhatrapati Sambhajinagar), Maharashtra',
  'Belagavi, Karnataka',
  'Bengaluru, Karnataka',
  'Bhagalpur, Bihar',
  'Bhilai, Chhattisgarh',
  'Bhopal, Madhya Pradesh',
  'Bhubaneswar, Odisha',
  'Bilaspur, Chhattisgarh',
  'Bokaro Steel City, Jharkhand',
  'Chandigarh',
  'Chennai, Tamil Nadu',
  'Coimbatore, Tamil Nadu',
  'Cuttack, Odisha',
  'Dehradun, Uttarakhand',
  'Delhi, NCT',
  'Dhanbad, Jharkhand',
  'Dharamshala, Himachal Pradesh',
  'Dibrugarh, Assam',
  'Durg, Chhattisgarh',
  'Durgapur, West Bengal',
  'Faridabad, Haryana',
  'Gandhinagar, Gujarat',
  'Gaya, Bihar',
  'Ghaziabad, Uttar Pradesh',
  'Guntur, Andhra Pradesh',
  'Gurgaon, Haryana',
  'Guwahati, Assam',
  'Gwalior, Madhya Pradesh',
  'Haldwani, Uttarakhand',
  'Haridwar, Uttarakhand',
  'Hubballi-Dharwad, Karnataka',
  'Hyderabad, Telangana',
  'Indore, Madhya Pradesh',
  'Jabalpur, Madhya Pradesh',
  'Jaipur, Rajasthan',
  'Jalandhar, Punjab',
  'Jammu, Jammu & Kashmir',
  'Jamnagar, Gujarat',
  'Jamshedpur, Jharkhand',
  'Jodhpur, Rajasthan',
  'Kanpur, Uttar Pradesh',
  'Karimnagar, Telangana',
  'Karnal, Haryana',
  'Kochi, Kerala',
  'Kolkata, West Bengal',
  'Kota, Rajasthan',
  'Kozhikode, Kerala',
  'Kurnool, Andhra Pradesh',
  'Lucknow, Uttar Pradesh',
  'Ludhiana, Punjab',
  'Madgaon, Goa',
  'Madurai, Tamil Nadu',
  'Mandi, Himachal Pradesh',
  'Mangaluru, Karnataka',
  'Meerut, Uttar Pradesh',
  'Mormugao, Goa',
  'Mumbai, Maharashtra',
  'Muzaffarpur, Bihar',
  'Mysore, Karnataka',
  'Nagpur, Maharashtra',
  'Nashik, Maharashtra',
  'New Delhi, NCT',
  'Noida, Uttar Pradesh',
  'Panaji, Goa',
  'Panipat, Haryana',
  'Patiala, Punjab',
  'Patna, Bihar',
  'Pune, Maharashtra',
  'Puri, Odisha',
  'Raipur, Chhattisgarh',
  'Rajkot, Gujarat',
  'Rajnandgaon, Chhattisgarh',
  'Ranchi, Jharkhand',
  'Rourkela, Odisha',
  'Salem, Tamil Nadu',
  'Shimla, Himachal Pradesh',
  'Siliguri, West Bengal',
  'Sonipat, Haryana',
  'Srinagar, Jammu & Kashmir',
  'Surat, Gujarat',
  'Thane, Maharashtra',
  'Thiruvananthapuram, Kerala',
  'Thrissur, Kerala',
  'Tinsukia, Assam',
  'Tirupati, Andhra Pradesh',
  'Tiruppur, Tamil Nadu',
  'Tiruchirappalli, Tamil Nadu',
  'Udhampur, Jammu & Kashmir',
  'Ujjain, Madhya Pradesh',
  'Udaipur, Rajasthan',
  'Vadodara, Gujarat',
  'Varanasi, Uttar Pradesh',
  'Vijayawada, Andhra Pradesh',
  'Visakhapatnam, Andhra Pradesh',
  'Warangal, Telangana'
];

export default function PostJobPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const editJobId = searchParams.get('edit');
  const templateId = searchParams.get('template');
  const isEditMode = Boolean(editJobId);

  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [jobTitles, setJobTitles] = useState<string[]>([]);
  const [isCustomTitle, setIsCustomTitle] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    company_name: '',
    category: 'Software Development',
    type: 'Full-time',
    salary_min: '',
    salary_max: '',
    location: '',
    description: '',
    requirements: '',
    openings: '1',
    deadline: '',
  });

  const [locationSearchQuery, setLocationSearchQuery] = useState('');
  const [isLocationDropdownOpen, setIsLocationDropdownOpen] = useState(false);
  const locationDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (locationDropdownRef.current && !locationDropdownRef.current.contains(event.target as Node)) {
        setIsLocationDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!user) return;

    const fetchPrefillData = async () => {
      try {
        let companyName = '';

        // 1. Fetch Company Name
        if (user.company_id) {
          const { data: company } = await insforge.database
            .from('companies')
            .select('name')
            .eq('id', user.company_id)
            .single();

          if (company?.name) {
            companyName = company.name;
            setFormData(prev => ({ ...prev, company_name: prev.company_name || company.name }));
          }
        }

        // 2. Fetch Recruiter Profile Location
        const { data: profile } = await insforge.database
          .from('profiles')
          .select('location')
          .eq('id', user.id)
          .single();

        if (profile?.location) {
          setFormData(prev => ({ ...prev, location: prev.location || profile.location }));
        }

        if (editJobId) {
          const { data: job, error: jobError } = await insforge.database
            .from('jobs')
            .select('id, title, company_id, department, type, salary_min, salary_max, location, description, requirements')
            .eq('id', editJobId)
            .single();

          if (jobError) throw jobError;
          setFormData(prev => ({
            ...prev,
            title: job.title || '',
            company_name: companyName || prev.company_name,
            category: job.department || prev.category,
            type: job.type || prev.type,
            salary_min: job.salary_min == null ? '' : String(job.salary_min),
            salary_max: job.salary_max == null ? '' : String(job.salary_max),
            location: job.location || prev.location,
            description: job.description || '',
            requirements: Array.isArray(job.requirements) ? job.requirements.join('\n') : (job.requirements || ''),
          }));
          setIsCustomTitle(true);
        }

        // 3. Fetch previous job titles posted by this recruiter
        const { data: jobs } = await insforge.database
          .from('jobs')
          .select('title')
          .eq('recruiter_id', user.id)
          .order('created_at', { ascending: false });

        const predefinedTitles = [
          'Software Engineer', 'Frontend Developer', 'Backend Developer',
          'Full Stack Developer', 'Product Manager', 'Project Manager',
          'UI/UX Designer', 'Data Scientist', 'DevOps Engineer', 'QA Tester',
          'Marketing Specialist', 'Sales Executive', 'HR Manager'
        ];

        let uniqueTitles = [...predefinedTitles];
        if (jobs && jobs.length > 0) {
          const pastTitles = jobs.map(j => j.title);
          uniqueTitles = Array.from(new Set([...uniqueTitles, ...pastTitles]));
        }
        setJobTitles(uniqueTitles);
      } catch (error) {
        console.error('Failed to pre-fill form data:', error);
      }
    };

    fetchPrefillData();
  }, [user, editJobId]);

  useEffect(() => {
    if (!templateId || isEditMode) return;
    const template = TEMPLATE_PREFILLS[templateId];
    if (!template) return;

    setFormData(prev => ({
      ...prev,
      title: template.title,
      category: template.category,
      description: template.description,
      requirements: template.requirements,
    }));
    setIsCustomTitle(true);
  }, [templateId, isEditMode]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    if (e.target.name === 'title_select') {
      if (e.target.value === '___OTHER___') {
        setIsCustomTitle(true);
        setFormData(prev => ({ ...prev, title: '' }));
      } else {
        setIsCustomTitle(false);
        setFormData(prev => ({ ...prev, title: e.target.value }));
      }
      return;
    }
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async () => {
    setIsLoading(true);

    try {
      const payload = {
        title: formData.title,
        description: formData.description,
        requirements: formData.requirements.split('\n').filter(r => r.trim()),
        department: formData.category,
        location: formData.location,
        type: formData.type,
        salary_min: parseInt(formData.salary_min) || 0,
        salary_max: parseInt(formData.salary_max) || 0,
        currency: 'INR',
      };

      // Creation derives company_id/recruiter_id server-side via create_job. Editing uses the
      // existing PATCH endpoint and deliberately omits status/approval_status so editing cannot
      // silently publish, unpublish, or bypass the approval state machine.
      const res = await fetch(editJobId ? `/api/jobs/${editJobId}` : '/api/jobs', {
        method: editJobId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editJobId ? payload : { ...payload, status: 'active' }),
      });
      const json = await res.json();

      if (!res.ok) {
        if (json.error === 'ACTIVE_JOB_LIMIT') {
          alert(`${json.message}\n\nClose an active job to post another, or upgrade your plan.`);
        } else if (json.error === 'no active company') {
          router.push('/pending-approval');
        } else if (json.error === 'coordinators cannot post jobs') {
          alert('Your role does not permit posting jobs. Contact your company admin.');
        } else if (json.details) {
          const firstError = Object.values(json.details).flat()[0] as string | undefined;
          alert(firstError || json.error || 'Failed to post job');
        } else {
          alert(json.error || 'Failed to post job');
        }
        return;
      }

      router.push(`/dashboard/recruiter/${params.role_id}/jobs`);
    } catch (err: any) {
      console.error(err);
      alert(err?.message || 'Failed to post job');
    } finally {
      setIsLoading(false);
    }
  };

  const nextStep = () => setStep(s => Math.min(s + 1, 3));
  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>{isEditMode ? 'Edit Job' : 'Post a New Job'}</h1>
          <p className={styles.subtitle}>{isEditMode ? 'Update the job details without changing its approval state.' : 'Fill in the details to find your next great hire.'}</p>
        </div>

        <div className={styles.stepper}>
          {[1, 2, 3].map(s => (
            <div key={s} className={`${styles.stepBar} ${s <= step ? styles.stepBarActive : ''}`} />
          ))}
        </div>

        {step === 1 && (
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Job Title</label>
              {!isCustomTitle ? (
                <CustomSelect
                  name="title_select"
                  className={styles.select}
                  value={formData.title}
                  onChange={handleChange}
                  options={jobTitles}
                  placeholder="Select a Job Title"
                  required
                  footer={
                    <div 
                      style={{ padding: '12px 16px', cursor: 'pointer', color: '#1e88e5', fontWeight: 600, fontSize: '14.5px', background: '#f8fafc', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px' }}
                      onClick={(e) => {
                         e.stopPropagation();
                         setIsCustomTitle(true);
                         setFormData(prev => ({ ...prev, title: '' }));
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#eff6ff'}
                      onMouseLeave={e => e.currentTarget.style.background = '#f8fafc'}
                    >
                      + Create Custom Title
                    </div>
                  }
                />
              ) : (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    name="title"
                    className={styles.input}
                    style={{ flex: 1 }}
                    value={formData.title}
                    onChange={handleChange}
                    placeholder="Type custom job title..."
                    autoComplete="off"
                    required
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomTitle(false);
                      setFormData(prev => ({ ...prev, title: '' }));
                    }}
                    style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '0 1rem', cursor: 'pointer', color: '#64748b', fontWeight: 600, fontSize: '0.9rem' }}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Company Name</label>
              <input name="company_name" className={styles.input} value={formData.company_name} onChange={handleChange} placeholder="Your Company Name" required />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Category</label>
              <CustomSelect 
                name="category"
                className={styles.select}
                value={formData.category}
                onChange={handleChange}
                options={JOB_CATEGORIES}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Job Type</label>
              <CustomSelect 
                name="type"
                className={styles.select}
                value={formData.type}
                onChange={handleChange}
                options={JOB_TYPES}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Location</label>
              <div ref={locationDropdownRef} className="relative w-full">
                <input
                  name="location"
                  className={styles.input}
                  value={formData.location}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData(prev => ({ ...prev, location: val }));
                    setLocationSearchQuery(val);
                    setIsLocationDropdownOpen(true);
                  }}
                  onFocus={() => {
                    setLocationSearchQuery(formData.location);
                    setIsLocationDropdownOpen(true);
                  }}
                  placeholder="Search city in India (e.g. Bengaluru, Mumbai)..."
                  autoComplete="off"
                />
                {isLocationDropdownOpen && (
                  <div className="absolute top-[calc(100%+4px)] left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 max-h-52 overflow-y-auto p-2 space-y-0.5 no-scrollbar">
                    {locationSearchQuery.trim() && !INDIAN_CITIES.some(c => c.toLowerCase() === locationSearchQuery.toLowerCase().trim()) && (
                      <div
                        onClick={() => {
                          setFormData(prev => ({ ...prev, location: locationSearchQuery.trim() }));
                          setIsLocationDropdownOpen(false);
                        }}
                        className="flex items-center justify-between p-2 hover:bg-blue-50 rounded-lg cursor-pointer text-xs text-blue-600 font-bold border border-dashed border-blue-200 transition-colors"
                      >
                        <span>Use custom: &ldquo;{locationSearchQuery}&rdquo;</span>
                        <span>+</span>
                      </div>
                    )}
                    {INDIAN_CITIES.filter(city =>
                      city.toLowerCase().includes(locationSearchQuery.toLowerCase())
                    ).map(city => (
                      <div
                        key={city}
                        onClick={() => {
                          setFormData(prev => ({ ...prev, location: city }));
                          setIsLocationDropdownOpen(false);
                        }}
                        className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer text-xs hover:bg-slate-50 transition-colors ${formData.location === city ? 'bg-blue-50 text-blue-600 font-bold' : 'text-slate-700'}`}
                      >
                        <span>{city}</span>
                        {formData.location === city && <span className="text-blue-600">✓</span>}
                      </div>
                    ))}
                    {INDIAN_CITIES.filter(city =>
                      city.toLowerCase().includes(locationSearchQuery.toLowerCase())
                    ).length === 0 && !locationSearchQuery.trim() && (
                      <div className="text-center py-3 text-xs text-slate-400">Type to search Indian cities...</div>
                    )}
                    {INDIAN_CITIES.filter(city =>
                      city.toLowerCase().includes(locationSearchQuery.toLowerCase())
                    ).length === 0 && locationSearchQuery.trim() && (
                      <div className="text-center py-3 text-xs text-slate-400">No matching Indian cities found.</div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Openings</label>
              <CustomSelect 
                name="openings"
                className={styles.select}
                value={formData.openings}
                onChange={handleChange}
                options={['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Salary Min (Annual INR)</label>
              <input type="number" name="salary_min" className={styles.input} value={formData.salary_min} onChange={handleChange} placeholder="e.g. 1200000" />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Salary Max (Annual INR)</label>
              <input type="number" name="salary_max" className={styles.input} value={formData.salary_max} onChange={handleChange} placeholder="e.g. 2000000" />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className={styles.formGrid}>
            <div className={`${styles.formGroup} ${styles.fullWidth}`}>
              <label className={styles.label}>Job Description</label>
              <textarea name="description" className={styles.textarea} value={formData.description} onChange={handleChange} placeholder="Describe the role, responsibilities, and team..." />
            </div>
            <div className={`${styles.formGroup} ${styles.fullWidth}`}>
              <label className={styles.label}>Requirements (one per line)</label>
              <textarea name="requirements" className={styles.textarea} style={{ minHeight: 100 }} value={formData.requirements} onChange={handleChange} placeholder="Skill 1&#10;Skill 2&#10;Experience Level..." />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Application Deadline</label>
              <input type="date" name="deadline" className={styles.input} value={formData.deadline} onChange={handleChange} />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className={styles.previewCard}>
            <h3 style={{ marginBottom: '1.5rem', fontWeight: 700 }}>Preview Posting</h3>
            <div className={styles.previewItem}>
              <span className={styles.previewLabel}>Job Title</span>
              <span className={styles.previewValue}>{formData.title}</span>
            </div>
            <div className={styles.previewItem}>
              <span className={styles.previewLabel}>Company</span>
              <span className={styles.previewValue}>{formData.company_name}</span>
            </div>
            <div className={styles.previewItem}>
              <span className={styles.previewLabel}>Details</span>
              <span className={styles.previewValue}>{formData.category} · {formData.type} · {formData.location}</span>
            </div>
            <div className={styles.previewItem}>
              <span className={styles.previewLabel}>Salary</span>
              <span className={styles.previewValue}>₹{(parseInt(formData.salary_min) / 100000).toFixed(1)}L - ₹{(parseInt(formData.salary_max) / 100000).toFixed(1)}L PA</span>
            </div>
            <div className={styles.previewItem}>
              <span className={styles.previewLabel}>Openings</span>
              <span className={styles.previewValue}>{formData.openings}</span>
            </div>
          </div>
        )}

        <div className={styles.footer}>
          {step > 1 && <button className={styles.backBtn} onClick={prevStep}>Back</button>}
          <div style={{ marginLeft: 'auto' }}>
            {step < 3 ? (
              <button className={styles.nextBtn} onClick={nextStep}>Continue</button>
            ) : (
              <button className={styles.nextBtn} onClick={handleSubmit} disabled={isLoading}>
                {isLoading ? (isEditMode ? 'Saving...' : 'Publishing...') : (isEditMode ? 'Save Changes' : 'Publish Job')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
