"use client";
import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowLeft, ArrowUpRight, ChevronRight } from 'lucide-react';
import { TALENTMESH_SERVICES } from '@/content/home';
import styles from './Navbar.module.css';

type NavKey = 'solutions' | 'portal' | 'company' | 'login';

const MENU_EXIT_MS = 200;

const MenuIcon = ({ expanded }: { expanded: boolean }) => (
    <svg className={`${styles.menuIcon} ${expanded ? styles.menuIconExpanded : ''}`} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
        <path className={styles.menuIconTop} data-menu-line="top" d="M4 6h16" />
        <path className={styles.menuIconMiddle} data-menu-line="middle" d="M4 12h16" />
        <path className={styles.menuIconBottom} data-menu-line="bottom" d="M4 18h16" />
    </svg>
);

const Navbar = () => {
    const [isMenuOpen, setIsMenuOpen] = React.useState(false);
    const [isMenuClosing, setIsMenuClosing] = React.useState(false);
    const [isScrolled, setIsScrolled] = React.useState(false);
    const [isOverDark, setIsOverDark] = React.useState(false);
    const [activeService, setActiveService] = React.useState(0);
    // Tracks which desktop dropdown currently has keyboard focus inside it, so its
    // trigger can report an accurate aria-expanded. Visibility itself is driven by
    // CSS (:hover / :focus-within) — this state never toggles the panel directly.
    const [openNav, setOpenNav] = React.useState<NavKey | null>(null);
    // Which mobile group's second screen is showing — null means level 1.
    const [mobileSub, setMobileSub] = React.useState<NavKey | null>(null);
    const pathname = usePathname();
    const mobileDialog = React.useRef<HTMLDialogElement>(null);
    // Group row to refocus once its second screen has been left via Back/Escape.
    const mobileReturnFocus = React.useRef<NavKey | null>(null);

    const finishClosingMenu = React.useCallback(() => {
        setIsMenuOpen(false);
        setIsMenuClosing(false);
        setMobileSub(null);
    }, []);

    const closeMenu = () => {
        if (isMenuClosing) return;
        const dialog = mobileDialog.current;
        if (!dialog || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            finishClosingMenu();
            return;
        }
        // Capture an interrupted entrance so an early close never jumps to a
        // fully open panel or icon before reversing. Keep the modal until exit ends.
        dialog.style.setProperty('--menu-exit-clip', getComputedStyle(dialog).clipPath);
        for (const line of ['top', 'middle', 'bottom']) {
            const path = dialog.querySelector(`[data-menu-line="${line}"]`);
            if (path) {
                dialog.style.setProperty(`--icon-${line}-exit`, getComputedStyle(path).transform);
                if (line === 'middle') dialog.style.setProperty('--icon-middle-opacity', getComputedStyle(path).opacity);
            }
        }
        setIsMenuClosing(true);
    };

    // A fallback also releases focus/scroll if animationend is interrupted or
    // the motion preference changes while the panel is closing.
    React.useEffect(() => {
        if (!isMenuClosing) return;
        const timer = window.setTimeout(finishClosingMenu, MENU_EXIT_MS + 50);
        return () => window.clearTimeout(timer);
    }, [isMenuClosing, finishClosingMenu]);

    // Close mobile menu on route change
    React.useEffect(() => { finishClosingMenu(); }, [pathname, finishClosingMenu]);

    // Track page scroll position for transparent vs glassmorphic header, and
    // whether the bar sits over a dark section (any element marked
    // data-nav-theme="dark"), where it turns transparent with a white logo.
    React.useEffect(() => {
        const NAV_LINE = 30; // px from the top: the middle of the bar
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 10);
            const dark = Array.from(document.querySelectorAll('[data-nav-theme="dark"]')).some((el) => {
                const r = el.getBoundingClientRect();
                return r.top <= NAV_LINE && r.bottom >= NAV_LINE;
            });
            setIsOverDark(dark);
        };
        handleScroll(); // Initial check
        window.addEventListener('scroll', handleScroll, { passive: true });
        window.addEventListener('resize', handleScroll);
        return () => {
            window.removeEventListener('scroll', handleScroll);
            window.removeEventListener('resize', handleScroll);
        };
    }, [pathname]);

    // Native modal keeps focus inside the menu and makes the page behind it inert.
    React.useEffect(() => {
        const dialog = mobileDialog.current;
        if (!isMenuOpen || !dialog) return;
        const previousOverflow = document.body.style.overflow;
        dialog.showModal();
        document.body.style.overflow = 'hidden';
        const desktop = window.matchMedia('(min-width: 1025px)');
        const closeOnDesktop = () => { if (desktop.matches) finishClosingMenu(); };
        desktop.addEventListener('change', closeOnDesktop);
        return () => {
            dialog.close();
            document.body.style.overflow = previousOverflow;
            desktop.removeEventListener('change', closeOnDesktop);
        };
    }, [isMenuOpen, finishClosingMenu]);

    // Runs after the commit that swaps which level is inert, so the target is focusable.
    // preventScroll: the incoming level is still mid-slide and must not be scrolled into view.
    React.useEffect(() => {
        if (mobileSub) {
            document.getElementById(`mobile-back-${mobileSub}`)?.focus({ preventScroll: true });
        } else if (mobileReturnFocus.current) {
            document.getElementById(`mobile-trigger-${mobileReturnFocus.current}`)?.focus({ preventScroll: true });
            mobileReturnFocus.current = null;
        }
    }, [mobileSub]);

    // ── Hide the Navbar entirely inside the dashboard (it has its own layout) ──
    if (pathname.startsWith('/dashboard')) return null;

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        finishClosingMenu();
    };

    const toggleMenu = () => {
        setIsMenuClosing(false);
        setMobileSub(null);
        setIsMenuOpen(prev => !prev);
    };

    const closeMobileSub = () => {
        mobileReturnFocus.current = mobileSub;
        setMobileSub(null);
    };

    // Escape (or any other close request) steps back one level before closing.
    const dismissMobileLevel = () => {
        if (mobileSub) closeMobileSub();
        else closeMenu();
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
    const isTransparentNav = (((isHome || pathname === '/about') && !isScrolled) || isOverDark) && !isMenuOpen;

    const mobileGroups: { key: NavKey; title: string; active: boolean; links: { href: string; label: string }[] }[] = [
        {
            key: 'solutions',
            title: 'Talent Solutions',
            active: isSolutionsActive,
            links: [{ href: '/contact', label: 'Hire Talent' }, ...TALENTMESH_SERVICES.flatMap(service => service.actionPills)],
        },
        {
            key: 'portal',
            title: 'Talent Portal',
            active: isPortalActive,
            links: [
                { href: '/talentmesh-portal', label: 'Talentmesh Portal' },
                { href: '/job-seekers', label: 'Candidate Benefits' },
                { href: '/employers/post-job', label: 'Post a Job' },
            ],
        },
        {
            key: 'company',
            title: 'Company',
            active: isCompanyActive,
            links: [
                { href: '/about', label: 'About' },
                { href: '/contact', label: 'Contact' },
                { href: '/blog', label: 'Blog' },
                { href: '/career-advice', label: 'Career Advice' },
            ],
        },
    ];

    return (
        <nav className={`${styles.navbar} ${isHome ? styles.homeNav : ''} ${isScrolled && !isTransparentNav ? styles.scrolled : ''} ${isTransparentNav ? styles.transparentNav : ''} ${isMenuOpen ? styles.menuOpen : ''}`}>

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
                        alt="Talentmesh Solutions"
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
                            <span className={styles.linkLabel}>Talent Solutions</span> <span className={styles.chevron} aria-hidden="true">▼</span>
                        </button>
                        <div id="mega-panel-solutions" className={styles.megaPanel}>
                            <div className={styles.megaPanelInner}>

                                {/* Left column — intro + CTAs */}
                                <div className={styles.megaIntro}>
                                    <h3 className={styles.megaIntroTitle}>Talent Solutions</h3>
                                    <p className={styles.megaIntroText}>
                                        From flexible staffing to global capability centers, we design
                                        end-to-end workforce solutions that scale with your business,
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
                            <span className={styles.linkLabel}>Talent Portal</span> <span className={styles.chevron} aria-hidden="true">▼</span>
                        </button>
                        <div id="dropdown-portal" className={styles.dropdown}>
                            <Link href="/talentmesh-portal" className={`${styles.dropdownLink} ${pathname === '/talentmesh-portal' ? styles.dropdownLinkActive : ''}`}>Talentmesh Portal</Link>
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
                            <span className={styles.linkLabel}>Company</span> <span className={styles.chevron} aria-hidden="true">▼</span>
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
                    <MenuIcon expanded={isMenuOpen && !isMenuClosing} />
                </button>
            </div>

            {/* ── Mobile Drawer ── */}
            <dialog
                ref={mobileDialog}
                id="mobile-navigation"
                className={styles.mobileNav}
                aria-label="Main navigation"
                data-closing={isMenuClosing}
                style={{ '--menu-exit-duration': `${MENU_EXIT_MS}ms` } as React.CSSProperties}
                onCancel={(event) => { event.preventDefault(); dismissMobileLevel(); }}
                onKeyDown={(event) => {
                    // Handled here as well as onCancel: browsers let a second
                    // consecutive Escape close a modal without a cancelable event.
                    if (event.key === 'Escape') { event.preventDefault(); dismissMobileLevel(); }
                }}
                onAnimationEnd={(event) => {
                    if (event.target === event.currentTarget && isMenuClosing) finishClosingMenu();
                }}
                onClick={(event) => {
                    if ((event.target as Element).closest('a')) closeMenu();
                }}
            >
                <div className={styles.mobileHeader}>
                    <Link href="/" className={styles.logo} aria-label="Talentmesh Solutions home">
                        <Image src="/talentmesh-solutions-logo-transparent.png" alt="Talentmesh Solutions" width={2172} height={724} sizes="162px" className={styles.logoImg} />
                    </Link>
                    <button type="button" className={styles.mobileClose} onClick={closeMenu} aria-label="Close navigation menu" autoFocus>
                        <MenuIcon expanded={isMenuOpen && !isMenuClosing} />
                    </button>
                </div>
                <div className={styles.mobileLevels}>
                    <div className={`${styles.mobileScroll} ${styles.mobileLevel} ${mobileSub ? styles.mobileLevelBehind : ''}`} inert={mobileSub !== null}>
                        <Link href="/" className={`${styles.mobileHome} ${isHome ? styles.mobileNavLinkActive : ''}`} aria-current={isHome ? 'page' : undefined}>Home<ArrowUpRight size={19} aria-hidden="true" /></Link>

                        {mobileGroups.map(group => (
                            <div key={group.key} className={styles.mobileNavItem}>
                                <button
                                    id={`mobile-trigger-${group.key}`}
                                    type="button"
                                    className={`${styles.mobileNavSectionHeader} ${group.active ? styles.mobileNavSectionActive : ''}`}
                                    onClick={() => setMobileSub(group.key)}
                                    aria-haspopup="true"
                                    aria-expanded={mobileSub === group.key}
                                    aria-controls={`mobile-section-${group.key}`}
                                >
                                    <span>{group.title}</span>
                                    <ChevronRight size={21} className={styles.chevron} aria-hidden="true" />
                                </button>
                            </div>
                        ))}
                    </div>

                    {mobileGroups.map(group => (
                        <div
                            key={group.key}
                            id={`mobile-section-${group.key}`}
                            className={`${styles.mobileScroll} ${styles.mobileLevel} ${mobileSub === group.key ? '' : styles.mobileLevelAhead}`}
                            role="group"
                            aria-labelledby={`mobile-section-title-${group.key}`}
                            inert={mobileSub !== group.key}
                        >
                            <div className={styles.mobileSubHeader}>
                                <button
                                    id={`mobile-back-${group.key}`}
                                    type="button"
                                    className={styles.mobileBack}
                                    onClick={closeMobileSub}
                                    aria-label="Back to main menu"
                                >
                                    <ArrowLeft size={19} aria-hidden="true" />Back
                                </button>
                                <h2 id={`mobile-section-title-${group.key}`} className={styles.mobileSubTitle}>{group.title}</h2>
                            </div>
                            <div className={`${styles.mobileNavSectionBody} ${group.key === 'solutions' ? styles.mobileNavGrid : ''}`}>
                                {group.links.map(link => mobileLink(link.href, link.label))}
                            </div>
                        </div>
                    ))}
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
