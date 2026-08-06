'use client';
import React, { useState, useEffect, useRef } from 'react';
import { insforge, invokeFunction } from '@/lib/insforge';
import { useAuth } from '@/lib/auth/AuthContext';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { motion, AnimatePresence } from 'framer-motion';

interface ApplyModalProps {
    isOpen: boolean;
    onClose: () => void;
    jobId: string;
    jobTitle: string;
    companyName: string;
    candidateProfile?: {
        name: string;
        email: string;
        phone: string;
        location: string;
        headline: string;
        skills: string[];
        experienceYears: number;
        education: string;
        resumeUrl: string;
        profileStrength: number;
        linkedinUrl: string;
        githubUrl: string;
        portfolioUrl: string;
    } | null;
    jobSkills?: string[];
    onSuccess: (appId?: string) => void;
}

// ─── Preset Lists ─────────────────────────────────────────────────────────────
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
  const matchedState = Object.keys(STATE_UNIVERSITIES_COLLEGES).find(state => 
    locationStr.toLowerCase().includes(state.toLowerCase())
  );
  if (matchedState) {
    return Array.from(new Set([
      ...STATE_UNIVERSITIES_COLLEGES[matchedState],
      ...NATIONAL_UNIVERSITIES
    ]));
  }
  return [...NATIONAL_UNIVERSITIES];
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

const EXP_PRESETS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"];

const DYNAMIC_EXP_PRESETS = ["0.5", "1", "1.5", "2", "2.5", "3", "4", "5"];

const HEADLINE_PRESETS = [
    "Software Engineer",
    "Frontend Developer",
    "Backend Developer",
    "Full Stack Developer",
    "DevOps Engineer",
    "QA / Testing Engineer",
    "Data Scientist / Analyst",
    "Product Manager",
    "Product / UI-UX Designer",
    "Business Analyst",
    "Human Resources (HR) Specialist",
    "Talent Acquisition / Recruiter",
    "Marketing Specialist",
    "Sales / Business Development Associate",
    "Operations Manager",
    "Customer Support Specialist"
];

// ─── Skill match helper ────────────────────────────────────────────────────────
function getSkillMatch(candidateSkills: string[], jobSkills: string[]) {
    if (!jobSkills.length) return { matched: [], missing: [], pct: 100 };
    const norm = (s: string) => s.toLowerCase().trim();
    const candSet = new Set(candidateSkills.map(norm));
    const matched: string[] = [];
    const missing: string[] = [];
    for (const s of jobSkills) {
        if (candSet.has(norm(s))) matched.push(s);
        else missing.push(s);
    }
    return { matched, missing, pct: Math.round((matched.length / jobSkills.length) * 100) };
}

// ─── Inline SVGs ──────────────────────────────────────────────────────────────
const Ico = {
    Check: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>,
    File: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>,
    Upload: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>,
    Sparkle: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="m12 3 1.912 5.885L20 10.8l-5.088 1.912L13 18.6l-1.912-5.888L6 10.8l5.088-1.915Z" /></svg>,
    User: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>,
    Shield: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>,
    X: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>,
    ChevronDown: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>,
    Briefcase: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>,
};

// ─── Step Progress Bar ─────────────────────────────────────────────────────────
function StepBar({ step, total, labels, isMobile }: { step: number; total: number; labels: string[]; isMobile?: boolean }) {
    if (isMobile) {
        return (
            <div style={{ padding: '0 2rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                    {Array.from({ length: total }).map((_, i) => (
                        <div
                            key={i}
                            style={{
                                width: i === step ? 20 : 8,
                                height: 8,
                                borderRadius: 4,
                                background: i === step ? 'var(--primary-blue)' : i < step ? '#10b981' : '#e2e8f0',
                                transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
                            }}
                        />
                    ))}
                </div>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569' }}>
                    {labels[step]}
                </span>
            </div>
        );
    }

    return (
        <div style={{ padding: '0 2rem 1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                {Array.from({ length: total }).map((_, i) => {
                    const done = i < step;
                    const active = i === step;
                    return (
                        <React.Fragment key={i}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: '0 0 auto' }}>
                                <div style={{
                                    width: 28, height: 28, borderRadius: '50%',
                                    background: done ? '#10b981' : active ? 'var(--primary-blue)' : '#e2e8f0',
                                    color: done || active ? 'white' : '#94a3b8',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '0.7rem', fontWeight: 800,
                                    transition: 'all 0.3s ease',
                                    boxShadow: active ? '0 0 0 4px rgba(59,130,246,0.15)' : 'none'
                                }}>
                                    {done ? <Ico.Check /> : i + 1}
                                </div>
                                <span style={{ fontSize: '0.62rem', fontWeight: 600, color: done ? '#10b981' : active ? 'var(--primary-blue)' : '#94a3b8', whiteSpace: 'nowrap' }}>
                                    {labels[i]}
                                </span>
                            </div>
                            {i < total - 1 && (
                                <div style={{ flex: 1, height: 2, background: done ? '#10b981' : '#e2e8f0', margin: '0 4px', marginBottom: 18, transition: 'background 0.3s ease' }} />
                            )}
                        </React.Fragment>
                    );
                })}
            </div>
        </div>
    );
}

// ─── Collapsible Section (progressive disclosure) ──────────────────────────────
interface CollapsibleSectionProps {
    title: string;
    icon: React.ReactNode;
    isOpen: boolean;
    onToggle: () => void;
    children: React.ReactNode;
    isCompleted?: boolean;
    isMobile?: boolean;
}

function CollapsibleSection({ title, icon, isOpen, onToggle, children, isCompleted = false, isMobile = false }: CollapsibleSectionProps) {
    return (
        <div style={{
            background: '#ffffff',
            border: isOpen ? '1px solid #bfdbfe' : '1px solid #e2e8f0',
            borderRadius: 12,
            overflow: 'hidden',
            marginBottom: '0.5rem',
            transition: 'border-color 0.2s, box-shadow 0.2s',
            boxShadow: isOpen ? '0 0 0 3px rgba(37,99,235,0.06)' : '0 1px 3px rgba(0,0,0,0.04)'
        }}>
            <button
                type="button"
                onClick={onToggle}
                aria-expanded={isOpen}
                style={{
                    width: '100%',
                    padding: '1rem 1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: isOpen ? '#eff6ff' : '#fafbfc',
                    border: 'none',
                    cursor: 'pointer',
                    outline: 'none',
                    textAlign: 'left',
                    fontFamily: 'inherit',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    color: '#334155',
                    minHeight: 48,
                    transition: 'background 0.2s'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: isOpen ? '#2563eb' : '#94a3b8', display: 'flex', alignItems: 'center' }}>
                        {icon}
                    </span>
                    <span style={{ fontWeight: isOpen ? 700 : 600, color: isOpen ? '#1e40af' : '#374151' }}>{title}</span>
                    {isCompleted && (
                        <span style={{ fontSize: '0.68rem', color: '#059669', background: '#ecfdf5', padding: '2px 8px', borderRadius: 100, marginLeft: 8, fontWeight: 600, border: '1px solid #a7f3d0' }}>
                            ✓ Done
                        </span>
                    )}
                </div>
                <motion.span
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    style={{ display: 'inline-flex', color: '#64748b' }}
                >
                    <Ico.ChevronDown />
                </motion.span>
            </button>
            <AnimatePresence initial={false}>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: 'easeInOut' }}
                        style={{ overflow: 'hidden' }}
                    >
                        <div style={{ padding: isMobile ? '1.25rem' : '1.125rem 1.25rem', background: '#ffffff', borderTop: '1px solid #e2e8f0' }}>
                            {children}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ─── Skill Badge ──────────────────────────────────────────────────────────────
function SkillBadge({ label, matched }: { label: string; matched: boolean }) {
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '0.3rem 0.65rem', borderRadius: 100,
            fontSize: '0.75rem', fontWeight: 600,
            background: matched ? '#f0fdf4' : '#f8fafc',
            color: matched ? '#16a34a' : '#64748b',
            border: `1px solid ${matched ? '#bbf7d0' : '#e2e8f0'}`,
            transition: 'transform 0.15s',
        }}>
            {matched ? '✓' : '·'} {label}
        </span>
    );
}

