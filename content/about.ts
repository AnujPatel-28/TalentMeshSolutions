/**
 * Copy for the `/about` page (Talentmesh Solutions corporate site).
 *
 * Rules (from docs/specs/companyContext.md + content/home.ts):
 * 1. Vision-led, not history-led. Do not add founding date, headcount,
 *    revenue, client counts, placements, awards or testimonials.
 * 2. Brand = "Talentmesh Solutions". Legal = "Talentmesh Solution Pvt. Ltd."
 *    (hero/footer use brand; legal line uses legal name).
 * 3. Every claim must trace to companyContext: sourcing, pre-screening
 *    (qualifications / experience / skills / role-fit), interview
 *    coordination, onboarding & documentation support, HR consulting.
 */

/**
 * Image slots. Each is a single path so a replacement photo is a one-line
 * swap; keep the stated crop so nothing else has to change.
 *
 *  - ABOUT_WHO_IMAGE: portrait, 4:5 (final asset 1600×2000).
 *  - ABOUT_SERVICE_IMAGES: landscape, 4:3 (final assets 1600×1200), one per
 *    SERVICE_CATEGORIES title in content/home.ts.
 */
export const ABOUT_WHO_IMAGE = '/images/about/about-who-we-are.webp';

export const ABOUT_SERVICE_IMAGES = {
  'Talent Acquisition': '/images/about/talent-acquisition.webp',
  'Flexible Workforce': '/images/about/flexible-workforce.webp',
  'Workforce Support': '/images/about/workforce-support.webp',
} as const;

export const ABOUT_HERO = {
  eyebrow: 'Talent Meets Opportunity',
  // Headline in the home hero's treatment: grotesk, with the accent words in
  // the serif italic. Wraps via text-wrap: balance, no forced breaks.
  title: 'Hiring support that delivers',
  titleAccent: 'interview-ready talent',
  description:
    'A recruitment partner for people and businesses who aim higher.',
  primaryCta: { label: 'Get Hiring Support', href: '/contact' },
  secondaryCta: { label: 'Find Opportunities', href: '/job-seekers' },
  // Grounded mini-proof row — no counts, no client names, no awards.
  trust: [
    { icon: 'users', title: 'Skilled Talent', sub: 'Screened for role-fit' },
    { icon: 'building', title: 'Across Industries', sub: 'Ten sectors in India' },
    { icon: 'star', title: 'Human-First', sub: 'People before process' },
  ],
  stripLeft: 'People Power Progress',
  stripRight: 'Ahmedabad, India',
  imageSrc: '/images/about/about-hero-editorial1.png',
  imageAlt: 'Two Talentmesh consultants reviewing candidate profiles across a table at dusk',
} as const;

export const ABOUT_WHO = {
  eyebrow: 'Who we are',
  headingA: 'Hiring should feel coordinated,',
  headingAccent: 'not chaotic.',
  intro:
    'Talentmesh Solutions is an Ahmedabad-based recruitment and staffing solutions provider offering end-to-end talent acquisition, staffing, hiring coordination and workforce support across multiple industries.',
  body: 'Every organization can access skilled talent screened for skills, experience and role-fit. Coordinated interviews and onboarding support carry every hire through to their first day.',
  positioning:
    'We help organizations find skilled talent and build high-performing teams.',
  imageAlt: 'A recruitment consultant walking a hiring manager through candidate data on a laptop at a glass meeting table',
  // The same two proof points as the home page (components/home/TrustStrip.tsx).
  // They are the whole numeric budget: see the header of content/home.ts.
  proof: [
    {
      value: '48–72h',
      label: 'Shortlists',
      note: 'Screened shortlist in 48–72 hours for most mandates.',
    },
    {
      value: '100%',
      label: 'Vetted Talent',
      note: 'Candidates are pre-screened for qualifications, experience, skills and role-fit.',
    },
  ],
} as const;

