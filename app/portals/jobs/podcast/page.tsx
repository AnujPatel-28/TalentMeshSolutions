"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import styles from './podcast.module.css';
import { SectionHeader, CTA } from '@/components/ui';
import HeroBg from '@/components/ui/HeroBg/HeroBg';
import AnimateOnScroll from '@/components/AnimateOnScroll';
import { 
    Mic, 
    Play, 
    Pause, 
    ArrowRight,
    Twitter,
    Linkedin,
    Instagram
} from 'lucide-react';

const PlayIcon = () => <Play size={18} fill="currentColor" />;
const PauseIcon = () => <Pause size={18} fill="currentColor" />;
const ArrowRightIcon = () => <ArrowRight size={16} />;

const FEATURED_SHOWS = [
    {
        title: "The Creative Talk",
        host: "Sarah Mitchell",
        category: "Creative",
        image: "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=400&h=250&q=80",
        tagColor: "var(--primary-blue, #007BFF)"
    },
    {
        title: "Startup Series",
        host: "James Okafor",
        category: "Business",
        image: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=400&h=250&q=80",
        tagColor: "var(--primary-blue, #007BFF)"
    },
    {
        title: "Mindset Mastery",
        host: "Dr. Amara Cole",
        category: "Self-Growth",
        image: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=400&h=250&q=80",
        tagColor: "var(--primary-blue, #007BFF)"
    },
    {
        title: "Tech Weekly",
        host: "Ryan Torres",
        category: "Technology",
        image: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=400&h=250&q=80",
        tagColor: "var(--primary-blue, #007BFF)"
    }
];

const TRENDING_EPISODES = [
    {
        title: "The Power of Creative Freedom",
        image: "https://images.unsplash.com/photo-1478737270239-2f02b77fc618?auto=format&fit=crop&w=500&h=300&q=80"
    },
    {
        title: "Pitching Your First Venture Capital",
        image: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=500&h=300&q=80"
    },
    {
        title: "Overcoming Imposter Syndrome",
        image: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=500&h=300&q=80"
    },
    {
        title: "The Future of Generative DevTools",
        image: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=500&h=300&q=80"
    }
];

const HOSTS = [
    {
        name: "Sarah Mitchell",
        role: "Creative Director",
        bio: "Host of The Creative Talk, sharing design philosophies, creative struggles, and strategies of top global artists.",
        image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&h=200&q=80"
    },
    {
        name: "James Chen",
        role: "Serial Entrepreneur",
        bio: "Host of Startup Series, demystifying seed funding, product-market fit, and scale challenges for startup founders.",
        image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&h=200&q=80"
    },
    {
        name: "Dr. Amara Cole",
        role: "Psychologist & Coach",
        bio: "Host of Mindset Mastery, helping listeners unlock hidden potential through cognitive habit reconfiguration.",
        image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&h=200&q=80"
    },
    {
        name: "Ryan Torres",
        role: "Tech Journalist",
        bio: "Host of Tech Weekly, covering the fast-paced intersection of AI, SaaS architectures, and engineering growth.",
        image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&h=200&q=80"
    }
];

const GALLERY_THEMES = [
    {
        title: "AI & Future Recruiting",
        category: "AI & Tech",
        image: "https://images.unsplash.com/photo-1507146426996-ef05306b995a?auto=format&fit=crop&w=400&h=250&q=80"
    },
    {
        title: "Creative Design Studios",
        category: "Design & Art",
        image: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=400&h=250&q=80"
    },
    {
        title: "Pitching & Raising Funds",
        category: "Startups",
        image: "https://images.unsplash.com/photo-1515187029135-18ee286d815b?auto=format&fit=crop&w=400&h=250&q=80"
    },
    {
        title: "Work Culture & Scaling",
        category: "People Strategy",
        image: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=400&h=250&q=80"
    }
];

