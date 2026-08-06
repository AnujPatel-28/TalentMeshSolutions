"use client";
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import createGlobe from 'cobe';
import AnimateOnScroll from '@/components/AnimateOnScroll';
import styles from './job-seekers.module.css';
import { MotionAccordion } from '@/components/ui';
import { GraduationCap, Award, Briefcase, RefreshCw, Globe, TrendingUp, CheckCircle2, XCircle, Sparkles as SparklesIcon } from 'lucide-react';
import {
    Sparkles,
    Heart,
    FaceSmile as Smile,
    Compass,
    Check,
    ArrowRight,
    Shield,
    ChevronDown,
    DocText as FileText,
    ProfileTick as UserCheck,
    Clock,
    Search,
    Bell,
    Send,
    Profile2user as Users
} from 'reicon-react';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined';
import ShowChartOutlinedIcon from '@mui/icons-material/ShowChartOutlined';
import FavoriteBorderOutlinedIcon from '@mui/icons-material/FavoriteBorderOutlined';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import ExploreOutlinedIcon from '@mui/icons-material/ExploreOutlined';
import EmojiEmotionsOutlinedIcon from '@mui/icons-material/EmojiEmotionsOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';


// SVG Icons
const IconSparkle = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
        <path d="M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4L12 2z" />
    </svg>
);

const IconArrowRight = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12h14m-7-7 7 7-7 7" />
    </svg>
);

const InteractiveGlobe = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const pointerInteracting = useRef<number | null>(null);

    useEffect(() => {
        let phi = 0;
        let theta = 0.25;
        let width = 320; // default initial width

        if (!canvasRef.current) return;

        // Measure container size
        const canvas = canvasRef.current;
        const container = canvas.parentElement;
        if (container) {
            width = container.offsetWidth || 320;
        }

        const globe = createGlobe(canvas, {
            devicePixelRatio: 2,
            width: width * 2,
            height: width * 2,
            phi: 0,
            theta: 0.25,
            dark: 0,
            diffuse: 1.2,
            mapSamples: 12000,
            mapBrightness: 6,
            baseColor: [0.95, 0.96, 0.98],
            markerColor: [0.23, 0.51, 0.96], // #3b82f6
            glowColor: [0.93, 0.96, 1.0],
            markers: [
                { location: [37.7749, -122.4194], size: 0.04, id: "sf" }, // San Francisco
                { location: [51.5074, -0.1278], size: 0.04, id: "london" },   // London
                { location: [35.6762, 139.6503], size: 0.04, id: "tokyo" },   // Tokyo
                { location: [12.9716, 77.5946], size: 0.05, id: "bangalore" },    // Bangalore
                { location: [-33.8688, 151.2093], size: 0.04, id: "sydney" }  // Sydney
            ]
        });

        // Set up manual animation loop
        let animationFrameId: number;
        const renderLoop = () => {
            if (pointerInteracting.current === null) {
                phi += 0.005;
            }
            globe.update({ phi, theta });
            animationFrameId = requestAnimationFrame(renderLoop);
        };
        renderLoop();

        // Resize handler to update WebGL canvas internal width/height
        const handleResize = () => {
            if (canvas && container) {
                const newWidth = container.offsetWidth;
                if (newWidth && newWidth !== width) {
                    width = newWidth;
                    globe.update({
                        width: width * 2,
                        height: width * 2
                    });
                }
            }
        };

        window.addEventListener('resize', handleResize);

        const handlePointerDown = (e: PointerEvent) => {
            pointerInteracting.current = e.clientX;
            if (canvas) canvas.style.cursor = 'grabbing';
        };

        const handlePointerUp = () => {
            pointerInteracting.current = null;
            if (canvas) canvas.style.cursor = 'grab';
        };

        const handlePointerMove = (e: PointerEvent) => {
            if (pointerInteracting.current !== null) {
                const delta = e.clientX - pointerInteracting.current;
                pointerInteracting.current = e.clientX;
                phi += delta / 150;
            }
        };

        canvas.addEventListener('pointerdown', handlePointerDown);
        canvas.addEventListener('pointerup', handlePointerUp);
        canvas.addEventListener('pointermove', handlePointerMove);
        canvas.addEventListener('pointerout', handlePointerUp);

        return () => {
            globe.destroy();
            cancelAnimationFrame(animationFrameId);
            window.removeEventListener('resize', handleResize);
            canvas.removeEventListener('pointerdown', handlePointerDown);
            canvas.removeEventListener('pointerup', handlePointerUp);
            canvas.removeEventListener('pointermove', handlePointerMove);
            canvas.removeEventListener('pointerout', handlePointerUp);
        };
    }, []);

    return (
        <div className={styles.globeContainer}>
            <canvas
                ref={canvasRef}
                className={styles.globeCanvas}
            />
        </div>
    );
};

