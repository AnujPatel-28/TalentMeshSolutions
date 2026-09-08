import type { Metadata } from 'next';
import React from 'react';
import ServicePageLayout from '@/components/shared/ServicePageLayout/ServicePageLayout';
import { STRONG_CTA } from '@/content/home';

const SITE_URL = 'https://talentmeshsolutions.com';

export const metadata: Metadata = {
    // Bare title: root layout's title.template appends " | TalentMesh Solutions".
    title: 'Hire, Train & Deploy',
    description: "Build talent pipelines around the skills your organization needs through structured hiring, training and workforce deployment.",
    alternates: { canonical: '/hire-train-deploy' },
    openGraph: {
        title: 'Hire, Train & Deploy | TalentMesh Solutions',
        description: "Build talent pipelines around the skills your organization needs through structured hiring, training and workforce deployment.",
        url: `${SITE_URL}/hire-train-deploy`,
        siteName: 'TalentMesh Solutions',
        type: 'website',
        images: [{ url: `${SITE_URL}/images/services/hire-train-deploy.webp`, alt: "An instructor explaining a concept to young professionals working at laptops" }],
    },
};

const APPROACH_STEPS = [
    {
        "num": "01",
        "title": "Identify",
        "desc": "Understand the skills and roles required."
    },
    {
        "num": "02",
        "title": "Hire",
        "desc": "Find promising candidates through targeted recruitment."
    },
    {
        "num": "03",
        "title": "Develop",
        "desc": "Connect talent with relevant training and upskilling resources."
    },
    {
        "num": "04",
        "title": "Deploy",
        "desc": "Move job-ready professionals into the opportunities where they can contribute."
    }
];

export default function HireTrainDeployPage() {
    return (
        <ServicePageLayout
            heroTitle="Hire, Train & Deploy"
            heroTagline="Turn potential into job-ready talent."
            heroDescription="Build talent pipelines around the skills your organization needs through structured hiring, training and workforce deployment."
            heroCtaText="Build Your Pipeline"
            imageSrc="/images/services/hire-train-deploy.webp"
            imageAlt="An instructor explaining a concept to young professionals working at laptops"
            approachCategory="Train & Deploy"
            approachHeadingDark="Build capability,"
            approachHeadingAccent="not just headcount"
            approachLead={
                <p>Finding talent is only the beginning.</p>
            }
            approachBody={
                <p>For emerging skills and growing teams, organizations need people who can develop into the capabilities the business requires.</p>
            }
            approachSteps={APPROACH_STEPS}
            formTitleDark={<>Need <br />to <br />build <br />a</>}
            formTitleAccent="talent pipeline?"
            formSubtitle={
                <p>Let's create the capability your business needs next.</p>
            }
            contactPhoneDisplay={STRONG_CTA.phoneDisplay}
            contactPhoneHref={STRONG_CTA.phoneHref}
            contactEmail={STRONG_CTA.email}
        />
    );
}
