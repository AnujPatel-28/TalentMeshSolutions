import React, { useState } from 'react';
import styles from '../../../../shared-dashboard.module.css';
import SectionStatus from './SectionStatus';
import type { EducationEntry } from '@/types/user';
import { CustomSelect } from '@/components/ui/CustomSelect';

const INDIAN_DEGREES = [
  'B.Tech / B.E. (Bachelor of Technology / Engineering)',
  'BCA (Bachelor of Computer Applications)',
  'B.Sc (Bachelor of Science)',
  'B.Com (Bachelor of Commerce)',
  'BBA (Bachelor of Business Administration)',
  'B.A. (Bachelor of Arts)',
  'M.Tech / M.E. (Master of Technology / Engineering)',
  'MCA (Master of Computer Applications)',
  'MBA (Master of Business Administration)',
  'M.Sc (Master of Science)',
  'M.Com (Master of Commerce)',
  'M.A. (Master of Arts)',
  'Ph.D / Doctorate',
  'Diploma Degree',
  'Higher Secondary (12th)',
  'Other Degree'
];

const FIELDS_OF_STUDY = [
  'Computer Science & Engineering',
  'Information Technology',
  'Electronics & Communication Engineering',
  'Electrical & Electronics Engineering',
  'Mechanical Engineering',
  'Civil Engineering',
  'Chemical Engineering',
  'Aerospace & Aeronautical Engineering',
  'Biotechnology / Biomedical Engineering',
  'Data Science & Artificial Intelligence',
  'Computer Applications (BCA / MCA)',
  'Business Administration (BBA / MBA)',
  'Finance & Accounting',
  'Marketing & Sales',
  'Human Resource Management',
  'Operations & Supply Chain Management',
  'Economics',
  'Commerce (B.Com / M.Com)',
  'Mathematics & Statistics',
  'Physics',
  'Chemistry',
  'Biology & Life Sciences',
  'MBBS / Medicine',
  'Pharmacy (B.Pharm / M.Pharm)',
  'Nursing',
  'Law (LLB / LLM)',
  'Psychology & Cognitive Science',
  'Sociology & Social Work',
  'Political Science & International Relations',
  'History',
  'English Literature & Linguistics',
  'Journalism & Mass Communication',
  'Graphic Design & Animation',
  'UI/UX & Product Design',
  'Fine Arts & Visual Arts',
  'Architecture',
  'Other Field of Study'
];

