"use client";
import React, { useState, useEffect, useRef } from 'react';
import styles from './sections.module.css';

const POPULAR_JOBS = [
    'Software Engineer',
    'Product Designer',
    'Marketing Manager',
    'Data Scientist',
    'Sales Representative',
    'Project Manager',
    'Customer Success'
];

const POPULAR_CITIES = [
    'Bangalore, KA',
    'Mumbai, MH',
    'Delhi, NCR',
    'Hyderabad, TS',
    'Pune, MH',
    'Chennai, TN',
    'Remote'
];

const POPULAR_TAGS = ['Remote Engineer', 'Product Designer', 'Marketing AI'];

const Hero = () => {
    const [jobQuery, setJobQuery] = useState('');
    const [locationQuery, setLocationQuery] = useState('');
    const [isJobDropdownOpen, setIsJobDropdownOpen] = useState(false);
    const [isLocationDropdownOpen, setIsLocationDropdownOpen] = useState(false);
    const [isLocating, setIsLocating] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsJobDropdownOpen(false);
                setIsLocationDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Trace user location on user request instead of mount to avoid permissions policy violation
    const handleLocateMe = () => {
        if ('geolocation' in navigator) {
            setIsLocating(true);
            navigator.geolocation.getCurrentPosition(async (position) => {
                try {
                    const { latitude, longitude } = position.coords;
                    // Using a free reverse geocoding API (BigDataCloud is a good fallback for client-side)
                    const response = await fetch(
                        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
                    );
                    const data = await response.json();

                    if (data && (data.city || data.locality)) {
                        const city = data.city || data.locality;
                        const region = data.principalSubdivisionCode || '';
                        setLocationQuery(region ? `${city}, ${region}` : city);
                    }
                } catch (error) {
                    console.error("Error fetching location:", error);
                } finally {
                    setIsLocating(false);
                }
            }, (error) => {
                console.log("Geolocation permission denied:", error);
                setIsLocating(false);
            });
        }
    };

    const filteredJobs = POPULAR_JOBS.filter(job =>
        job.toLowerCase().includes(jobQuery.toLowerCase())
    );

    const filteredCities = POPULAR_CITIES.filter(city =>
        city.toLowerCase().includes(locationQuery.toLowerCase())
    );

    return (
        <section className={styles.hero}>
            <div className={styles.container}>
                <div className={styles.heroGrid}>
                    <div className={styles.heroBadge}>
                        <span style={{ marginRight: '8px', color: '#2ecc71' }}>●</span> Next-Gen Recruitment Platform
                    </div>

                    <h1 className={styles.heroTitle}>
                        Scale Your Team<br />
                        <span className={styles.highlight}>Not Your Workload</span>
                    </h1>

                    <p className={styles.heroDescription}>
                        The all-in-one recruiting platform that evolves at the <strong>speed of AI</strong>. ✨
                        Empowering ambitious teams from <strong>Startups to Enterprises</strong>.
                    </p>

                    <div className={styles.searchContainer} ref={containerRef} style={{ overflow: 'visible' }}>
                        {/* Job Input */}
                        <div className={styles.searchInputGroup} style={{ position: 'relative' }}>
                            <svg className={styles.searchIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="11" cy="11" r="8"></circle>
                                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                            </svg>
                            <input
                                type="text"
                                placeholder="Job title, keywords, or company"
                                className={styles.searchInput}
                                value={jobQuery}
                                onChange={(e) => {
                                    setJobQuery(e.target.value);
                                    setIsJobDropdownOpen(true);
                                    setIsLocationDropdownOpen(false);
                                }}
                                onFocus={() => {
                                    setIsJobDropdownOpen(true);
                                    setIsLocationDropdownOpen(false);
                                }}
                            />
                            <ul className={`${styles.suggestionsList} ${isJobDropdownOpen && filteredJobs.length > 0 ? styles.suggestionsListOpen : ''}`}>
                                {filteredJobs.map((job, index) => (
                                    <li
                                        key={index}
                                        className={styles.suggestionItem}
                                        onClick={() => {
                                            setJobQuery(job);
                                            setIsJobDropdownOpen(false);
                                        }}
                                    >
                                        {job}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Location Input */}
                        <div className={styles.searchInputGroup} style={{ position: 'relative' }}>
                            <svg className={styles.searchIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                                <circle cx="12" cy="10" r="3"></circle>
                            </svg>
                            <input
                                type="text"
                                placeholder={isLocating ? "Locating..." : "City, state, or zip code"}
                                className={styles.searchInput}
                                value={locationQuery}
                                onChange={(e) => {
                                    setLocationQuery(e.target.value);
                                    setIsLocationDropdownOpen(true);
                                    setIsJobDropdownOpen(false);
                                }}
                                onFocus={() => {
                                    setIsLocationDropdownOpen(true);
                                    setIsJobDropdownOpen(false);
                                }}
                                style={{ paddingRight: '40px' }}
                            />
                            <button
                                type="button"
                                onClick={handleLocateMe}
                                disabled={isLocating}
                                style={{
                                    position: 'absolute',
                                    right: '12px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'none',
                                    border: 'none',
                                    cursor: isLocating ? 'default' : 'pointer',
                                    color: isLocating ? '#6366f1' : '#9ca3af',
                                    padding: '4px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'color 0.2s'
                                }}
                                title="Locate me"
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polygon points="3 11 22 2 13 21 11 13 3 11"></polygon>
                                </svg>
                            </button>
                            <ul className={`${styles.suggestionsList} ${isLocationDropdownOpen && filteredCities.length > 0 ? styles.suggestionsListOpen : ''}`}>
                                {filteredCities.map((city, index) => (
                                    <li
                                        key={index}
                                        className={styles.suggestionItem}
                                        onClick={() => {
                                            setLocationQuery(city);
                                            setIsLocationDropdownOpen(false);
                                        }}
                                    >
                                        {city}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <button 
                            className={styles.searchBtn}
                            onClick={() => {
                                const q = jobQuery || '';
                                const l = locationQuery || '';
                                window.location.href = `/browse-jobs?search=${encodeURIComponent(q)}&location=${encodeURIComponent(l)}`;
                            }}
                        >
                            Search Jobs
                        </button>
                    </div>

                    <div className={styles.popularContainer}>
                        <span className={styles.popularLabel}>Popular:</span>
                        <div className={styles.popularTags}>
                            {POPULAR_TAGS.map((tag, index) => (
                                <span key={index} className={styles.popularTag}>
                                    {tag}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Dashboard peek — grounded visual anchor */}
                    <div className={styles.dashboardPeek}>
                        <div className={styles.dashboardBar}>
                            <div className={styles.dashboardBarDot} style={{ background: '#ef4444' }} />
                            <div className={styles.dashboardBarDot} style={{ background: '#f59e0b' }} />
                            <div className={styles.dashboardBarDot} style={{ background: '#22c55e' }} />
                            <span className={styles.dashboardBarTitle}>TalentMesh — Active Pipeline</span>
                        </div>
                        <div className={styles.dashboardContent}>
                            {[
                                { initials: 'AS', name: 'Alex S.', role: 'Senior Engineer', score: 98, skills: ['React', 'AWS'] },
                                { initials: 'MK', name: 'Maya K.', role: 'Product Designer', score: 94, skills: ['Figma', 'UX'] },
                                { initials: 'JR', name: 'James R.', role: 'DevOps Lead', score: 91, skills: ['K8s', 'CI/CD'] },
                            ].map((c, i) => (
                                <div key={i} className={styles.dashboardRow}>
                                    <div className={styles.dashboardAvatar}>{c.initials}</div>
                                    <div className={styles.dashboardInfo}>
                                        <span className={styles.dashboardName}>{c.name}</span>
                                        <span className={styles.dashboardRole}>{c.role}</span>
                                    </div>
                                    <div className={styles.dashboardSkills}>
                                        {c.skills.map(s => <span key={s}>{s}</span>)}
                                    </div>
                                    <div className={styles.dashboardScore}>{c.score}%</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Hero;

