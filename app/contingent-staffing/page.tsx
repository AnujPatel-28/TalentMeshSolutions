import type { Metadata } from 'next';
import React from 'react';
import ServicePageLayout from '@/components/shared/ServicePageLayout/ServicePageLayout';
import { STRONG_CTA } from '@/content/home';

const SITE_URL = 'https://talentmeshsolutions.com';

export const metadata: Metadata = {
    // Bare title: root layout's title.template appends " | TalentMesh Solutions".
    title: 'Contingent Staffing',
    description: "Access skilled professionals without committing to a permanent workforce structure. We help businesses respond to changing project demands with flexible staffing solutions built around their immediate requirements.",
    alternates: { canonical: '/contingent-staffing' },
    openGraph: {
        title: 'Contingent Staffing | TalentMesh Solutions',
        description: "Access skilled professionals without committing to a permanent workforce structure. We help businesses respond to changing project demands with flexible staffing solutions built around their immediate requirements.",
        url: `${SITE_URL}/contingent-staffing`,
        siteName: 'TalentMesh Solutions',
        type: 'website',
        images: [{ url: `${SITE_URL}/images/services/contingent-staffing.webp`, alt: "A project team bringing a newly joined colleague up to speed at a standing desk" }],
    },
};

const APPROACH_STEPS = [
    {
        num: '01',
        title: 'Understand',
        desc: 'We begin with the role, project requirements, skills, experience and expected outcomes.',
    },
    {
        num: '02',
        title: 'Identify',
        desc: 'Our team sources and pre-screens candidates based on qualification, experience and skill alignment.',
    },
    {
        num: '03',
        title: 'Coordinate',
        desc: 'From candidate presentation through interviews, Talentmesh manages the coordination to keep the process moving.',
    },
    {
        num: '04',
        title: 'Scale',
        desc: 'Add the talent you need when you need it, while maintaining flexibility as your requirements change.',
    },
];

export default function ContingentStaffingPage() {
    return (
        <ServicePageLayout
            heroTitle="Contingent Staffing"
            heroTagline="The right talent, when your business needs it."
            heroDescription="Access skilled professionals without committing to a permanent workforce structure. We help businesses respond to changing project demands with flexible staffing solutions built around their immediate requirements."
            heroCtaText="Request Talent"
            imageSrc="/images/services/contingent-staffing.webp"
            imageAlt="A project team bringing a newly joined colleague up to speed at a standing desk"
            approachCategory="Contingent Workforce"
            approachHeadingDark="Build capacity"
            approachHeadingAccent="without slowing down."
            approachLead={
                <p>Business needs change quickly. Projects expand, workloads fluctuate, and new priorities emerge.</p>
            }
            approachBody={
                <p>Our contingent staffing approach helps you bring in qualified professionals for the work you need today—giving your team the flexibility to scale capacity as requirements evolve.</p>
            }
            approachSteps={APPROACH_STEPS}
            formTitleDark={<>Ready to Find<br />Your Next</>}
            formTitleAccent="Specialist?"
            formSubtitle={
                <p>Partner with Talentmesh to execute staffing searches with confidence, speed, and precision. We help you secure skilled talent ready to deliver today and adapt for tomorrow.</p>
            }
            contactPhoneDisplay={STRONG_CTA.phoneDisplay}
            contactPhoneHref={STRONG_CTA.phoneHref}
            contactEmail={STRONG_CTA.email}
        />
    );
}