export const ABOUT_PRINCIPLES = {
  eyebrow: 'What we stand for',
  headingA: 'More than a recruiter.',
  headingB: 'A workforce partner.',
  lede: 'Three working principles behind how we source, coordinate and support every hire.',
  points: [
    {
      title: 'Quality over volume',
      description:
        'Every shortlist is checked for role-fit first, your interviews go to candidates worth meeting.',
    },
    {
      title: 'Coordination over chaos',
      description:
        'End-to-end interview scheduling, communication and documentation support for both sides.',
    },
    {
      title: 'Partnership over placement',
      description:
        'Workforce planning, HR consulting, onboarding and post-joining support, not just sourcing.',
    },
  ],
} as const;

export const ABOUT_SERVICES = {
  headingA: 'What we',
  headingAccent: 'do',
  lede: 'End-to-end support across the recruitment lifecycle: sourcing, screening, coordination, verification and onboarding.',
  imageAlts: {
    'Talent Acquisition': 'An interviewer and a candidate shaking hands across a desk after an interview',
    'Flexible Workforce': 'A team of four working together around two laptops in an open-plan office',
    'Workforce Support': 'An HR professional guiding a new joiner through onboarding paperwork',
  } as Record<string, string>,
  // Service-list items (content/home.ts SERVICE_CATEGORIES) that have their
  // own solution page. Items not listed here render as plain text.
  links: {
    'Executive & Leadership Hiring': '/executive-search',
    'Temporary & Flexi Staffing': '/contingent-staffing',
    'Remote Hiring Solutions': '/remote-hiring-solutions',
    'Recruitment Process Outsourcing': '/recruitment-process-outsourcing',
  } as Record<string, string>,
} as const;

export const ABOUT_PROCESS = {
  headingA: 'How we',
  headingAccent: 'work',
  lede: 'A calm, end-to-end flow across the recruitment lifecycle.',
  steps: [
    {
      num: '01',
      title: 'Understand',
      desc: 'We start with your hiring requirements, role context and fit criteria.',
    },
    {
      num: '02',
      title: 'Source & screen',
      desc: 'Candidates are pre-screened for qualifications, experience, skills and role-fit.',
    },
    {
      num: '03',
      title: 'Coordinate',
      desc: 'We manage interview scheduling, panels, technical evaluation assist and salary insights.',
    },
    {
      num: '04',
      title: 'Support',
      desc: 'Pre-joining engagement, HR documentation, onboarding assistance and attrition insights.',
    },
  ],
} as const;

export const ABOUT_INDUSTRIES = {
  headingA: 'Industries we',
  headingAccent: 'support',
  lede: 'Recruitment and staffing support across ten industry groups in India.',
  industries: [
    { name: 'Information Technology', icon: 'monitor' },
    { name: 'Pharmaceuticals & Healthcare', icon: 'heartPulse' },
    { name: 'Engineering & Manufacturing', icon: 'factory' },
    { name: 'Sales, Marketing & Retail', icon: 'shoppingBag' },
    { name: 'Logistics & Supply Chain', icon: 'truck' },
    { name: 'BFSI', icon: 'landmark' },
    { name: 'BPO, KPO & Call Centers', icon: 'headphones' },
    { name: 'EdTech & Training', icon: 'graduationCap' },
    { name: 'Hospitality & Tourism', icon: 'hotel' },
    { name: 'E-commerce & Startups', icon: 'rocket' },
  ],
} as const;

export const ABOUT_CTA = {
  headingA: 'Let’s build your',
  headingAccent: 'high-performing workforce.',
  subtext:
    'Tell us what you’re hiring for. We’ll recommend the right recruitment and staffing solution.',
  buttonLabel: 'Start a Conversation',
  buttonHref: '/contact',
  baseTitle: 'Based in Ahmedabad, serving India',
  baseBody:
    'Headquartered in Navrangpura, Ahmedabad, recruiting for on-site, hybrid and remote roles across India.',
} as const;
