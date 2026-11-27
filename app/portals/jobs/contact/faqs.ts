/**
 * FAQ copy for /contact. Backs both the visible accordion (page.tsx) and the
 * FAQPage JSON-LD (layout.tsx), so the two cannot drift apart. Every answer is
 * drawn from facts already published elsewhere on the site (content/home.ts).
 */
export const CONTACT_FAQS = [
  {
    question: 'Which industries and locations do you hire for?',
    answer:
      'We are headquartered in Ahmedabad, Gujarat and recruit for roles across India, including remote and work-from-home positions. Our industries include Information Technology; Pharmaceuticals & Healthcare; Engineering & Manufacturing; Sales, Marketing & Retail; Logistics & Supply Chain; Banking, Financial Services & Insurance; BPO, KPO & Call Centers; EdTech & Training Institutes; Hospitality & Tourism; and E-commerce & Startups.',
  },
  {
    question: 'What hiring models do you offer?',
    answer:
      'Permanent placement, contractual and temporary or flexi staffing, Recruitment Process Outsourcing, campus hiring and internship drives, and dedicated bulk or volume hiring programmes. Tell us about the mandate in the form and we will recommend the model that fits it.',
  },
  {
    question: 'I’m looking for a job. How do I get in touch?',
    answer:
      'Tick “Looking for a job” in the form on this page and tell us about your experience, the roles you’re looking for and your preferred location. You can also email us at info@talentmeshsolutions.com or message us on WhatsApp.',
  },
  {
    question: 'What happens after I send the form?',
    answer:
      'Your message goes to the Talentmesh Solutions team, and we get in touch using the details you shared. For hiring enquiries, we start by understanding your hiring requirements, roles and workforce needs before sourcing and screening candidates.',
  },
] as const;