const st = {
    input: {
        width: '100%',
        padding: '10px 12px',
        borderRadius: '8px',
        border: '1px solid #d1d5db',
        fontSize: '0.875rem',
        outline: 'none',
        background: '#f8fafc',
        boxSizing: 'border-box' as const,
        fontFamily: 'inherit',
        color: '#111827',
        transition: 'all 0.15s ease-in-out',
    },
    label: {
        display: 'block',
        fontSize: '0.72rem',
        fontWeight: 500,
        color: '#6b7280',
        marginBottom: '4px',
        letterSpacing: '0.01em',
    },
    card: {
        background: '#f8fafc',
        border: '1px solid #e8ecf0',
        borderRadius: '12px',
        padding: '1rem 1.25rem',
    },
    cardTitle: {
        margin: '0 0 1rem',
        fontSize: '0.78rem',
        fontWeight: 800,
        textTransform: 'uppercase' as const,
        letterSpacing: '0.06em',
        color: '#475569',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
    },
    select: {
        width: '100%',
        padding: '10px 12px',
        borderRadius: '8px',
        border: '1px solid #d1d5db',
        fontSize: '0.875rem',
        outline: 'none',
        background: '#f8fafc',
        boxSizing: 'border-box' as const,
        fontFamily: 'inherit',
        fontWeight: 500,
        color: '#111827',
        transition: 'all 0.15s ease-in-out',
    }
};

// education comes back either as a jsonb array or as a JSON string, depending on the call site.
export function parseEducation(education: any): any[] {
    if (Array.isArray(education)) return education;
    if (typeof education !== 'string' || !education) return [];
    try {
        const parsed = JSON.parse(education);
        if (Array.isArray(parsed)) return parsed;
        return parsed && typeof parsed === 'object' ? [parsed] : [];
    } catch {
        return [{ degree: education }];
    }
}

