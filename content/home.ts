/**
 * Copy and data for the `/` landing page (TalentMesh Solutions corporate site).
 *
 * Sourced from the company business proposal and LinkedIn overview. Two rules
 * apply when editing this file:
 *
 *  1. India only. The LinkedIn overview lists other markets; they are not
 *     operational yet and must not appear on the site.
 *  2. The three claims in TRUST_CLAIMS are the complete numeric budget for this
 *     page. Do not add client counts, placement counts or years-in-business.
 */

export const CONTACT = {
  legalName: 'Talentmesh Solution Pvt. Ltd.',
  brandName: 'TalentMesh Solutions',
  addressLines: [
    '7-B, Amrut Bag Colony, Opp. Stadium,',
    'Nr. Hindu Colony, Navrangpura,',
    'Ahmedabad – 380009, Gujarat, India',
  ],
  streetAddress: '7-B, Amrut Bag Colony, Opp. Stadium, Nr. Hindu Colony, Navrangpura',
  locality: 'Ahmedabad',
  region: 'Gujarat',
  postalCode: '380009',
  phoneDisplay: '9898161106',
  phoneHref: 'tel:9898161106',
  email: 'info@talentmeshsolutions.com',
} as const;

export const HERO = {
  eyebrow: 'Recruitment & Staffing Solutions',
  /** Word-by-word reveal; words flagged `accent` render in brand blue. */
  headline: [
    { text: 'Connecting' },
    { text: 'Businesses' },
    { text: 'With' },
    { text: 'the' },
    { text: 'Right', accent: true },
    { text: 'Talent', accent: true },
  ] as { text: string; accent?: boolean }[],
  /** Same string, unsplit — used for the `og:title` and screen-reader label. */
  headlinePlain: 'Connecting Businesses With the Right Talent',
  description:
    'End-to-end recruitment and staffing solutions designed to help businesses hire skilled professionals, scale teams, and build high-performing workforces.',
  primaryCta: { label: 'Get Hiring Support', href: '/contact' },
  secondaryCta: { label: 'Talk to Our Team', href: '/contact' },
} as const;

export const POSITIONING = {
  sectionTitle: 'Why TalentMesh',
  badge: 'POSITIONING',
  columns: [
    {
      title: 'Find the Right Talent',
      description: 'Skilled candidates matched to your requirements.',
      icon: 'zap',
      rightHeading: 'Uncover Top Talent, Instantly.',
      rightIntro: 'Our recruiters screen every profile against your brief — skills, experience and cultural fit — so the shortlist you see is already worth interviewing.',
      rightImage: '/cop2.png',
      rightBackground: '/building bg.png'
    },
    {
      title: 'Scale With Flexibility',
      description: 'Permanent, contractual, temporary, bulk and remote hiring.',
      icon: 'trendingUp',
      rightHeading: 'Elastic Teams for Dynamic Growth.',
      rightIntro: 'Whether you need a single remote developer or a full bulk hiring drive, we provide permanent, temporary, and contractual staffing to match your exact momentum.',
      rightImage: '/personWithLaptop3.png',
      rightBackground: '/building bg.png'
    },
    {
      title: 'Simplify Recruitment',
      description: 'End-to-end RPO and seamless compliance.',
      icon: 'shieldCheck',
      rightHeading: 'Recruitment on Autopilot.',
      rightIntro: 'From sourcing and screening to onboarding and compliance, our RPO solutions handle the heavy lifting so you can focus on building your business.',
      rightImage: '/withClient.png',
      rightBackground: '/building bg.png'
    }
  ]
} as const;

export interface ServiceCategory {
  title: string;
  icon: string;
  items: string[];
}

export const SERVICE_CATEGORIES: ServiceCategory[] = [
  {
    title: 'Talent Acquisition',
    icon: 'userCheck',
    items: [
      'Permanent & Contractual Staffing',
      'Executive & Leadership Hiring',
      'Bulk & Volume Hiring',
      'Campus Hiring & Internship Drives',
    ],
  },
  {
    title: 'Flexible Workforce',
    icon: 'sliders',
    items: [
      'Temporary & Flexi Staffing',
      'Remote Hiring Solutions',
      'Recruitment Process Outsourcing',
    ],
  },
  {
    title: 'Workforce Support',
    icon: 'shieldCheck',
    items: [
      'Background Verification',
      'Reference Checks',
      'Onboarding Assistance',
      'Documentation Support',
      'HR Consulting & Workforce Planning',
    ],
  },
];

