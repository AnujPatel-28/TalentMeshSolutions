"use client";
import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { TALENTMESH_SERVICES } from '@/content/home';
import styles from './Navbar.module.css';

type NavKey = 'solutions' | 'portal' | 'company' | 'login';

const Navbar = () => {
    const [isMenuOpen, setIsMenuOpen] = React.useState(false);
    const [isScrolled, setIsScrolled] = React.useState(false);
    const [activeService, setActiveService] = React.useState(0);
    // Tracks which desktop dropdown currently has keyboard focus inside it, so its
    // trigger can report an accurate aria-expanded. Visibility itself is driven by
    // CSS (:hover / :focus-within) — this state never toggles the panel directly.
    const [openNav, setOpenNav] = React.useState<NavKey | null>(null);
    // Which top-level mobile drawer section is expanded — collapsed (null) by default.
    const [expandedMobileSection, setExpandedMobileSection] = React.useState<NavKey | null>(null);
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

    // Prevent body scroll when mobile menu is open
    React.useEffect(() => {
        if (isMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
            setExpandedMobileSection(null);
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isMenuOpen]);

    // ── Hide the Navbar entirely inside the dashboard (it has its own layout) ──
    if (pathname.startsWith('/dashboard')) return null;

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setIsMenuOpen(false);
    };

    const toggleMenu = () => setIsMenuOpen(prev => !prev);

    // Helper – returns true when the pathname starts with the given base
    const isActive = (base: string) => pathname.startsWith(base);

    // Talent Solutions covers the 12 individual solution pages.
    // Exact match, not startsWith, so a leaf solution
    // page doesn't also light up Talent Portal.
    const isSolutionsActive =
        TALENTMESH_SERVICES.some(service =>
            service.actionPills.some(pill => pathname === pill.href)
        );
    const isPortalActive =
        isActive('/talentmesh-portal') || pathname === '/job-seekers' || isActive('/employers/post-job');
    const isCompanyActive =
        isActive('/about') || isActive('/contact') || isActive('/blog') || isActive('/career-advice');

    const isHome = pathname === '/';
    // /about opens with a full-bleed dark cinematic hero, so it borrows the
    // home transparent-over-dark treatment until the first scroll.
    const isTransparentNav = (isHome || pathname === '/about') && !isScrolled && !isMenuOpen;

    return (
        <nav className={`${styles.navbar} ${isHome ? styles.homeNav : ''} ${isScrolled ? styles.scrolled : ''} ${isTransparentNav ? styles.transparentNav : ''} ${isMenuOpen ? styles.menuOpen : ''}`}>

            <div className={styles.container}>
                {/* ── Logo ── */}
                <Link
                    href="/"
                    className={styles.logo}
                    onClick={scrollToTop}
                    tabIndex={isMenuOpen ? -1 : undefined}
                >
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

                    {/* Talent Solutions */}
                    <div
                        className={styles.navItem}
                        onFocus={() => setOpenNav('solutions')}
                        onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpenNav(null); }}
                    >
                        <button
                            type="button"
                            className={`${styles.link} ${isSolutionsActive ? styles.linkActive : ''}`}
                            aria-haspopup="true"
                            aria-expanded={openNav === 'solutions'}
                            aria-controls="mega-panel-solutions"
                        >
                            Talent Solutions <span className={styles.chevron} aria-hidden="true">▼</span>
                        </button>
                        <div id="mega-panel-solutions" className={styles.megaPanel}>
                            <div className={styles.megaPanelInner}>

                                {/* Left column — intro + CTAs */}
                                <div className={styles.megaIntro}>
                                    <h3 className={styles.megaIntroTitle}>Talent Solutions</h3>
                                    <p className={styles.megaIntroText}>
                                        From flexible staffing to global capability centers, we design
                                        end-to-end workforce solutions that scale with your business —
                                        whichever hiring model fits your team today.
                                    </p>
                                    <div className={styles.megaIntroActions}>
                                        <Link href="/contact" className={styles.megaCtaPrimary}>Hire Talent</Link>
                                        <Link href="/employers/post-job" className={styles.megaCtaSecondary}>Post a Job</Link>
                                    </div>
                                </div>

                                {/* Middle column — category rows */}
                                <div className={styles.megaCategories}>
                                    {TALENTMESH_SERVICES.map((service, i) => (
                                        <div key={service.title} className={styles.megaCategoryRow}>
                                            <button
                                                type="button"
                                                className={`${styles.megaCategoryTrigger} ${i === activeService ? styles.megaCategoryTriggerActive : ''}`}
                                                onMouseEnter={() => setActiveService(i)}
                                                onFocus={() => setActiveService(i)}
                                                aria-expanded={i === activeService}
                                                aria-controls={`mega-pills-${i}`}
                                            >
                                                {service.title}
                                            </button>
                                            <div
                                                id={`mega-pills-${i}`}
                                                className={`${styles.megaPillGroup} ${i === activeService ? styles.megaPillGroupOpen : ''}`}
                                            >
                                                {service.actionPills.map(pill => (
                                                    <Link
                                                        key={pill.label}
                                                        href={pill.href}
                                                        className={styles.megaPillLink}
                                                    >
                                                        {pill.label}
                                                    </Link>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Right column — active category media */}
                                <div className={styles.megaMedia}>
                                    <div className={styles.megaMediaImageWrap}>
                                        <Image
                                            src={TALENTMESH_SERVICES[activeService].image}
                                            alt=""
                                            fill
                                            sizes="320px"
                                            className={styles.megaMediaImage}
                                        />
                                    </div>
                                    <p className={styles.megaMediaText}>
                                        {TALENTMESH_SERVICES[activeService].description}
                                    </p>
                                </div>

                            </div>
                        </div>
                    </div>

                    {/* Talent Portal */}
                    <div
                        className={styles.navItem}
                        onFocus={() => setOpenNav('portal')}
                        onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpenNav(null); }}
                    >
                        <button
                            type="button"
                            className={`${styles.link} ${isPortalActive ? styles.linkActive : ''}`}
                            aria-haspopup="true"
                            aria-expanded={openNav === 'portal'}
                            aria-controls="dropdown-portal"
                        >
                            Talent Portal <span className={styles.chevron} aria-hidden="true">▼</span>
                        </button>
                        <div id="dropdown-portal" className={styles.dropdown}>
                            <Link href="/talentmesh-portal" className={`${styles.dropdownLink} ${pathname === '/talentmesh-portal' ? styles.dropdownLinkActive : ''}`}>TalentMesh Portal</Link>
                            <Link href="/job-seekers" className={`${styles.dropdownLink} ${pathname === '/job-seekers' ? styles.dropdownLinkActive : ''}`}>Candidate Benefits</Link>
                            <Link href="/employers/post-job" className={`${styles.dropdownLink} ${pathname === '/employers/post-job' ? styles.dropdownLinkActive : ''}`}>Post a Job</Link>
                        </div>
                    </div>

                    {/* Company */}
                    <div
                        className={styles.navItem}
                        onFocus={() => setOpenNav('company')}
                        onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpenNav(null); }}
                    >
                        <button
                            type="button"
                            className={`${styles.link} ${isCompanyActive ? styles.linkActive : ''}`}
                            aria-haspopup="true"
                            aria-expanded={openNav === 'company'}
                            aria-controls="dropdown-company"
                        >
                            Company <span className={styles.chevron} aria-hidden="true">▼</span>
                        </button>
                        <div id="dropdown-company" className={styles.dropdown}>
                            <Link href="/about" className={`${styles.dropdownLink} ${pathname === '/about' ? styles.dropdownLinkActive : ''}`}>About</Link>
                            <Link href="/contact" className={`${styles.dropdownLink} ${pathname === '/contact' ? styles.dropdownLinkActive : ''}`}>Contact</Link>
                            <Link href="/blog" className={`${styles.dropdownLink} ${pathname === '/blog' ? styles.dropdownLinkActive : ''}`}>Blog</Link>
                            <Link href="/career-advice" className={`${styles.dropdownLink} ${isActive('/career-advice') ? styles.dropdownLinkActive : ''}`}>Career Advice</Link>
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
                    <div
                        className={styles.navItem}
                        onFocus={() => setOpenNav('login')}
                        onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpenNav(null); }}
                    >
                        <Link
                            href="/login"
                            className={styles.loginBtn}
                            aria-haspopup="true"
                            aria-expanded={openNav === 'login'}
                            aria-controls="dropdown-login"
                        >
                            Login <span className={styles.chevron} aria-hidden="true">▼</span>
                        </Link>
                        <div id="dropdown-login" className={styles.dropdown}>
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
                    <button
                        type="button"
                        className={styles.mobileNavSectionHeader}
                        onClick={() => setExpandedMobileSection(prev => (prev === 'solutions' ? null : 'solutions'))}
                        aria-expanded={expandedMobileSection === 'solutions'}
                        aria-controls="mobile-section-solutions"
                    >
                        Talent Solutions
                        <span className={styles.chevron} aria-hidden="true">▼</span>
                    </button>
                    <div id="mobile-section-solutions" className={`${styles.mobileNavSectionBody} ${expandedMobileSection === 'solutions' ? styles.mobileNavSectionBodyOpen : ''}`}>
                        <Link href="/contact" className={styles.mobileNavLink}>Hire Talent</Link>
                        {TALENTMESH_SERVICES.map(service => (
                            <React.Fragment key={service.title}>
                                <span className={styles.mobileCategoryLabel}>{service.title}</span>
                                {service.actionPills.map(pill => (
                                    <Link
                                        key={pill.href}
                                        href={pill.href}
                                        className={`${styles.mobileNavSubLink} ${pathname === pill.href ? styles.mobileNavLinkActive : ''}`}
                                    >
                                        {pill.label}
                                    </Link>
                                ))}
                            </React.Fragment>
                        ))}
                    </div>
                </div>

                <div className={styles.mobileNavItem}>
                    <button
                        type="button"
                        className={styles.mobileNavSectionHeader}
                        onClick={() => setExpandedMobileSection(prev => (prev === 'portal' ? null : 'portal'))}
                        aria-expanded={expandedMobileSection === 'portal'}
                        aria-controls="mobile-section-portal"
                    >
                        Talent Portal
                        <span className={styles.chevron} aria-hidden="true">▼</span>
                    </button>
                    <div id="mobile-section-portal" className={`${styles.mobileNavSectionBody} ${expandedMobileSection === 'portal' ? styles.mobileNavSectionBodyOpen : ''}`}>
                        <Link href="/talentmesh-portal" className={`${styles.mobileNavLink} ${pathname === '/talentmesh-portal' ? styles.mobileNavLinkActive : ''}`}>TalentMesh Portal</Link>
                        <Link href="/job-seekers" className={`${styles.mobileNavLink} ${pathname === '/job-seekers' ? styles.mobileNavLinkActive : ''}`}>Candidate Benefits</Link>
                        <Link href="/employers/post-job" className={`${styles.mobileNavLink} ${pathname === '/employers/post-job' ? styles.mobileNavLinkActive : ''}`}>Post a Job</Link>
                    </div>
                </div>

                <div className={styles.mobileNavItem}>
                    <button
                        type="button"
                        className={styles.mobileNavSectionHeader}
                        onClick={() => setExpandedMobileSection(prev => (prev === 'company' ? null : 'company'))}
                        aria-expanded={expandedMobileSection === 'company'}
                        aria-controls="mobile-section-company"
                    >
                        Company
                        <span className={styles.chevron} aria-hidden="true">▼</span>
                    </button>
                    <div id="mobile-section-company" className={`${styles.mobileNavSectionBody} ${expandedMobileSection === 'company' ? styles.mobileNavSectionBodyOpen : ''}`}>
                        <Link href="/about" className={`${styles.mobileNavLink} ${pathname === '/about' ? styles.mobileNavLinkActive : ''}`}>About</Link>
                        <Link href="/contact" className={`${styles.mobileNavLink} ${pathname === '/contact' ? styles.mobileNavLinkActive : ''}`}>Contact</Link>
                        <Link href="/blog" className={`${styles.mobileNavLink} ${pathname === '/blog' ? styles.mobileNavLinkActive : ''}`}>Blog</Link>
                        <Link href="/career-advice" className={`${styles.mobileNavLink} ${isActive('/career-advice') ? styles.mobileNavLinkActive : ''}`}>Career Advice</Link>
                    </div>
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
