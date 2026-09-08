import type { Metadata } from 'next';
import React from 'react';
import ServicePageLayout from '@/components/shared/ServicePageLayout/ServicePageLayout';
import { STRONG_CTA } from '@/content/home';

const SITE_URL = 'https://talentmeshsolutions.com';

export const metadata: Metadata = {
    // Bare title: root layout's title.template appends " | TalentMesh Solutions".
    title: 'Recruitment Process Outsourcing',
    description: "Talentmesh provides structured recruitment support to help organizations manage hiring requirements with greater consistency, coordination and speed.",
    alternates: { canonical: '/recruitment-process-outsourcing' },
    openGraph: {
        title: 'Recruitment Process Outsourcing | TalentMesh Solutions',
        description: "Talentmesh provides structured recruitment support to help organizations manage hiring requirements with greater consistency, coordination and speed.",
        url: `${SITE_URL}/recruitment-process-outsourcing`,
        siteName: 'TalentMesh Solutions',
        type: 'website',
        images: [{ url: `${SITE_URL}/images/services/recruitment-process-outsourcing.webp`, alt: "A recruitment delivery floor with colleagues collaborating over a candidate shortlist" }],
    },
};

const APPROACH_STEPS = [
    {
        "num": "01",
        "title": "Requirement coordination",
        "desc": "A structured recruitment workflow designed around your hiring requirements."
    },
    {
        "num": "02",
        "title": "Candidate sourcing",
        "desc": "Sourcing the right candidates for the job."
    },
    {
        "num": "03",
        "title": "Pre-screening and assessment",
        "desc": "Evaluating candidates against the requirements."
    },
    {
        "num": "04",
        "title": "Interview scheduling",
        "desc": "Coordinating interviews with the candidates."
    },
    {
        "num": "05",
        "title": "Hiring process support",
        "desc": "Supporting the recruitment process and coordination."
    },
    {
        "num": "06",
        "title": "Onboarding assistance",
        "desc": "Assisting with documentation and onboarding requirements."
    }
];

export default function RecruitmentProcessOutsourcingPage() {
    return (
        <ServicePageLayout
            heroTitle="Recruitment Process Outsourcing"
            heroTagline="Turn recruitment into a scalable capability."
            heroDescription="Talentmesh provides structured recruitment support to help organizations manage hiring requirements with greater consistency, coordination and speed."
            heroCtaText="Scale Your Hiring"
            imageSrc="/images/services/recruitment-process-outsourcing.webp"
            imageAlt="A recruitment delivery floor with colleagues collaborating over a candidate shortlist"
            approachCategory="RPO"
            approachHeadingDark="Bring structure to"
            approachHeadingAccent="your hiring process"
            approachLead={
                <p>When hiring volumes increase, recruitment can quickly become a bottleneck.</p>
            }
            approachBody={
                <p>Our RPO support extends your hiring capability with dedicated recruitment expertise—from candidate sourcing and screening to interview coordination.</p>
            }
            approachSteps={APPROACH_STEPS}
            formTitleDark={<>Scaling <br />your</>}
            formTitleAccent="hiring?"
            formSubtitle={
                <p>Let's build a recruitment process that scales with you.</p>
            }
            contactPhoneDisplay={STRONG_CTA.phoneDisplay}
            contactPhoneHref={STRONG_CTA.phoneHref}
            contactEmail={STRONG_CTA.email}
        />
    );
}
