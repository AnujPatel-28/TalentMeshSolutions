import type { Metadata } from 'next';
import React from 'react';
import ServicePageLayout from '@/components/shared/ServicePageLayout/ServicePageLayout';
import { STRONG_CTA } from '@/content/home';

const SITE_URL = 'https://talentmeshsolutions.com';

export const metadata: Metadata = {
    // Bare title: root layout's title.template appends " | TalentMesh Solutions".
    title: 'Contract-to-Hire',
    description: "Create a flexible path from contract engagement to permanent employment while giving both the organization and candidate time to establish the right fit.",
    alternates: { canonical: '/contract-to-hire' },
    openGraph: {
        title: 'Contract-to-Hire | TalentMesh Solutions',
        description: "Create a flexible path from contract engagement to permanent employment while giving both the organization and candidate time to establish the right fit.",
        url: `${SITE_URL}/contract-to-hire`,
        siteName: 'TalentMesh Solutions',
        type: 'website',
        images: [{ url: `${SITE_URL}/images/services/contract-to-hire.webp`, alt: "Two colleagues working side by side, one reviewing the other's work on screen" }],
    },
};

const APPROACH_STEPS = [
    {
        num: '01',
        title: 'Define the role',
        desc: 'Understand the skills, experience and expectations required.',
    },
    {
        num: '02',
        title: 'Find the right match',
        desc: 'Source and pre-screen candidates against the role.',
    },
    {
        num: '03',
        title: 'Evaluate through experience',
        desc: 'Allow the candidate and organization to assess the working relationship in a real environment.',
    },
    {
        num: '04',
        title: 'Move with confidence',
        desc: 'Transition to a longer-term opportunity when the fit is right.',
    },
];

export default function ContractToHirePage() {
    return (
        <ServicePageLayout
            heroTitle="Contract-to-Hire"
            heroTagline="Evaluate talent before making the long-term commitment."
            heroDescription="Create a flexible path from contract engagement to permanent employment while giving both the organization and candidate time to establish the right fit."
            heroCtaText="Start a Contract Hire"
            imageSrc="/images/services/contract-to-hire.webp"
            imageAlt="Two colleagues working side by side, one reviewing the other's work on screen"
            approachCategory="Trial to Permanent"
            approachHeadingDark="Flexibility first."
            approachHeadingAccent="Long-term fit when it matters."
            approachLead={
                <p>Not every hiring decision needs to be permanent from day one.</p>
            }
            approachBody={
                <p>Contract-to-hire gives businesses the flexibility to bring talent into the team while evaluating skills, performance and organizational fit before making a long-term hiring decision.</p>
            }
            approachSteps={APPROACH_STEPS}
            formTitleDark={<>Looking for a more flexible</>}
            formTitleAccent="way to hire?"
            formSubtitle={
                <p>Let's find talent that can grow with your business.</p>
            }
            contactPhoneDisplay={STRONG_CTA.phoneDisplay}
            contactPhoneHref={STRONG_CTA.phoneHref}
            contactEmail={STRONG_CTA.email}
        />
    );
}
