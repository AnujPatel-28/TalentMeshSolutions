import React, { useState, useRef, useEffect } from 'react';
import styles from '../../../../shared-dashboard.module.css';
import SectionStatus from './SectionStatus';

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

const DOMAIN_SKILLS: Record<string, string[]> = {
  'Engineering & Technology': [
    // Frontend
    'JavaScript', 'TypeScript', 'React', 'Next.js', 'Vue.js', 'Angular', 'Svelte', 'SolidJS',
    'HTML5', 'CSS3', 'Tailwind CSS', 'Bootstrap', 'Sass', 'Webpack', 'Vite', 'Redux', 'Zustand', 'React Query',
    // Backend
    'Node.js', 'Express.js', 'NestJS', 'Python', 'Django', 'Flask', 'FastAPI', 'Java', 'Spring Boot',
    'C#', '.NET Core', 'Go (Golang)', 'Rust', 'PHP', 'Laravel', 'Ruby on Rails', 'Elixir',
    // Databases & Caching
    'SQL', 'PostgreSQL', 'MySQL', 'Microsoft SQL Server', 'Oracle DB', 'MongoDB', 'Redis', 'Cassandra',
    'DynamoDB', 'Elasticsearch', 'Firebase', 'Prisma ORM', 'Sequelize',
    // Mobile Development
    'React Native', 'Flutter', 'Swift', 'SwiftUI', 'Kotlin', 'Jetpack Compose', 'Objective-C', 'Android SDK',
    // DevOps & Cloud
    'Amazon Web Services (AWS)', 'Microsoft Azure', 'Google Cloud Platform (GCP)', 'Docker', 'Kubernetes',
    'Terraform', 'Ansible', 'CI/CD Pipelines', 'Jenkins', 'GitHub Actions', 'GitLab CI', 'Linux Systems', 'Bash Scripting', 'Nginx',
    // Architecture & APIs
    'RESTful APIs', 'GraphQL', 'gRPC', 'WebSockets', 'Microservices Architecture', 'Serverless computing', 'System Design',
    // Testing
    'Jest', 'Cypress', 'Selenium', 'Playwright', 'JUnit',
    // Cybersecurity
    'Penetration Testing', 'OWASP Top 10', 'Cryptography', 'IAM (Identity & Access Management)', 'Network Security', 'SIEM',
    // Systems & Embedded
    'C', 'C++', 'Assembly', 'RTOS', 'Firmware Development', 'Microcontrollers', 'VHDL / Verilog',
    // Version Control & Project Tools
    'Git', 'GitHub', 'GitLab', 'Bitbucket', 'Jira', 'Confluence', 'Agile Methodologies', 'Scrum Framework',
    // Blockchain & Web3
    'Blockchain Technology', 'Solidity', 'Smart Contracts', 'Web3.js'
  ],
  'Data Science & Artificial Intelligence': [
    // Programming Languages
    'Python', 'R Programming', 'SQL', 'Julia', 'MATLAB', 'SAS',
    // Scientific Libraries
    'NumPy', 'Pandas', 'SciPy', 'Scikit-learn', 'Statsmodels',
    // Machine Learning & Deep Learning
    'Machine Learning', 'Deep Learning', 'Neural Networks', 'Supervised Learning', 'Unsupervised Learning', 'Reinforcement Learning',
    'TensorFlow', 'PyTorch', 'Keras', 'JAX', 'Hugging Face', 'XGBoost', 'LightGBM',
    // NLP
    'Natural Language Processing (NLP)', 'BERT', 'GPT models', 'NLTK', 'spaCy', 'Sentiment Analysis', 'Text Mining',
    // Computer Vision
    'Computer Vision', 'OpenCV', 'Object Detection', 'Image Segmentation', 'YOLO', 'Generative AI', 'Stable Diffusion',
    // LLMs & GenAI
    'Large Language Models (LLMs)', 'Prompt Engineering', 'RAG (Retrieval-Augmented Generation)', 'Vector Databases (Pinecone/Milvus)',
    // Data Engineering
    'Data Engineering', 'ETL Pipelines', 'Apache Spark', 'PySpark', 'Apache Hadoop', 'Apache Kafka', 'Apache Airflow', 'dbt (data build tool)',
    // Data Warehousing
    'Snowflake', 'Google BigQuery', 'Amazon Redshift', 'Data Lakehouse',
    // Data Visualization & BI
    'Tableau', 'Power BI', 'Matplotlib', 'Seaborn', 'Plotly', 'Looker', 'Advanced Excel', 'Quantitative Analysis',
    // MLOps
    'MLOps', 'MLflow', 'Kubeflow', 'DVC (Data Version Control)', 'Model Deployment', 'A/B Testing'
  ],
  'Product & Design': [
    // UI/UX Design Tools
    'Figma', 'Adobe XD', 'Sketch', 'InVision', 'Axure RP', 'Framer', 'Marvel App',
    // Graphic & Visual Arts
    'Adobe Photoshop', 'Adobe Illustrator', 'Adobe InDesign', 'Adobe Premiere Pro', 'Adobe After Effects', 'Canva', 'Motion Graphics', 'Typography', 'Color Theory',
    // UX Research & Strategy
    'User Research', 'User Interviews', 'Usability Testing', 'User Personas', 'User Journey Mapping', 'Information Architecture', 'Wireframing', 'Rapid Prototyping', 'Interaction Design', 'Heuristic Evaluation',
    // Product Management
    'Product Strategy', 'Product Roadmap Development', 'Product Lifecycle Management (PLM)', 'Competitive Analysis', 'Market Analysis', 'Feature Prioritization', 'PRDs (Product Requirement Documents)', 'Product Analytics', 'Amplitude', 'Mixpanel',
    // Process & Tools
    'Agile Product Management', 'Scrum Framework', 'Kanban', 'Jira Software', 'Confluence', 'Trello', 'Asana', 'Monday.com', 'Design Thinking'
  ],
  'Marketing, Sales & Business Development': [
    // Digital Marketing & SEO
    'SEO (Search Engine Optimization)', 'SEM (Search Engine Marketing)', 'Google Analytics 4 (GA4)', 'Google Search Console', 'Google Tag Manager', 'Hotjar',
    // Paid Advertising
    'Google Ads', 'Meta Ads Manager', 'LinkedIn Ads', 'Twitter Ads', 'Programmatic Advertising',
    // Content & Social
    'Content Marketing', 'Content Strategy', 'Copywriting', 'Blogging', 'Social Media Marketing', 'Social Media Management', 'Hootsuite', 'Buffer',
    // Email & Inbound
    'Email Marketing', 'Mailchimp', 'ActiveCampaign', 'HubSpot Marketing Hub', 'Inbound Marketing', 'Conversion Rate Optimization (CRO)', 'A/B Testing (Marketing)',
    // Performance & Analytics
    'Growth Marketing', 'Customer Acquisition Cost (CAC) Optimization', 'LTV (Lifetime Value) Marketing',
    // B2B Sales & BD
    'Lead Generation', 'Cold Calling', 'Cold Email Outreach', 'B2B Sales', 'Enterprise Sales', 'Account-Based Marketing (ABM)', 'Sales Pitching', 'Negotiation', 'Closing Deals',
    // CRM & Sales Tools
    'Salesforce CRM', 'HubSpot Sales Hub', 'Pipedrive CRM', 'Sales Pipeline Management', 'Key Account Management',
    // Branding & PR
    'Brand Management', 'Public Relations (PR)', 'Media Relations', 'Event Management', 'Influencer Marketing', 'Crisis Communication'
  ],
  'Customer Success & Operations': [
    // Customer Support & Success
    'Customer Success Management (CSM)', 'Customer Onboarding', 'Zendesk', 'Intercom', 'Salesforce Service Cloud', 'Freshdesk', 'Customer Support Operations', 'NPS (Net Promoter Score) Improvement', 'CSAT Optimization', 'Escalation Management', 'Help Desk Support', 'Live Chat Support',
    // HR & Talent
    'Human Resources (HR)', 'Technical Recruiting', 'Candidate Sourcing', 'Talent Acquisition', 'Candidate Experience', 'Applicant Tracking Systems (ATS)', 'Greenhouse ATS', 'Lever ATS', 'Employee Onboarding', 'Performance Management', 'Employee Relations', 'Labor Compliance',
    // Finance & Accounting
    'Financial Analysis', 'Financial Modeling', 'Bookkeeping', 'Accounting Principles', 'QuickBooks', 'Xero', 'Accounts Payable', 'Accounts Receivable', 'Tax Compliance', 'Auditing', 'Budgeting & Forecasting', 'Corporate Finance',
    // Operations
    'Operations Management', 'Process Optimization', 'Lean Six Sigma', 'Supply Chain Management', 'Logistics Operations', 'Project Coordination', 'Vendor Management', 'Executive Assistant Support', 'Office Administration', 'Facilities Management'
  ],
  'Healthcare & Life Sciences': [
    // Clinical & Practice
    'Patient Care', 'Clinical Diagnostics', 'General Medicine', 'Surgery Assistance', 'Nursing Care', 'EHR/EMR Systems', 'Patient Assessment', 'CPR & First Aid', 'Telehealth Systems', 'Medical Terminology',
    // Pharmaceuticals
    'Pharmacology', 'Drug Development', 'Pharmacovigilance', 'Regulatory Affairs (Pharma)', 'Medical Information Services', 'Clinical Trials Management', 'Good Clinical Practice (GCP)',
    // Biotech & Lab
    'Biotechnology', 'Bioinformatics', 'Genomics', 'PCR Techniques', 'Cell Culture', 'Lab Safety Protocols', 'Microbiology', 'Immunology',
    // Administration & Coding
    'Medical Coding (ICD-10/CPT)', 'Medical Device Engineering', 'Biomedical Engineering', 'Healthcare Administration', 'Patient Scheduling', 'HIPAA Compliance', 'Quality Assurance in Healthcare'
  ],
  'Other Professional Services': [
    // Consulting & Business Analysis
    'Management Consulting', 'Business Analysis', 'Requirements Gathering', 'Change Management', 'Strategy Consulting', 'SWOT Analysis', 'Executive Coaching', 'Workshop Facilitation',
    // Traditional Engineering
    'Civil Engineering', 'Structural Design', 'AutoCAD', 'Autodesk Revit', 'SolidWorks', 'Mechanical Engineering', 'Thermodynamics', 'Electrical Engineering', 'Circuit Design', 'MATLAB (Engineering)', 'LabVIEW', 'Construction Project Management', 'GIS (Geographic Information Systems)',
    // Writing & Creative
    'Technical Writing', 'Creative Writing', 'Translation Services', 'Proofreading & Editing', 'Audio Transcription', 'Professional Photography', 'Videography', 'Video Editing', 'Sound Design', 'Voice Acting', 'Content Creation',
    // Supply Chain & Logistics
    'Inventory Control', 'Procurement & Purchasing', 'Logistics Planning', 'Warehouse Operations', 'Import/Export Compliance'
  ]
};

