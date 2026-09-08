import type { Metadata } from 'next';
import React from 'react';
import ServicePageLayout from '@/components/shared/ServicePageLayout/ServicePageLayout';
import { STRONG_CTA } from '@/content/home';

const SITE_URL = 'https://talentmeshsolutions.com';

export const metadata: Metadata = {
    // Bare title: root layout's title.template appends " | TalentMesh Solutions".
    title: 'Managed Talent Solutions',
    description: "From recruitment coordination to workforce support, Talentmesh brings the people and processes together to help organizations build and maintain high-performing teams.",
    alternates: { canonical: '/managed-talent-solutions' },
    openGraph: {
        title: 'Managed Talent Solutions | TalentMesh Solutions',
        description: "From recruitment coordination to workforce support, Talentmesh brings the people and processes together to help organizations build and maintain high-performing teams.",
        url: `${SITE_URL}/managed-talent-solutions`,
        siteName: 'TalentMesh Solutions',
        type: 'website',
        images: [{ url: `${SITE_URL}/images/services/managed-talent-solutions.webp`, alt: "Two operations colleagues reviewing workforce data together on a large monitor" }],
    },
};

const APPROACH_STEPS = [
    {
        "num": "01",
        "title": "Talent Acquisition",
        "desc": "Find and assess the right people."
    },
    {
        "num": "02",
        "title": "Workforce Support",
        "desc": "Coordinate the processes that keep hiring moving."
    },
    {
        "num": "03",
        "title": "Onboarding Assistance",
        "desc": "Support new joiners with documentation and transition requirements."
    },
    {
        "num": "04",
        "title": "Workforce Planning",
        "desc": "Help align talent requirements with business needs."
    }
];

export default function ManagedTalentSolutionsPage() {
    return (
        <ServicePageLayout
            heroTitle="Managed Talent Solutions"
            heroTagline="A more connected way to manage your workforce."
            heroDescription="From recruitment coordination to workforce support, Talentmesh brings the people and processes together to help organizations build and maintain high-performing teams."
            heroCtaText="Review Your Workforce"
            imageSrc="/images/services/managed-talent-solutions.webp"
            imageAlt="Two operations colleagues reviewing workforce data together on a large monitor"
            approachCategory="Managed Programs"
            approachHeadingDark="Your workforce."
            approachHeadingAccent="One connected partner."
            approachLead={
                <p>Hiring is only one part of building a strong workforce.</p>
            }
            approachBody={
                <p>Talentmesh combines recruitment, staffing and workforce support to help organizations address talent requirements across different stages of the employee journey.</p>
            }
            approachSteps={APPROACH_STEPS}
            formTitleDark={<>Looking <br />for <br />the <br />Right <br />Team</>}
            formTitleAccent="to Grow Your Business?"
            formSubtitle={
                <p>Tell us what you're hiring for. Our team can help you find the right recruitment and staffing solution.</p>
            }
            contactPhoneDisplay={STRONG_CTA.phoneDisplay}
            contactPhoneHref={STRONG_CTA.phoneHref}
            contactEmail={STRONG_CTA.email}
        />
    );
}
