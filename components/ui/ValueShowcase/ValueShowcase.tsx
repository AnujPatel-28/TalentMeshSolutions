"use client";
import React from 'react';
import PublicOutlinedIcon from '@mui/icons-material/PublicOutlined';
import SecurityOutlinedIcon from '@mui/icons-material/SecurityOutlined';
import BoltOutlinedIcon from '@mui/icons-material/BoltOutlined';
import FavoriteOutlinedIcon from '@mui/icons-material/FavoriteOutlined';
import EmojiEventsOutlinedIcon from '@mui/icons-material/EmojiEventsOutlined';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import styles from './ValueShowcase.module.css';

const VALUES = [
    { icon: <PublicOutlinedIcon sx={{ fontSize: 24 }} />, title: "Global Reach", desc: "We connect talent and companies across 50+ countries, breaking down borders with AI matching." },
    { icon: <SecurityOutlinedIcon sx={{ fontSize: 24 }} />, title: "Ethical AI", desc: "Our algorithms are built to eliminate bias, ensuring every candidate gets a fair and equitable shot." },
    { icon: <BoltOutlinedIcon sx={{ fontSize: 24 }} />, title: "High Velocity", desc: "Reduce your time-to-hire by 60% with our automated screening and intelligent sourcing engine." },
    { icon: <FavoriteOutlinedIcon sx={{ fontSize: 24 }} />, title: "Human Centered", desc: "Technology should empower people. We handle the data so you can focus on the human connection." },
    { icon: <EmojiEventsOutlinedIcon sx={{ fontSize: 24 }} />, title: "Elite Quality", desc: "We screen for the top 1% of talent, ensuring your team is built with the best engineers and designers." },
    { icon: <GroupsOutlinedIcon sx={{ fontSize: 24 }} />, title: "Community Driven", desc: "Join a network of 10,000+ companies and millions of candidates growing together." }
];

const ValueShowcase = () => {
    return (
        <section className={styles.section}>
            <div className={styles.container}>
                <div className={styles.header}>
                    <span className={styles.tag}>Why TalentMesh</span>
                    <h2 className={styles.title}>The next evolution of <span className={styles.highlight}>recruitment.</span></h2>
                    <p className={styles.desc}>We don&apos;t just match keywords; we architect the teams that build the future.</p>
                </div>
                <div className={styles.grid}>
                    {VALUES.map((v, i) => (
                        <div key={i} className={styles.card}>
                            <div className={styles.iconWrap}>{v.icon}</div>
                            <h3 className={styles.cardTitle}>{v.title}</h3>
                            <p className={styles.cardDesc}>{v.desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default ValueShowcase;