const ALL_POPULAR_SKILLS = [
  'JavaScript', 'TypeScript', 'React', 'Next.js', 'Node.js', 'Python', 'Java', 'SQL',
  'AWS', 'Docker', 'Git', 'Figma', 'UI/UX Design', 'Product Management', 'Project Management',
  'Business Development', 'Sales Strategy', 'Customer Support', 'Communication Skills', 'Problem Solving',
  'Machine Learning', 'Data Analysis', 'SEO', 'Content Strategy', 'Financial Modeling', 'Recruiting'
];

const CATEGORY_TABS = [
  { id: 'All', label: 'Recommended' },
  { id: 'Engineering & Technology', label: 'Tech' },
  { id: 'Data Science & Artificial Intelligence', label: 'Data & AI' },
  { id: 'Product & Design', label: 'Product & Design' },
  { id: 'Marketing, Sales & Business Development', label: 'Marketing & Sales' },
  { id: 'Customer Success & Operations', label: 'Operations & CS' },
  { id: 'Healthcare & Life Sciences', label: 'Healthcare' },
  { id: 'Other Professional Services', label: 'Other' }
];

const CATEGORY_META: Record<string, { label: string; icon: string; bg: string; border: string; text: string; badgeBg: string; badgeBorder: string }> = {
  'Engineering & Technology': {
    label: 'Engineering & Tech',
    icon: '💻',
    bg: '#eff6ff',
    border: '#bfdbfe',
    text: '#1e40af',
    badgeBg: '#ffffff',
    badgeBorder: '#dbeafe'
  },
  'Data Science & Artificial Intelligence': {
    label: 'Data & AI',
    icon: '📊',
    bg: '#ecfdf5',
    border: '#a7f3d0',
    text: '#065f46',
    badgeBg: '#ffffff',
    badgeBorder: '#d1fae5'
  },
  'Product & Design': {
    label: 'Product & Design',
    icon: '🎨',
    bg: '#faf5ff',
    border: '#e9d5ff',
    text: '#6b21a8',
    badgeBg: '#ffffff',
    badgeBorder: '#f3e8ff'
  },
  'Marketing, Sales & Business Development': {
    label: 'Marketing & Sales',
    icon: '📈',
    bg: '#fff7ed',
    border: '#fed7aa',
    text: '#9a3412',
    badgeBg: '#ffffff',
    badgeBorder: '#ffedd5'
  },
  'Customer Success & Operations': {
    label: 'Operations & CS',
    icon: '⚙️',
    bg: '#f0fdfa',
    border: '#99f6e4',
    text: '#0f766e',
    badgeBg: '#ffffff',
    badgeBorder: '#ccfbf1'
  },
  'Healthcare & Life Sciences': {
    label: 'Healthcare',
    icon: '🩺',
    bg: '#fdf2f8',
    border: '#fbcfe8',
    text: '#9d174d',
    badgeBg: '#ffffff',
    badgeBorder: '#fce7f3'
  },
  'Other Professional Services': {
    label: 'Professional Services',
    icon: '💼',
    bg: '#f8fafc',
    border: '#e2e8f0',
    text: '#334155',
    badgeBg: '#ffffff',
    badgeBorder: '#f1f5f9'
  },
  'General & Others': {
    label: 'Other Skills',
    icon: '⚡',
    bg: '#f8fafc',
    border: '#cbd5e1',
    text: '#475569',
    badgeBg: '#ffffff',
    badgeBorder: '#cbd5e1'
  }
};

