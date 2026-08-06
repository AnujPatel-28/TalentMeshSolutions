// Shared job listings data used by browse-jobs and job detail pages

export interface Job {
    id: number;
    title: string;
    company: string;
    location: string;
    salary: string;
    type: string;
    industry: string;
    exp: string;
    logo: string;
    color: string;
    match: number;
    posted: string;
    country: string;
    description: string;
    responsibilities: string[];
    requirements: string[];
    benefits: string[];
    about: string;
}

export const JOBS: Job[] = [
    {
        id: 1, title: 'Senior AI Researcher', company: 'Quantum Leap', location: 'Bangalore', salary: '$190k–$260k', type: 'Full-Time', industry: 'Engineering', exp: 'Senior', logo: 'QL', color: '#0D47A1', match: 96, posted: '1 day ago', country: 'India',
        description: 'We are looking for a Senior AI Researcher to push the boundaries of machine learning and artificial intelligence. You will work on cutting-edge research in deep learning, NLP, and computer vision, publishing papers and building production-ready models.',
        responsibilities: ['Lead research initiatives in deep learning and generative AI', 'Design and implement novel ML architectures', 'Publish findings in top-tier conferences (NeurIPS, ICML, CVPR)', 'Mentor junior researchers and engineers', 'Collaborate with product teams to deploy models at scale'],
        requirements: ['PhD in Computer Science, ML, or related field', '5+ years of research experience in AI/ML', 'Strong publication record in top venues', 'Proficiency in PyTorch or TensorFlow', 'Experience with large-scale distributed training'],
        benefits: ['Competitive equity package', 'Unlimited PTO', 'Annual conference budget', '$5,000 learning stipend', 'Premium health & dental'],
        about: 'Quantum Leap is a Series C AI startup building the next generation of intelligent systems. Backed by Sequoia and a16z, we are redefining how enterprises leverage AI.'
    },
    {
        id: 2, title: 'Product Designer', company: 'VividOps', location: 'Remote', salary: '$130k–$170k', type: 'Full-Time', industry: 'Design', exp: 'Mid', logo: 'VO', color: '#1565C0', match: 91, posted: '2 days ago', country: 'India',
        description: 'Join VividOps as a Product Designer to craft beautiful, intuitive interfaces for our enterprise operations platform. You will own the end-to-end design process from research to high-fidelity prototypes.',
        responsibilities: ['Own product design for key features end-to-end', 'Conduct user research and usability testing', 'Create wireframes, prototypes, and high-fidelity mockups', 'Build and maintain the design system', 'Partner closely with engineering and product management'],
        requirements: ['4+ years of product design experience', 'Strong portfolio showing UX process and visual design', 'Proficiency in Figma and prototyping tools', 'Experience with design systems at scale', 'Data-driven approach to design decisions'],
        benefits: ['Fully remote with coworking stipend', 'Equity options', '4 weeks PTO', 'Home office budget', 'Annual team retreats'],
        about: 'VividOps helps enterprises streamline operations with AI-powered automation. We serve Fortune 500 clients across 20 countries.'
    },
    {
        id: 3, title: 'Blockchain Architect', company: 'DefiCore', location: 'Mumbai', salary: '$150k–$210k', type: 'Contract', industry: 'Engineering', exp: 'Senior', logo: 'DC', color: '#1E88E5', match: 88, posted: '3 days ago', country: 'India',
        description: 'Design and implement scalable blockchain infrastructure for our DeFi protocol. You will architect smart contracts, Layer 2 solutions, and cross-chain bridges.',
        responsibilities: ['Architect blockchain solutions for DeFi products', 'Design and audit smart contracts (Solidity/Rust)', 'Build cross-chain bridge infrastructure', 'Optimize gas efficiency and transaction throughput', 'Lead security audits and vulnerability assessments'],
        requirements: ['6+ years in blockchain development', 'Deep expertise in Ethereum, Solana, or Cosmos ecosystems', 'Experience with DeFi protocols (AMMs, lending, staking)', 'Strong understanding of cryptographic primitives', 'Track record of deployed smart contracts'],
        benefits: ['Token allocation', 'Flexible schedule', 'Conference sponsorship', 'Remote-first culture', 'Performance bonuses'],
        about: 'DefiCore builds the infrastructure layer for decentralized finance. Our protocols process $2B+ in daily volume across multiple chains.'
    },
    {
        id: 4, title: 'Growth Engineer', company: 'ScaleUp', location: 'Pune', salary: '$140k–$185k', type: 'Full-Time', industry: 'Marketing', exp: 'Mid', logo: 'SU', color: '#2196F3', match: 84, posted: '4 days ago', country: 'India',
        description: 'Be the bridge between engineering and growth. Build experimentation frameworks, optimize conversion funnels, and create data pipelines that drive user acquisition.',
        responsibilities: ['Build and optimize acquisition and activation funnels', 'Design A/B testing frameworks and experimentation infrastructure', 'Develop analytics dashboards and attribution models', 'Automate marketing workflows and integrations', 'Collaborate with marketing and data science teams'],
        requirements: ['3+ years in growth engineering or full-stack development', 'Experience with A/B testing at scale', 'Proficiency in Python, SQL, and JavaScript', 'Familiarity with analytics tools (Amplitude, Mixpanel, Segment)', 'Understanding of marketing attribution and CAC optimization'],
        benefits: ['Hybrid work (3 days in office)', 'Stock options', '401(k) matching', 'Gym membership', 'Commuter benefits'],
        about: 'ScaleUp is a growth-stage SaaS company helping B2B companies scale their go-to-market. We have grown 300% year-over-year.'
    },
    {
        id: 5, title: 'ML Infrastructure Lead', company: 'DataFlux', location: 'Hyderabad', salary: '$110k–$160k', type: 'Full-Time', industry: 'Engineering', exp: 'Lead', logo: 'DF', color: '#42A5F5', match: 79, posted: '5 days ago', country: 'India',
        description: 'Lead the ML infrastructure team building the foundation for our AI products. Design scalable training pipelines, model serving infrastructure, and feature stores.',
        responsibilities: ['Lead a team of 5-8 ML infrastructure engineers', 'Design scalable model training and serving pipelines', 'Build and maintain feature stores and data pipelines', 'Optimize model deployment for low-latency inference', 'Define technical roadmap for ML platform'],
        requirements: ['7+ years in software engineering, 3+ in ML infrastructure', 'Experience with Kubernetes, Ray, or similar orchestration', 'Deep knowledge of MLOps tools and practices', 'Strong leadership and mentoring skills', 'Experience with GPU clusters and distributed computing'],
        benefits: ['Relocation package', '30 days PTO (EU standard)', 'Public transit pass', 'Language learning budget', 'Flexible hours'],
        about: 'DataFlux is Berlin\'s fastest-growing AI company, building real-time data intelligence for European enterprises.'
    },
    {
        id: 6, title: 'Head of Product', company: 'Aether', location: 'Gurugram', salary: '$180k–$230k', type: 'Full-Time', industry: 'Product', exp: 'Lead', logo: 'AE', color: '#0D47A1', match: 93, posted: '1 day ago', country: 'India',
        description: 'Define and execute the product vision for Aether\'s AI platform. Lead a team of PMs and designers to deliver world-class products that transform how companies work.',
        responsibilities: ['Define product vision 和 roadmap for the AI platform', 'Lead and grow a team of 4 product managers', 'Drive product-market fit through customer research', 'Own metrics and KPIs for product success', 'Collaborate with C-suite on company strategy'],
        requirements: ['10+ years in product management, 5+ in leadership roles', 'Experience building AI/ML or developer tools', 'Strong analytical and strategic thinking', 'Excellent communication and stakeholder management', 'Track record of 0-to-1 product launches'],
        benefits: ['EMI share scheme', 'Private healthcare (Bupa)', '28 days holiday + bank holidays', 'Central London office', 'Quarterly off-sites'],
        about: 'Aether is building the operating system for AI-native companies. Backed by Index Ventures and Accel.'
    },
    {
        id: 7, title: 'Finance Manager', company: 'CapitalNow', location: 'Remote', salary: '$100k–$140k', type: 'Full-Time', industry: 'Finance', exp: 'Senior', logo: 'CN', color: '#1565C0', match: 77, posted: '6 days ago', country: 'India',
        description: 'Oversee financial planning, analysis, and reporting for a high-growth fintech. Drive budgeting, forecasting, and investor reporting as we scale.',
        responsibilities: ['Lead FP&A including budgeting and forecasting', 'Prepare board and investor reporting packages', 'Build financial models for new business initiatives', 'Manage month-end close and reconciliation', 'Partner with department heads on budget management'],
        requirements: ['5+ years in finance with FP&A experience', 'CPA or CFA preferred', 'Advanced Excel and financial modeling skills', 'Experience with NetSuite or similar ERP', 'Startup or high-growth company experience preferred'],
        benefits: ['Fully remote', 'Equity package', 'Unlimited PTO', 'Professional development budget', 'Home office setup allowance'],
        about: 'CapitalNow is a Series B fintech making business lending faster and more transparent.'
    },
    {
        id: 8, title: 'UX Research Lead', company: 'Designify', location: 'Chennai', salary: '$120k–$155k', type: 'Part-Time', industry: 'Design', exp: 'Senior', logo: 'DZ', color: '#1E88E5', match: 82, posted: '2 days ago', country: 'India',
        description: 'Lead UX research strategy to uncover deep user insights that shape product direction. Build and scale research operations across the organization.',
        responsibilities: ['Define and execute research strategy across products', 'Conduct generative and evaluative research studies', 'Build research operations and democratize insights', 'Present findings to leadership and influence roadmaps', 'Mentor researchers and build research culture'],
        requirements: ['6+ years in UX research', 'Mixed-methods research expertise (qual + quant)', 'Experience with research ops and scaling programs', 'Strong presentation and storytelling skills', 'Portfolio of impactful research projects'],
        benefits: ['Part-time flexibility (20-30 hrs/week)', 'Pro-rata equity', 'Conference budget', 'Austin office access', 'Health insurance'],
        about: 'Designify creates AI-powered design tools used by millions of creators worldwide.'
    },
    {
        id: 9, title: 'DevOps Engineer', company: 'CloudNine', location: 'Remote', salary: '$130k–$170k', type: 'Remote', industry: 'Engineering', exp: 'Mid', logo: 'C9', color: '#2196F3', match: 87, posted: '1 day ago', country: 'India',
        description: 'Build and maintain cloud infrastructure that powers our platform. You will design CI/CD pipelines, manage Kubernetes clusters, and ensure 99.99% uptime.',
        responsibilities: ['Design and manage cloud infrastructure on AWS/GCP', 'Build and optimize CI/CD pipelines', 'Manage Kubernetes clusters and container orchestration', 'Implement monitoring, alerting, and incident response', 'Automate infrastructure using Terraform and Ansible'],
        requirements: ['3+ years in DevOps or SRE roles', 'Strong experience with AWS or GCP', 'Kubernetes and Docker expertise', 'Infrastructure as Code (Terraform, Pulumi)', 'Experience with monitoring tools (Datadog, Grafana)'],
        benefits: ['100% remote', 'Async-first culture', 'Equipment budget', 'Quarterly team meetups', 'Generous equity'],
        about: 'CloudNine provides cloud infrastructure management for scaling startups. We help 500+ companies ship faster.'
    },
    {
        id: 10, title: 'Marketing Strategist', company: 'GrowthLab', location: 'Noida', salary: '$90k–$120k', type: 'Full-Time', industry: 'Marketing', exp: 'Entry', logo: 'GL', color: '#42A5F5', match: 72, posted: '7 days ago', country: 'India',
        description: 'Develop and execute marketing strategies that drive brand awareness and customer acquisition. Work across content, paid, and organic channels.',
        responsibilities: ['Develop integrated marketing campaigns', 'Create content strategy for blog, social, and email', 'Manage paid advertising across Google and social platforms', 'Analyze campaign performance and optimize ROI', 'Coordinate with sales on lead generation efforts'],
        requirements: ['1-2 years of marketing experience', 'Strong writing and communication skills', 'Familiarity with marketing automation tools', 'Basic understanding of SEO and paid advertising', 'Analytical mindset with attention to detail'],
        benefits: ['Hybrid work', 'Learning & development budget', 'Health insurance', '401(k)', 'Team lunches'],
        about: 'GrowthLab helps B2B SaaS companies build scalable growth engines through data-driven marketing.'
    },
    {
        id: 11, title: 'HR Business Partner', company: 'PeopleFirst', location: 'Kolkata', salary: '$85k–$115k', type: 'Full-Time', industry: 'HR', exp: 'Mid', logo: 'PF', color: '#0D47A1', match: 68, posted: '5 days ago', country: 'India',
        description: 'Partner with business leaders to align HR strategy with organizational goals. Drive talent development, employee engagement, and organizational effectiveness.',
        responsibilities: ['Partner with business units on people strategy', 'Drive talent management and succession planning', 'Lead employee engagement and retention programs', 'Advise on compensation, benefits, and compliance', 'Support organizational design and change management'],
        requirements: ['4+ years as an HRBP or similar role', 'CHRP or SHRM-CP certification preferred', 'Experience with HRIS systems', 'Strong consulting and stakeholder skills', 'Knowledge of employment law (Canada/US)'],
        benefits: ['Hybrid work', 'Extended health benefits', 'RRSP matching', 'Professional development', 'Wellness program'],
        about: 'PeopleFirst is an HR tech company building the future of employee experience for mid-market companies.'
    },
    {
        id: 12, title: 'Data Analyst', company: 'InsightCo', location: 'Remote', salary: '$80k–$110k', type: 'Full-Time', industry: 'Finance', exp: 'Entry', logo: 'IC', color: '#1565C0', match: 75, posted: '3 days ago', country: 'India',
        description: 'Transform raw data into actionable insights that drive business decisions. Build dashboards, perform analyses, and partner with teams across the organization.',
        responsibilities: ['Build and maintain BI dashboards (Tableau/Looker)', 'Perform ad-hoc analyses for stakeholders', 'Design and track KPIs and metrics', 'Write complex SQL queries for data extraction', 'Present findings and recommendations to leadership'],
        requirements: ['1+ years of data analysis experience', 'Strong SQL skills', 'Experience with Tableau, Looker, or Power BI', 'Basic Python or R for data analysis', 'Excellent communication and storytelling'],
        benefits: ['Fully remote', 'Learning budget', 'Stock options', 'Flexible hours', 'Mental health support'],
        about: 'InsightCo provides data analytics solutions for financial services companies.'
    },
    {
        id: 13, title: 'Senior Full Stack Developer', company: 'Infosys', location: 'Bangalore', salary: '₹25L–₹45L', type: 'Full-Time', industry: 'Engineering', exp: 'Senior', logo: 'IN', color: '#0D47A1', match: 94, posted: '1 day ago', country: 'India',
        description: 'Build scalable enterprise web applications for global clients. Work with React, Node.js, and cloud technologies to deliver high-impact digital transformation projects.',
        responsibilities: ['Design and develop full-stack web applications', 'Lead technical discussions and code reviews', 'Architect microservices on AWS/Azure', 'Mentor team of 3-5 junior developers', 'Collaborate with global client stakeholders'],
        requirements: ['5+ years of full-stack development (React + Node.js)', 'Experience with cloud platforms (AWS/Azure)', 'Strong understanding of microservices architecture', 'Knowledge of CI/CD and DevOps practices', 'Excellent communication skills'],
        benefits: ['Performance bonus (up to 20%)', 'Health insurance for family', 'ESOPs', 'Learning platforms access', 'Flexible work from home'],
        about: 'Infosys is a global leader in next-generation digital services and consulting. We help clients in 56 countries navigate their digital transformation.'
    },
    {
        id: 14, title: 'Product Manager', company: 'Flipkart', location: 'Bangalore', salary: '₹30L–₹50L', type: 'Full-Time', industry: 'Product', exp: 'Senior', logo: 'FK', color: '#F57C00', match: 92, posted: '2 days ago', country: 'India',
        description: 'Drive product strategy for Flipkart\'s AI-powered recommendation engine. Define the roadmap for personalization features that impact 400M+ users.',
        responsibilities: ['Own the product roadmap for recommendation systems', 'Define metrics and drive product-market fit', 'Run A/B tests and analyze user behavior at scale', 'Collaborate with ML engineers on model improvements', 'Present product strategy to leadership'],
        requirements: ['5+ years in product management at a tech company', 'Experience with ML/AI products or recommendation systems', 'Strong analytical skills (SQL, data analysis)', 'Experience managing cross-functional teams', 'MBA or equivalent experience preferred'],
        benefits: ['ESOPs', 'Relocation assistance', 'Employee discount', 'Health insurance (family)', 'Annual learning budget'],
        about: 'Flipkart is India\'s leading e-commerce marketplace, serving 400M+ registered users with a catalog of 150M+ products.'
    },
    {
        id: 15, title: 'Data Scientist', company: 'Wipro', location: 'Hyderabad', salary: '₹18L–₹32L', type: 'Full-Time', industry: 'Engineering', exp: 'Mid', logo: 'WP', color: '#7B1FA2', match: 86, posted: '1 day ago', country: 'India',
        description: 'Apply machine learning and statistical models to solve complex business problems for Fortune 500 clients. Work on NLP, computer vision, and predictive analytics projects.',
        responsibilities: ['Build and deploy ML models for client projects', 'Perform exploratory data analysis and feature engineering', 'Develop NLP and computer vision solutions', 'Present insights and recommendations to clients', 'Collaborate with data engineering teams on pipelines'],
        requirements: ['3+ years in data science or ML engineering', 'Strong Python skills (scikit-learn, pandas, TensorFlow)', 'Experience with NLP, CV, or time series forecasting', 'MS/PhD in CS, Statistics, or related field preferred', 'Excellent client-facing presentation skills'],
        benefits: ['Performance bonus', 'Health and life insurance', 'Learning certifications sponsored', 'Flexible work policy', 'Employee wellness program'],
        about: 'Wipro is a leading technology services company helping clients across 6 continents build resilient businesses with AI and cloud.'
    },
    {
        id: 16, title: 'Cloud Solutions Architect', company: 'TCS', location: 'Mumbai', salary: '₹35L–₹60L', type: 'Full-Time', industry: 'Engineering', exp: 'Lead', logo: 'TC', color: '#1565C0', match: 89, posted: '3 days ago', country: 'India',
        description: 'Design enterprise-scale cloud architectures for TCS\'s largest banking and financial services clients. Lead cloud migration and modernization initiatives.',
        responsibilities: ['Architect cloud solutions on AWS/Azure/GCP', 'Lead cloud migration and modernization projects', 'Define cloud governance and security standards', 'Mentor and guide cloud engineering teams', 'Present architecture proposals to C-level clients'],
        requirements: ['8+ years in cloud architecture or infrastructure', 'AWS/Azure/GCP certifications (Solutions Architect level)', 'Experience with BFSI or enterprise clients', 'Strong understanding of security and compliance', 'Excellent leadership and communication'],
        benefits: ['Variable pay', 'International travel opportunities', 'NPS and gratuity', 'Company car (for senior roles)', 'Comprehensive health cover'],
        about: 'TCS is a global IT services leader with 600,000+ employees across 55 countries, serving major enterprises and governments.'
    },
    {
        id: 17, title: 'UX Designer', company: 'Razorpay', location: 'Bangalore', salary: '₹20L–₹35L', type: 'Full-Time', industry: 'Design', exp: 'Mid', logo: 'RZ', color: '#1E88E5', match: 83, posted: '2 days ago', country: 'India',
        description: 'Design intuitive payment experiences for millions of businesses. Work on Razorpay\'s dashboard, checkout flows, and merchant tools.',
        responsibilities: ['Design end-to-end user experiences for payment products', 'Conduct user research with merchants and developers', 'Create prototypes and run usability tests', 'Contribute to and evolve the design system', 'Collaborate closely with product and engineering'],
        requirements: ['3+ years of UX/Product design experience', 'Strong portfolio in fintech/B2B SaaS', 'Proficiency in Figma', 'Experience with user research methods', 'Understanding of developer experience design'],
        benefits: ['ESOPs', 'Flexible work', 'Health insurance', 'Learning budget', 'Team offsites'],
        about: 'Razorpay is India\'s leading full-stack payments and banking platform, powering 8M+ businesses.'
    },
    {
        id: 18, title: 'Backend Engineer', company: 'Zoho', location: 'Chennai', salary: '₹15L–₹28L', type: 'Full-Time', industry: 'Engineering', exp: 'Mid', logo: 'ZH', color: '#D32F2F', match: 81, posted: '4 days ago', country: 'India',
        description: 'Build robust backend systems for Zoho\'s suite of 50+ business applications. Work on high-throughput APIs, distributed systems, and database optimization.',
        responsibilities: ['Design and build scalable backend services', 'Optimize database queries and system performance', 'Build RESTful APIs and microservices', 'Participate in code reviews and architecture discussions', 'Contribute to internal frameworks and tools'],
        requirements: ['3+ years of backend development (Java/Python/Go)', 'Strong understanding of data structures and algorithms', 'Experience with relational and NoSQL databases', 'Knowledge of distributed systems concepts', 'Problem-solving mindset'],
        benefits: ['Subsidized meals', 'On-campus gym and recreation', 'Health insurance', 'Annual retreats', 'No-layoff policy'],
        about: 'Zoho is a privately held, profitable tech company with 55+ products serving 100M+ users. We believe in building software that respects user privacy.'
    },
    {
        id: 19, title: 'Marketing Head', company: 'Meesho', location: 'Delhi', salary: '₹40L–₹65L', type: 'Full-Time', industry: 'Marketing', exp: 'Lead', logo: 'MS', color: '#E91E63', match: 78, posted: '5 days ago', country: 'India',
        description: 'Lead marketing strategy for India\'s fastest-growing social commerce platform. Drive brand building, user acquisition, and seller growth.',
        responsibilities: ['Define and execute brand and growth marketing strategy', 'Lead a team of 15+ marketers across channels', 'Drive user acquisition through digital and offline channels', 'Build partnerships and influencer marketing programs', 'Own marketing P&L and ROI optimization'],
        requirements: ['10+ years in marketing, 5+ in leadership', 'Experience in e-commerce or consumer internet', 'Proven track record of scaling user acquisition', 'Strong brand building and storytelling skills', 'MBA from a tier-1 institute preferred'],
        benefits: ['ESOPs', 'Performance bonus', 'Health insurance', 'Flexible work', 'Leadership coaching'],
        about: 'Meesho is India\'s largest social commerce platform with 150M+ monthly transacting users, enabling millions of small businesses.'
    },
    {
        id: 20, title: 'DevOps Engineer', company: 'Paytm', location: 'Noida', salary: '₹22L–₹38L', type: 'Full-Time', industry: 'Engineering', exp: 'Senior', logo: 'PT', color: '#00BCD4', match: 85, posted: '1 day ago', country: 'India',
        description: 'Manage infrastructure for one of India\'s largest payment platforms. Build CI/CD pipelines, manage containerized workloads, and ensure high availability.',
        responsibilities: ['Build and manage CI/CD pipelines for microservices', 'Manage Kubernetes clusters at scale', 'Implement infrastructure as code (Terraform/Ansible)', 'Design monitoring and alerting systems', 'Drive SRE practices and incident management'],
        requirements: ['5+ years in DevOps/SRE roles', 'Kubernetes and Docker expertise', 'AWS or private cloud experience', 'Scripting skills (Python, Bash)', 'Experience with high-traffic systems (1M+ TPS)'],
        benefits: ['ESOPs', 'Health insurance', 'Flexible hours', 'Learning stipend', 'Team outings'],
        about: 'Paytm is India\'s leading digital payments and financial services company with 300M+ users.'
    },
    {
        id: 21, title: 'HR Manager', company: 'Zomato', location: 'Gurgaon', salary: '₹16L–₹26L', type: 'Full-Time', industry: 'HR', exp: 'Mid', logo: 'ZM', color: '#E53935', match: 71, posted: '6 days ago', country: 'India',
        description: 'Drive people strategy for Zomato\'s technology and product teams. Lead talent acquisition, employee engagement, and organizational development initiatives.',
        responsibilities: ['Partner with tech leaders on people strategy', 'Drive employee engagement and retention', 'Lead talent acquisition for engineering roles', 'Manage performance review cycles', 'Build learning and development programs'],
        requirements: ['4+ years in HR with tech team partnership', 'Experience in tech hiring at scale', 'Strong understanding of compensation benchmarking', 'Data-driven approach to HR decisions', 'Excellent interpersonal skills'],
        benefits: ['Zomato credits', 'Health insurance', 'Flexible work', 'Parental leave', 'ESOPs'],
        about: 'Zomato is India\'s leading food delivery and restaurant discovery platform, operating across 500+ cities.'
    },
    {
        id: 22, title: 'Finance Analyst', company: 'CRED', location: 'Bangalore', salary: '₹14L–₹24L', type: 'Full-Time', industry: 'Finance', exp: 'Entry', logo: 'CR', color: '#424242', match: 74, posted: '3 days ago', country: 'India',
        description: 'Join CRED\'s finance team to drive financial planning, analysis, and strategic decision-making. Build models that support our next phase of growth.',
        responsibilities: ['Build financial models and forecasts', 'Prepare investor and board reporting', 'Analyze unit economics and cohort metrics', 'Support fundraising and M&A activities', 'Partner with business teams on budgeting'],
        requirements: ['1-2 years in finance or consulting', 'Strong Excel and financial modeling skills', 'CA/CFA or MBA (Finance) preferred', 'Basic SQL knowledge for data analysis', 'Excellent attention to detail'],
        benefits: ['ESOPs', 'Health insurance', 'Free meals', 'Premium office space', 'Learning budget'],
        about: 'CRED is a fintech platform for creditworthy individuals, offering rewards for credit card bill payments. Valued at $6.4B.'
    },
];

export function getJobById(id: number): Job | undefined {
    return JOBS.find(j => j.id === id);
}
