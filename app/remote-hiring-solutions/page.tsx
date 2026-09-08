import type { Metadata } from 'next';
import React from 'react';
import ServicePageLayout from '@/components/shared/ServicePageLayout/ServicePageLayout';
import { STRONG_CTA } from '@/content/home';

const SITE_URL = 'https://talentmeshsolutions.com';

export const metadata: Metadata = {
    // Bare title: root layout's title.template appends " | TalentMesh Solutions".
    title: 'Remote Hiring Solutions',
    description: "Connect with skilled professionals through remote hiring solutions designed for organizations building distributed and flexible teams.",
    alternates: { canonical: '/remote-hiring-solutions' },
    openGraph: {
        title: 'Remote Hiring Solutions | TalentMesh Solutions',
        description: "Connect with skilled professionals through remote hiring solutions designed for organizations building distributed and flexible teams.",
        url: `${SITE_URL}/remote-hiring-solutions`,
        siteName: 'TalentMesh Solutions',
        type: 'website',
        images: [{ url: `${SITE_URL}/images/services/remote-hiring-solutions.webp`, alt: "A professional working from a well-lit home study with a laptop and notebook" }],
    },
};

const APPROACH_STEPS = [
    {
        "num": "01",
        "title": "Remote talent sourcing",
        "desc": "Identify and source relevant candidates beyond geographic boundaries."
    },
    {
        "num": "02",
        "title": "Candidate screening",
        "desc": "Evaluate candidates for remote capabilities."
    },
    {
        "num": "03",
        "title": "Skill and experience assessment",
        "desc": "Review candidates against qualification and skill match."
    },
    {
        "num": "04",
        "title": "Interview coordination",
        "desc": "Manage remote interviews and candidate communication end-to-end."
    },
    {
        "num": "05",
        "title": "Hiring process support",
        "desc": "Structure the hiring process from requirement to selection."
    },
    {
        "num": "06",
        "title": "Onboarding assistance",
        "desc": "Support new remote team members during transition."
    }
];

export default function RemoteHiringSolutionsPage() {
    return (
        <ServicePageLayout
            heroTitle="Remote Hiring Solutions"
            heroTagline="Find capable talent beyond the office."
            heroDescription="Connect with skilled professionals through remote hiring solutions designed for organizations building distributed and flexible teams."
            heroCtaText="Hire Remotely"
            imageSrc="/images/services/remote-hiring-solutions.webp"
            imageAlt="A professional working from a well-lit home study with a laptop and notebook"
            approachCategory="Remote Hiring"
            approachHeadingDark="Talent shouldn't be"
            approachHeadingAccent="limited by location"
            approachLead={
                <p>Remote work opens access to a broader talent pool.</p>
            }
            approachBody={
                <p>Talentmesh helps organizations identify, evaluate and coordinate qualified candidates for remote opportunities while keeping the hiring process structured from requirement to selection.</p>
            }
            approachSteps={APPROACH_STEPS}
            formTitleDark={<>Build <br />beyond</>}
            formTitleAccent="geographic boundaries."
            formSubtitle={
                <p>Find the talent your team needs—wherever they are.</p>
            }
            contactPhoneDisplay={STRONG_CTA.phoneDisplay}
            contactPhoneHref={STRONG_CTA.phoneHref}
            contactEmail={STRONG_CTA.email}
        />
    );
}
