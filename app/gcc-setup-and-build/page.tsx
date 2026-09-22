import type { Metadata } from 'next';
import React from 'react';
import ServicePageLayout from '@/components/shared/ServicePageLayout/ServicePageLayout';
import { STRONG_CTA } from '@/content/home';

const SITE_URL = 'https://talentmeshsolutions.com';

export const metadata: Metadata = {
    // Bare title: root layout's title.template appends " | TalentMesh Solutions".
    title: 'GCC Setup & Build',
    description: "Create a workforce strategy designed around the people, skills and hiring requirements needed to establish and grow your capability center.",
    alternates: { canonical: '/gcc-setup-and-build' },
    openGraph: {
        title: 'GCC Setup & Build | TalentMesh Solutions',
        description: "Create a workforce strategy designed around the people, skills and hiring requirements needed to establish and grow your capability center.",
        url: `${SITE_URL}/gcc-setup-and-build`,
        siteName: 'TalentMesh Solutions',
        type: 'website',
        images: [{ url: `${SITE_URL}/images/services/gcc-setup-and-build.webp`, alt: "A wide view across a newly occupied office floor with people walking and talking" }],
    },
};

const APPROACH_STEPS = [
    {
        "num": "01",
        "title": "Talent Strategy",
        "desc": "Define the workforce requirements around your business goals."
    },
    {
        "num": "02",
        "title": "Specialized Hiring",
        "desc": "Identify professionals across the capabilities your center requires."
    },
    {
        "num": "03",
        "title": "Scaling Support",
        "desc": "Build hiring capacity as your center grows."
    },
    {
        "num": "04",
        "title": "Workforce Planning",
        "desc": "Align talent requirements with your long-term expansion plans."
    }
];

export default function GccSetupAndBuildPage() {
    return (
        <ServicePageLayout
            heroTitle="GCC Setup & Build"
            heroTagline="Build the talent foundation for your next capability center."
            heroDescription="Create a workforce strategy designed around the people, skills and hiring requirements needed to establish and grow your capability center."
            heroCtaText="Plan Your GCC"
            imageSrc="/images/services/gcc-setup-and-build.webp"
            imageAlt="A wide view across a newly occupied office floor with people walking and talking"
            approachCategory="Capability Centers"
            approachHeadingDark="Establish and scale"
            approachHeadingAccent="your capability center"
            approachLead={
                <p>Building a capability center requires a strategic approach to talent.</p>
            }
            approachBody={
                <p>We provide end-to-end support to set up, build infrastructure, and scale Global Capability Centers aligned to your business goals.</p>
            }
            approachSteps={APPROACH_STEPS}
            formTitleDark={<>Planning <br />your <br />next</>}
            formTitleAccent="capability center?"
            formSubtitle={
                <p>Let's start with the talent.</p>
            }
            contactPhoneDisplay={STRONG_CTA.phoneDisplay}
            contactPhoneHref={STRONG_CTA.phoneHref}
            contactEmail={STRONG_CTA.email}
        />
    );
}