export default function ApplyModal({
    isOpen, onClose, jobId, jobTitle, companyName,
    candidateProfile, jobSkills = [], onSuccess
}: ApplyModalProps) {
    const { user } = useAuth();
    const [step, setStep] = useState(0);
    const [direction, setDirection] = useState(0);
    const [isMobile, setIsMobile] = useState(false);
    const [reduceMotion, setReduceMotion] = useState(false);
    const [manualActiveSection, setManualActiveSection] = useState<'personal' | 'professional' | 'resume'>('personal');

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 600);
        checkMobile();
        window.addEventListener('resize', checkMobile);

        const motionMedia = window.matchMedia('(prefers-reduced-motion: reduce)');
        setReduceMotion(motionMedia.matches);
        const motionListener = (e: MediaQueryListEvent) => setReduceMotion(e.matches);
        motionMedia.addEventListener('change', motionListener);

        return () => {
            window.removeEventListener('resize', checkMobile);
            motionMedia.removeEventListener('change', motionListener);
        };
    }, []);

    const [applyType, setApplyType] = useState<'quick' | 'manual'>('quick');
    const [coverLetter, setCoverLetter] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [dragOver, setDragOver] = useState(false);

    const finalJobSkills = jobSkills || [];

    // Manual form state
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [location, setLocation] = useState('');
    const [headline, setHeadline] = useState('');
    const [experienceYears, setExperienceYears] = useState('');
    const [degree, setDegree] = useState('');
    const [fieldOfStudy, setFieldOfStudy] = useState('');
    const [institution, setInstitution] = useState('');
    const [portfolioUrl, setPortfolioUrl] = useState('');
    const [linkedinUrl, setLinkedinUrl] = useState('');
    const [githubUrl, setGithubUrl] = useState('');
    const [skillsString, setSkillsString] = useState('');

    // Dropdown selections
    const [expSelection, setExpSelection] = useState('');
    const [manualExp, setManualExp] = useState('');
    const [dynamicExpSelection, setDynamicExpSelection] = useState('');
    const [manualDynamicExp, setManualDynamicExp] = useState('');
    const [headlineSelection, setHeadlineSelection] = useState('');
    const [manualHeadline, setManualHeadline] = useState('');
    const [locationSearchQuery, setLocationSearchQuery] = useState('');
    const [isLocationDropdownOpen, setIsLocationDropdownOpen] = useState(false);

    const locationDropdownRef = useRef<HTMLDivElement>(null);

    // Screening
    const [sponsorshipRequired, setSponsorshipRequired] = useState<'Yes' | 'No'>('No');
    const [relocationInterest, setRelocationInterest] = useState<'Yes' | 'No'>('Yes');
    const [dynamicExp, setDynamicExp] = useState('');
    const [joiningDate, setJoiningDate] = useState('');
    const [manualResumeFile, setManualResumeFile] = useState<File | null>(null);

    const modalRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Dynamic computations based on current selection
    const mainSkill = finalJobSkills.length > 0 ? finalJobSkills[0] : 'the role';
    const skillMatch = getSkillMatch(candidateProfile?.skills || [], finalJobSkills);

    // Steps depend on applyType
    const steps = applyType === 'quick'
        ? ['Profile', 'Cover Letter', 'Review']
        : ['Profile', 'Screening', 'Cover Letter', 'Review'];
    const totalSteps = steps.length;

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
        if (isOpen) {
            setStep(0);
            setDirection(0);
            setManualActiveSection('personal');
            setCoverLetter('');
            setError(null);
            setSuccess(false);
            document.body.style.overflow = 'hidden';
            modalRef.current?.focus();

            const strength = candidateProfile?.profileStrength || 0;
            const hasRequired = !!(
                candidateProfile?.phone && 
                candidateProfile?.location && 
                candidateProfile?.resumeUrl && 
                candidateProfile?.skills?.length > 0 && 
                candidateProfile?.experienceYears !== undefined && 
                candidateProfile?.experienceYears !== null
            );
            setApplyType((strength > 80 && hasRequired) ? 'quick' : 'manual');

            if (candidateProfile) {
                setFullName(candidateProfile.name || '');
                setEmail(candidateProfile.email || '');
                setPhone(candidateProfile.phone || '');

                const initialLoc = candidateProfile.location || '';
                setLocation(initialLoc);
                setLocationSearchQuery(initialLoc);
                setIsLocationDropdownOpen(false);

                const initialHeadline = candidateProfile.headline || '';
                setHeadline(initialHeadline);
                if (HEADLINE_PRESETS.includes(initialHeadline)) {
                    setHeadlineSelection(initialHeadline);
                    setManualHeadline('');
                } else if (initialHeadline) {
                    setHeadlineSelection('Other');
                    setManualHeadline(initialHeadline);
                } else {
                    setHeadlineSelection('');
                    setManualHeadline('');
                }

                const initialExp = candidateProfile.experienceYears !== undefined && candidateProfile.experienceYears !== null ? String(candidateProfile.experienceYears) : '';
                setExperienceYears(initialExp);
                if (EXP_PRESETS.includes(initialExp)) {
                    setExpSelection(initialExp);
                    setManualExp('');
                } else if (initialExp) {
                    setExpSelection('Other');
                    setManualExp(initialExp);
                } else {
                    setExpSelection('');
                    setManualExp('');
                }

                const eduItem: any = parseEducation(candidateProfile.education)[0];
                setDegree(eduItem?.degree || '');
                setFieldOfStudy(eduItem?.field_of_study || '');
                setInstitution(eduItem?.institution || '');

                setPortfolioUrl(candidateProfile.portfolioUrl || '');
                setLinkedinUrl(candidateProfile.linkedinUrl || '');
                setGithubUrl(candidateProfile.githubUrl || '');
                setSkillsString(candidateProfile.skills ? candidateProfile.skills.join(', ') : '');
            } else {
                setFullName(''); setEmail(''); setPhone(''); setLocation('');
                setLocationSearchQuery(''); setIsLocationDropdownOpen(false);
                setHeadline(''); setExperienceYears(''); 
                setDegree(''); setFieldOfStudy(''); setInstitution('');
                setPortfolioUrl(''); setLinkedinUrl(''); setGithubUrl(''); setSkillsString('');
                setHeadlineSelection(''); setManualHeadline('');
                setExpSelection(''); setManualExp('');
            }
            setManualResumeFile(null);
            setSponsorshipRequired('No');
            setRelocationInterest('Yes');
            setDynamicExp('');
            setDynamicExpSelection('');
            setManualDynamicExp('');
        } else {
            document.body.style.overflow = 'auto';
        }
        return () => { document.body.style.overflow = 'auto'; };
    }, [isOpen, candidateProfile, jobId, jobTitle, companyName, jobSkills]);

    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape' && !loading) onClose(); };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose, loading]);

    if (!isOpen) return null;

    // ─── File validation ──────────────────────────────────────────────────────
    const validateAndSetFile = async (file: File) => {
        const ext = '.' + file.name.split('.').pop()?.toLowerCase();
        if (ext !== '.pdf' || file.type !== 'application/pdf') {
            setError('Only PDF resumes are accepted.'); return;
        }
        const bytes = new Uint8Array(await file.slice(0, 5).arrayBuffer());
        const isPdf = bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46 && bytes[4] === 0x2D;
        if (!isPdf) { setError('Invalid PDF file.'); return; }
        setError(null);
        setManualResumeFile(file);
    };

    // ─── Submit ────────────────────────────────────────────────────────────────
    const handleSubmit = async () => {
        setLoading(true);
        setError(null);

        try {
            let finalResumeUrl = candidateProfile?.resumeUrl || '';

            if (applyType === 'manual') {
                if (!(fullName || '').trim() || !(email || '').trim() || !(phone || '').trim() || !(location || '').trim() ||
                    !(headline || '').trim() || !(experienceYears || '').trim() || !(degree || '').trim() || !(institution || '').trim() || !(skillsString || '').trim()) {
                    throw new Error('Please fill in all required fields.');
                }
                if (!(dynamicExp || '').trim() || !(joiningDate || '').trim()) {
                    throw new Error('Please answer all screening questions.');
                }

                if (manualResumeFile) {
                    // The session lives in the HttpOnly tm_access_token cookie; the SDK's own
                    // getCurrentUser() cannot see it (in-memory TokenManager + refresh cookie
                    // scoped to /api/auth), so read the id from AuthContext like ResumeManager does.
                    const userId = user?.id;
                    if (!userId) throw new Error('User session not found.');
                    const path = `${userId}/${Date.now()}_${manualResumeFile.name}`;
                    const { data: uploadData, error: uploadError } = await (insforge.storage.from('resumes') as any)
                        .upload(path, manualResumeFile, { contentType: 'application/pdf' });
                    if (uploadError) throw new Error(uploadError.message || 'Resume upload failed.');
                    finalResumeUrl = uploadData?.url || '';
                } else if (!finalResumeUrl) {
                    throw new Error('Please upload a resume.');
                }

                // Only sync back to the profile when the modal was seeded from it. With
                // candidateProfile === null the fields start blank, and candidate-profile's PUT
                // overwrites every key it receives — syncing then would wipe stored education,
                // skills and social links.
                if (user?.id && candidateProfile) {
                    let strength = 0;
                    if (fullName) strength += 10; if (email) strength += 10; if (phone) strength += 10;
                    if (location) strength += 10; if (headline) strength += 15; if (experienceYears) strength += 15;
                    if (degree && institution) strength += 15; if (finalResumeUrl) strength += 15;
                    const skillsList = (skillsString || '').split(',').map(s => (s || '').trim()).filter(Boolean);

                    // education arrives either as a jsonb array or as a JSON string (the init
                    // effect above handles both). Normalise before merging, or the string case
                    // drops every entry past the first one the PUT overwrites.
                    const existingEdu: any[] = parseEducation(candidateProfile?.education);
                    const educationPayload = [
                        {
                            id: existingEdu[0]?.id || 'edu-primary',
                            degree: degree,
                            field_of_study: fieldOfStudy || undefined,
                            institution: institution
                        },
                        ...existingEdu.slice(1)
                    ];

                    await invokeFunction('candidate-profile', {
                        method: 'PUT',
                        body: {
                            profile: { name: fullName, phone, location },
                            candidateProfile: {
                                headline, skills: skillsList,
                                experience_years: Number(experienceYears) || null,
                                education: educationPayload, resume_url: finalResumeUrl,
                                linkedin_url: linkedinUrl, github_url: githubUrl,
                                portfolio_url: portfolioUrl, profile_strength: strength
                            }
                        }
                    });
                }
            } else {
                if (!finalResumeUrl) throw new Error('Your profile is missing a resume. Switch to Manual Apply to upload one.');
                if (!candidateProfile?.phone || !candidateProfile?.location || !candidateProfile?.skills?.length || candidateProfile?.experienceYears === undefined || candidateProfile?.experienceYears === null) {
                    throw new Error('Your profile is missing critical required fields (Phone, Location, Skills, or Experience). Please switch to Manual Apply to complete them.');
                }
            }

            const screeningAnswers = applyType === 'manual' ? {
                'Do you require sponsorship?': sponsorshipRequired,
                'Can you relocate?': relocationInterest,
                [`Years of ${mainSkill} experience?`]: Number(dynamicExp) || 0,
                'Expected joining date?': joiningDate
            } : null;

            const result = await invokeFunction('candidate-applications', {
                method: 'POST',
                body: {
                    jobId, coverLetter: coverLetter || undefined,
                    applyType, resumeUrl: finalResumeUrl || undefined,
                    screeningAnswers: screeningAnswers || undefined
                }
            });

            if (result.error) throw new Error(result.error.message || 'Application submission failed.');

            setSuccess(true);
            setTimeout(() => { onSuccess(result.data?.application?.id); onClose(); }, 2200);
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred.');
        } finally {
            setLoading(false);
        }
    };

    // ─── Step validation before advancing ─────────────────────────────────────
    const canAdvance = () => {
        if (applyType === 'quick') {
            if (step === 0) return true; // profile review — read only
            if (step === 1) return true; // cover letter optional
        } else {
            if (step === 0) {
                const expNum = Number(experienceYears);
                const isExpValid = !isNaN(expNum) && expNum >= 0 && (experienceYears || '').trim() !== '';
                return !!((fullName || '').trim() && (email || '').trim() && (phone || '').trim() && (location || '').trim() &&
                    (headline || '').trim() && isExpValid && (degree || '').trim() && (institution || '').trim() && (skillsString || '').trim() &&
                    (!!candidateProfile?.resumeUrl || !!manualResumeFile));
            }
            if (step === 1) {
                const dynExpNum = Number(dynamicExp);
                const isDynExpValid = !isNaN(dynExpNum) && dynExpNum >= 0 && (dynamicExp || '').trim() !== '';
                return !!(isDynExpValid && (joiningDate || '').trim());
            }
            if (step === 2) return true;
        }
        return true;
    };

    // ─── Step: Profile review (Quick) / Profile edit (Manual) ─────────────────
    const renderStepProfile = () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '1.25rem' : '1rem' }}>
            {/* Apply Type Selector */}
            <div style={{ display: 'flex', gap: '16px', marginBottom: '0.25rem' }}>
                {[
                    { key: 'quick', title: '⚡ Fast Apply', desc: 'Use your saved profile & default resume for a 1-click submission.' },
                    { key: 'manual', title: '✏️ Manual Apply', desc: 'Customize details, upload a custom resume, and answer screening Qs.' }
                ].map(t => {
                    const isSelected = applyType === t.key;
                    return (
                        <motion.div
                            key={t.key}
                            whileHover={{ scale: 1.015 }}
                            whileTap={{ scale: 0.985 }}
                            onClick={() => { setApplyType(t.key as any); setStep(0); setDirection(0); }}
                            style={{
                                flex: 1,
                                padding: '16px',
                                borderRadius: '12px',
                                border: isSelected ? '2px solid #2563eb' : '1px solid #e2e8f0',
                                backgroundColor: isSelected ? 'rgba(239,246,255,0.85)' : '#ffffff',
                                cursor: 'pointer',
                                transition: 'background-color 0.2s, border-color 0.2s',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '6px',
                                boxShadow: isSelected ? '0 2px 12px rgba(37,99,235,0.10)' : '0 1px 3px rgba(0,0,0,0.04)',
                                position: 'relative',
                                minHeight: 88,
                                boxSizing: 'border-box'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.88rem', fontWeight: 800, color: isSelected ? '#1d4ed8' : '#1e293b' }}>
                                    {t.title}
                                </span>
                                <div style={{
                                    width: '18px', height: '18px', borderRadius: '50%',
                                    border: isSelected ? '2px solid #2563eb' : '1.5px solid #d1d5db',
                                    backgroundColor: isSelected ? '#ffffff' : '#f9fafb',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    {isSelected && <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#2563eb' }} />}
                                </div>
                            </div>
                            <span style={{ fontSize: '0.75rem', color: isSelected ? '#3b82f6' : '#64748b', lineHeight: 1.4, fontWeight: 500 }}>
                                {t.desc}
                            </span>
                        </motion.div>
                    );
                })}
            </div>

            {/* Skill match banner */}
            {finalJobSkills.length > 0 && (
                <div style={{
                    background: `linear-gradient(135deg, ${skillMatch.pct >= 70 ? '#f0fdf4' : skillMatch.pct >= 40 ? '#fffbeb' : '#f8fafc'}, white)`,
                    border: `1px solid ${skillMatch.pct >= 70 ? '#bbf7d0' : skillMatch.pct >= 40 ? '#fde68a' : '#e2e8f0'}`,
                    borderRadius: 12, padding: '1rem 1.25rem',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    {skillMatch.pct >= 70 && (
                        <div className="shimmer-bg" style={{
                            position: 'absolute',
                            top: 0, left: 0, right: 0, bottom: 0,
                            pointerEvents: 'none',
                            mixBlendMode: 'overlay' as any
                        }} />
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Ico.Sparkle /> AI Skill Match
                        </span>
                        <span style={{
                            fontSize: '1.1rem', fontWeight: 800,
                            color: skillMatch.pct >= 70 ? '#16a34a' : skillMatch.pct >= 40 ? '#d97706' : '#dc2626'
                        }}>{skillMatch.pct}%</span>
                    </div>
                    <div style={{ height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden', marginBottom: 10 }}>
                        <motion.div 
                            style={{
                                height: '100%', borderRadius: 3,
                                background: skillMatch.pct >= 70 ? '#10b981' : skillMatch.pct >= 40 ? '#f59e0b' : '#ef4444',
                            }}
                            initial={{ width: 0 }}
                            animate={{ width: `${skillMatch.pct}%` }}
                            transition={reduceMotion ? { duration: 0.01 } : { duration: 0.8, ease: 'easeOut' }}
                        />
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {skillMatch.matched.map(s => <SkillBadge key={s} label={s} matched />)}
                        {skillMatch.missing.map(s => <SkillBadge key={s} label={s} matched={false} />)}
                    </div>
                </div>
            )}

            {applyType === 'quick' ? (
                /* ── Quick: show profile card ── */
                candidateProfile ? (
                    <div style={{ background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: 12, padding: '1.25rem', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                        <div style={{ width: 52, height: 52, borderRadius: 14, background: 'var(--primary-blue)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', fontWeight: 800, flexShrink: 0 }}>
                            {candidateProfile.name?.[0]?.toUpperCase()}
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>{candidateProfile.name}</h4>
                                    <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: '#64748b' }}>{candidateProfile.headline || 'No headline set'}</p>
                                </div>
                                <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#3b82f6', background: '#eff6ff', padding: '3px 10px', borderRadius: 100, letterSpacing: '0.04em' }}>PRE-FILLED</span>
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                                {[
                                    { label: candidateProfile.email, icon: '📧' },
                                    { label: candidateProfile.phone || '—', icon: '📞' },
                                    { label: candidateProfile.location || '—', icon: '📍' },
                                    { label: `${candidateProfile.experienceYears}y exp`, icon: '💼' },
                                ].map(({ label, icon }) => (
                                    <span key={label} style={{ fontSize: '0.78rem', color: '#475569', display: 'flex', alignItems: 'center', gap: 4 }}>
                                        {icon} {label}
                                    </span>
                                ))}
                            </div>
                            {candidateProfile.resumeUrl ? (
                                <div style={{ marginTop: '0.6rem', fontSize: '0.78rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: 5, fontWeight: 600 }}>
                                    <Ico.File /> Resume attached from profile
                                </div>
                            ) : (
                                <div style={{ marginTop: '0.6rem', fontSize: '0.78rem', color: '#ef4444', fontWeight: 600 }}>
                                    ⚠ No resume found — switch to Manual Apply
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '1rem', color: '#dc2626', fontSize: '0.85rem', fontWeight: 500 }}>
                        Profile not loaded. Please switch to Manual Apply.
                    </div>
                )
            ) : (
                /* ── Manual: collapsible sections (progressive disclosure) ── */
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <CollapsibleSection
                        title="Personal Details"
                        icon={<Ico.User />}
                        isOpen={manualActiveSection === 'personal'}
                        onToggle={() => setManualActiveSection(manualActiveSection === 'personal' ? 'professional' : 'personal')}
                        isCompleted={!!(fullName && email && phone && location)}
                        isMobile={isMobile}
                    >
                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1rem' }}>
                            <div>
                                <label className="tm-label" style={st.label}>Full Name *</label>
                                <input type="text" className="tm-input" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your name" autoComplete="name"
                                    style={st.input} />
                            </div>
                            <div>
                                <label className="tm-label" style={st.label}>Email *</label>
                                <input type="email" className="tm-input" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" autoComplete="email"
                                    style={st.input} />
                            </div>
                            <div>
                                <label className="tm-label" style={st.label}>Phone *</label>
                                <input type="tel" className="tm-input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 XXXXX XXXXX" autoComplete="tel"
                                    style={st.input} />
                            </div>
                            <div>
                                <label className="tm-label" style={st.label}>Location *</label>
                                <div ref={locationDropdownRef} className="relative w-full">
                                    <input 
                                        type="text" 
                                        className="tm-input"
                                        value={location} 
                                        onChange={e => {
                                            const val = e.target.value;
                                            setLocation(val);
                                            setLocationSearchQuery(val);
                                            setIsLocationDropdownOpen(true);
                                        }}
                                        onFocus={() => {
                                            setLocationSearchQuery(location);
                                            setIsLocationDropdownOpen(true);
                                        }}
                                        placeholder="Search city in India (e.g. Bengaluru, Mumbai)..."
                                        style={st.input}
                                    />
                                    {isLocationDropdownOpen && (
                                        <div className="absolute top-[calc(100%+4px)] left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 max-h-52 overflow-y-auto p-2 space-y-0.5 no-scrollbar">
                                            {locationSearchQuery.trim() && !INDIAN_CITIES.some(c => c.toLowerCase() === locationSearchQuery.toLowerCase().trim()) && (
                                                <div
                                                    onClick={() => {
                                                        setLocation(locationSearchQuery.trim());
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
                                                        setLocation(city);
                                                        setIsLocationDropdownOpen(false);
                                                    }}
                                                    className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer text-xs hover:bg-slate-50 transition-colors ${location === city ? 'bg-blue-50 text-blue-600 font-bold' : 'text-slate-700'}`}
                                                >
                                                    <span>{city}</span>
                                                    {location === city && <span className="text-blue-600">✓</span>}
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
                        </div>
                    </CollapsibleSection>

                    <CollapsibleSection
                        title="Professional Details"
                        icon={<Ico.Briefcase />}
                        isOpen={manualActiveSection === 'professional'}
                        onToggle={() => setManualActiveSection(manualActiveSection === 'professional' ? 'personal' : 'professional')}
                        isCompleted={!!(headline && experienceYears && degree && institution && skillsString)}
                        isMobile={isMobile}
                    >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <label className="tm-label" style={st.label}>Headline / Current Role *</label>
                                <select
                                    value={headlineSelection}
                                    onChange={e => {
                                        const val = e.target.value || '';
                                        setHeadlineSelection(val);
                                        if (val !== 'Other') {
                                            setHeadline(val);
                                        } else {
                                            setHeadline(manualHeadline || '');
                                        }
                                    }}
                                    className="tm-select"
                                    style={st.select}
                                >
                                    <option value="" disabled>Select Role</option>
                                    {HEADLINE_PRESETS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                    <option value="Other">Other (Enter manually)</option>
                                </select>
                                {headlineSelection === 'Other' && (
                                    <input
                                        type="text"
                                        value={manualHeadline}
                                        onChange={e => {
                                            setManualHeadline(e.target.value);
                                            setHeadline(e.target.value);
                                        }}
                                        placeholder="Enter your current role manually"
                                        className="tm-input"
                                        style={st.input}
                                    />
                                )}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div>
                                    <label className="tm-label" style={st.label}>Experience (Years) *</label>
                                    <select
                                        value={expSelection}
                                        onChange={e => {
                                            const val = e.target.value || '';
                                            setExpSelection(val);
                                            if (val !== 'Other') {
                                                setExperienceYears(val);
                                            } else {
                                                setExperienceYears(manualExp || '');
                                            }
                                        }}
                                        className="tm-select"
                                        style={st.select}
                                    >
                                        <option value="" disabled>Select Experience</option>
                                        <option value="0">Less than 1 Year</option>
                                        <option value="1">1 Year</option>
                                        <option value="2">2 Years</option>
                                        <option value="3">3 Years</option>
                                        <option value="4">4 Years</option>
                                        <option value="5">5 Years</option>
                                        <option value="6">6 Years</option>
                                        <option value="7">7 Years</option>
                                        <option value="8">8 Years</option>
                                        <option value="9">9 Years</option>
                                        <option value="10">10+ Years</option>
                                        <option value="Other">Enter manually</option>
                                    </select>
                                    {expSelection === 'Other' && (
                                        <div style={{ marginTop: '0.5rem' }}>
                                            <input
                                                type="text"
                                                value={manualExp}
                                                onChange={e => {
                                                    const val = e.target.value;
                                                    if (val === '' || /^\d*\.?\d*$/.test(val)) {
                                                        setManualExp(val);
                                                        setExperienceYears(val);
                                                    }
                                                }}
                                                placeholder="Enter experience (e.g. 2.5)"
                                                className="tm-input"
                                                style={st.input}
                                            />
                                            {manualExp && isNaN(Number(manualExp)) && (
                                                <span style={{ fontSize: '0.65rem', color: '#dc2626', marginTop: 2, display: 'block' }}>
                                                    Please enter a valid numeric value (e.g. 2.5)
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                                
                                <div>
                                    <label className="tm-label" style={st.label}>Highest Degree *</label>
                                    <CustomSelect
                                        className="tm-select"
                                        value={INDIAN_DEGREES.includes(degree) || !degree ? degree : 'Other Degree'}
                                        onChange={e => {
                                            const val = e.target.value;
                                            setDegree(val === 'Other Degree' ? '' : val);
                                        }}
                                        options={INDIAN_DEGREES}
                                        placeholder="Select Degree"
                                        required
                                    />
                                    {(degree === 'Other Degree' || (degree && !INDIAN_DEGREES.includes(degree))) && (
                                        <input
                                            type="text"
                                            value={degree === 'Other Degree' ? '' : degree}
                                            onChange={e => setDegree(e.target.value)}
                                            placeholder="Specify Custom Degree"
                                            className="tm-input"
                                            style={st.input}
                                        />
                                    )}
                                </div>

                                <div>
                                    <label className="tm-label" style={st.label}>Specialization / Field of Study</label>
                                    <CustomSelect
                                        className="tm-select"
                                        value={FIELDS_OF_STUDY.includes(fieldOfStudy) || !fieldOfStudy ? fieldOfStudy : 'Other Field of Study'}
                                        onChange={e => {
                                            const val = e.target.value;
                                            setFieldOfStudy(val === 'Other Field of Study' ? '' : val);
                                        }}
                                        options={FIELDS_OF_STUDY}
                                        placeholder="Select Field of Study"
                                    />
                                    {(fieldOfStudy === 'Other Field of Study' || (fieldOfStudy && !FIELDS_OF_STUDY.includes(fieldOfStudy))) && (
                                        <input
                                            type="text"
                                            value={fieldOfStudy === 'Other Field of Study' ? '' : fieldOfStudy}
                                            onChange={e => setFieldOfStudy(e.target.value)}
                                            placeholder="Specify Specialization"
                                            className="tm-input"
                                            style={st.input}
                                        />
                                    )}
                                </div>
                                <div>
                                    <label className="tm-label" style={st.label}>College / University *</label>
                                    <CustomSelect
                                        className="tm-select"
                                        value={getUniversitiesForLocation(location).includes(institution) || !institution ? institution : 'Other Institution'}
                                        onChange={e => {
                                            const val = e.target.value;
                                            setInstitution(val === 'Other Institution' ? '' : val);
                                        }}
                                        options={getUniversitiesForLocation(location)}
                                        placeholder="Select College/University"
                                        required
                                    />
                                    {(institution === 'Other Institution' || (institution && !getUniversitiesForLocation(location).includes(institution))) && (
                                        <input
                                            type="text"
                                            value={institution === 'Other Institution' ? '' : institution}
                                            onChange={e => setInstitution(e.target.value)}
                                            placeholder="Specify Custom Institution"
                                            className="tm-input"
                                            style={st.input}
                                        />
                                    )}
                                </div>
                            </div>
                            <div>
                                <label className="tm-label" style={st.label}>
                                    Skills (comma separated) * — <span style={{ color: '#007BFF', fontWeight: 500 }}>job needs: {finalJobSkills.slice(0, 4).join(', ')}{finalJobSkills.length > 4 ? '…' : ''}</span>
                                </label>
                                <input type="text" className="tm-input" value={skillsString} onChange={e => setSkillsString(e.target.value)} placeholder="React, TypeScript, Node.js, Python"
                                    style={st.input} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: '0.75rem' }}>
                                {[
                                    { label: 'Portfolio', icon: '🌐', val: portfolioUrl, set: setPortfolioUrl },
                                    { label: 'LinkedIn', icon: '💼', val: linkedinUrl, set: setLinkedinUrl },
                                    { label: 'GitHub', icon: '🐙', val: githubUrl, set: setGithubUrl },
                                ].map(({ label, icon, val, set }) => (
                                    <div key={label}>
                                        <label className="tm-label" style={{ ...st.label, color: '#9ca3af', fontSize: '0.68rem', marginBottom: 4 }}>{icon} {label}</label>
                                        <input type="url" className="tm-input" value={val} onChange={e => set(e.target.value)} placeholder="https://..."
                                            style={{ ...st.input, padding: '8px 10px', fontSize: '0.8rem' }} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </CollapsibleSection>

                    <CollapsibleSection
                        title="Resume Upload"
                        icon={<Ico.File />}
                        isOpen={manualActiveSection === 'resume'}
                        onToggle={() => setManualActiveSection(manualActiveSection === 'resume' ? 'professional' : 'resume')}
                        isCompleted={!!(manualResumeFile || candidateProfile?.resumeUrl)}
                        isMobile={isMobile}
                    >
                        <div
                            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                            onDragLeave={() => setDragOver(false)}
                            onDrop={async e => {
                                e.preventDefault(); setDragOver(false);
                                const file = e.dataTransfer.files[0];
                                if (file) await validateAndSetFile(file);
                            }}
                            style={{
                                border: `2px dashed ${dragOver ? 'var(--primary-blue)' : manualResumeFile ? '#10b981' : candidateProfile?.resumeUrl ? '#10b981' : '#e2e8f0'}`,
                                borderRadius: 8, padding: '1.25rem', textAlign: 'center',
                                background: dragOver ? '#eff6ff' : manualResumeFile || candidateProfile?.resumeUrl ? '#f0fdf4' : '#fafcff',
                                cursor: 'pointer', transition: 'all 0.2s',
                                minHeight: 120, display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <input ref={fileInputRef} type="file" accept=".pdf" style={{ display: 'none' }} onChange={async e => {
                                const file = e.target.files?.[0]; if (file) await validateAndSetFile(file);
                            }} />
                            {manualResumeFile ? (
                                <div>
                                    <div style={{ fontSize: '1.5rem', marginBottom: 4 }}>📄</div>
                                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#16a34a' }}>{manualResumeFile.name}</div>
                                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 2 }}>
                                        {(manualResumeFile.size / 1024 / 1024).toFixed(2)} MB · <span style={{ color: '#3b82f6', cursor: 'pointer' }}>Change</span>
                                    </div>
                                </div>
                            ) : candidateProfile?.resumeUrl ? (
                                <div>
                                    <div style={{ fontSize: '1.2rem', marginBottom: 4 }}>✅</div>
                                    <div style={{ fontWeight: 600, fontSize: '0.82rem', color: '#16a34a' }}>Using resume from profile</div>
                                    <div style={{ fontSize: '0.72rem', color: '#3b82f6', marginTop: 2 }}>Drop or click to replace</div>
                                </div>
                            ) : (
                                <div>
                                    <div style={{ marginBottom: 6, color: '#94a3b8' }}><Ico.Upload /></div>
                                    <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#334155' }}>Drop your PDF resume here</div>
                                    <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: 2 }}>or click to browse · PDF only</div>
                                </div>
                            )}
                        </div>
                    </CollapsibleSection>
                </div>
            )}


        </div>
    );

    // ─── Step: Screening (Manual only) ────────────────────────────────────────
    const renderStepScreening = () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={st.card}>
                <h3 style={st.cardTitle}>
                    <Ico.Shield /> Screening Questions
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {[
                        { q: 'Do you require work visa/sponsorship? *', state: sponsorshipRequired, set: setSponsorshipRequired },
                        { q: 'Are you open to relocation if required? *', state: relocationInterest, set: setRelocationInterest },
                    ].map(({ q, state, set }) => (
                        <div key={q}>
                            <p style={{ margin: '0 0 0.6rem', fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>{q}</p>
                            <div style={{ display: 'flex', gap: 12 }}>
                                {['Yes', 'No'].map(opt => (
                                    <motion.label 
                                        key={opt} 
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                                            padding: '0.6rem 1.25rem', borderRadius: 8, border: `1.5px solid ${state === opt ? '#007BFF' : '#cbd5e1'}`,
                                            background: state === opt ? '#eff6ff' : 'white',
                                            fontWeight: 600, fontSize: '0.85rem', color: state === opt ? '#007BFF' : '#475569',
                                            transition: 'all 0.15s',
                                            boxShadow: state === opt ? '0 2px 8px rgba(0,123,255,0.06)' : 'none',
                                            minHeight: 48,
                                            boxSizing: 'border-box'
                                        }}
                                    >
                                        <input type="radio" style={{ display: 'none' }} checked={state === opt} onChange={() => (set as any)(opt)} />
                                        <span style={{
                                            width: 16, height: 16, borderRadius: '50%',
                                            border: `2px solid ${state === opt ? '#2563eb' : '#d1d5db'}`,
                                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center'
                                        }}>
                                            {state === opt && <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#2563eb' }} />}
                                        </span>
                                        {opt}
                                    </motion.label>
                                ))}
                            </div>
                        </div>
                    ))}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label className="tm-label" style={st.label}>
                                Years of <span style={{ color: '#007BFF' }}>{mainSkill}</span> experience *
                            </label>
                            <select
                                value={dynamicExpSelection}
                                onChange={e => {
                                    const val = e.target.value || '';
                                    setDynamicExpSelection(val);
                                    if (val !== 'Other') {
                                        setDynamicExp(val);
                                    } else {
                                        setDynamicExp(manualDynamicExp || '');
                                    }
                                }}
                                className="tm-select"
                                style={st.select}
                            >
                                <option value="" disabled>Select Experience</option>
                                {DYNAMIC_EXP_PRESETS.map(opt => <option key={opt} value={opt}>{opt} {Number(opt) === 1 ? 'Year' : 'Years'}</option>)}
                                <option value="Other">Enter manually</option>
                            </select>
                            {dynamicExpSelection === 'Other' && (
                                <div style={{ marginTop: '0.5rem' }}>
                                    <input
                                        type="text"
                                        value={manualDynamicExp}
                                        onChange={e => {
                                            const val = e.target.value;
                                            if (val === '' || /^\d*\.?\d*$/.test(val)) {
                                                setManualDynamicExp(val);
                                                setDynamicExp(val);
                                            }
                                        }}
                                        placeholder="Enter experience (e.g. 1.5)"
                                        className="tm-input"
                                        style={st.input}
                                    />
                                    {manualDynamicExp && isNaN(Number(manualDynamicExp)) && (
                                        <span style={{ fontSize: '0.7rem', color: '#dc2626', marginTop: 2, display: 'block' }}>
                                            Please enter a valid numeric value
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                        <div>
                            <label className="tm-label" style={st.label}>Earliest joining date *</label>
                            <input type="date" className="tm-input" value={joiningDate} onChange={e => setJoiningDate(e.target.value)}
                                style={st.input} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    // ─── Step: Cover Letter ────────────────────────────────────────────────────
    const renderStepCoverLetter = () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ background: '#fffbeb', borderRadius: 10, padding: '0.875rem 1rem', border: '1px solid #fde68a', borderLeft: '3px solid #f59e0b' }}>
                <p style={{ margin: 0, fontSize: '0.82rem', color: '#92400e', fontWeight: 500, lineHeight: 1.5 }}>
                    💡 <strong>Tip:</strong> A personal cover note can increase your reply rate by up to <strong>3×</strong>. Mention the role name, a specific skill, and why you&apos;re excited about {companyName}.
                </p>
            </div>
            <div>
                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: 8 }}>
                    <span>Cover Note <span style={{ fontWeight: 400, color: '#94a3b8' }}>(optional)</span></span>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 400 }}>{coverLetter.length}/1500</span>
                </label>
                <textarea
                    value={coverLetter}
                    onChange={e => setCoverLetter(e.target.value.slice(0, 1500))}
                    placeholder={`Hi ${companyName} team,\n\nI'm excited to apply for the ${jobTitle} role. With my background in ${finalJobSkills.slice(0, 2).join(' and ')}, I believe I can bring immediate value to your team...\n\nLooking forward to connecting!`}
                    className="tm-textarea"
                    style={{
                        width: '100%', minHeight: 160, padding: '1rem', borderRadius: 8,
                        border: '1px solid #d1d5db', fontFamily: 'inherit', fontSize: '0.875rem',
                        resize: 'vertical', outline: 'none', lineHeight: 1.65,
                        background: '#f8fafc', boxSizing: 'border-box',
                        color: '#111827', transition: 'all 0.15s ease'
                    }}
                />
            </div>
        </div>
    );

    // ─── Step: Review & Submit ─────────────────────────────────────────────────
    const renderStepReview = () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ background: 'linear-gradient(135deg, #f0fdf4, white)', border: '1px solid #bbf7d0', borderRadius: 14, padding: '1.25rem' }}>
                <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.85rem', fontWeight: 800, color: '#166534' }}>✅ Application Summary</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {[
                        { label: 'Role', val: jobTitle },
                        { label: 'Company', val: companyName },
                        { label: 'Applicant', val: fullName || candidateProfile?.name || '—' },
                        { label: 'Apply type', val: applyType === 'quick' ? '⚡ Quick Apply' : '✏️ Manual Apply' },
                        { label: 'Education', val: degree ? (fieldOfStudy ? `${degree} in ${fieldOfStudy} at ${institution}` : `${degree} at ${institution}`) : 'Not provided' },
                        { label: 'Resume', val: manualResumeFile ? `📄 ${manualResumeFile.name}` : candidateProfile?.resumeUrl ? '📎 Profile resume' : '⚠ Not provided' },
                        { label: 'Skill match', val: finalJobSkills.length ? `${skillMatch.pct}% (${skillMatch.matched.length}/${finalJobSkills.length} matched)` : 'N/A' },
                        { label: 'Cover note', val: coverLetter.trim() ? (coverLetter.trim().length > 30 ? `"${coverLetter.trim().substring(0, 30)}..."` : `"${coverLetter.trim()}"`) : 'Not included' },
                    ].map(({ label, val }) => (
                        <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                            <span style={{ color: '#64748b', fontWeight: 500 }}>{label}</span>
                            <span style={{ color: '#0f172a', fontWeight: 600, textAlign: 'right', maxWidth: '60%' }}>{val}</span>
                        </div>
                    ))}
                </div>
            </div>
            <p style={{ textAlign: 'center', fontSize: '0.75rem', color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>
                By submitting, your profile details and resume will be shared with the employer. You can track the status in <strong>My Applications</strong>.
            </p>
        </div>
    );

    // ─── Success state ─────────────────────────────────────────────────────────
    const ConfettiCanvas = () => {
        const canvasRef = useRef<HTMLCanvasElement>(null);

        useEffect(() => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            let animationFrameId: number;
            
            canvas.width = canvas.parentElement?.clientWidth || 500;
            canvas.height = canvas.parentElement?.clientHeight || 400;

            const colors = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A", "#98D8C8", "#3B82F6", "#F59E0B", "#10B981"];
            
            interface Particle {
                x: number;
                y: number;
                r: number;
                d: number;
                color: string;
                tilt: number;
                tiltAngleIncremental: number;
                tiltAngle: number;
                vx: number;
                vy: number;
            }

            const particles: Particle[] = [];
            const particleCount = 120;

            for (let i = 0; i < particleCount; i++) {
                particles.push({
                    x: canvas.width / 2,
                    y: canvas.height / 2 - 20,
                    r: Math.random() * 6 + 4,
                    d: Math.random() * particleCount,
                    color: colors[Math.floor(Math.random() * colors.length)],
                    tilt: Math.random() * 10 - 5,
                    tiltAngleIncremental: Math.random() * 0.07 + 0.02,
                    tiltAngle: 0,
                    vx: (Math.random() - 0.5) * 10,
                    vy: Math.random() * -14 - 5,
                });
            }

            const gravity = 0.45;
            const friction = 0.98;

            function draw() {
                if (!canvas || !ctx) return;
                ctx.clearRect(0, 0, canvas.width, canvas.height);

                let active = false;

                particles.forEach((p) => {
                    p.vy += gravity;
                    p.vx *= friction;
                    p.vy *= friction;
                    p.x += p.vx;
                    p.y += p.vy;

                    p.tiltAngle += p.tiltAngleIncremental;
                    p.tilt = Math.sin(p.tiltAngle) * 12;

                    if (p.y <= canvas.height + 20) {
                        active = true;
                        ctx.beginPath();
                        ctx.lineWidth = p.r;
                        ctx.strokeStyle = p.color;
                        ctx.moveTo(p.x + p.tilt + p.r / 2, p.y);
                        ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 2);
                        ctx.stroke();
                    }
                });

                if (active) {
                    animationFrameId = requestAnimationFrame(draw);
                }
            }

            draw();

            return () => {
                cancelAnimationFrame(animationFrameId);
            };
        }, []);

        return (
            <canvas 
                ref={canvasRef} 
                style={{ 
                    position: 'absolute', 
                    top: 0, 
                    left: 0, 
                    width: '100%', 
                    height: '100%', 
                    pointerEvents: 'none',
                    zIndex: 5
                }} 
            />
        );
    };

    const renderSuccess = () => (
        <div style={{ textAlign: 'center', padding: '2.5rem 1rem', position: 'relative' }}>
            <ConfettiCanvas />
            <div style={{ position: 'relative', display: 'inline-block', marginBottom: '1.5rem' }}>
                <div style={{
                    width: 88, height: 88, borderRadius: '50%', background: 'linear-gradient(135deg, #10b981, #059669)',
                    color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '2.5rem', margin: '0 auto',
                    boxShadow: '0 0 0 12px #f0fdf4, 0 8px 24px rgba(16,185,129,0.3)'
                }}>✓</div>
            </div>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.5rem' }}>Application Sent! 🎉</h3>
            <p style={{ color: '#64748b', fontSize: '0.95rem', margin: '0 0 1.25rem', lineHeight: 1.5 }}>
                Your application for <strong>{jobTitle}</strong> at <strong>{companyName}</strong> has been submitted successfully.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                {['Application sent', 'Profile shared', 'Recruiter notified'].map(item => (
                    <span key={item} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.78rem', fontWeight: 600, color: '#10b981', background: '#f0fdf4', padding: '0.35rem 0.75rem', borderRadius: 100, border: '1px solid #bbf7d0' }}>
                        <Ico.Check /> {item}
                    </span>
                ))}
            </div>
        </div>
    );

    // ─── Current step content ──────────────────────────────────────────────────
    const renderContent = () => {
        if (success) return renderSuccess();
        const isLastStep = step === totalSteps - 1;
        if (applyType === 'quick') {
            if (step === 0) return renderStepProfile();
            if (step === 1) return renderStepCoverLetter();
            if (isLastStep) return renderStepReview();
        } else {
            if (step === 0) return renderStepProfile();
            if (step === 1) return renderStepScreening();
            if (step === 2) return renderStepCoverLetter();
            if (isLastStep) return renderStepReview();
        }
        return null;
    };

    const isLastStep = step === totalSteps - 1;
    const blockAdvance = !canAdvance();

    const activeVariants = reduceMotion ? {
        enter: { opacity: 0 },
        center: { opacity: 1 },
        exit: { opacity: 0 }
    } : {
        enter: (dir: number) => ({
            x: dir > 0 ? 120 : dir < 0 ? -120 : 0,
            opacity: 0
        }),
        center: {
            x: 0,
            opacity: 1
        },
        exit: (dir: number) => ({
            x: dir < 0 ? 120 : dir > 0 ? -120 : 0,
            opacity: 0
        })
    };

    const activeTransition = reduceMotion ? { duration: 0.15 } : {
        x: { type: 'spring', stiffness: 300, damping: 30 },
        opacity: { duration: 0.2 }
    };

    const modalWrapperStyle = isMobile ? {
        background: 'white',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
        width: '100%',
        maxWidth: '100%',
        boxShadow: '0 -8px 32px rgba(15, 23, 42, 0.15)',
        overflow: 'hidden',
        position: 'relative' as const,
        display: 'flex',
        flexDirection: 'column' as const,
        maxHeight: '92vh',
        boxSizing: 'border-box' as const,
    } : {
        background: 'white',
        borderRadius: 20,
        width: '100%',
        maxWidth: 560,
        boxShadow: '0 2px 4px rgba(0,0,0,0.08), 0 16px 48px rgba(0,0,0,0.14)',
        overflow: 'hidden',
        position: 'relative' as const,
        display: 'flex',
        flexDirection: 'column' as const,
        maxHeight: '92vh',
        boxSizing: 'border-box' as const,
    };

    return (
        <div
            style={{
                position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                background: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(10px)',
                display: 'flex',
                alignItems: isMobile ? 'flex-end' : 'center',
                justifyContent: 'center',
                zIndex: 1000,
                padding: isMobile ? 0 : '1rem',
                boxSizing: 'border-box'
            }}
            onClick={e => { if (e.target === e.currentTarget && !loading) onClose(); }}
        >
            <style>{`
                .tm-input {
                    transition: border-color 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease;
                }
                .tm-input::placeholder { color: #9ca3af; }
                .tm-input:hover {
                    border-color: #9ca3af !important;
                }
                .tm-input:focus {
                    background-color: #ffffff !important;
                    border-color: #2563eb !important;
                    box-shadow: 0 0 0 3px rgba(37,99,235,0.12) !important;
                }
                .tm-select {
                    transition: border-color 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease;
                }
                .tm-select:hover {
                    border-color: #9ca3af !important;
                }
                .tm-select:focus {
                    background-color: #ffffff !important;
                    border-color: #2563eb !important;
                    box-shadow: 0 0 0 3px rgba(37,99,235,0.12) !important;
                }
                .tm-textarea {
                    transition: border-color 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease;
                }
                .tm-textarea::placeholder { color: #9ca3af; }
                .tm-textarea:hover {
                    border-color: #9ca3af !important;
                }
                .tm-textarea:focus {
                    background-color: #ffffff !important;
                    border-color: #2563eb !important;
                    box-shadow: 0 0 0 3px rgba(37,99,235,0.12) !important;
                }
                .shimmer-bg {
                    background: linear-gradient(
                        90deg,
                        rgba(255, 255, 255, 0) 0%,
                        rgba(255, 255, 255, 0.4) 50%,
                        rgba(255, 255, 255, 0) 100%
                    );
                    background-size: 200% 100%;
                    animation: shimmer-anim 2s infinite linear;
                }
                @keyframes shimmer-anim {
                    0% { background-position: -200% center; }
                    100% { background-position: 200% center; }
                }
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
            <motion.div
                ref={modalRef}
                tabIndex={-1}
                layout="size"
                transition={reduceMotion ? { duration: 0.01 } : { type: 'spring', stiffness: 300, damping: 30 }}
                style={modalWrapperStyle}
                onClick={e => e.stopPropagation()}
            >
                {/* ── Drag grabber for mobile bottom sheet ── */}
                {isMobile && (
                    <div style={{ display: 'flex', justifyContent: 'center', width: '100%', padding: '8px 0 4px', flexShrink: 0 }}>
                        <div style={{ width: 36, height: 4, borderRadius: 2, background: '#cbd5e1' }} />
                    </div>
                )}

                {/* ── Header ── */}
                <div style={{
                    padding: isMobile ? '1rem 1.5rem 0.75rem' : '1.5rem 2rem 1rem',
                    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                    position: 'relative', flexShrink: 0
                }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                        <div>
                            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
                                Applying for
                            </div>
                            <h2 style={{ fontSize: isMobile ? '1.2rem' : '1.35rem', fontWeight: 800, color: 'white', margin: '0 0 0.2rem', letterSpacing: '-0.02em' }}>{jobTitle}</h2>
                            <p style={{ fontSize: '0.9rem', color: '#94a3b8', margin: 0 }}>{companyName}</p>
                        </div>
                        {!loading && !success && (
                            <motion.button 
                                whileHover={{ scale: 1.08 }}
                                whileTap={{ scale: 0.92 }}
                                onClick={onClose}
                                aria-label="Close application modal"
                                style={{ 
                                    background: 'rgba(255,255,255,0.1)', 
                                    border: 'none', 
                                    cursor: 'pointer', 
                                    width: 48,
                                    height: 48,
                                    color: '#94a3b8', 
                                    borderRadius: 12, 
                                    display: 'flex', 
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'background 0.2s, color 0.2s',
                                    boxSizing: 'border-box'
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.2)'; e.currentTarget.style.color = 'white'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#94a3b8'; }}>
                                <Ico.X />
                            </motion.button>
                        )}
                    </div>
                </div>

                {/* ── Step bar ── */}
                {!success && (
                    <div style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9', paddingTop: '1rem', flexShrink: 0 }}>
                        <StepBar step={step} total={totalSteps} labels={steps} isMobile={isMobile} />
                    </div>
                )}

                {/* ── Body ── */}
                <div style={{ padding: isMobile ? '1.25rem 1.5rem' : '1.25rem 1.75rem', overflowY: 'auto', flex: 1 }}>
                    <AnimatePresence mode="wait" initial={false}>
                        <motion.div
                            key={step + '-' + applyType}
                            custom={direction}
                            variants={activeVariants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={activeTransition}
                        >
                            {renderContent()}
                        </motion.div>
                    </AnimatePresence>
                    {error && (
                        <div role="alert" style={{ marginTop: '1rem', background: '#fef2f2', border: '1px solid #fecaca', borderLeft: '3px solid #ef4444', borderRadius: 10, padding: '0.7rem 1rem', color: '#dc2626', fontSize: '0.82rem', fontWeight: 600 }}>
                            ⚠ {error}
                        </div>
                    )}
                </div>

                {/* ── Footer nav ── */}
                {!success && (
                    <div style={{ padding: '1rem 2rem 1.5rem', background: 'white', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                        <motion.button
                            type="button"
                            whileHover={{ scale: step === 0 || loading ? 1 : 1.02 }}
                            whileTap={{ scale: step === 0 || loading ? 1 : 0.98 }}
                            onClick={() => { setDirection(-1); setStep(s => s - 1); }}
                            disabled={step === 0 || loading}
                            style={{
                                padding: '0.65rem 1rem', border: 'none', borderRadius: 10,
                                background: 'transparent', color: step === 0 ? '#d1d5db' : '#6b7280',
                                fontWeight: 600, fontSize: '0.88rem', cursor: step === 0 ? 'default' : 'pointer',
                                transition: 'all 0.2s', fontFamily: 'inherit',
                                minHeight: 48, boxSizing: 'border-box'
                            }}
                        >
                            ← Back
                        </motion.button>
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 500 }}>
                            Step {step + 1} of {totalSteps}
                        </span>
                        {isLastStep ? (
                            <motion.button
                                type="button"
                                whileHover={{ scale: loading ? 1 : 1.03 }}
                                whileTap={{ scale: loading ? 1 : 0.97 }}
                                onClick={handleSubmit}
                                disabled={loading}
                                style={{
                                    padding: '0.65rem 1.8rem', border: 'none', borderRadius: 10,
                                    background: loading ? '#94a3b8' : 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                                    color: 'white', fontWeight: 700, fontSize: '0.95rem',
                                    cursor: loading ? 'default' : 'pointer',
                                    boxShadow: loading ? 'none' : '0 4px 14px rgba(37,99,235,0.35)',
                                    transition: 'all 0.25s', fontFamily: 'inherit',
                                    display: 'flex', alignItems: 'center', gap: 8,
                                    minHeight: 48, boxSizing: 'border-box'
                                }}
                            >
                                {loading ? (
                                    <>
                                        <span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
                                        Submitting…
                                    </>
                                ) : (
                                    <AnimatePresence mode="wait">
                                        <motion.span
                                            key="submit-text"
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            transition={activeTransition}
                                        >
                                            🚀 Submit Application
                                        </motion.span>
                                    </AnimatePresence>
                                )}
                            </motion.button>
                        ) : (
                            <motion.button
                                type="button"
                                whileHover={{ scale: blockAdvance || loading ? 1 : 1.03 }}
                                whileTap={{ scale: blockAdvance || loading ? 1 : 0.97 }}
                                onClick={() => { setError(null); setDirection(1); setStep(s => s + 1); }}
                                disabled={blockAdvance || loading}
                                style={{
                                    padding: '0.65rem 1.8rem', border: 'none', borderRadius: 10,
                                    background: blockAdvance ? '#e2e8f0' : '#2563eb',
                                    color: blockAdvance ? '#9ca3af' : 'white',
                                    fontWeight: 700, fontSize: '0.88rem',
                                    cursor: blockAdvance ? 'not-allowed' : 'pointer',
                                    boxShadow: blockAdvance ? 'none' : '0 4px 12px rgba(37,99,235,0.25)',
                                    transition: 'all 0.2s', fontFamily: 'inherit',
                                    minHeight: 48, boxSizing: 'border-box'
                                }}
                            >
                                <AnimatePresence mode="wait">
                                    <motion.span
                                        key="continue-text"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={activeTransition}
                                    >
                                        Continue →
                                    </motion.span>
                                </AnimatePresence>
                            </motion.button>
                        )}
                    </div>
                )}
            </motion.div>
        </div>
    );
}
