/**
 * Copy for the `/about` page (TalentMesh Solutions corporate site).
 *
 * Rules (from docs/specs/companyContext.md + content/home.ts):
 * 1. Vision-led, not history-led. Do not add founding date, headcount,
 *    revenue, client counts, placements, awards or testimonials.
 * 2. Brand = "TalentMesh Solutions". Legal = "Talentmesh Solution Pvt. Ltd."
 *    (hero/footer use brand; legal line uses legal name).
 * 3. Every claim must trace to companyContext: sourcing, pre-screening
 *    (qualifications / experience / skills / role-fit), interview
 *    coordination, onboarding & documentation support, HR consulting.
 */

export const ABOUT_HERO = {
  eyebrow: 'Talent Meets Opportunity',
  // Flowing mixed-weight headline: light / bold white / bold brand-gradient.
  // Wraps via text-wrap: balance — no forced breaks.
  titleLight: 'Hiring',
  titleWhite: 'support that delivers',
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
  imageAlt: 'Two TalentMesh consultants reviewing candidate profiles across a table at dusk',
} as const;

export const ABOUT_VISION = {
  kicker: 'Our vision',
  quoteA: 'Hiring should feel coordinated,',
  quoteAccent: 'not chaotic.',
  body: 'Every organization can access skilled talent screened for skills, experience and role-fit. Coordinated interviews and onboarding support carry every hire through to their first day.',
  positioning:
    'We help organizations find skilled talent and build high-performing teams.',
  // Flanking editorial cards, bespoke generated pair per phase. Quote pair
  // reads with the statement; trust pair crossfades in for the proof lines.
  sideImages: [
    {
      side: 'quote-left',
      src: '/images/about/vision-quote-left.png',
      alt: 'Consultant reviewing candidate profiles in a bright office',
    },
    {
      side: 'quote-right',
      src: '/images/about/vision-quote-right.png',
      alt: 'Consultant explaining a shortlist across a table',
    },
    {
      side: 'trust-left',
      src: '/images/about/vision-trust-left.png',
      alt: 'Consultant and client shaking hands over a hiring agreement',
    },
    {
      side: 'trust-right',
      src: '/images/about/vision-trust-right.png',
      alt: 'Hiring manager welcoming a new joiner on day one',
    },
  ],
} as const;

export const ABOUT_PRINCIPLES = {
  headingA: 'More than a recruiter.',
  headingB: 'A workforce partner.',
  lede: 'Three working principles behind how we source, coordinate and support every hire.',
  points: [
    {
      title: 'Quality over volume',
      description:
        'Every shortlist is checked for role-fit first, your interviews go to candidates worth meeting.',
      icon: 'target',
    },
    {
      title: 'Coordination over chaos',
      description:
        'End-to-end interview scheduling, communication and documentation support for both sides.',
      icon: 'lifeBuoy',
    },
    {
      title: 'Partnership over placement',
      description:
        'Workforce planning, HR consulting, onboarding and post-joining support, not just sourcing.',
      icon: 'layers',
    },
  ],
} as const;

export const ABOUT_PROCESS = {
  heading: 'How we work',
  lede: 'A calm, end-to-end flow across the recruitment lifecycle.',
  imageSrc: '/images/about/about-coordination.png',
  imageAlt: 'Small team coordinating interviews around a laptop',
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
  heading: 'Industries we support',
  lede: 'Recruitment and staffing support across ten industry groups in India.',
  industries: [
    'Information Technology',
    'Pharmaceuticals & Healthcare',
    'Engineering & Manufacturing',
    'Sales, Marketing & Retail',
    'Logistics & Supply Chain',
    'BFSI',
    'BPO, KPO & Call Centers',
    'EdTech & Training',
    'Hospitality & Tourism',
    'E-commerce & Startups',
  ],
  baseTitle: 'Based in Ahmedabad, serving India',
  baseBody:
    'Headquartered in Navrangpura, Ahmedabad — recruiting for on-site, hybrid and remote roles across India.',
} as const;

export const ABOUT_CTA = {
  heading: 'Let’s build your high-performing workforce.',
  subtext:
    'Tell us what you’re hiring for. We’ll recommend the right recruitment and staffing solution.',
  buttonLabel: 'Start a Conversation →',
  buttonHref: '/contact',
} as const;
