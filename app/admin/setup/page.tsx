import { notFound } from 'next/navigation';
import { validateAdminToken } from '@/lib/admin/token';
import AdminSetupForm from './AdminSetupForm';
import styles from '@/app/(auth)/login/login.module.css';
import Image from 'next/image';
import Link from 'next/link';

interface Props {
  searchParams: Promise<{ token?: string }>;
}

export default async function AdminSetupPage({ searchParams }: Props) {
  const params = await searchParams;
  const token = params.token;

  if (!token || !validateAdminToken(token)) {
    // Return a generic "Not Found" to keep the page secret
    return (
      <div className={styles.page}>
         <div className={styles.header}>
            <h1 className={styles.title}>404 - Page Not Found</h1>
            <p className={styles.subtitle}>The page you are looking for does not exist.</p>
            <Link href="/" className={styles.backLink} style={{ marginTop: '20px' }}>
               Back to Home
            </Link>
         </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.bgGlow} />
      <div className={styles.gridOverlay} />

      <div className={styles.container}>
        <Link href="/" className={styles.logoWrap}>
          <Image
            src="/TalentMesh_page-0002-removebg-preview.png"
            alt="TalentMesh"
            width={160}
            height={44}
            unoptimized
          />
        </Link>
        <AdminSetupForm />
      </div>
    </div>
  );
}
