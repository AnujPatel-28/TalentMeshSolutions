import { InfoLayout } from '@/components/ui';

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