export const SERVICES = SERVICE_CATEGORIES.flatMap((cat) =>
  cat.items.map((item) => ({
    title: item,
    description: `${item} solutions provided by TalentMesh Solutions.`,
  }))
);

export interface TalentMeshServiceCard {
  title: string;
  description: string;
  image: string;
  actionPills: { label: string; href: string }[];
}

export const TALENTMESH_SERVICES: TalentMeshServiceCard[] = [
  {
    title: 'Flexible Workforce Solutions',
    description: 'Access pre-vetted skilled professionals on demand, and scale your team up or down as project requirements shift.',
    image: '/images/services/flexible_workforce_solutions1.png',
    actionPills: [
      { label: 'Contingent Staffing', href: '/contingent-staffing' },
      { label: 'Contract-to-Hire', href: '/contract-to-hire' },
    ],
  },
  {
    title: 'Scaled Hiring',
    description: 'Bring structure, speed, and consistency to high-volume recruitment programs and enterprise expansion initiatives.',
    image: '/images/services/scaled_hiring_rpo1.png',
    actionPills: [
      { label: 'Recruitment Process Outsourcing', href: '/recruitment-process-outsourcing' },
      { label: 'Managed Talent Solutions', href: '/managed-talent-solutions' },
    ],
  },
  {
    title: 'Technology & Platform',
    description: 'Hire smarter across borders with connected sourcing tools and dedicated offshore tech teams.',
    image: '/images/services/technology_platform1.png',
    actionPills: [
      { label: 'Remote Hiring Solutions', href: '/remote-hiring-solutions' },
      { label: 'Technology Talent Sourcing', href: '/technology-talent-sourcing' },
    ],
  },
  {
    title: 'Global Capability Centers (GCC)',
    description: 'End-to-end support to set up, build infrastructure, and scale Global Capability Centers aligned to business goals.',
    image: '/images/services/global_capability_centers1.png',
    actionPills: [
      { label: 'GCC Setup & Build', href: '/gcc-setup-and-build' },
      { label: 'Offshore Staffing', href: '/offshore-staffing' },
    ],
  },
  {
    title: 'Leadership & Strategic Hiring',
    description: 'Identify and place senior leaders and specialist directors who shape long-term business outcomes and market growth.',
    image: '/images/services/leadership_strategic_hiring1.png',
    actionPills: [
      { label: 'Executive Search', href: '/executive-search' },
      { label: 'Direct Hire Recruitment', href: '/direct-hire-recruitment' },
    ],
  },
  {
    title: 'Workforce Creation & Enablement',
    description: 'Build job-ready talent pipelines through structured skill training, designed for long-term impact and sustained delivery.',
    image: '/images/services/workforce_creation_enablement1.png',
    actionPills: [
      { label: 'Hire, Train & Deploy', href: '/hire-train-deploy' },
      { label: 'Skill Upskilling', href: '/skill-upskilling' },
    ],
  },
];



export const WHY_TALENTMESH = {
  heading: 'More Than Recruitment. A Hiring Partner.',
  points: [
    {
      title: 'Quality-Focused Hiring',
      description: "Focus on finding candidates aligned with the organization's requirements.",
      icon: 'target',
    },
    {
      title: 'Flexible Staffing Models',
      description: 'Permanent, contractual, temporary, remote and volume hiring options.',
      icon: 'layers',
    },
    {
      title: 'End-to-End Support',
      description: 'Support across recruitment coordination, verification and onboarding.',
      icon: 'lifeBuoy',
    },
    {
      title: 'Industry-Aware Recruitment',
      description: 'Recruitment support across technology, healthcare, manufacturing, BFSI and other sectors.',
      icon: 'briefcase',
    },
  ],
} as const;

export interface IndustryTag {
  name: string;
  /** Key into ICONS in components/home/IndustriesGrid.tsx. */
  icon: string;
  /** Accent for the icon and the label's hover glow. */
  color: string;
  /** Shown in the cursor-following card on hover. */
  image: string;
}

