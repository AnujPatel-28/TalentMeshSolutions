import type { Metadata } from 'next';
import React from 'react';
import ServicePageLayout from '@/components/shared/ServicePageLayout/ServicePageLayout';
import { STRONG_CTA } from '@/content/home';

const SITE_URL = 'https://talentmeshsolutions.com';

export const metadata: Metadata = {
    // Bare title: root layout's title.template appends " | TalentMesh Solutions".
    title: 'Offshore Staffing',
    description: "Access skilled talent through flexible offshore staffing solutions designed to help organizations expand capacity while staying focused on their core business.",
    alternates: { canonical: '/offshore-staffing' },
    openGraph: {
        title: 'Offshore Staffing | TalentMesh Solutions',
        description: "Access skilled talent through flexible offshore staffing solutions designed to help organizations expand capacity while staying focused on their core business.",
        url: `${SITE_URL}/offshore-staffing`,
        siteName: 'TalentMesh Solutions',
        type: 'website',
        images: [{ url: `${SITE_URL}/images/services/offshore-staffing.webp`, alt: "A team in a meeting room on a video call with remote colleagues on a wall display" }],
    },
};

const APPROACH_STEPS = [
    {
        "num": "01",
        "title": "Broader talent access",
        "desc": "Access skilled talent pools beyond your immediate geography."
    },
    {
        "num": "02",
        "title": "Flexible workforce capacity",
        "desc": "Scale your team up or down as project requirements shift."
    },
    {
        "num": "03",
        "title": "Skill-focused sourcing",
        "desc": "Identify candidates whose skills align with your business needs."
    },
    {
        "num": "04",
        "title": "Structured candidate screening",
        "desc": "Evaluate candidates thoroughly against role requirements."
    },
    {
        "num": "05",
        "title": "End-to-end coordination",
        "desc": "Manage the process from candidate screening to hiring coordination."
    }
];

export default function OffshoreStaffingPage() {
    return (
        <ServicePageLayout
            heroTitle="Offshore Staffing"
            heroTagline="Extend your workforce beyond borders."
            heroDescription="Access skilled talent through flexible offshore staffing solutions designed to help organizations expand capacity while staying focused on their core business."
            heroCtaText="Extend Your Team"
            imageSrc="/images/services/offshore-staffing.webp"
            imageAlt="A team in a meeting room on a video call with remote colleagues on a wall display"
            approachCategory="Offshore Delivery"
            approachHeadingDark="Add capability"
            approachHeadingAccent="without adding complexity"
            approachLead={
                <p>Offshore staffing can give businesses access to broader talent pools and additional workforce capacity.</p>
            }
            approachBody={
                <p>Talentmesh supports organizations through candidate sourcing, screening and hiring coordination to help build the teams they need.</p>
            }
            approachSteps={APPROACH_STEPS}
            formTitleDark={<>Looking <br />beyond <br />your</>}
            formTitleAccent="local talent pool?"
            formSubtitle={
                <p>Let's find the right capability for your team.</p>
            }
            contactPhoneDisplay={STRONG_CTA.phoneDisplay}
            contactPhoneHref={STRONG_CTA.phoneHref}
            contactEmail={STRONG_CTA.email}
        />
    );
}
