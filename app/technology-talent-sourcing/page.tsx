import type { Metadata } from 'next';
import React from 'react';
import ServicePageLayout from '@/components/shared/ServicePageLayout/ServicePageLayout';
import { STRONG_CTA } from '@/content/home';

const SITE_URL = 'https://talentmeshsolutions.com';

export const metadata: Metadata = {
    // Bare title: root layout's title.template appends " | TalentMesh Solutions".
    title: 'Technology Talent Sourcing',
    description: "Technology hiring is about more than matching keywords. Talentmesh helps organizations identify professionals whose skills, experience and technical background align with the role.",
    alternates: { canonical: '/technology-talent-sourcing' },
    openGraph: {
        title: 'Technology Talent Sourcing | TalentMesh Solutions',
        description: "Technology hiring is about more than matching keywords. Talentmesh helps organizations identify professionals whose skills, experience and technical background align with the role.",
        url: `${SITE_URL}/technology-talent-sourcing`,
        siteName: 'TalentMesh Solutions',
        type: 'website',
        images: [{ url: `${SITE_URL}/images/services/technology-talent-sourcing.webp`, alt: "Two engineers at a dual-monitor desk, one explaining something on screen" }],
    },
};

const APPROACH_STEPS = [
    {
        "num": "01",
        "title": "Understand the stack",
        "desc": "Identify the technologies, skills and experience required."
    },
    {
        "num": "02",
        "title": "Assess the profile",
        "desc": "Review candidates against qualification, experience and skill match."
    },
    {
        "num": "03",
        "title": "Coordinate the process",
        "desc": "Manage interviews and candidate communication end-to-end."
    },
    {
        "num": "04",
        "title": "Build the team",
        "desc": "Help you move from an open position to the right hire."
    }
];

export default function TechnologyTalentSourcingPage() {
    return (
        <ServicePageLayout
            heroTitle="Technology Talent Sourcing"
            heroTagline="Find people who understand your technology."
            heroDescription="Technology hiring is about more than matching keywords. Talentmesh helps organizations identify professionals whose skills, experience and technical background align with the role."
            heroCtaText="Find Tech Talent"
            imageSrc="/images/services/technology-talent-sourcing.webp"
            imageAlt="Two engineers at a dual-monitor desk, one explaining something on screen"
            approachCategory="Technology Hiring"
            approachHeadingDark="Match technical capability"
            approachHeadingAccent="with business needs"
            approachLead={
                <p>From IT professionals to specialized technical roles, we focus on understanding what the position actually requires before identifying potential candidates.</p>
            }
            approachBody={
                null
            }
            approachSteps={APPROACH_STEPS}
            formTitleDark={<>Hiring <br />for <br />a</>}
            formTitleAccent="technical role?"
            formSubtitle={
                <p>Tell us what you're building.</p>
            }
            contactPhoneDisplay={STRONG_CTA.phoneDisplay}
            contactPhoneHref={STRONG_CTA.phoneHref}
            contactEmail={STRONG_CTA.email}
        />
    );
}
