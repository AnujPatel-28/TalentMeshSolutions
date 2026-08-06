"use client";
import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Navbar.module.css';

const Navbar = () => {
    const [isMenuOpen, setIsMenuOpen] = React.useState(false);
    const [isScrolled, setIsScrolled] = React.useState(false);
    const pathname = usePathname();

    // Close mobile menu on route change
    React.useEffect(() => { setIsMenuOpen(false); }, [pathname]);

    // Track page scroll position for transparent vs glassmorphic header
    React.useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 10);
        };
        handleScroll(); // Initial check
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // ── Hide the Navbar entirely inside the dashboard (it has its own layout) ──
    if (pathname.startsWith('/dashboard')) return null;

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setIsMenuOpen(false);
    };

    const toggleMenu = () => setIsMenuOpen(prev => !prev);

    // Helper – returns true when the pathname starts with the given base
    const isActive = (base: string) => pathname.startsWith(base);

    return (
        <nav className={`${styles.navbar} ${isScrolled ? styles.scrolled : ''}`}>
            <div className={styles.container}>
                {/* ── Logo ── */}
                <Link href="/" className={styles.logo} onClick={scrollToTop}>
                    <Image
                        src="/TalentMesh_page-0002-removebg-preview.png"
                        alt="TalentMesh"
                        width={180}
                        height={50}
                        priority
                        className={styles.logoImg}
                        unoptimized
                    />
                </Link>

                {/* ── Desktop Nav ── */}
                <div className={styles.links}>

                    {/* Find Work */}
                    <div className={styles.navItem}>
                        <div className={`${styles.link} ${isActive('/browse-jobs') || isActive('/portals/jobs/career-advice') ? styles.linkActive : ''}`}>
                            Find Work <span className={styles.chevron}>▼</span>
                        </div>
                        <div className={styles.dropdown}>
                            {/* <Link href="/browse-jobs" className={`${styles.dropdownLink} ${pathname === '/browse-jobs' ? styles.dropdownLinkActive : ''}`}>Browse Jobs</Link> */}
                            <Link href="/job-seekers" className={`${styles.dropdownLink} ${pathname === '/job-seekers' ? styles.dropdownLinkActive : ''}`}>Candidate Benefits</Link>
                            <Link href="/portals/jobs/career-advice" className={`${styles.dropdownLink} ${pathname === '/career-advice' ? styles.dropdownLinkActive : ''}`}>Career Advice</Link>
                        </div>
                    </div>

                    {/* For Employers */}
                    <div className={styles.navItem}>
                        <div className={`${styles.link} ${isActive('/employers') ? styles.linkActive : ''}`}>
                            For Employers <span className={styles.chevron}>▼</span>
                        </div>
                        <div className={styles.dropdown}>
                            <Link href="/employers/post-job" className={`${styles.dropdownLink} ${pathname === '/employers/post-job' ? styles.dropdownLinkActive : ''}`}>Post a Job</Link>
                            <Link href="/employers/sourcing" className={`${styles.dropdownLink} ${pathname === '/employers/sourcing' ? styles.dropdownLinkActive : ''}`}>Talent Sourcing</Link>
                            {/* <Link href="/employers/products" className={`${styles.dropdownLink} ${pathname === '/employers/products' ? styles.dropdownLinkActive : ''}`}>Products & Pricing</Link> */}
                        </div>
                    </div>

                    {/* Company */}
                    <div className={styles.navItem}>
                        <div className={`${styles.link} ${isActive('/portals/jobs/about') || isActive('/portals/jobs/contact') /* || isActive('/portals/jobs/careers') */ || isActive('/blog') || isActive('/portals/jobs/podcast') ? styles.linkActive : ''}`}>
                            Company <span className={styles.chevron}>▼</span>
                        </div>
                        <div className={styles.dropdown}>
                            {/* <Link href="/portals/jobs/about" className={`${styles.dropdownLink} ${pathname === '/about' || pathname === '/portals/jobs/about' ? styles.dropdownLinkActive : ''}`}>About</Link> */}
                            <Link href="/portals/jobs/contact" className={`${styles.dropdownLink} ${pathname === '/portals/jobs/contact' ? styles.dropdownLinkActive : ''}`}>Contact</Link>
                            {/* <Link href="/portals/jobs/careers" className={`${styles.dropdownLink} ${pathname === '/careers' ? styles.dropdownLinkActive : ''}`}>Careers</Link> */}
                            <Link href="/blog" className={`${styles.dropdownLink} ${pathname === '/blog' ? styles.dropdownLinkActive : ''}`}>Blog</Link>
                            {/* <Link href="/portals/jobs/podcast" className={`${styles.dropdownLink} ${pathname === '/podcast' ? styles.dropdownLinkActive : ''}`}>Podcast</Link> */}
                        </div>
                    </div>

                    {/* Dashboard ── new dropdown
                    <div className={styles.navItem}>
                        <div className={styles.link}>
                            Dashboard <span className={styles.chevron}>▼</span>
                        </div>
                        <div className={styles.dropdown}>
                            <div className={styles.dropdownSectionLabel}>Recruiter</div>
                            <Link href="/dashboard/company" className={styles.dropdownLink}>
                                <span className={styles.ddIcon}>🏢</span> Company Hub
                            </Link>
                            <div className={styles.dropdownDivider} />
                            <div className={styles.dropdownSectionLabel}>Candidate</div>
                            <Link href="/dashboard/candidate" className={styles.dropdownLink}>
                                <span className={styles.ddIcon}>👤</span> My Career
                            </Link>
                        </div>
                    </div> */}
                </div>

                {/* ── Auth Buttons ── */}
                <div className={styles.auth}>
                    {/* Login dropdown — candidate stays on this host's /login; recruiter goes via
                        /recruiter/dashboard, which the proxy routes to the app-subdomain login
                        (or straight to the dashboard when already signed in). */}
                    <div className={styles.navItem}>
                        <Link href="/login" className={styles.loginBtn}>
                            Login <span className={styles.chevron}>▼</span>
                        </Link>
                        <div className={styles.dropdown}>
                            <Link href="/login" className={styles.dropdownLink}>Candidate Login</Link>
                            <Link href="/login" className={styles.dropdownLink}>Recruiter Login</Link>
                        </div>
                    </div>
                    <Link href="/login" className={styles.signupBtn}>Get Started</Link>
                </div>

                {/* ── Mobile Hamburger ── */}
                <button
                    className={`${styles.mobileToggle} ${isMenuOpen ? styles.open : ''}`}
                    onClick={toggleMenu}
                    aria-label="Toggle menu"
                    aria-expanded={isMenuOpen}
                >
                    <span className={styles.bar} />
                    <span className={styles.bar} />
                    <span className={styles.bar} />
                </button>
            </div>

            {/* ── Mobile Drawer ── */}
            <div className={`${styles.mobileNav} ${isMenuOpen ? styles.open : ''}`} aria-hidden={!isMenuOpen}>

                <div className={styles.mobileNavItem}>
                    <span className={styles.mobileNavLabel}>Find Work</span>
                    {/* <Link href="/browse-jobs" className={styles.mobileNavLink}>Browse Jobs</Link> */}
                    <Link href="/job-seekers" className={styles.mobileNavLink}>Candidate Benefits</Link>
                    <Link href="/portals/jobs/career-advice" className={styles.mobileNavLink}>Career Advice</Link>
                </div>

                <div className={styles.mobileNavItem}>
                    <span className={styles.mobileNavLabel}>For Employers</span>
                    <Link href="/employers/post-job" className={styles.mobileNavLink}>Post a Job</Link>
                    <Link href="/employers/sourcing" className={styles.mobileNavLink}>Talent Sourcing</Link>
                    {/* <Link href="/employers/products" className={styles.mobileNavLink}>Products & Pricing</Link> */}
                    {/* <Link href="/portals/jobs/case-studies" className={styles.mobileNavLink}>Success Stories</Link> */}
                </div>

                <div className={styles.mobileNavItem}>
                    <span className={styles.mobileNavLabel}>Company</span>
                    {/* <Link href="/portals/jobs/about" className={styles.mobileNavLink}>About</Link> */}
                    <Link href="/portals/jobs/contact" className={styles.mobileNavLink}>Contact</Link>
                    {/* <Link href="/portals/jobs/careers" className={styles.mobileNavLink}>Careers</Link> */}
                    <Link href="/blog" className={styles.mobileNavLink}>Blog</Link>
                    {/* <Link href="/portals/jobs/podcast" className={styles.mobileNavLink}>Podcast</Link> */}
                </div>

                <div className={styles.mobileAuth}>
                    <Link href="/login" className={styles.signupBtn} style={{ textAlign: 'center', justifyContent: 'center' }}>
                        Get Started
                    </Link>
                    <Link href="/login" className={styles.mobileLogin}>
                        Candidate Log In
                    </Link>
                    <Link href="/login" className={styles.mobileLogin}>
                        Recruiter Log In
                    </Link>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
