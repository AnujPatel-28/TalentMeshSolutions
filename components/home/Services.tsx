import {
    Briefcase,
    Crown,
    Timer,
    Workflow,
    GraduationCap,
    Globe,
    Users,
    ShieldCheck,
    FileCheck2,
    Compass,
} from 'lucide-react';
import { SERVICES, type ServiceIcon } from '@/content/home';
import styles from './home.module.css';

/**
 * lucide-react only — @mui/icons-material carries 'use client' through its
 * SvgIcon chain and would pull the emotion runtime into this server component.
 */
const ICONS: Record<ServiceIcon, typeof Briefcase> = {
    briefcase: Briefcase,
    crown: Crown,
    timer: Timer,
    workflow: Workflow,
    graduation: GraduationCap,
    globe: Globe,
    users: Users,
    shield: ShieldCheck,
    fileCheck: FileCheck2,
    compass: Compass,
};

export default function Services() {
    return (
        <section className={styles.section} id="services">
            <div className={styles.inner}>
                <div className={styles.head}>
                    <p className={styles.eyebrow}>Our core services</p>
                    <h2 className={styles.h2}>
                        End-to-end manpower services, <span className={styles.accent}>under one roof</span>
                    </h2>
                    <p className={styles.lede}>
                        From a single senior replacement to a hundred-seat ramp, we cover the full hiring
                        lifecycle — sourcing, screening, verification and onboarding.
                    </p>
                </div>

                <div className={styles.serviceGrid}>
                    {SERVICES.map((service) => {
                        const Icon = ICONS[service.icon];
                        return (
                            <article
                                key={service.title}
                                className={`${styles.serviceCard} ${service.featured ? styles.serviceFeatured : ''}`}
                            >
                                <span className={styles.serviceIcon} aria-hidden="true">
                                    <Icon size={22} strokeWidth={1.75} />
                                </span>
                                <h3 className={styles.serviceTitle}>{service.title}</h3>
                                <p className={styles.serviceDesc}>{service.description}</p>
                            </article>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