interface SkillsSectionProps {
  skills?: string[] | null;
  isEditing: boolean;
  onUpdate: (skills: string[]) => void;
  headline?: string;
}

export default React.memo(function SkillsSection({
  skills = [],
  isEditing,
  onUpdate,
  headline = ''
}: SkillsSectionProps) {
  
  const skillList = skills || [];
  const isComplete = skillList.length >= 5;
  const tier = skillList.length <= 2 ? 'warning' : skillList.length >= 5 ? 'strong' : 'neutral';

  const [skillInput, setSkillInput] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const categorizedSkills = React.useMemo(() => {
    const groups: Record<string, string[]> = {};
    skillList.forEach(skill => {
      let foundCategory = 'General & Others';
      for (const [catName, list] of Object.entries(DOMAIN_SKILLS)) {
        if (list.some(s => s.toLowerCase() === skill.toLowerCase())) {
          foundCategory = catName;
          break;
        }
      }
      if (!groups[foundCategory]) {
        groups[foundCategory] = [];
      }
      groups[foundCategory].push(skill);
    });
    return groups;
  }, [skillList]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Determine domain list based on candidate headline
  const detectedDomain = React.useMemo(() => {
    if (!headline) return '';
    const match = DETAILED_ROLES.find(d => d.roles.includes(headline));
    return match ? match.category : '';
  }, [headline]);

  const availableSkills = React.useMemo(() => {
    if (detectedDomain && DOMAIN_SKILLS[detectedDomain]) {
      return DOMAIN_SKILLS[detectedDomain];
    }
    return ALL_POPULAR_SKILLS;
  }, [detectedDomain]);

  const filteredSkillsForActiveCategory = React.useMemo(() => {
    let baseSkills: string[] = [];
    if (activeCategory === 'All') {
      baseSkills = availableSkills;
    } else {
      baseSkills = DOMAIN_SKILLS[activeCategory] || [];
    }

    const normalizedQuery = skillInput.toLowerCase().trim();
    if (!normalizedQuery) return baseSkills;
    return baseSkills.filter(s => s.toLowerCase().includes(normalizedQuery));
  }, [activeCategory, availableSkills, skillInput]);

  const addSkill = (name: string) => {
    const clean = name.trim();
    if (clean && !skillList.includes(clean) && skillList.length < 15) {
      onUpdate([...skillList, clean]);
    }
    setSkillInput('');
    setIsDropdownOpen(false);
  };

  return (
    <div className={styles.profileSection} id="skills">
      <SectionStatus 
        title={isEditing ? `Skills (${skillList.length}/15)` : "Skills"} 
        icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary-blue)' }}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>} 
        count={isEditing ? undefined : skillList.length}
        isComplete={isComplete} 
        required={true}
      />

      {isEditing ? (
        <div className={styles.skillsTagEditor}>
          {skillList.map(skill => (
            <span key={skill} className={styles.skillBadge} data-tier={tier}>
              {skill}
              <button 
                type="button" 
                onClick={() => {
                  const updated = skillList.filter(s => s !== skill);
                  onUpdate(updated);
                }}
                className={styles.skillRemoveBtn}
                aria-label={`Remove ${skill}`}
              >×</button>
            </span>
          ))}
          
          <div ref={dropdownRef} className="relative w-full mt-2">
            <div className={styles.skillInputWrapper}>
              <div style={{ position: 'relative', width: '100%' }}>
                <input
                  className={`${styles.formInput} ${styles.skillInput}`}
                  style={{ paddingRight: '36px' }}
                  placeholder={skillList.length >= 15 ? "Skill limit reached" : "Search and add skills..."}
                  disabled={skillList.length >= 15}
                  value={skillInput}
                  onChange={(e) => {
                    setSkillInput(e.target.value);
                    setIsDropdownOpen(true);
                  }}
                  onFocus={() => {
                    setIsDropdownOpen(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (skillInput.trim()) {
                        addSkill(skillInput);
                      }
                    }
                  }}
                />
                <div 
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#94a3b8',
                    pointerEvents: 'none',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'transform 0.2s', transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
              </div>
              {skillList.length >= 15 && (
                <span className={styles.skillLimitText}>
                  You've added 15 skills — that's the maximum.
                </span>
              )}
            </div>

            {isDropdownOpen && skillList.length < 15 && (
              <div 
                className="absolute top-[calc(100%+4px)] left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 overflow-hidden"
                style={{
                  boxShadow: '0 20px 60px rgba(15, 23, 42, 0.15)',
                  borderRadius: '12px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff'
                }}
              >
                {/* Horizontal Category Pill Tabs */}
                <div 
                  style={{
                    display: 'flex',
                    gap: '6px',
                    overflowX: 'auto',
                    padding: '8px',
                    borderBottom: '1px solid #cbd5e1',
                    background: '#f8fafc',
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none'
                  }}
                  className="no-scrollbar"
                >
                  <style>{`
                    .no-scrollbar::-webkit-scrollbar {
                      display: none !important;
                    }
                  `}</style>
                  {CATEGORY_TABS.map(tab => {
                    const isActive = activeCategory === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveCategory(tab.id)}
                        style={{
                          flexShrink: 0,
                          padding: '4px 12px',
                          fontSize: '11px',
                          fontWeight: 600,
                          borderRadius: '100px',
                          border: 'none',
                          backgroundColor: isActive ? 'var(--primary-blue)' : '#e2e8f0',
                          color: isActive ? '#ffffff' : '#475569',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>

                {/* Filtered Skills List */}
                <div style={{ maxHeight: '180px', overflowY: 'auto', padding: '6px' }}>
                  {skillInput.trim() && !skillList.includes(skillInput.trim()) && (
                    <div
                      onClick={() => addSkill(skillInput)}
                      className="flex items-center justify-between p-2 hover:bg-blue-50 rounded-lg cursor-pointer text-xs text-blue-600 font-bold border border-dashed border-blue-200 transition-colors"
                      style={{ cursor: 'pointer', marginBottom: '4px' }}
                    >
                      <span>Add custom: &ldquo;{skillInput}&rdquo;</span>
                      <span>+</span>
                    </div>
                  )}
                  {filteredSkillsForActiveCategory.map(s => {
                    const isAlreadySelected = skillList.includes(s);
                    return (
                      <div
                        key={s}
                        onClick={() => addSkill(s)}
                        className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer text-xs hover:bg-slate-50 transition-colors ${isAlreadySelected ? 'bg-blue-50 text-blue-600 font-bold' : 'text-slate-700'}`}
                        style={{ cursor: 'pointer' }}
                      >
                        <span>{s}</span>
                        {isAlreadySelected && <span style={{ color: 'var(--primary-blue)', fontWeight: 'bold' }}>✓</span>}
                      </div>
                    );
                  })}
                  {filteredSkillsForActiveCategory.length === 0 && (
                    <div className="text-center py-4 text-xs text-slate-400">
                      No skills found. {skillInput.trim() ? 'Press Enter to add custom.' : ''}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Premium Categorized Showcase Grid */
        skillList.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
            {Object.entries(categorizedSkills).map(([catName, list]) => {
              const meta = CATEGORY_META[catName] || CATEGORY_META['General & Others'];
              return (
                <div 
                  key={catName} 
                  style={{ 
                    background: meta.bg, 
                    border: `1px solid ${meta.border}`, 
                    borderRadius: '12px', 
                    padding: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  }}
                  onMouseOver={e => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
                  }}
                  onMouseOut={e => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: `1px solid ${meta.border}`, paddingBottom: '6px' }}>
                    <span style={{ fontSize: '16px' }}>{meta.icon}</span>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: meta.text }}>{meta.label}</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {list.map(skill => (
                      <span 
                        key={skill} 
                        style={{ 
                          display: 'inline-flex',
                          alignItems: 'center',
                          background: meta.badgeBg,
                          color: meta.text,
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 600,
                          border: `1px solid ${meta.badgeBorder}`,
                          boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                        }}
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className={styles.emptySectionText}>
            No skills added yet. Click <strong>Edit Profile</strong> to add some skills.
          </p>
        )
      )}
    </div>
  );
});