export default function JobSeekersPage() {
    const [openFaq, setOpenFaq] = useState<number | null>(null);
    const [wordIndex, setWordIndex] = useState(0);
    const [hoveredJourney, setHoveredJourney] = useState<string | null>(null);
    const rotatingWords = ["Possibilities.", "Opportunities.", "Connections.", "Growth.", "Matches."];

    useEffect(() => {
        const interval = setInterval(() => {
            setWordIndex((prev) => (prev + 1) % rotatingWords.length);
        }, 2500);
        return () => clearInterval(interval);
    }, []);

    const toggleFaq = (index: number) => {
        setOpenFaq(prev => (prev === index ? null : index));
    };

    const JOURNEY_STEPS = [
        { title: "Create Your Profile", desc: "Sign up and set your preferences in minutes." },
        { title: "Complete Your Resume", desc: "Highlight your experience, skills, and projects." },
        { title: "Discover Matching Jobs", desc: "Find curated jobs matched to your skills." },
        { title: "Apply in Minutes", desc: "Submit your saved profile with a single click." },
        { title: "Track Every Application", desc: "See exactly where your profile stands in the loop." },
        { title: "Get Hired", desc: "Secure your next career move with verified employers." }
    ];

    const JOURNEYS = [
        {
            title: "Students & Interns",
            desc: "Start your career with internships and entry-level opportunities.",
            badge: "Entry Level",
            icon: <GraduationCap size={22} />,
            colorClass: styles.iconCyan,
            cardClass: styles.cardCyan
        },
        {
            title: "Fresh Graduates",
            desc: "Discover graduate jobs and build your professional experience.",
            badge: "0-2 Yrs Exp",
            icon: <Award size={22} />,
            colorClass: styles.iconBlue,
            cardClass: styles.cardBlue
        },
        {
            title: "Experienced Professionals",
            desc: "Explore roles that match your expertise and career goals.",
            badge: "3+ Yrs Exp",
            icon: <Briefcase size={22} />,
            colorClass: styles.iconPurple,
            cardClass: styles.cardPurple
        },
        {
            title: "Career Changers",
            desc: "Find opportunities that support your next career move.",
            badge: "Transition",
            icon: <RefreshCw size={22} />,
            colorClass: styles.iconOrange,
            cardClass: styles.cardOrange
        },
        {
            title: "Remote Professionals",
            desc: "Browse remote and hybrid opportunities from trusted employers.",
            badge: "Hybrid & Remote",
            icon: <Globe size={22} />,
            colorClass: styles.iconGreen,
            cardClass: styles.cardGreen
        },
        {
            title: "Growing Professionals",
            desc: "Advance your career with better opportunities and long-term growth.",
            badge: "Career Growth",
            icon: <TrendingUp size={22} />,
            colorClass: styles.iconRose,
            cardClass: styles.cardRose
        }
    ];

    const PLATFORM_FEATURE_ROWS = [
        [
            { title: "Job Search", icon: <SearchOutlinedIcon sx={{ fontSize: 20 }} />, color: "#3b82f6" },
            { title: "Personalized Job Matches", icon: <AutoAwesomeOutlinedIcon sx={{ fontSize: 20 }} />, color: "#10b981" },
            { title: "Application Tracking", icon: <ShowChartOutlinedIcon sx={{ fontSize: 20 }} />, color: "#f59e0b" },
            { title: "Saved Jobs", icon: <FavoriteBorderOutlinedIcon sx={{ fontSize: 20 }} />, color: "#ef4444" }
        ],
        [
            { title: "Verified Employers", icon: <ShieldOutlinedIcon sx={{ fontSize: 20 }} />, color: "#8b5cf6" },
            { title: "Career Advice", icon: <ExploreOutlinedIcon sx={{ fontSize: 20 }} />, color: "#06b6d4" },
            { title: "Interview Preparation", icon: <EmojiEmotionsOutlinedIcon sx={{ fontSize: 20 }} />, color: "#ec4899" }
        ],
        [
            { title: "Resume Guidance", icon: <DescriptionOutlinedIcon sx={{ fontSize: 20 }} />, color: "#f97316" }
        ]
    ];

    const FAQS = [
        {
            question: "Is TalentMesh free for job seekers?",
            answer: "Yes. Creating a TalentMesh profile and applying for jobs is free for candidates."
        },
        {
            question: "Can I track my job applications?",
            answer: "Yes. TalentMesh allows you to monitor your applications throughout the hiring process."
        },
        {
            question: "Are employers verified?",
            answer: "We work to ensure job opportunities come from trusted employers and recruitment partners."
        },
        {
            question: "Can fresh graduates use TalentMesh?",
            answer: "Yes. TalentMesh supports students, fresh graduates, and experienced professionals."
        },
        {
            question: "Will I receive job alerts?",
            answer: "Yes. You'll receive notifications when opportunities match your profile."
        },
        {
            question: "Can I update my resume later?",
            answer: "Absolutely. You can edit your profile and resume whenever your experience or skills change."
        }
    ];

    return (
        <main className={styles.page}>
            {/* Background Layer */}
            <div className={styles.bgWrapper}>
                <div className={styles.bgImage} />
                <div className={styles.bgOverlay} />
            </div>

            {/* HERO SECTION */}
            <div className={styles.heroWrapper}>
                <div className={styles.heroBgImage} />
                <section className={styles.hero}>
                    <div className={styles.heroContent}>

                        <h1 className={styles.heroTitle}>
                            One Profile. <br />
                            <span className={styles.heroHighlight}>Infinite</span> <br />
                            <span className={`${styles.heroHighlight} ${styles.rotatingWord}`} key={wordIndex}>
                                {rotatingWords[wordIndex]}
                            </span>
                        </h1>
                        <p className={styles.heroDesc}>
                            Create your professional portfolio once and connect with actively hiring companies instantly. Your dream job is waiting.
                        </p>
                        <div className={styles.heroButtons}>
                            <Link href="/login" className={styles.primaryCta}>
                                Create Free Profile <IconArrowRight />
                            </Link>
                            <Link href="/login" className={styles.secondaryCta}>
                                Browse Jobs
                            </Link>
                        </div>
                    </div>
                </section>
            </div>

            {/* SECTION 2: Why Candidates Choose TalentMesh */}
            <AnimateOnScroll animation="fadeUp">
                <section className={`${styles.section} ${styles.sectionWhiteBg}`}>
                    <div className={styles.sectionInner}>
                        <div className={styles.sectionHeader}>
                            <div className={styles.sectionBadge}>Benefits</div>
                            <h2 className={styles.sectionTitle}>
                                Why Candidates Choose <span className={styles.highlightText}>TalentMesh</span>
                            </h2>
                            <p className={styles.sectionDesc}>
                                Everything you need to manage your job search with confidence.
                            </p>
                        </div>

                        <div className={styles.gridChoose}>
                            {/* Card 1: Smart Job Matching */}
                            <div className={`${styles.chooseCard} ${styles.cardSmartMatch}`}>
                                <div className={styles.cardInfoCol}>
                                    <div className={`${styles.chooseIconWrapper} ${styles.iconGreen}`}>
                                        <Sparkles size={22} />
                                    </div>
                                    <h3 className={styles.chooseTitle}>Smart Job Matching</h3>
                                    <p className={styles.chooseDesc}>
                                        Discover opportunities that align with your skills, experience, and career goals.
                                    </p>
                                    <Link href="/login" className={styles.btnGreen}>
                                        Explore Jobs <ArrowRight size={14} style={{ marginLeft: '4px' }} />
                                    </Link>
                                </div>
                            </div>

                            {/* Card 2: One Profile. Multiple Applications. */}
                            <div className={`${styles.chooseCard} ${styles.cardOneProfile}`}>
                                <div className={styles.cardIllustrationCol} style={{ margin: '0 0 16px 0', width: '100%' }}>
                                    <img
                                        src="/back2.2.png"
                                        alt="One Profile Illustration"
                                        className={styles.chooseIllustration}
                                        style={{ width: '100%', height: 'auto', borderRadius: '12px' }}
                                    />
                                </div>
                                <h3 className={styles.chooseTitle}>One Profile. Multiple Applications.</h3>
                                <p className={styles.chooseDesc}>
                                    Create your profile once and apply to multiple verified jobs without repeating the same information.
                                </p>
                            </div>

                            {/* Card 3: Verified Employers */}
                            <div className={`${styles.chooseCard} ${styles.cardVerified}`}>
                                {/* Background Shield SVG */}
                                <div className={styles.cardBgDecoration}>
                                    <svg width="160" height="160" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M12 22C12 22 20 18 20 12V5L12 2L4 5V12C4 18 12 22 12 22Z" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.08" />
                                    </svg>
                                </div>
                                <h3 className={styles.chooseTitle}>Verified Employers</h3>
                                <p className={styles.chooseDesc}>
                                    Apply with confidence to opportunities from trusted companies actively hiring.
                                </p>
                            </div>

                            {/* Card 4: Job Alerts */}
                            <div className={`${styles.chooseCard} ${styles.cardJobAlerts}`}>
                                {/* Background Bell SVG */}
                                <div className={styles.cardBgDecoration}>
                                    <svg width="160" height="160" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.08" />
                                    </svg>
                                </div>
                                <h3 className={styles.chooseTitle}>Job Alerts</h3>
                                <p className={styles.chooseDesc}>
                                    Receive notifications when new opportunities match your profile and preferences.
                                </p>
                            </div>

                            {/* Card 5: Track Every Application */}
                            <div className={`${styles.chooseCard} ${styles.cardTrackApp}`}>
                                <div className={styles.cardInfoCol}>
                                    <div className={`${styles.chooseIconWrapper} ${styles.iconBlue}`}>
                                        <TrendingUp size={22} />
                                    </div>
                                    <h3 className={styles.chooseTitle}>Track Every Application</h3>
                                    <p className={styles.chooseDesc}>
                                        Monitor your application status and stay updated throughout the hiring process.
                                    </p>
                                    <Link href="/login" className={styles.btnBlueLink}>
                                        View My Applications <ArrowRight size={14} style={{ marginLeft: '4px' }} />
                                    </Link>
                                </div>
                                <div className={styles.cardIllustrationCol}>
                                    <div className={styles.simpleStepperContainer}>
                                        {/* Top Row: Large Circle Icons */}
                                        <div className={styles.stepperIconsRow}>
                                            <div className={`${styles.simpleIconCircle} ${styles.iconApplied}`}>
                                                <Send size={22} />
                                            </div>
                                            <div className={`${styles.simpleIconCircle} ${styles.iconInterview}`}>
                                                <Users size={22} />
                                            </div>
                                            <div className={`${styles.simpleIconCircle} ${styles.iconOffer}`}>
                                                <Briefcase size={22} />
                                            </div>
                                            <div className={`${styles.simpleIconCircle} ${styles.iconHired}`}>
                                                <Check size={24} strokeWidth={2.5} />
                                            </div>
                                        </div>

                                        {/* Middle Row: Labels */}
                                        <div className={styles.stepperLabelsRow}>
                                            <span className={styles.simpleStepLabel}>Applied</span>
                                            <span className={styles.simpleStepLabel}>Interview</span>
                                            <span className={styles.simpleStepLabel}>Offer</span>
                                            <span className={styles.simpleStepLabel}>Hired</span>
                                        </div>

                                        {/* Bottom Row: Progress Line & Check Dots */}
                                        <div className={styles.stepperDotsRow}>
                                            <div className={styles.stepperProgressLine} />
                                            <div className={styles.stepperDotsList}>
                                                <div className={`${styles.simpleDot} ${styles.dotGreen}`}>
                                                    <Check size={10} strokeWidth={3.5} />
                                                </div>
                                                <div className={`${styles.simpleDot} ${styles.dotBlue}`}>
                                                    <Check size={10} strokeWidth={3.5} />
                                                </div>
                                                <div className={`${styles.simpleDot} ${styles.dotBlue}`}>
                                                    <Check size={10} strokeWidth={3.5} />
                                                </div>
                                                <div className={`${styles.simpleDot} ${styles.dotGreen}`}>
                                                    <Check size={10} strokeWidth={3.5} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Card 6: Career Growth */}
                            <div className={`${styles.chooseCard} ${styles.cardCareerGrowth}`}>
                                <div className={styles.cardInfoCol}>
                                    <h3 className={styles.chooseTitle}>Career Growth</h3>
                                    <p className={styles.chooseDesc}>
                                        Access personalized career advice, skill resources, and expert guidance to help you grow and achieve your goals.
                                    </p>
                                    <Link href="/login" className={styles.btnPurple}>
                                        Explore Growth Paths <ArrowRight size={14} style={{ marginLeft: '4px' }} />
                                    </Link>
                                </div>
                            </div>

                            {/* Card 7: Resume & Profile Optimization */}
                            <div className={`${styles.chooseCard} ${styles.cardResumeOpt}`}>
                                <div className={styles.cardInfoCol}>
                                    <div className={`${styles.chooseIconWrapper} ${styles.iconOrange}`}>
                                        <FileText size={22} />
                                    </div>
                                    <h3 className={styles.chooseTitle}>Resume & Profile Optimization</h3>
                                    <p className={styles.chooseDesc}>
                                        Get tips to improve your resume and profile visibility to stand out to recruiters.
                                    </p>
                                    <Link href="/login" className={styles.btnOrange}>
                                        Optimize Now <ArrowRight size={14} style={{ marginLeft: '4px' }} />
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </AnimateOnScroll>

            {/* SECTION 3: Your Journey with TalentMesh */}
            <AnimateOnScroll animation="fadeUp">
                <section className={styles.section}>
                    <div className={styles.sectionInner}>
                        <div className={styles.sectionHeader}>
                            <div className={styles.sectionBadge}>Timeline</div>
                            <h2 className={styles.sectionTitle}>
                                Your Journey with <span className={styles.highlightText}>TalentMesh</span>
                            </h2>
                            <p className={styles.sectionDesc}>
                                TalentMesh keeps your entire job search organized—from your first application to your next opportunity.
                            </p>
                        </div>

                        <div className={styles.timelineWrapper}>
                            <div className={styles.timelineLine} />
                            <div className={styles.timelineSteps}>
                                {JOURNEY_STEPS.map((step, idx) => (
                                    <div key={idx} className={styles.timelineStep}>
                                        <div className={styles.timelineNode}>
                                            <span className={styles.timelineNodeNumber}>{idx + 1}</span>
                                        </div>
                                        <h3 className={styles.timelineStepTitle}>{step.title}</h3>
                                        <p className={styles.timelineStepDesc}>{step.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>
            </AnimateOnScroll>

            {/* COMBINED WHITE SECTION UNIT (Sections 4 & 5) */}
            <div className={styles.combinedWhiteWrapper}>
                {/* SECTION 4: Built for Every Career Journey */}
                <AnimateOnScroll animation="fadeUp">
                    <section className={styles.sectionCombinedInner}>
                        <div className={styles.sectionInner}>
                            <div className={styles.sectionHeader}>
                                <div className={styles.sectionBadge}>Inclusivity</div>
                                <h2 className={styles.sectionTitle}>
                                    Built for Every <br className={styles.desktopBr} />
                                    <span
                                        className={`${styles.highlightText} ${styles.journeyHighlight}`}
                                        key={hoveredJourney || "default"}
                                    >
                                        {hoveredJourney || "Career Journey"}
                                    </span>
                                </h2>
                                <p className={styles.sectionDesc}>
                                    We design specialized pathways for your distinct background and professional objectives.
                                </p>
                            </div>

                            <div className={styles.gridJourneys}>
                                {JOURNEYS.map((item, idx) => (
                                    <div
                                        key={idx}
                                        className={`${styles.journeyCard} ${item.cardClass}`}
                                        onMouseEnter={() => setHoveredJourney(item.title === "Experienced Professionals" ? "Professionals" : item.title)}
                                        onMouseLeave={() => setHoveredJourney(null)}
                                    >
                                        <div className={styles.journeyHeader}>
                                            <div className={`${styles.journeyIconWrapper} ${item.colorClass}`}>
                                                {item.icon}
                                            </div>
                                            <span className={styles.journeyBadge}>{item.badge}</span>
                                        </div>
                                        <h3 className={styles.journeyTitle}>{item.title}</h3>
                                        <p className={styles.journeyDesc}>{item.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>
                </AnimateOnScroll>

                {/* SECTION 5: Everything You Need in One Platform */}
                <AnimateOnScroll animation="fadeUp">
                    <section className={styles.sectionCombinedInner}>
                        <div className={styles.sectionInner}>
                            <div className={styles.sectionHeader}>
                                <div className={styles.sectionBadge}>SEARCHABLE ENTITIES</div>
                                <h2 className={styles.sectionTitle}>
                                    Everything You Need in <span className={styles.highlightText}>One Platform</span>
                                </h2>
                                <p className={styles.sectionDesc}>
                                    Direct access to vital professional resources, tools, and career support assets.
                                </p>
                            </div>

                            <div className={styles.platformFeaturesContainer}>
                                {PLATFORM_FEATURE_ROWS.map((row, rIdx) => (
                                    <div key={rIdx} className={styles.platformFeatureRow}>
                                        {row.map((feat, idx) => (
                                            <div
                                                key={idx}
                                                className={styles.platformFeatureTag}
                                                style={{ '--hover-color': feat.color } as React.CSSProperties}
                                            >
                                                <span className={styles.tagIcon}>{feat.icon}</span>
                                                <span className={styles.tagName}>{feat.title}</span>
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>
                </AnimateOnScroll>

                {/* SECTION 6: Why TalentMesh? (Commented out for future reference)
                <AnimateOnScroll animation="fadeUp">
                    <section className={styles.section}>
                        <div className={styles.sectionInner}>
                            <div className={styles.sectionHeader}>
                                <div className={styles.sectionBadge}>Comparison</div>
                                <h2 className={styles.sectionTitle}>
                                    Why <span className={styles.highlightText}>TalentMesh?</span>
                                </h2>
                                <p className={styles.sectionDesc}>
                                    Uncompromising value compared to traditional, noisy job boards.
                                </p>
                            </div>

                            <div className={styles.comparisonWrapper}>
                                <div className={styles.comparisonTable}>
                                    <div className={styles.tableHeader}>
                                        <div className={styles.headerPortals}>
                                            <span className={styles.portalTitle}>Traditional Job Portals</span>
                                        </div>
                                        <div className={styles.headerTalentMesh}>
                                            <div className={styles.recommendBadge}>
                                                <SparklesIcon size={12} />
                                                <span>THE SMARTER CHOICE</span>
                                            </div>
                                            <span className={styles.talentMeshTitle}>TalentMesh</span>
                                        </div>
                                    </div>
                                    <div className={styles.tableBody}>
                                        {[
                                            { portal: "Endless applications", talentMesh: "One professional profile" },
                                            { portal: "Limited application visibility", talentMesh: "Real-time application tracking" },
                                            { portal: "Generic recommendations", talentMesh: "Personalized job matching" },
                                            { portal: "Little career guidance", talentMesh: "Career advice & interview support" },
                                            { portal: "Scattered job search", talentMesh: "One organized dashboard" }
                                        ].map((item, idx) => (
                                            <div key={idx} className={styles.tableRow}>
                                                <div className={styles.tableCellPortals}>
                                                    <div className={styles.portalIconBadge}>
                                                        <XCircle size={16} />
                                                    </div>
                                                    <span>{item.portal}</span>
                                                </div>
                                                <div className={styles.tableCellTalentMesh}>
                                                    <div className={styles.talentMeshIconBadge}>
                                                        <CheckCircle2 size={17} />
                                                    </div>
                                                    <span className={styles.talentMeshText}>{item.talentMesh}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>
                </AnimateOnScroll>
                */}

                {/* SECTION 7: Frequently Asked Questions */}
                <AnimateOnScroll animation="fadeUp">
                    <section className={styles.sectionCombinedInner}>
                        <div className={styles.sectionInner}>
                            <div className={styles.sectionHeader}>
                                <div className={styles.sectionBadge}>FAQ</div>
                                <h2 className={styles.sectionTitle}>
                                    Frequently Asked <span className={styles.highlightText}>Questions</span>
                                </h2>
                                <p className={styles.sectionDesc}>
                                    Transparent answers to key questions about utilizing our candidate portal.
                                </p>
                            </div>

                            <div className="max-w-3xl mx-auto mt-8">
                                <MotionAccordion items={FAQS} gap={12} />
                            </div>
                        </div>
                    </section>
                </AnimateOnScroll>
            </div>

            {/* FINAL CTA */}
            <AnimateOnScroll animation="scaleUp">
                <section className={styles.ctaSection}>
                    <div className={styles.ctaContainer}>
                        <h2 className={styles.ctaTitle}>Ready for Your Next Opportunity?</h2>
                        <p className={styles.ctaDesc}>
                            Create your free TalentMesh profile, connect with verified employers, and take the next step in your career.
                        </p>
                        <div className={styles.ctaButtons}>
                            <Link href="/login" className={styles.ctaPrimary}>
                                Create Free Profile
                            </Link>
                            <Link href="/login" className={styles.ctaSecondary}>
                                Browse Jobs
                            </Link>
                        </div>
                    </div>
                </section>
            </AnimateOnScroll>
        </main>
    );
}
