import type { Metadata } from 'next';
import React from 'react';
import ServicePageLayout from '@/components/shared/ServicePageLayout/ServicePageLayout';
import { STRONG_CTA } from '@/content/home';

const SITE_URL = 'https://talentmeshsolutions.com';

export const metadata: Metadata = {
    // Bare title: root layout's title.template appends " | TalentMesh Solutions".
    title: 'Skill Upskilling',
    description: "Help employees and emerging talent develop relevant capabilities through structured upskilling and training support.",
    alternates: { canonical: '/skill-upskilling' },
    openGraph: {
        title: 'Skill Upskilling | TalentMesh Solutions',
        description: "Help employees and emerging talent develop relevant capabilities through structured upskilling and training support.",
        url: `${SITE_URL}/skill-upskilling`,
        siteName: 'TalentMesh Solutions',
        type: 'website',
        images: [{ url: `${SITE_URL}/images/services/skill-upskilling.webp`, alt: "Colleagues gathered at a whiteboard while one sketches a diagram" }],
    },
};

const APPROACH_STEPS = [
    {
        "num": "01",
        "title": "Skill-gap identification",
        "desc": "Identify the skills required to support your business goals."
    },
    {
        "num": "02",
        "title": "Training referrals",
        "desc": "Connect talent with relevant training opportunities."
    },
    {
        "num": "03",
        "title": "Upskilling resources",
        "desc": "Provide resources to support workforce capability development."
    },
    {
        "num": "04",
        "title": "Workforce capability development",
        "desc": "Develop the internal capabilities of your team."
    },
    {
        "num": "05",
        "title": "Talent pipeline development",
        "desc": "Build a talent pipeline that evolves with your business."
    }
];

export default function SkillUpskillingPage() {
    return (
        <ServicePageLayout
            heroTitle="Skill Upskilling"
            heroTagline="Build the skills your workforce needs next."
            heroDescription="Help employees and emerging talent develop relevant capabilities through structured upskilling and training support."
            heroCtaText="Plan Upskilling"
            imageSrc="/images/services/skill-upskilling.webp"
            imageAlt="Colleagues gathered at a whiteboard while one sketches a diagram"
            approachCategory="Workforce Enablement"
            approachHeadingDark="Keep talent"
            approachHeadingAccent="moving forward"
            approachLead={
                <p>Skills evolve. Businesses evolve with them.</p>
            }
            approachBody={
                <p>Talentmesh helps organizations connect workforce needs with training and development opportunities that can strengthen capability over time.</p>
            }
            approachSteps={APPROACH_STEPS}
            formTitleDark={<>Build <br />the <br />skills <br />your</>}
            formTitleAccent="future requires."
            formSubtitle={
                <p>Let's create a stronger talent pipeline.</p>
            }
            contactPhoneDisplay={STRONG_CTA.phoneDisplay}
            contactPhoneHref={STRONG_CTA.phoneHref}
            contactEmail={STRONG_CTA.email}
        />
    );
}
