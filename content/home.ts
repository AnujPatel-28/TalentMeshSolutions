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
  phoneDisplay: '+91 98981 61106',
  phoneHref: 'tel:+919898161106',
  email: 'info@talentmeshsolutions.com',
} as const;

export const HERO = {
  eyebrow: 'Recruitment & Staffing · Ahmedabad, India',
  /** Word-by-word reveal; words flagged `accent` render in brand blue. */
  headline: [
    { text: 'Your' },
    { text: 'trusted' },
    { text: 'hiring' },
    { text: 'partner' },
    { text: 'for' },
    { text: 'a' },
    { text: 'high-performing', accent: true },
    { text: 'workforce.', accent: true },
  ] as { text: string; accent?: boolean }[],
  /** Same string, unsplit — used for the `og:title` and screen-reader label. */
  headlinePlain: 'Your trusted hiring partner for a high-performing workforce.',
  description:
    'TalentMesh Solutions is a professional, result-driven recruitment and staffing firm. With deep domain knowledge and a focus on quality, we deliver end-to-end manpower services tailored to the way your organisation actually hires.',
  primaryCta: { label: 'Hire Talent', href: '/portals/jobs/contact' },
  secondaryCta: { label: 'Post a Job', href: '/employers/post-job' },
} as const;

/** The only numeric claims permitted on this page. Source: LinkedIn overview. */
export const TRUST_CLAIMS = [
  { value: '48–72 hrs', label: 'Shortlists delivered' },
  { value: '93%+', label: 'Retention & offer-to-joining ratio' },
  { value: 'Dedicated', label: 'Talent pools built per client' },
] as const;

export type ServiceIcon =
  | 'briefcase'
  | 'crown'
  | 'timer'
  | 'workflow'
  | 'graduation'
  | 'globe'
  | 'users'
  | 'shield'
  | 'fileCheck'
  | 'compass';

export interface Service {
  title: string;
  description: string;
  icon: ServiceIcon;
  /** Renders as a double-width tile in the bento grid. */
  featured?: boolean;
}

export const SERVICES: Service[] = [
  {
    title: 'Permanent & Contractual Staffing',
    description:
      'Full-time hires and fixed-term contract roles sourced, screened and closed against your role specification — from individual replacements to entire teams.',
    icon: 'briefcase',
    featured: true,
  },
  {
    title: 'Executive & Leadership Hiring',
    description:
      'Confidential search for senior and leadership mandates, with mapped shortlists, structured evaluation and discreet candidate engagement throughout.',
    icon: 'crown',
    featured: true,
  },
  {
    title: 'Temporary & Flexi Staffing',
    description:
      'Short-term and seasonal manpower for peak load, project cycles and cover, without adding to permanent headcount.',
    icon: 'timer',
  },
  {
    title: 'Recruitment Process Outsourcing',
    description:
      'We run your hiring function end to end — sourcing, screening, coordination and reporting — as an extension of your internal team.',
    icon: 'workflow',
  },
  {
    title: 'Campus Hiring & Internship Drives',
    description:
      'Campus engagement, assessment days and internship pipelines that build an entry-level bench before you need it.',
    icon: 'graduation',
  },
  {
    title: 'Remote Hiring Solutions',
    description:
      'Distributed and work-from-home roles sourced beyond your immediate city, with remote-readiness factored into screening.',
    icon: 'globe',
  },
  {
    title: 'Bulk & Volume Hiring',
    description:
      'High-volume mandates run to a schedule — coordinated sourcing, batch assessment and joining tracking against agreed timelines.',
    icon: 'users',
  },
  {
    title: 'Background Verification & Reference Checks',
    description:
      'Employment, education and reference verification completed before joining, so surprises surface early rather than after onboarding.',
    icon: 'shield',
  },
  {
    title: 'Onboarding Assistance & Documentation Support',
    description:
      'Offer-to-joining follow-through: documentation, joining formalities and candidate engagement across the notice period.',
    icon: 'fileCheck',
  },
  {
    title: 'HR Consulting & Workforce Planning',
    description:
      'Role design, compensation benchmarking and headcount planning to align hiring with where the business is heading.',
    icon: 'compass',
  },
];