const STATE_UNIVERSITIES_COLLEGES: Record<string, string[]> = {
  'Karnataka': [
    'Indian Institute of Science (IISc), Bengaluru',
    'Visvesvaraya Technological University (VTU), Belagavi',
    'Bangalore University, Bengaluru',
    'Manipal Academy of Higher Education, Manipal',
    'National Institute of Technology Karnataka (NITK), Surathkal',
    'Christ University, Bengaluru',
    'PES University, Bengaluru',
    'M. S. Ramaiah Institute of Technology, Bengaluru',
    'R.V. College of Engineering (RVCE), Bengaluru',
    'B.M.S. College of Engineering, Bengaluru',
    'IIIT Bangalore, Bengaluru',
    'Alliance University, Bengaluru',
    'University of Mysore, Mysuru',
    'Karnatak University, Dharwad',
    'St. Joseph\'s University, Bengaluru',
    'Reva University, Bengaluru'
  ],
  'Maharashtra': [
    'Indian Institute of Technology (IIT) Bombay, Mumbai',
    'University of Mumbai, Mumbai',
    'Savitribai Phule Pune University, Pune',
    'COEP Technological University, Pune',
    'Veermata Jijabai Technological Institute (VJTI), Mumbai',
    'SNDT Women\'s University, Mumbai',
    'Narsee Monjee Institute of Management Studies (NMIMS), Mumbai',
    'Symbiosis International University, Pune',
    'Visvesvaraya National Institute of Technology (VNIT), Nagpur',
    'BITS Pilani (Kalyan Campus), Kalyan',
    'MIT World Peace University, Pune',
    'DY Patil Vidyapeeth, Pune',
    'ICT Mumbai, Mumbai',
    'Ferguson College, Pune',
    'Symbiosis Institute of Technology, Pune'
  ],
  'Tamil Nadu': [
    'Indian Institute of Technology (IIT) Madras, Chennai',
    'Anna University, Chennai',
    'Vellore Institute of Technology (VIT), Vellore',
    'SRM Institute of Science and Technology, Chennai',
    'Amrita Vishwa Vidyapeetham, Coimbatore',
    'National Institute of Technology (NIT) Trichy, Tiruchirappalli',
    'University of Madras, Chennai',
    'PSG College of Technology, Coimbatore',
    'Sathyabama Institute of Science and Technology, Chennai',
    'SSN College of Engineering, Chennai',
    'SASTRA Deemed University, Thanjavur',
    'Coimbatore Institute of Technology, Coimbatore',
    'Loyola College, Chennai',
    'Madras Christian College, Chennai'
  ],
  'Delhi': [
    'Indian Institute of Technology (IIT) Delhi, New Delhi',
    'University of Delhi, Delhi',
    'Jawaharlal Nehru University (JNU), New Delhi',
    'Delhi Technological University (DTU), Delhi',
    'Netaji Subhas University of Technology (NSUT), Delhi',
    'Jamia Millia Islamia, New Delhi',
    'Guru Gobind Singh Indraprastha University (GGSIPU), Delhi',
    'Indraprastha Institute of Information Technology (IIIT) Delhi, New Delhi',
    'Indira Gandhi Delhi Technical University for Women (IGDTUW), Delhi',
    'Amity University Delhi NCR, Noida/Delhi',
    'St. Stephen\'s College, Delhi',
    'LSR (Lady Shri Ram College for Women), Delhi'
  ],
  'Telangana': [
    'Indian Institute of Technology (IIT) Hyderabad, Hyderabad',
    'International Institute of Information Technology (IIIT) Hyderabad, Hyderabad',
    'BITS Pilani (Hyderabad Campus), Hyderabad',
    'Osmania University, Hyderabad',
    'Jawaharlal Nehru Technological University (JNTUH), Hyderabad',
    'University of Hyderabad, Hyderabad',
    'National Institute of Technology (NIT) Warangal, Warangal',
    'Chaitanya Bharathi Institute of Technology (CBIT), Hyderabad',
    'VNR Vignana Jyothi Institute of Engineering and Technology, Hyderabad',
    'Vasavi College of Engineering, Hyderabad'
  ],
  'Andhra Pradesh': [
    'Andhra University, Visakhapatnam',
    'Sri Venkateswara University, Tirupati',
    'Jawaharlal Nehru Technological University (JNTUK), Kakinada',
    'K L University, Guntur',
    'National Institute of Technology (NIT) Andhra Pradesh, Tadepalligudem',
    'IIIT Sri City, Chittoor',
    'Gitam University, Visakhapatnam',
    'JNTU Anantapur, Ananthamu'
  ],
  'West Bengal': [
    'Indian Institute of Technology (IIT) Kharagpur, Kharagpur',
    'Jadavpur University, Kolkata',
    'University of Calcutta, Kolkata',
    'Indian Statistical Institute (ISI), Kolkata',
    'Indian Institute of Engineering Science and Technology (IIEST), Shibpur',
    'National Institute of Technology (NIT) Durgapur, Durgapur',
    'Maulana Abul Kalam Azad University of Technology (MAKAUT), Kolkata',
    'Presidency University, Kolkata',
    'St. Xavier\'s College, Kolkata',
    'Heritage Institute of Technology, Kolkata',
    'Techno India University, Kolkata'
  ],
  'Uttar Pradesh': [
    'Indian Institute of Technology (IIT) Kanpur, Kanpur',
    'Banaras Hindu University (BHU), Varanasi',
    'Indian Institute of Technology (IIT BHU) Varanasi, Varanasi',
    'Aligarh Muslim University (AMU), Aligarh',
    'Dr. A.P.J. Abdul Kalam Technical University (AKTU), Lucknow',
    'Motilal Nehru National Institute of Technology (MNNIT), Allahabad',
    'Amity University Uttar Pradesh, Noida',
    'Sharda University, Greater Noida',
    'Shiv Nadar University, Dadri',
    'Harcourt Butler Technical University (HBTU), Kanpur',
    'Madan Mohan Malaviya University of Technology, Gorakhpur',
    'Jaypee Institute of Information Technology (JIIT), Noida'
  ],
  'Gujarat': [
    'Indian Institute of Technology (IIT) Gandhinagar, Gandhinagar',
    'Sardar Vallabhbhai National Institute of Technology (SVNIT), Surat',
    'Gujarat Technological University (GTU), Ahmedabad',
    'Nirma University, Ahmedabad',
    'Dhirubhai Ambani Institute of Information and Communication Technology (DA-IICT), Gandhinagar',
    'Maharaja Sayajirao University of Baroda (MSU), Vadodara',
    'Pandit Deendayal Energy University (PDEU), Gandhinagar',
    'Ahmedabad University, Ahmedabad',
    'L.D. College of Engineering, Ahmedabad'
  ],
  'Kerala': [
    'National Institute of Technology (NIT) Calicut, Calicut',
    'APJ Abdul Kalam Technological University (KTU), Thiruvananthapuram',
    'Cochin University of Science and Technology (CUSAT), Kochi',
    'University of Kerala, Thiruvananthapuram',
    'Mahatma Gandhi University, Kottayam',
    'Indian Institute of Space Science and Technology (IIST), Thiruvananthapuram',
    'Indian Institute of Management (IIM) Kozhikode, Kozhikode',
    'Government Engineering College (GEC), Thrissur',
    'College of Engineering Trivandrum (CET), Thiruvananthapuram'
  ],
  'Rajasthan': [
    'Malaviya National Institute of Technology (MNIT), Jaipur',
    'Birla Institute of Technology and Science (BITS), Pilani',
    'Indian Institute of Technology (IIT) Jodhpur, Jodhpur',
    'University of Rajasthan, Jaipur',
    'Rajasthan Technical University (RTU), Kota',
    'LNM Institute of Information Technology (LNMIIT), Jaipur',
    'Manipal University, Jaipur',
    'Mody University, Lakshmangarh'
  ],
  'Punjab': [
    'Indian Institute of Technology (IIT) Ropar, Ropar',
    'Panjab University, Chandigarh',
    'Thapar Institute of Engineering and Technology, Patiala',
    'I. K. Gujral Punjab Technical University (PTU), Jalandhar',
    'Guru Nanak Dev University (GNDU), Amritsar',
    'Punjab Agricultural University, Ludhiana',
    'Lovely Professional University (LPU), Phagwara'
  ],
  'Haryana': [
    'National Institute of Technology (NIT) Kurukshetra, Kurukshetra',
    'Kurukshetra University, Kurukshetra',
    'JC Bose University of Science and Technology (YMCA), Faridabad',
    'Deenbandhu Chhotu Ram University of Science and Technology, Murthal',
    'Maharshi Dayanand University (MDU), Rohtak',
    'Ashoka University, Sonepat',
    'O.P. Jindal Global University, Sonipat'
  ],
  'Madhya Pradesh': [
    'Indian Institute of Technology (IIT) Indore, Indore',
    'Maulana Azad National Institute of Technology (MANIT), Bhopal',
    'Devi Ahilya Vishwavidyalaya (DAVV), Indore',
    'Rajiv Gandhi Proudyogiki Vishwavidyalaya (RGPV), Bhopal',
    'Shri Govindram Seksaria Institute of Technology and Science (SGSITS), Indore',
    'Jabalpur Engineering College, Jabalpur',
    'PDPM IIITDM Jabalpur, Jabalpur',
    'Amity University Madhya Pradesh, Gwalior'
  ],
  'Bihar': [
    'Indian Institute of Technology (IIT) Patna, Patna',
    'National Institute of Technology (NIT) Patna, Patna',
    'Patna University, Patna',
    'Aryabhatta Knowledge University, Patna',
    'Chanakya National Law University, Patna',
    'Nalanda University, Rajgir',
    'Muzaffarpur Institute of Technology, Muzaffarpur'
  ],
  'Odisha': [
    'Indian Institute of Technology (IIT) Bhubaneswar, Bhubaneswar',
    'National Institute of Technology (NIT) Rourkela, Rourkela',
    'Biju Patnaik University of Technology (BPUT), Rourkela',
    'Utkal University, Bhubaneswar',
    'Kalinga Institute of Industrial Technology (KIIT), Bhubaneswar',
    'Siksha \'O\' Anusandhan (SOA) University, Bhubaneswar',
    'Veer Surendra Sai University of Technology (VSSUT), Burla'
  ],
  'Uttarakhand': [
    'Indian Institute of Technology (IIT) Roorkee, Roorkee',
    'Govind Ballabh Pant University of Agriculture and Technology, Pantnagar',
    'Uttarakhand Technical University, Dehradun',
    'Graphic Era University, Dehradun',
    'University of Petroleum and Energy Studies (UPES), Dehradun',
    'National Institute of Technology (NIT) Uttarakhand, Srinagar'
  ],
  'Assam': [
    'Indian Institute of Technology (IIT) Guwahati, Guwahati',
    'Tezpur University, Tezpur',
    'Gauhati University, Guwahati',
    'National Institute of Technology (NIT) Silchar, Silchar',
    'Assam Engineering College, Guwahati'
  ],
  'Chhattisgarh': [
    'National Institute of Technology (NIT) Raipur, Raipur',
    'Chhattisgarh Swami Vivekanand Technical University (CSVTU), Bhilai',
    'Indian Institute of Technology (IIT) Bhilai, Bhilai',
    'Guru Ghasidas Vishwavidyalaya, Bilaspur',
    'Kalinga University, Raipur'
  ],
  'Jharkhand': [
    'Indian Institute of Technology (IIT ISM) Dhanbad, Dhanbad',
    'National Institute of Technology (NIT) Jamshedpur, Jamshedpur',
    'Birla Institute of Technology (BIT) Mesra, Ranchi',
    'Ranchi University, Ranchi',
    'Birsa Institute of Technology (BIT) Sindri, Dhanbad'
  ],
  'Himachal Pradesh': [
    'Indian Institute of Technology (IIT) Mandi, Mandi',
    'National Institute of Technology (NIT) Hamirpur, Hamirpur',
    'Himachal Pradesh University, Shimla',
    'Jaypee University of Information Technology, Waknaghat'
  ],
  'Jammu & Kashmir': [
    'Indian Institute of Technology (IIT) Jammu, Jammu',
    'National Institute of Technology (NIT) Srinagar, Srinagar',
    'University of Jammu, Jammu',
    'University of Kashmir, Srinagar',
    'Shri Mata Vaishno Devi University (SMVDU), Katra'
  ],
  'Goa': [
    'Birla Institute of Technology and Science (BITS) Pilani (Goa Campus), Zuarinagar',
    'Goa University, Taleigao Plateau',
    'Goa College of Engineering, Farmagudi',
    'Indian Institute of Technology (IIT) Goa, Farmagudi'
  ]
};

