"use client";
import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowUpRight, ChevronDown, ChevronRight, Menu, X } from 'lucide-react';
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
    const [expandedMobileService, setExpandedMobileService] = React.useState<number | null>(null);
    const pathname = usePathname();
    const mobileDialog = React.useRef<HTMLDialogElement>(null);
    const mobileScroll = React.useRef<HTMLDivElement>(null);

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

    // Native modal keeps focus inside the menu and makes the page behind it inert.
    React.useEffect(() => {
        const dialog = mobileDialog.current;
        if (!isMenuOpen || !dialog) return;
        const previousOverflow = document.body.style.overflow;
        dialog.showModal();
        document.body.style.overflow = 'hidden';
        const desktop = window.matchMedia('(min-width: 1025px)');
        const closeOnDesktop = () => { if (desktop.matches) setIsMenuOpen(false); };
        desktop.addEventListener('change', closeOnDesktop);
        return () => {
            dialog.close();
            document.body.style.overflow = previousOverflow;
            desktop.removeEventListener('change', closeOnDesktop);
        };
    }, [isMenuOpen]);

    // Run after showModal and the accordion layout settle, including reopening
    // on a service page. Only the menu's own scroll container is repositioned.
    React.useEffect(() => {
        if (!isMenuOpen || !expandedMobileSection) return;
        const frame = requestAnimationFrame(() => {
            const scroller = mobileScroll.current;
            const heading = document.getElementById(`mobile-trigger-${expandedMobileSection}`);
            if (!scroller || !heading) return;
            scroller.scrollTop += heading.getBoundingClientRect().top - scroller.getBoundingClientRect().top;
            if (expandedMobileSection === 'solutions' && expandedMobileService !== null) {
                const service = document.getElementById(`mobile-service-trigger-${expandedMobileService}`);
                if (service) {
                    scroller.scrollTop += service.getBoundingClientRect().top - scroller.getBoundingClientRect().top - heading.offsetHeight;
                }
            }
        });
        return () => cancelAnimationFrame(frame);
    }, [isMenuOpen, expandedMobileSection, expandedMobileService]);

    // ── Hide the Navbar entirely inside the dashboard (it has its own layout) ──
    if (pathname.startsWith('/dashboard')) return null;

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setIsMenuOpen(false);
    };

    const toggleMenu = () => {
        const serviceIndex = TALENTMESH_SERVICES.findIndex(service => service.actionPills.some(pill => pill.href === pathname));
        setExpandedMobileService(serviceIndex < 0 ? null : serviceIndex);
        setExpandedMobileSection(serviceIndex >= 0 ? 'solutions' : isPortalActive ? 'portal' : isCompanyActive ? 'company' : null);
        setIsMenuOpen(prev => !prev);
    };

    const toggleMobileSection = (section: NavKey) => {
        setExpandedMobileSection(prev => prev === section ? null : section);
    };

    const mobileLink = (href: string, label: string) => (
        <Link
            key={href}
            href={href}
            aria-current={pathname === href ? 'page' : undefined}
            className={`${styles.mobileNavLink} ${pathname === href ? styles.mobileNavLinkActive : ''}`}
        >
            <span>{label}</span>
            <ChevronRight size={18} aria-hidden="true" />
        </Link>
    );

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
                        src="/talentmesh-solutions-logo-transparent.png"
                        alt="TalentMesh Solutions"
                        width={2172}
                        height={724}
                        sizes="(max-width: 1024px) 162px, 180px"
                        priority
                        className={styles.logoImg}
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
                                        end-to-end workforce solutions that scale with your business
                                        and fit the way your team hires today.
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
                    type="button"
                    className={styles.mobileToggle}
                    onClick={toggleMenu}
                    aria-label="Open navigation menu"
                    aria-expanded={isMenuOpen}
                    aria-controls="mobile-navigation"
                    aria-haspopup="dialog"
                >
                    <span>Menu</span>
                    <Menu size={22} strokeWidth={1.7} aria-hidden="true" />
                </button>
            </div>

            {/* ── Mobile Drawer ── */}
            <dialog
                ref={mobileDialog}
                id="mobile-navigation"
                className={styles.mobileNav}
                aria-label="Main navigation"
                onCancel={() => setIsMenuOpen(false)}
                onClick={(event) => {
                    if ((event.target as Element).closest('a')) setIsMenuOpen(false);
                }}
            >
                <div className={styles.mobileHeader}>
                    <Link href="/" className={styles.logo} aria-label="TalentMesh Solutions home">
                        <Image src="/talentmesh-solutions-logo-transparent.png" alt="TalentMesh Solutions" width={2172} height={724} sizes="162px" className={styles.logoImg} />
                    </Link>
                    <button type="button" className={styles.mobileClose} onClick={() => setIsMenuOpen(false)} aria-label="Close navigation menu" autoFocus>
                        <X size={24} strokeWidth={1.7} aria-hidden="true" />
                    </button>
                </div>
                <div ref={mobileScroll} className={styles.mobileScroll}>
                    <div className={styles.mobileIntro}>
                        <h2>People. Possibilities.<br /><span>The right connection.</span></h2>
                    </div>
                    <Link href="/" className={`${styles.mobileHome} ${isHome ? styles.mobileNavLinkActive : ''}`} aria-current={isHome ? 'page' : undefined}>Home<ArrowUpRight size={19} aria-hidden="true" /></Link>

                    <div className={styles.mobileNavItem}>
                        <button
                            id="mobile-trigger-solutions"
                            type="button"
                            className={styles.mobileNavSectionHeader}
                            onClick={() => toggleMobileSection('solutions')}
                            aria-expanded={expandedMobileSection === 'solutions'}
                            aria-controls="mobile-section-solutions"
                        >
                            <span>Talent Solutions<small>Build and grow your team</small></span>
                            <ChevronDown size={21} className={styles.chevron} aria-hidden="true" />
                        </button>
                        <div id="mobile-section-solutions" className={styles.mobileNavSectionBody} role="region" aria-labelledby="mobile-trigger-solutions" hidden={expandedMobileSection !== 'solutions'}>
                            {mobileLink('/contact', 'Hire Talent')}
                            {TALENTMESH_SERVICES.map((service, index) => (
                                <div key={service.title} className={styles.mobileService}>
                                    <button
                                        id={`mobile-service-trigger-${index}`}
                                        type="button"
                                        className={styles.mobileServiceTrigger}
                                        onClick={() => setExpandedMobileService(prev => prev === index ? null : index)}
                                        aria-expanded={expandedMobileService === index}
                                        aria-controls={`mobile-service-${index}`}
                                    >
                                        <span>{service.title}</span>
                                        <ChevronDown size={18} aria-hidden="true" />
                                    </button>
                                    <div id={`mobile-service-${index}`} className={styles.mobileServiceLinks} hidden={expandedMobileService !== index}>
                                        {service.actionPills.map(pill => mobileLink(pill.href, pill.label))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className={styles.mobileNavItem}>
                        <button
                            id="mobile-trigger-portal"
                            type="button"
                            className={styles.mobileNavSectionHeader}
                            onClick={() => toggleMobileSection('portal')}
                            aria-expanded={expandedMobileSection === 'portal'}
                            aria-controls="mobile-section-portal"
                        >
                            <span>Talent Portal<small>Find opportunities. Connect with talent.</small></span>
                            <ChevronDown size={21} className={styles.chevron} aria-hidden="true" />
                        </button>
                        <div id="mobile-section-portal" className={styles.mobileNavSectionBody} role="region" aria-labelledby="mobile-trigger-portal" hidden={expandedMobileSection !== 'portal'}>
                            {mobileLink('/talentmesh-portal', 'TalentMesh Portal')}
                            {mobileLink('/job-seekers', 'Candidate Benefits')}
                            {mobileLink('/employers/post-job', 'Post a Job')}
                        </div>
                    </div>

                    <div className={styles.mobileNavItem}>
                        <button
                            id="mobile-trigger-company"
                            type="button"
                            className={styles.mobileNavSectionHeader}
                            onClick={() => toggleMobileSection('company')}
                            aria-expanded={expandedMobileSection === 'company'}
                            aria-controls="mobile-section-company"
                        >
                            <span>Company<small>Meet TalentMesh and explore our insights</small></span>
                            <ChevronDown size={21} className={styles.chevron} aria-hidden="true" />
                        </button>
                        <div id="mobile-section-company" className={styles.mobileNavSectionBody} role="region" aria-labelledby="mobile-trigger-company" hidden={expandedMobileSection !== 'company'}>
                            {mobileLink('/about', 'About')}
                            {mobileLink('/contact', 'Contact')}
                            {mobileLink('/blog', 'Blog')}
                            {mobileLink('/career-advice', 'Career Advice')}
                        </div>
                    </div>
                </div>
                <div className={styles.mobileAuth}>
                    <Link href="/contact" className={styles.mobilePrimary}>
                        Get Hiring Support<ArrowUpRight size={20} aria-hidden="true" />
                    </Link>
                    <div className={styles.mobileLoginRow}>
                        <Link href="/login" className={styles.mobileLogin}>
                            Candidate login
                        </Link>
                        <Link href="/login" className={styles.mobileLogin}>
                            Recruiter login
                        </Link>
                    </div>
                </div>
            </dialog>
        </nav>
    );
};

export default Navbar;
