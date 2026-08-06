"use client";
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { insforge, directInsforge } from '@/lib/insforge';
import { getPublicStorageUrl } from '@/lib/utils/storage-url';
import { toast } from 'react-hot-toast';
import styles from './CandidateTopNavShell.module.css';

/* ─── SVG Icons ─── */
const Icons = {
    bookmark: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
        </svg>
    ),
    messages: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
    ),
    bell: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
    ),
    menu: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="6" x2="20" y2="6" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="18" x2="20" y2="18" />
        </svg>
    ),
    close: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
    ),
};

interface NavItem {
    label: string;
    href: string;
}

export default function CandidateTopNavShell({ children }: { children: React.ReactNode }) {
    const { user, signOut } = useAuth();
    const pathname = usePathname();
    const router = useRouter();

    const isSubPage = useMemo(() => {
        if (!pathname) return false;
        if (pathname === '/candidate/dashboard' || pathname === '/candidate/dashboard/') return false;
        const match = pathname.match(/^\/dashboard\/candidate\/([^\/]+)\/?$/);
        if (match) return false;
        return true;
    }, [pathname]);

    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isSigningOut, setIsSigningOut] = useState(false);
    const [unreadNotif, setUnreadNotif] = useState(false);

    const dropdownRef = useRef<HTMLDivElement>(null);
    const avatarRef = useRef<HTMLDivElement>(null);


    // Left Navigation Definitions (Find Jobs / Company reviews / My Jobs)
    const navItems = useMemo<NavItem[]>(() => [
        { label: 'Find Jobs', href: '/candidate/dashboard' },
        { label: 'My Jobs', href: '/candidate/dashboard/applications' },
        { label: 'Company reviews', href: '/candidate/dashboard/company-reviews' },
    ], []);

    // Load unread notifications dot
    const loadMetadata = useCallback(async () => {
        if (!user?.id) return;
        try {
            const { data } = await insforge.database
                .from('notifications')
                .select('id')
                .eq('user_id', user.id)
                .eq('is_read', false)
                .limit(1);
            setUnreadNotif(!!(data && data.length > 0));
        } catch (e) {
            console.error('Failed to load notification dot:', e);
        }
    }, [user?.id]);

    useEffect(() => {
        if (!user?.id) return;
        loadMetadata();

        const handleUpdate = () => {
            loadMetadata();
        };

        const setupRealtime = async () => {
            try {
                await directInsforge.realtime.connect();
                await directInsforge.realtime.subscribe('notifications:' + user.id);
                directInsforge.realtime.on('INSERT_notifications', handleUpdate);
                directInsforge.realtime.on('UPDATE_notifications', handleUpdate);
            } catch (err) {
                console.error('Failed to setup realtime in top nav:', err);
            }
        };

        setupRealtime();

        return () => {
            directInsforge.realtime.off('INSERT_notifications', handleUpdate);
            directInsforge.realtime.off('UPDATE_notifications', handleUpdate);
            directInsforge.realtime.unsubscribe('notifications:' + user.id);
        };
    }, [user?.id, loadMetadata]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (
                dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
                avatarRef.current && !avatarRef.current.contains(event.target as Node)
            ) {
                setIsDropdownOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Track internal dashboard navigation history to prevent back button from going to /login
    useEffect(() => {
        if (typeof window === 'undefined') return;
        
        try {
            const currentHistory = JSON.parse(sessionStorage.getItem('tm_candidate_history') || '[]');
            if (pathname && (pathname.startsWith('/candidate/dashboard') || pathname.startsWith('/dashboard/candidate'))) {
                // Keep the history clean, avoid consecutive duplicates
                if (currentHistory[currentHistory.length - 1] !== pathname) {
                    currentHistory.push(pathname);
                    sessionStorage.setItem('tm_candidate_history', JSON.stringify(currentHistory));
                }
            }
        } catch (e) {
            console.warn('Failed to update candidate history:', e);
        }
    }, [pathname]);

    // Set browser tab title dynamically based on the current candidate dashboard page
    useEffect(() => {
        if (typeof window === 'undefined') return;

        let heading = 'Dashboard';
        
        if (pathname === '/candidate/dashboard' || pathname === `/dashboard/candidate/${user?.role_id || ''}`) {
            heading = 'Find Jobs';
        } else if (pathname.includes('/applications')) {
            heading = 'My Applications';
        } else if (pathname.includes('/company-reviews')) {
            heading = 'Company Reviews';
        } else if (pathname.includes('/profile')) {
            heading = 'My Profile';
        } else if (pathname.includes('/saved-jobs')) {
            heading = 'Saved Jobs';
        } else if (pathname.includes('/messages')) {
            heading = 'Messages';
        } else if (pathname.includes('/notifications')) {
            heading = 'Notifications';
        } else if (pathname.includes('/settings')) {
            heading = 'Settings';
        } else if (pathname.includes('/referrals')) {
            heading = 'My Reviews';
        }

        document.title = `${heading} | TalentMesh`;
    }, [pathname, user?.role_id]);

    const handleSignOut = async () => {
        if (isSigningOut) return;
        setIsSigningOut(true);
        try {
            if (typeof window !== 'undefined') {
                sessionStorage.removeItem('tm_candidate_history');
            }
            await signOut();
            router.push('/login');
            toast.success('Signed out successfully');
        } catch (err) {
            console.error('Sign out error:', err);
            toast.error('Failed to sign out');
        } finally {
            setIsSigningOut(false);
        }
    };

    const handleBackClick = () => {
        if (typeof window !== 'undefined') {
            const event = new CustomEvent('app:back', { cancelable: true });
            const prevented = !window.dispatchEvent(event);
            if (prevented) return;
            
            try {
                const currentHistory = JSON.parse(sessionStorage.getItem('tm_candidate_history') || '[]');
                
                // Pop the current page first
                if (currentHistory.length > 0 && currentHistory[currentHistory.length - 1] === pathname) {
                    currentHistory.pop();
                }
                
                // Pop the actual previous page to go back to it
                const prevPage = currentHistory.pop();
                sessionStorage.setItem('tm_candidate_history', JSON.stringify(currentHistory));
                
                if (prevPage && (prevPage.startsWith('/candidate/dashboard') || prevPage.startsWith('/dashboard/candidate'))) {
                    router.push(prevPage);
                    return;
                }
            } catch (e) {
                console.warn('Failed to navigate using candidate history:', e);
            }
            
            router.push('/candidate/dashboard');
            return;
        }
        router.back();
    };

    const userInitials = useMemo(() => {
        if (user?.name) {
            return user.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
        }
        return 'C';
    }, [user?.name]);

    return (
        <div className={styles.shell}>
            <header className={styles.header}>
                <div className={styles.leftSection}>
                    {isSubPage && (
                        <button 
                            onClick={handleBackClick} 
                            className={styles.headerBackButton} 
                            title="Go Back"
                            aria-label="Go Back"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="19" y1="12" x2="5" y2="12"></line>
                                <polyline points="12 19 5 12 12 5"></polyline>
                            </svg>
                        </button>
                    )}
                    {/* Logo Only */}
                    <Link href="/candidate/dashboard" className={styles.brand}>
                        <Image
                            src="/TalentMesh_page-0002-removebg-preview.png"
                            alt="TalentMesh Logo"
                            width={150}
                            height={48}
                            unoptimized
                            style={{ objectFit: 'contain', maxHeight: '48px', height: 'auto', width: 'auto' }}
                        />
                    </Link>
                </div>

                {/* Main navigation links centered vertically & horizontally */}
                <nav className={styles.desktopNav}>
                    {navItems.map((item: NavItem) => {
                        const isActive = item.href === '/candidate/dashboard'
                            ? pathname === '/candidate/dashboard'
                            : pathname === item.href || pathname.startsWith(item.href + '/');
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`${styles.navTab} ${isActive ? styles.navTabActive : ''}`}
                            >
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                <div className={styles.rightSection}>
                    {/* Right side icon cluster: Bookmark, Messages, Bell, Profile */}
                    <div className={styles.iconCluster}>
                        <Link 
                            href="/candidate/dashboard/saved-jobs" 
                            className={`${styles.iconBtn} ${styles.hideMobile}`} 
                            title="Saved Jobs"
                            aria-label="Saved Jobs"
                            style={{ width: 48, height: 48 }}
                        >
                            {Icons.bookmark}
                        </Link>

                        <Link 
                            href="/candidate/dashboard/messages" 
                            className={`${styles.iconBtn} ${styles.hideMobile}`} 
                            title="Messages"
                            aria-label="Messages"
                            style={{ width: 48, height: 48 }}
                        >
                            {Icons.messages}
                        </Link>

                        <Link 
                            href="/candidate/dashboard/notifications" 
                            className={`${styles.iconBtn} ${styles.bellBtn}`} 
                            title="Notifications"
                            aria-label="Notifications"
                            style={{ width: 48, height: 48 }}
                        >
                            {Icons.bell}
                            {unreadNotif && <span className={styles.notifDot} />}
                        </Link>

                        <div
                            ref={avatarRef}
                            className={`${styles.avatar} ${styles.hideMobile}`}
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            style={{ width: 40, height: 40 }}
                            role="button"
                            tabIndex={0}
                            aria-haspopup="menu"
                            aria-expanded={isDropdownOpen}
                            aria-label="Open profile menu"
                            onKeyDown={e => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    setIsDropdownOpen(!isDropdownOpen);
                                }
                            }}
                        >
                            {user?.avatar_url ? (
                                <img src={getPublicStorageUrl('avatars', user.avatar_url)} alt="Avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                            ) : (
                                userInitials
                            )}
                        </div>

                        {/* Mobile Hamburger menu */}
                        <button 
                            className={styles.hamburger} 
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
                            aria-expanded={isMenuOpen}
                        >
                            {isMenuOpen ? Icons.close : Icons.menu}
                        </button>
                    </div>
                </div>

                {/* Profile dropdown — Indeed style */}
                {isDropdownOpen && (
                    <div
                        ref={dropdownRef}
                        className={styles.avatarDropdown}
                        role="menu"
                    >
                        {/* Email header */}
                        <div className={styles.dropdownEmail}>
                            <span style={{ fontWeight: 600, wordBreak: 'break-all' }}>
                                {user?.email}
                            </span>
                        </div>

                        {/* Menu items with icons */}
                        {([
                            {
                                label: 'Profile',
                                href: '/candidate/dashboard/profile',
                                icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>,
                            },
                            {
                                label: 'My reviews',
                                href: '/candidate/dashboard/referrals',
                                icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 0 0 .95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 0 0-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 0 0-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 0 0-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 0 0 .951-.69l1.519-4.674z" /></svg>,
                            },
                            {
                                label: 'Settings',
                                href: '/candidate/dashboard/settings',
                                icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>,
                            },
                            {
                                label: 'Privacy Centre',
                                href: '/candidate/dashboard/settings?tab=privacy',
                                icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>,
                            },
                        ] as const).map(item => (
                            <Link
                                key={item.label}
                                href={item.href}
                                onClick={() => setIsDropdownOpen(false)}
                                className={styles.dropdownItem}
                                role="menuitem"
                            >
                                <span className={styles.dropdownIcon}>{item.icon}</span>
                                {item.label}
                            </Link>
                        ))}

                        {/* Sign out — red link at bottom, separated */}
                        <div className={styles.dropdownDivider} />
                        <div style={{ padding: '8px' }}>
                            <button
                                onClick={handleSignOut}
                                disabled={isSigningOut}
                                className={styles.logoutBtn}
                                role="menuitem"
                            >
                                {isSigningOut ? 'Signing out...' : 'Sign out'}
                            </button>
                        </div>
                    </div>
                )}

            </header>

            {/* Mobile Menu Drawer list */}
            <div 
                className={`${styles.mobileMenu} ${isMenuOpen ? styles.mobileMenuOpen : ''}`}
                onClick={() => setIsMenuOpen(false)}
            >
                <div 
                    className={styles.mobileMenuContent}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* User Profile Info section */}
                    <div className={styles.mobileProfileSection}>
                        <div className={styles.mobileProfileAvatar}>
                            {user?.avatar_url ? (
                                <img src={getPublicStorageUrl('avatars', user.avatar_url)} alt="Avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                            ) : (
                                userInitials
                            )}
                        </div>
                        <div className={styles.mobileProfileInfo}>
                            <span className={styles.mobileProfileName}>{user?.name || 'Candidate User'}</span>
                            <span className={styles.mobileProfileEmail}>{user?.email}</span>
                        </div>
                    </div>

                    <div className={styles.mobileMenuDivider} />

                    {/* Navigation list */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div className={styles.mobileSectionHeader}>Menu</div>
                        <div className={styles.mobileLinkList}>
                            {/* Dashboard Core Tabs */}
                            {navItems.map((item: NavItem) => {
                                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                                // Get icon for each core nav item
                                let navIcon = Icons.bookmark; // fallback
                                if (item.label === 'Find Jobs') {
                                    navIcon = (
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                                    );
                                } else if (item.label === 'My Jobs') {
                                    navIcon = (
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>
                                    );
                                } else if (item.label === 'Company reviews') {
                                    navIcon = (
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                                    );
                                }

                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={`${styles.mobileNavTab} ${isActive ? styles.mobileNavTabActive : ''}`}
                                        onClick={() => setIsMenuOpen(false)}
                                    >
                                        <div className={styles.mobileNavLabelGroup}>
                                            <span className={styles.mobileNavIcon}>{navIcon}</span>
                                            <span>{item.label}</span>
                                        </div>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>

                    <div className={styles.mobileMenuDivider} />

                    {/* Account Section */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div className={styles.mobileSectionHeader}>Account & Services</div>
                        <div className={styles.mobileLinkList}>
                            {[
                                {
                                    label: 'Saved Jobs',
                                    href: '/candidate/dashboard/saved-jobs',
                                    icon: Icons.bookmark,
                                },
                                {
                                    label: 'Messages',
                                    href: '/candidate/dashboard/messages',
                                    icon: Icons.messages,
                                },
                                {
                                    label: 'Profile',
                                    href: '/candidate/dashboard/profile',
                                    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>,
                                },
                                {
                                    label: 'Settings',
                                    href: '/candidate/dashboard/settings',
                                    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>,
                                },
                                {
                                    label: 'My reviews',
                                    href: '/candidate/dashboard/referrals',
                                    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 0 0 .95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 0 0-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 0 0-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 0 0-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 0 0 .951-.69l1.519-4.674z" /></svg>,
                                },
                                {
                                    label: 'Privacy Centre',
                                    href: '/candidate/dashboard/settings?tab=privacy',
                                    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>,
                                },
                            ].map(item => {
                                const isActive = pathname === item.href;
                                return (
                                    <Link
                                        key={item.label}
                                        href={item.href}
                                        className={`${styles.mobileNavTab} ${isActive ? styles.mobileNavTabActive : ''}`}
                                        onClick={() => setIsMenuOpen(false)}
                                    >
                                        <div className={styles.mobileNavLabelGroup}>
                                            <span className={styles.mobileNavIcon}>{item.icon}</span>
                                            <span>{item.label}</span>
                                        </div>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
                                    </Link>
                                );
                            })}

                            <button
                                onClick={() => {
                                    setIsMenuOpen(false);
                                    handleSignOut();
                                }}
                                className={styles.mobileSignOutBtn}
                            >
                                <div className={styles.mobileNavLabelGroup}>
                                    <span className={styles.mobileNavIcon} style={{ color: '#EF4444' }}>
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
                                    </span>
                                    <span>Sign Out</span>
                                </div>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main content body area */}
            <main className={styles.mainContent}>
                {children}
            </main>
        </div>
    );
}