const NATIONAL_UNIVERSITIES: string[] = [
  'Indian Institute of Technology (IIT) Bombay',
  'Indian Institute of Technology (IIT) Delhi',
  'Indian Institute of Technology (IIT) Madras',
  'Indian Institute of Technology (IIT) Kanpur',
  'Indian Institute of Technology (IIT) Kharagpur',
  'Indian Institute of Technology (IIT) Roorkee',
  'Indian Institute of Technology (IIT) Guwahati',
  'Indian Institute of Technology (IIT) Hyderabad',
  'Birla Institute of Technology and Science (BITS) Pilani',
  'Indian Institute of Science (IISc), Bengaluru',
  'National Institute of Technology (NIT) Trichy',
  'National Institute of Technology (NIT) Karnataka',
  'National Institute of Technology (NIT) Calicut',
  'National Institute of Technology (NIT) Warangal',
  'Delhi Technological University (DTU)',
  'Vellore Institute of Technology (VIT), Vellore',
  'SRM Institute of Science and Technology, Chennai',
  'Anna University, Chennai',
  'Jadavpur University, Kolkata',
  'University of Delhi, Delhi',
  'Banaras Hindu University (BHU), Varanasi',
  'Jawaharlal Nehru University (JNU), New Delhi',
  'Symbiosis International University, Pune',
  'Manipal Academy of Higher Education, Manipal',
  'Other Institution'
];