export interface Industry {
  name: string;
  /** Local file under `public/`. Omit for an icon-only tile. */
  image?: string;
  imageAlt?: string;
}

export const INDUSTRIES: Industry[] = [
  {
    name: 'Information Technology',
    image: '/images/tech-office.jpg',
    imageAlt: 'Technology team working in a modern office',
  },
  {
    name: 'Pharmaceuticals & Healthcare',
    image: '/healthcare_photo.png',
    imageAlt: 'Healthcare professionals at work',
  },
  {
    name: 'Engineering & Manufacturing',
    image: '/manufacturing_photo.png',
    imageAlt: 'Engineers on a manufacturing floor',
  },
  {
    name: 'Sales, Marketing & Retail',
    image: '/retail_photo.png',
    imageAlt: 'Retail team serving customers in store',
  },
  {
    name: 'Logistics & Supply Chain',
    image: '/logistics_photo.jpg',
    imageAlt: 'Logistics warehouse and distribution operations',
  },
  { name: 'Banking, Financial Services & Insurance' },
  {
    name: 'BPO, KPO & Call Centers',
    image: '/images/customer-support.jpg',
    imageAlt: 'Customer support agents at a contact centre',
  },
  {
    name: 'EdTech & Training Institutes',
    image: '/education_photo.jpg',
    imageAlt: 'Classroom training session in progress',
  },
  { name: 'Hospitality & Tourism' },
  { name: 'E-commerce & Startups' },
];

export interface ProcessStep {
  title: string;
  description: string;
}

export const PROCESS_STEPS: ProcessStep[] = [
  {
    title: 'Requirement Intake',
    description:
      'We map the role with your hiring manager — skills, band, reporting line, must-haves versus nice-to-haves — before a single profile is sourced.',
  },
  {
    title: 'Sourcing & Talent Mapping',
    description:
      'We work our dedicated talent pools and open market together, mapping the relevant candidate universe for the role rather than posting and waiting.',
  },
  {
    title: 'Screening & Assessment',
    description:
      'Every profile is spoken to before it reaches you: role fit, compensation expectation, notice period and genuine intent to move.',
  },
  {
    title: 'Shortlist & Interview Coordination',
    description:
      'You receive a shortlist, not a résumé dump. We schedule interviews, manage reschedules and keep candidates warm between rounds.',
  },
  {
    title: 'Offer, Verification & Onboarding',
    description:
      'Offer negotiation, background and reference checks, documentation support, and follow-through until the candidate actually joins.',
  },
];

export interface Pillar {
  title: string;
  description: string;
}

export const PILLARS: Pillar[] = [
  {
    title: 'Deep Domain Knowledge',
    description:
      'Consultants who understand the roles they hire for, so screening is a real technical conversation rather than keyword matching against a job description.',
  },
  {
    title: 'Quality Over Volume',
    description:
      'A short, defensible shortlist where every profile has been spoken to and qualified — we would rather send you four right ones than forty maybes.',
  },
  {
    title: 'Seamless Coordination',
    description:
      'One point of contact who owns scheduling, feedback loops and candidate communication, so your team spends its time interviewing rather than chasing.',
  },
  {
    title: 'End-to-End Ownership',
    description:
      'We stay accountable from requirement intake through verification and onboarding — the mandate is closed when the candidate joins, not when the offer goes out.',
  },
];

export interface FaqItem {
  question: string;
  answer: string;
}

export const FAQS: FaqItem[] = [
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

export const CONTACT_BAND = {
  heading: 'Let’s build your team.',
  description:
    'Tell us the role, the band and the timeline. We will come back with a realistic plan for filling it — and a shortlist, not a résumé dump.',
  cta: { label: 'Talk to our team', href: '/portals/jobs/contact' },
} as const;
