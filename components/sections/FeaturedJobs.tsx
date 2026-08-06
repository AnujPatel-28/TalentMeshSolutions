import Link from 'next/link';
import styles from './sections.module.css';

const FeaturedJobs = () => {
    const jobs = [
        {
            id: 1,
            title: "Senior Product Designer",
            company: "TechFlow",
            location: "Bangalore, KA",
            type: "Full-time",
            tags: ["UX/UI", "Figma", "Design Systems"],
            logo: "TF"
        },
        {
            id: 2,
            title: "Frontend Developer",
            company: "CloudScale",
            location: "Remote",
            type: "Contract",
            tags: ["React", "TypeScript", "Next.js"],
            logo: "CS"
        },
        {
            id: 3,
            title: "AI Research Scientist",
            company: "DataMind",
            location: "Mumbai, MH",
            type: "Full-time",
            tags: ["Python", "PyTorch", "NLP"],
            logo: "DM"
        },
        {
            id: 4,
            title: "Growth Marketing Manager",
            company: "ScaleUp",
            location: "Pune, MH",
            type: "Full-time",
            tags: ["SEO", "Analytics", "Strategy"],
            logo: "SU"
        },
        {
            id: 5,
            title: "Backend Engineer",
            company: "ServerLess",
            location: "Gurugram, HR",
            type: "Remote",
            tags: ["Go", "Kubernetes", "AWS"],
            logo: "SL"
        },
        {
            id: 6,
            title: "Product Manager",
            company: "Innovate",
            location: "Hyderabad, TS",
            type: "Full-time",
            tags: ["Agile", "Roadmap", "SaaS"],
            logo: "IN"
        }
    ];

    return (
        <section className={styles.featuredJobs}>
            <div className={styles.container}>
                <div className={styles.sectionHeader}>
                    <span className={styles.badge}>Hiring Now</span>
                    <h2 className={styles.sectionTitle}>Featured <span className={styles.highlightText}>Opportunities</span></h2>
                    <p className={styles.sectionDesc}>
                        Discover top roles at innovative companies vetted by our AI matching engine.
                    </p>
                </div>

                <div className={styles.jobGrid}>
                    {jobs.map((job) => (
                        <div key={job.id} className={styles.jobCard}>
                            <div className={styles.jobHeader}>
                                <div className={styles.companyLogo}>{job.logo}</div>
                                <span className={styles.jobTypeBadge}>{job.type}</span>
                            </div>
                            <h3 className={styles.jobTitle}>{job.title}</h3>
                            <p className={styles.companyName}>{job.company} • {job.location}</p>
                            <div className={styles.jobTags}>
                                {job.tags.map((tag) => (
                                    <span key={tag} className={styles.jobTag}>{tag}</span>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                <div style={{ textAlign: 'center', marginTop: '3rem' }}>
                    <Link href="/jobs" className={styles.secondaryBtn}>
                        View All Jobs
                    </Link>
                </div>
            </div>
        </section>
    );
};

export default FeaturedJobs;