export default function PodcastPage() {
    const [playingEpisode, setPlayingEpisode] = useState<string | null>(null);

    const togglePlay = (title: string) => {
        if (playingEpisode === title) {
            setPlayingEpisode(null);
        } else {
            setPlayingEpisode(title);
        }
    };

    return (
        <main className={styles.page}>
            <HeroBg src="/bg4.png" fixed />

            {/* 1. HERO SECTION */}
            <section className={styles.heroSection}>
                <div className="premium-container">
                    <div className={styles.heroInner}>
                        <SectionHeader
                            centered
                            tag="TalentMesh Podcasts"
                            title={<>Discover Stories That Inspire <span className={styles.highlightText}>Your Mind.</span></>}
                            description="Listen to world-class podcasts from creators, entrepreneurs, and storytellers — anytime, anywhere."
                        />
                        <div className={styles.heroBtnGroup}>
                            <button className={styles.primaryBtn} onClick={() => togglePlay("Main Hero Episode")}>
                                <span className={styles.btnIconWrapper}>
                                    {playingEpisode === "Main Hero Episode" ? <PauseIcon /> : <PlayIcon />}
                                </span>
                                <span>{playingEpisode === "Main Hero Episode" ? "Pause Listening" : "Listen Now"}</span>
                            </button>
                            <Link href="#episodes" className={styles.secondaryBtn}>
                                <span>Browse Episodes</span>
                                <ArrowRightIcon />
                            </Link>
                        </div>

                        {/* Central Landscape Featured Video Card */}
                        <div className={`${styles.featuredLandscapeCard} glass-card`}>
                            <div className={styles.landscapeImageWrapper}>
                                <Image
                                    src="https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=1200&h=600&q=80"
                                    alt="TalentMesh Studio"
                                    fill
                                    className={styles.landscapeImg}
                                    unoptimized
                                />
                                <div className={styles.playOverlay} onClick={() => togglePlay("Main Hero Episode")}>
                                    <div className={`${styles.outerPlayCircle} ${playingEpisode === "Main Hero Episode" ? styles.pulseGlow : ''}`}>
                                        {playingEpisode === "Main Hero Episode" ? <PauseIcon /> : <PlayIcon />}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* 2. FEATURED SHOWS SECTION */}
            <section className={styles.showsSection}>
                <div className="premium-container">
                    <div className={styles.sectionHeadingRow}>
                        <span className={styles.sectionLabelTheme}>Curated For You</span>
                        <h2 className={styles.sectionTitle}>Featured <span className={styles.highlightText}>Shows.</span></h2>
                    </div>
                    
                    <div className={styles.showsGrid}>
                        {FEATURED_SHOWS.map((show, idx) => (
                            <AnimateOnScroll key={idx} animation="fadeUp" delay={idx * 100}>
                                <div className={`${styles.showCard} glass-card`}>
                                    <div className={styles.showImageWrapper}>
                                        <Image
                                            src={show.image}
                                            alt={show.title}
                                            fill
                                            className={styles.showImg}
                                            unoptimized
                                        />
                                    </div>
                                    <div className={styles.showContent}>
                                        <span className={styles.showCategory}>
                                            {show.category}
                                        </span>
                                        <h3 className={styles.showTitle}>{show.title}</h3>
                                        <p className={styles.showHost}>By {show.host}</p>
                                    </div>
                                </div>
                            </AnimateOnScroll>
                        ))}
                    </div>
                </div>
            </section>

            {/* 3. TRENDING EPISODES SECTION */}
            <section id="episodes" className={styles.trendingSection}>
                <div className="premium-container">
                    <div className={styles.sectionHeadingRow}>
                        <span className={styles.sectionLabelTheme}>Don't Miss Out</span>
                        <h2 className={styles.sectionTitle}>Trending <span className={styles.highlightText}>Episodes.</span></h2>
                    </div>

                    <div className={styles.trendingGrid}>
                        {TRENDING_EPISODES.map((ep, idx) => (
                            <AnimateOnScroll key={idx} animation="fadeUp" delay={idx * 120}>
                                <div className={`${styles.trendingCard} glass-card`}>
                                    <div className={styles.trendingImageWrapper}>
                                        <Image
                                            src={ep.image}
                                            alt={ep.title}
                                            fill
                                            className={styles.trendingImg}
                                            unoptimized
                                        />
                                        <div className={styles.trendingPlayOverlay} onClick={() => togglePlay(ep.title)}>
                                            <div className={`${styles.trendingPlayCircle} ${playingEpisode === ep.title ? styles.pulseGlow : ''}`}>
                                                {playingEpisode === ep.title ? <PauseIcon /> : <PlayIcon />}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </AnimateOnScroll>
                        ))}
                    </div>
                </div>
            </section>

            {/* 4. VOICES BEHIND THE MIC SECTION */}
            <section className={styles.hostsSection}>
                <div className="premium-container">
                    <div className={styles.sectionHeadingRow}>
                        <span className={styles.sectionLabelTheme}>The Talent</span>
                        <h2 className={styles.sectionTitle}>Voices Behind <span className={styles.highlightText}>The Mic.</span></h2>
                    </div>

                    <div className={styles.hostsGrid}>
                        {HOSTS.map((host, idx) => (
                            <AnimateOnScroll key={idx} animation="fadeUp" delay={idx * 150}>
                                <div className={styles.hostCard}>
                                    <div className={styles.hostImageWrapper}>
                                        <Image
                                            src={host.image}
                                            alt={host.name}
                                            fill
                                            className={styles.hostImg}
                                            unoptimized
                                        />
                                    </div>
                                    <div className={styles.hostContent}>
                                        <h3 className={styles.hostName}>{host.name}</h3>
                                        <p className={styles.hostRole}>{host.role}</p>
                                        <p className={styles.hostBio}>{host.bio}</p>
                                        <div className={styles.hostSocials}>
                                            <a href="#" className={styles.socialLink} aria-label="Twitter">
                                                <Twitter size={14} />
                                            </a>
                                            <a href="#" className={styles.socialLink} aria-label="Linkedin">
                                                <Linkedin size={14} />
                                            </a>
                                            <a href="#" className={styles.socialLink} aria-label="Instagram">
                                                <Instagram size={14} />
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            </AnimateOnScroll>
                        ))}
                    </div>
                </div>
            </section>

            {/* 5. PODCAST GALLERY SECTION */}
            <section className={styles.gallerySection}>
                <div className="premium-container">
                    <div className={styles.sectionHeadingRow}>
                        <span className={styles.sectionLabelTheme}>Podcast Gallery</span>
                        <h2 className={styles.sectionTitle}>Explore Podcast <span className={styles.highlightText}>Themes.</span></h2>
                    </div>

                    <div className={styles.galleryGrid}>
                        {GALLERY_THEMES.map((theme, idx) => (
                            <AnimateOnScroll key={idx} animation="fadeUp" delay={idx * 100}>
                                <div className={`${styles.galleryCard} glass-card`}>
                                    <div className={styles.galleryImageWrapper}>
                                        <Image
                                            src={theme.image}
                                            alt={theme.title}
                                            fill
                                            className={styles.galleryImg}
                                            unoptimized
                                        />
                                        <div className={styles.galleryCardOverlay}>
                                            <span className={styles.galleryCategory}>{theme.category}</span>
                                            <h3 className={styles.galleryCardTitle}>{theme.title}</h3>
                                        </div>
                                    </div>
                                </div>
                            </AnimateOnScroll>
                        ))}
                    </div>
                </div>
            </section>

            {/* 6. GLOBAL CTA SECTION */}
            <CTA
                title={<>Ready to Listen to <span className={styles.highlightText}>Our Stories?</span></>}
                description="Join thousands of listeners tuning in weekly to learn from elite engineering leaders, founders, and creators."
                buttonText="Explore All Episodes"
                buttonLink="#episodes"
            />
        </main>
    );
}