const getUniversitiesForLocation = (locationStr: string): string[] => {
  if (!locationStr) {
    return [...NATIONAL_UNIVERSITIES];
  }
  
  // Find which state name is inside the locationStr
  const matchedState = Object.keys(STATE_UNIVERSITIES_COLLEGES).find(state => 
    locationStr.toLowerCase().includes(state.toLowerCase())
  );
  
  if (matchedState) {
    // Return state-specific colleges combined with national ones, deduplicated
    return Array.from(new Set([
      ...STATE_UNIVERSITIES_COLLEGES[matchedState],
      ...NATIONAL_UNIVERSITIES
    ]));
  }
  
  return [...NATIONAL_UNIVERSITIES];
};

const institutionColor = (name: string) => {
  if (!name) return '#7c3aed';
  const colors = [
    '#2563eb', '#7c3aed', '#db2777', '#ea580c', '#16a34a',
    '#0891b2', '#4f46e5', '#e11d48', '#059669', '#d97706'
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

interface EducationSectionProps {
  education?: EducationEntry[] | null;
  isEditing: boolean;
  onUpdate: (eduList: EducationEntry[]) => void;
  location?: string;
}

const EMPTY_EDU: EducationEntry = {
  id: '',
  institution: '',
  degree: '',
  field_of_study: '',
  start_year: undefined,
  end_year: undefined,
  is_current: false,
  grade: '',
  description: ''
};

export default React.memo(function EducationSection({
  education = [],
  isEditing,
  onUpdate,
  location = ''
}: EducationSectionProps) {
  
  const eduList = education || [];
  const isComplete = eduList.length >= 1;

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formState, setFormState] = useState<EducationEntry>(EMPTY_EDU);
  const [errors, setErrors] = useState<{ degree?: string; institution?: string }>({});

  const handleOpenAdd = () => {
    setFormState({ ...EMPTY_EDU, id: typeof window !== 'undefined' && window.crypto?.randomUUID ? window.crypto.randomUUID() : Math.random().toString(36).substring(2, 11) });
    setEditingId(null);
    setShowForm(true);
    setErrors({});
  };

  const handleOpenEdit = (edu: EducationEntry) => {
    setFormState({ ...edu });
    setEditingId(edu.id);
    setShowForm(true);
    setErrors({});
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormState(EMPTY_EDU);
    setErrors({});
  };

  const handleDelete = (id: string) => {
    const updated = eduList.filter(e => e.id !== id);
    onUpdate(updated);
  };

  const handleSave = () => {
    const errs: { degree?: string; institution?: string } = {};
    if (!formState.degree.trim()) errs.degree = 'Degree is required';
    if (!formState.institution.trim()) errs.institution = 'Institution is required';
    
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    let updated: EducationEntry[];
    if (editingId) {
      updated = eduList.map(e => e.id === editingId ? formState : e);
    } else {
      updated = [...eduList, formState];
    }

    onUpdate(updated);
    setShowForm(false);
    setEditingId(null);
    setFormState(EMPTY_EDU);
    setErrors({});
  };

  const renderForm = () => {
    return (
      <div className={styles.inlineFormCard}>
        <h3 className={styles.inlineFormTitle}>{editingId ? 'Edit Education' : 'New Education'}</h3>
        <div className={styles.formGrid2Col}>
          <div className={styles.formField}>
            <label className={styles.formLabel}>Degree *</label>
            <CustomSelect 
              className={`${styles.formInput} ${errors.degree ? styles.inputError : ''}`}
              value={INDIAN_DEGREES.includes(formState.degree) || !formState.degree ? formState.degree : 'Other Degree'} 
              onChange={e => {
                const val = e.target.value;
                setFormState(p => ({ ...p, degree: val === 'Other Degree' ? '' : val }));
              }} 
              options={INDIAN_DEGREES}
              placeholder="Select degree"
              required
            />
            {errors.degree && <span className={styles.errorText}>{errors.degree}</span>}
          </div>
          {(formState.degree === 'Other Degree' || (formState.degree && !INDIAN_DEGREES.includes(formState.degree))) && (
            <div className={styles.formField}>
              <label className={styles.formLabel}>Specify Custom Degree *</label>
              <input 
                className={`${styles.formInput} ${errors.degree ? styles.inputError : ''}`}
                value={formState.degree === 'Other Degree' ? '' : formState.degree} 
                onChange={e => setFormState(p => ({ ...p, degree: e.target.value }))} 
                placeholder="e.g. Bachelor of Fine Arts" 
              />
            </div>
          )}

          <div className={styles.formField}>
            <label className={styles.formLabel}>Institution *</label>
            <CustomSelect 
              className={`${styles.formInput} ${errors.institution ? styles.inputError : ''}`}
              value={getUniversitiesForLocation(location).includes(formState.institution) || !formState.institution ? formState.institution : 'Other Institution'} 
              onChange={e => {
                const val = e.target.value;
                setFormState(p => ({ ...p, institution: val === 'Other Institution' ? '' : val }));
              }} 
              options={getUniversitiesForLocation(location)}
              placeholder="Select college / university"
              required
            />
            {errors.institution && <span className={styles.errorText}>{errors.institution}</span>}
          </div>
          {(formState.institution === 'Other Institution' || (formState.institution && !getUniversitiesForLocation(location).includes(formState.institution))) && (
            <div className={styles.formField} style={{ gridColumn: '1 / -1' }}>
              <label className={styles.formLabel}>Specify Custom Institution *</label>
              <input 
                className={`${styles.formInput} ${errors.institution ? styles.inputError : ''}`}
                value={formState.institution === 'Other Institution' ? '' : formState.institution} 
                onChange={e => setFormState(p => ({ ...p, institution: e.target.value }))} 
                placeholder="e.g. Sharda University" 
              />
            </div>
          )}

          <div className={styles.formField}>
            <label className={styles.formLabel}>Field of Study</label>
            <CustomSelect 
              className={styles.formInput}
              value={FIELDS_OF_STUDY.includes(formState.field_of_study || '') || !formState.field_of_study ? formState.field_of_study || '' : 'Other Field of Study'} 
              onChange={e => {
                const val = e.target.value;
                setFormState(p => ({ ...p, field_of_study: val === 'Other Field of Study' ? '' : val }));
              }} 
              options={FIELDS_OF_STUDY}
              placeholder="Select field of study"
            />
          </div>
          {(formState.field_of_study === 'Other Field of Study' || (formState.field_of_study && !FIELDS_OF_STUDY.includes(formState.field_of_study))) && (
            <div className={styles.formField}>
              <label className={styles.formLabel}>Specify Custom Field of Study *</label>
              <input 
                className={styles.formInput}
                value={formState.field_of_study === 'Other Field of Study' ? '' : formState.field_of_study} 
                onChange={e => setFormState(p => ({ ...p, field_of_study: e.target.value }))} 
                placeholder="e.g. Mechatronics Engineering" 
              />
            </div>
          )}
          <div className={styles.formField}>
            <label className={styles.formLabel}>Start Year</label>
            <input 
              type="number" 
              className={styles.formInput}
              placeholder="e.g. 2021"
              value={formState.start_year || ''} 
              onChange={e => setFormState(p => ({ ...p, start_year: e.target.value === '' ? undefined : parseInt(e.target.value) || undefined }))} 
            />
          </div>
          {!formState.is_current && (
            <div className={styles.formField}>
              <label className={styles.formLabel}>End Year</label>
              <input 
                type="number" 
                className={styles.formInput}
                placeholder="e.g. 2025"
                value={formState.end_year || ''} 
                onChange={e => setFormState(p => ({ ...p, end_year: e.target.value === '' ? undefined : parseInt(e.target.value) || undefined }))} 
              />
            </div>
          )}
          <div className={styles.formField} style={{ justifyContent: 'center', paddingTop: '1rem' }}>
            <label className={styles.formCheckboxGroup}>
              <input 
                type="checkbox" 
                checked={!!formState.is_current} 
                onChange={e => setFormState(p => ({ ...p, is_current: e.target.checked, end_year: e.target.checked ? undefined : p.end_year }))} 
              />
              <span>Currently studying here</span>
            </label>
          </div>
          <div className={styles.formField} style={{ gridColumn: '1 / -1' }}>
            <label className={styles.formLabel}>Grade / CGPA</label>
            <input 
              className={styles.formInput}
              value={formState.grade || ''} 
              onChange={e => setFormState(p => ({ ...p, grade: e.target.value }))} 
              placeholder="e.g. 8.5 CGPA or 85%" 
            />
          </div>
        </div>
        <div className={styles.formField}>
          <label className={styles.formLabel}>Description / Coursework / Honors</label>
          <textarea 
            className={styles.formTextarea}
            value={formState.description || ''} 
            onChange={e => setFormState(p => ({ ...p, description: e.target.value }))} 
            placeholder="Describe honors, key achievements, coursework, extra activities... (Tip: Use bullet points '•' or '-' for lists)" 
            rows={3} 
          />
        </div>
        <div className={styles.formActions}>
          <button type="button" onClick={handleCancel} className={styles.cancelBtn}>Cancel</button>
          <button type="button" onClick={handleSave} className={styles.saveBtn}>Save</button>
        </div>
      </div>
    );
  };

  return (
    <div className={styles.profileSection} id="education">
      <div className={styles.timelineCardHeader} style={{ alignItems: 'center' }}>
        <SectionStatus 
          title="Education" 
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary-blue)' }}><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5"/></svg>} 
          count={eduList.length}
          isComplete={isComplete} 
          required={true}
        />
        {isEditing && !showForm && (
          <button
            type="button"
            onClick={handleOpenAdd}
            className={`${styles.emptyStateBtn} ${styles.smallAddBtn}`}
          >
            + Add Education
          </button>
        )}
      </div>

      {eduList.length === 0 && !showForm ? (
        <div className={styles.emptyStateCard}>
          <div className={styles.emptyStateIcon}>🎓</div>
          <h3 className={styles.emptyStateTitle}>No Education Added Yet</h3>
          <p className={styles.emptyStateText}>
            Add your educational credentials to verify your academic background.
          </p>
          {isEditing && (
            <button 
              type="button" 
              onClick={handleOpenAdd} 
              className={styles.emptyStateBtn}
            >
              Add Education
            </button>
          )}
        </div>
      ) : (
        <div className={styles.educationList}>
          {eduList.map((edu) => (
            editingId === edu.id && showForm ? (
              <React.Fragment key={edu.id}>
                {renderForm()}
              </React.Fragment>
            ) : (
              <div key={edu.id} className={styles.viewCard}>
                <div className={styles.timelineLogoLayout}>
                  <div className={styles.timelineLogo} style={{ background: institutionColor(edu.institution) }}>
                    {edu.institution ? edu.institution.charAt(0).toUpperCase() : '🎓'}
                  </div>
                  <div className={styles.flex1}>
                    <div className={styles.timelineCardHeader}>
                      <div>
                        <h4 className={styles.timelineTitle}>
                          {edu.degree}{edu.field_of_study ? ` in ${edu.field_of_study}` : ''}
                        </h4>
                        <p className={styles.timelineSubHeader}>
                          {edu.institution || 'Unknown Institution'}{edu.grade ? ` • Grade: ${edu.grade}` : ''}
                        </p>
                        <span className={styles.educationDateText}>
                          {edu.start_year || 'N/A'} → {edu.is_current ? 'Present' : edu.end_year || 'N/A'}
                        </span>
                      </div>
                      
                      {isEditing && (
                        <div className={styles.actionButtonContainer}>
                          <button 
                            type="button" 
                            onClick={() => handleOpenEdit(edu)} 
                            className={`${styles.iconButton} ${styles.editIconBtn}`} 
                            title="Edit education"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          </button>
                          <button 
                            type="button" 
                            onClick={() => handleDelete(edu.id)} 
                            className={`${styles.iconButton} ${styles.deleteIconBtn}`} 
                            title="Delete education"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                          </button>
                        </div>
                      )}
                    </div>
                    {edu.description && (
                      <p className={styles.timelineDescText} style={{ whiteSpace: 'pre-wrap' }}>
                        {edu.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )
          ))}
        </div>
      )}

      {isEditing && showForm && !editingId && renderForm()}
    </div>
  );
});
