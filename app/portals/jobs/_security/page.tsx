import type { Metadata } from 'next';
import { InfoLayout } from '@/components/ui';

const SITE_URL = 'https://talentmeshsolutions.com';

export const metadata: Metadata = {
    // Bare title: root layout's title.template appends " | TalentMesh Solutions".
    title: 'Security',
    description: 'How we ensure the safety and integrity of your data and our platform.',
    alternates: { canonical: '/security' },
    openGraph: {
        title: 'Security | TalentMesh Solutions',
        description: 'How we ensure the safety and integrity of your data and our platform.',
        url: `${SITE_URL}/security`,
        siteName: 'TalentMesh Solutions',
        type: 'website',
    },
};

export default function SecurityPage() {
    return (
        <InfoLayout
            title="Security"
            breadcrumb="Safety"
            description="How we ensure the safety and integrity of your data and our platform."
        >
            <h3>1. Infrastructure Security</h3>
            <p>Our infrastructure is hosted on secure, world-class cloud providers with multi-layered security protocols.</p>
            <h3>2. Encryption</h3>
            <p>We use industry-standard encryption for data at rest and in transit.</p>
            <h3>3. Continuous Monitoring</h3>
            <p>We continuously monitor our systems for potential vulnerabilities and threats.</p>
        </InfoLayout>
    );
}


