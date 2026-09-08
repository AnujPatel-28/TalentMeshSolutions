import type { Metadata } from 'next';
import React from 'react';
import ServicePageLayout from '@/components/shared/ServicePageLayout/ServicePageLayout';
import { STRONG_CTA } from '@/content/home';

const SITE_URL = 'https://talentmeshsolutions.com';

export const metadata: Metadata = {
    // Bare title: root layout's title.template appends " | TalentMesh Solutions".
    title: 'Direct Hire Recruitment',
    description: "Talentmesh helps organizations identify, assess and connect with professionals for permanent roles across functions and industries.",
    alternates: { canonical: '/direct-hire-recruitment' },
    openGraph: {
        title: 'Direct Hire Recruitment | TalentMesh Solutions',
        description: "Talentmesh helps organizations identify, assess and connect with professionals for permanent roles across functions and industries.",
        url: `${SITE_URL}/direct-hire-recruitment`,
        siteName: 'TalentMesh Solutions',
        type: 'website',
        images: [{ url: `${SITE_URL}/images/services/direct-hire-recruitment.webp`, alt: "A hiring manager welcoming a new permanent employee on an open-plan office floor" }],
    },
};

const APPROACH_STEPS = [
    {
        "num": "01",
        "title": "Requirement",
        "desc": "Understand the position and expectations."
    },
    {
        "num": "02",
        "title": "Sourcing",
        "desc": "Identify relevant candidates."
    },
    {
        "num": "03",
        "title": "Screening",
        "desc": "Pre-screen for qualification, experience and skill match."
    },
    {
        "num": "04",
        "title": "Interview",
        "desc": "Coordinate interviews and candidate communication."
    },
    {
        "num": "05",
        "title": "Hire",
        "desc": "Support the process through selection and joining."
    }
];

export default function DirectHireRecruitmentPage() {
    return (
        <ServicePageLayout
            heroTitle="Direct Hire Recruitment"
            heroTagline="Make the right permanent hire."
            heroDescription="Talentmesh helps organizations identify, assess and connect with professionals for permanent roles across functions and industries."
            heroCtaText="Start Hiring"
            imageSrc="/images/services/direct-hire-recruitment.webp"
            imageAlt="A hiring manager welcoming a new permanent employee on an open-plan office floor"
            approachCategory="Permanent Hiring"
            approachHeadingDark="Permanent hiring"
            approachHeadingAccent="built around fit"
            approachLead={
                <p>A strong permanent hire is more than a good resume.</p>
            }
            approachBody={
                <p>We look at the qualifications, experience and skills behind the profile to help organizations make informed hiring decisions.</p>
            }
            approachSteps={APPROACH_STEPS}
            formTitleDark={<>Have <br />a <br />critical <br />role</>}
            formTitleAccent="to fill?"
            formSubtitle={
                <p>Let's find the person who fits it.</p>
            }
            contactPhoneDisplay={STRONG_CTA.phoneDisplay}
            contactPhoneHref={STRONG_CTA.phoneHref}
            contactEmail={STRONG_CTA.email}
        />
    );
}
