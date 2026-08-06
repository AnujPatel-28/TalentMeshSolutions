"use client";
import { useRouter } from 'next/navigation';
import styles from '../../jobs/jobs.module.css';
import { invokeFunction } from '@/lib/insforge';
import { AdminHeader } from '../../_components/AdminHeader';
import { CompanyRegisterForm } from '../../_components/CompanyRegisterForm';

export default function CompanyRegisterPage() {
  const router = useRouter();

  return (
    <section className={styles.page}>
      <AdminHeader
        title="Establish Company Identity"
        eyebrow="Company Register"
        subtitle="Provision a new organizational entity into the TalentMesh ecosystem."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard/admin' },
          { label: 'Companies', href: '/dashboard/admin/companies' },
          { label: 'Register' }
        ]}
      />

      <div className={styles.formContainer} style={{ maxWidth: '600px', margin: '0 auto', background: 'white', padding: '2.5rem', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
        <CompanyRegisterForm
          onSuccess={() => router.push('/dashboard/admin/companies')}
          onCancel={() => router.back()}
        />
      </div>
    </section>
  );
}