/**
 * Grouped into display rows (4 / 3 / 3) so the centered block reads as a
 * pyramid, matching the same section on /employers/sourcing.
 */
export const INDUSTRY_ROWS: IndustryTag[][] = [
  [
    { name: 'IT & Software', icon: 'monitor', color: '#3b82f6', image: '/images/tech-office.jpg' },
    { name: 'Healthcare', icon: 'heart', color: '#ef4444', image: '/healthcare_photo.png' },
    { name: 'Finance', icon: 'landmark', color: '#10b981', image: '/Finance management.png' },
    { name: 'Manufacturing', icon: 'factory', color: '#f59e0b', image: '/manufacturing_photo.png' },
  ],
  [
    { name: 'Retail', icon: 'shoppingBag', color: '#8b5cf6', image: '/retail_photo.png' },
    { name: 'Logistics', icon: 'truck', color: '#06b6d4', image: '/logistics_photo.jpg' },
    { name: 'Education', icon: 'graduationCap', color: '#ec4899', image: '/education_photo.jpg' },
  ],
  [
    { name: 'Marketing', icon: 'megaphone', color: '#f97316', image: '/Marketing and finance.png' },
    { name: 'Human Resources', icon: 'users', color: '#6366f1', image: '/Human research.png' },
    { name: 'Customer Support', icon: 'headphones', color: '#14b8a6', image: '/Customer services.png' },
  ],
];

export interface RedesignStep {
  step: string;
  title: string;
  description: string;
}

export const PROCESS_REDESIGN_STEPS: RedesignStep[] = [
  {
    step: '01',
    title: 'Understand',
    description: 'We understand your hiring requirements, roles and workforce needs.',
  },
  {
    step: '02',
    title: 'Source',
    description: 'We identify and source relevant candidates.',
  },
  {
    step: '03',
    title: 'Screen',
    description: 'Candidates are evaluated against the requirements.',
  },
  {
    step: '04',
    title: 'Coordinate',
    description: 'We support the recruitment process and coordination.',
  },
  {
    step: '05',
    title: 'Onboard',
    description: 'We assist with documentation and onboarding requirements.',
  },
];

export const FAQS = [
  {
    question: 'How quickly can you share a shortlist?',
    answer:
      'For most mandates we deliver a screened shortlist within 48 to 72 hours of requirement sign-off. Niche, senior and confidential searches take longer because the candidate universe is smaller and engagement is one-to-one — we will tell you the realistic timeline at intake rather than after.',
  },
  {
    question: 'Which industries do you recruit for?',
    answer:
      'Information Technology; Pharmaceuticals & Healthcare; Engineering & Manufacturing; Sales, Marketing & Retail; Logistics & Supply Chain; Banking, Financial Services & Insurance; BPO, KPO & Call Centers; EdTech & Training Institutes; Hospitality & Tourism; and E-commerce & Startups.',
  },
  {
    question: 'What engagement models do you offer?',
    answer:
      'Permanent placement, contractual and temporary or flexi staffing, Recruitment Process Outsourcing where we run your hiring function as an extension of your team, campus hiring and internship drives, and dedicated bulk or volume hiring programmes. We will recommend the model that fits the mandate instead of defaulting to one.',
  },
  {
    question: 'Where do you hire?',
    answer:
      'We are headquartered in Ahmedabad, Gujarat and recruit for roles across India, including remote and work-from-home positions sourced beyond your immediate city.',
  },
  {
    question: 'Is background verification included?',
    answer:
      'Yes. Background verification and reference checks are part of our service range, covering employment history, education and professional references. We also provide onboarding assistance and documentation support so the offer-to-joining stage does not stall.',
  },
];

export const STRONG_CTA = {
  heading: 'Looking for the Right Team to Grow Your Business?',
  subtext: 'Tell us what you\'re hiring for. Our team can help you find the right recruitment and staffing solution.',
  buttonLabel: 'Start a Conversation →',
  buttonHref: '/contact',
  // E.164 so the link dials correctly from outside India, and so this matches
  // the Organization schema in app/layout.tsx.
  phoneDisplay: '+91 98981 61106',
  phoneHref: 'tel:+919898161106',
  email: 'info@talentmeshsolutions.com',
  emailHref: 'mailto:info@talentmeshsolutions.com',
} as const;

