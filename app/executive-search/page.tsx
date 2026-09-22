import type { Metadata } from 'next';
import React from 'react';
import ServicePageLayout from '@/components/shared/ServicePageLayout/ServicePageLayout';
import { STRONG_CTA } from '@/content/home';

const SITE_URL = 'https://talentmeshsolutions.com';

export const metadata: Metadata = {
    // Bare title: root layout's title.template appends " | TalentMesh Solutions".
    title: 'Executive Search',
    description: "The right leader can shape teams, influence strategy and define what comes next. Talentmesh helps organizations identify and connect with senior professionals aligned with their leadership requirements.",
    alternates: { canonical: '/executive-search' },
    openGraph: {
        title: 'Executive Search | TalentMesh Solutions',
        description: "The right leader can shape teams, influence strategy and define what comes next. Talentmesh helps organizations identify and connect with senior professionals aligned with their leadership requirements.",
        url: `${SITE_URL}/executive-search`,
        siteName: 'TalentMesh Solutions',
        type: 'website',
        images: [{ url: `${SITE_URL}/images/services/executive-search.webp`, alt: "Two colleagues reviewing leadership candidate profiles together" }],
    },
};

const APPROACH_STEPS = [
    {
        "num": "01",
        "title": "Understand",
        "desc": "We start with the role, business context and leadership expectations."
    },
    {
        "num": "02",
        "title": "Identify",
        "desc": "We search for professionals whose experience aligns with the requirement."
    },
    {
        "num": "03",
        "title": "Assess",
        "desc": "Candidates are pre-screened for qualifications, experience and skill fit."
    },
    {
        "num": "04",
        "title": "Coordinate",
        "desc": "Talentmesh manages interview coordination through the hiring process."
    }
];

export default function ExecutiveSearchPage() {
    return (
        <ServicePageLayout
            heroTitle="Executive Search"
            heroTagline="Find leaders who move your business forward."
            heroDescription="The right leader can shape teams, influence strategy and define what comes next. Talentmesh helps organizations identify and connect with senior professionals aligned with their leadership requirements."
            /* Per-page differentiators. The CTA names the actual next step
               rather than a generic verb shared by all twelve service pages,
               and the category chip names the engagement model. */
            variant="editorial"
            heroCtaText="Start a Search"
            imageSrc="/images/services/executive-search.webp"
            imageAlt="Two colleagues reviewing leadership candidate profiles together"
            approachCategory="Retained Search"
            approachHeadingDark="Leadership requires"
            approachHeadingAccent="a different kind of search"
            approachLead={
                <p>Senior hiring isn't simply about filling a position.</p>
            }
            approachBody={
                <p>It is about finding the experience, leadership capability and perspective required to make a meaningful difference to the organization.</p>
            }
            approachSteps={APPROACH_STEPS}
            formTitleDark={<>Looking <br />for <br />your</>}
            formTitleAccent="next leader?"
            formSubtitle={
                <p>Let&apos;s begin the search.</p>
            }
            contactPhoneDisplay={STRONG_CTA.phoneDisplay}
            contactPhoneHref={STRONG_CTA.phoneHref}
            contactEmail={STRONG_CTA.email}
        />
    );
}
