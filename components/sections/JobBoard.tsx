"use client";
import React, { useState } from 'react';
import CodeOutlinedIcon from '@mui/icons-material/CodeOutlined';
import PaletteOutlinedIcon from '@mui/icons-material/PaletteOutlined';
import TrendingUpOutlinedIcon from '@mui/icons-material/TrendingUpOutlined';
import WorkOutlinedIcon from '@mui/icons-material/WorkOutlined';
import MonitorHeartOutlinedIcon from '@mui/icons-material/MonitorHeartOutlined';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined';
import HeadphonesOutlinedIcon from '@mui/icons-material/HeadphonesOutlined';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import AttachMoneyOutlinedIcon from '@mui/icons-material/AttachMoneyOutlined';
import AccessTimeOutlinedIcon from '@mui/icons-material/AccessTimeOutlined';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import FilterListOutlinedIcon from '@mui/icons-material/FilterListOutlined';
import Link from 'next/link';
import { CustomSelect } from '@/components/ui/CustomSelect';
import styles from './JobBoard.module.css';

const SECTORS = [
    { id: 'tech', label: 'Technology', icon: <CodeOutlinedIcon sx={{ fontSize: 24 }} />, count: '1,240+', color: '#3b82f6' },
    { id: 'design', label: 'Design', icon: <PaletteOutlinedIcon sx={{ fontSize: 24 }} />, count: '850+', color: '#8b5cf6' },
    { id: 'marketing', label: 'Marketing', icon: <TrendingUpOutlinedIcon sx={{ fontSize: 24 }} />, count: '620+', color: '#ec4899' },
    { id: 'finance', label: 'Finance', icon: <WorkOutlinedIcon sx={{ fontSize: 24 }} />, count: '430+', color: '#10b981' },
    { id: 'health', label: 'Healthcare', icon: <MonitorHeartOutlinedIcon sx={{ fontSize: 24 }} />, count: '920+', color: '#ef4444' },
    { id: 'business', label: 'Business', icon: <GroupsOutlinedIcon sx={{ fontSize: 24 }} />, count: '310+', color: '#f59e0b' },
    { id: 'education', label: 'Education', icon: <SchoolOutlinedIcon sx={{ fontSize: 24 }} />, count: '150+', color: '#06b6d4' },
    { id: 'support', label: 'Customer Success', icon: <HeadphonesOutlinedIcon sx={{ fontSize: 24 }} />, count: '280+', color: '#f97316' },
];

const JOBS = [
    {
        id: 1,
        title: "Senior AI Engineer",
        company: "NeuroNexus",
        location: "Bangalore, KA",
        salary: "$180k - $240k",
        type: "Full-time",
        posted: "2h ago",
        sector: "tech",
        speciality: "Machine Learning",
        logoColor: "#3b82f6"
    },
    {
        id: 2,
        title: "Product Designer",
        company: "VividOps",
        location: "Remote",
        salary: "$120k - $160k",
        type: "Full-time",
        posted: "5h ago",
        sector: "design",
        speciality: "UX/UI Design",
        logoColor: "#8b5cf6"
    },
    {
        id: 3,
        title: "Growth Marketer",
        company: "ScaleFlow",
        location: "Mumbai, MH",
        salary: "$90k - $130k",
        type: "Contract",
        posted: "1d ago",
        sector: "marketing",
        speciality: "Performance Marketing",
        logoColor: "#ec4899"
    },
    {
        id: 4,
        title: "Financial Analyst",
        company: "GoldAnchor",
        location: "Gurugram, HR",
        salary: "$85k - $110k",
        type: "Full-time",
        posted: "3h ago",
        sector: "finance",
        speciality: "Asset Management",
        logoColor: "#10b981"
    },
    {
        id: 5,
        title: "Medical Researcher",
        company: "BioVinc",
        location: "Pune, MH",
        salary: "$110k - $150k",
        type: "Full-time",
        posted: "1d ago",
        sector: "health",
        speciality: "Genomics",
        logoColor: "#ef4444"
    },
    {
        id: 6,
        title: "Operations Manager",
        company: "BizPace",
        location: "Hyderabad, TS",
        salary: "$95k - $125k",
        type: "Full-time",
        posted: "2d ago",
        sector: "business",
        speciality: "Supply Chain",
        logoColor: "#f59e0b"
    },
    {
        id: 7,
        title: "Curriculum Designer",
        company: "EduVate",
        location: "Remote",
        salary: "$70k - $95k",
        type: "Part-time",
        posted: "4h ago",
        sector: "education",
        speciality: "EdTech",
        logoColor: "#06b6d4"
    },
    {
        id: 8,
        title: "CS Lead",
        company: "CloudHelp",
        location: "Remote",
        salary: "$80k - $115k",
        type: "Full-time",
        posted: "6h ago",
        sector: "support",
        speciality: "SaaS Support",
        logoColor: "#f97316"
    },
    {
        id: 9,
        title: "Cloud Architect",
        company: "SkyData",
        location: "Chennai, TN",
        salary: "$160k - $210k",
        type: "Full-time",
        posted: "1d ago",
        sector: "tech",
        speciality: "AWS/Azure",
        logoColor: "#3b82f6"
    }
];

const JobBoard = () => {
    const [activeSector, setActiveSector] = useState('tech');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('Latest');

    const filteredJobs = JOBS.filter(job =>
        job.sector === activeSector &&
        (job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            job.company.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <section className={styles.section}>
            <div className={styles.container}>
                {/* Search Bar */}
                <div className={styles.searchWrapper}>
                    <div className={styles.searchBox}>
                        <SearchOutlinedIcon className={styles.searchIcon} sx={{ fontSize: 20 }} />
                        <input
                            type="text"
                            placeholder="Job title, company, or keyword"
                            className={styles.searchInput}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <button className={styles.searchBtn}>Search Jobs</button>
                    </div>
                </div>

                {/* Sectors Grid */}
                <div className={styles.sectorsGrid}>
                    {SECTORS.map((sector) => (
                        <button
                            key={sector.id}
                            className={`${styles.sectorCard} ${activeSector === sector.id ? styles.sectorActive : ''}`}
                            onClick={() => setActiveSector(sector.id)}
                            style={{ '--accent': sector.color } as React.CSSProperties}
                        >
                            <div className={styles.sectorIcon}>{sector.icon}</div>
                            <div className={styles.sectorInfo}>
                                <h3 className={styles.sectorLabel}>{sector.label}</h3>
                                <span className={styles.sectorCount}>{sector.count} jobs</span>
                            </div>
                        </button>
                    ))}
                </div>

                {/* Filters Row */}
                <div className={styles.filterRow}>
                    <div className={styles.resultCount}>
                        Showing <strong>{filteredJobs.length}</strong> results for <strong>{SECTORS.find(s => s.id === activeSector)?.label}</strong>
                    </div>
                    <div className={styles.filters}>
                        <button className={styles.filterBtn}>
                            <FilterListOutlinedIcon sx={{ fontSize: 16 }} /> Filters
                        </button>
                        <CustomSelect
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            options={['Latest', 'Salary: High to Low', 'Salary: Low to High']}
                            className={styles.sortSelect}
                        />
                    </div>
                </div>

                {/* Jobs Grid */}
                <div className={styles.jobsGrid}>
                    {filteredJobs.length > 0 ? (
                        filteredJobs.map((job) => (
                            <div key={job.id} className={styles.jobCard}>
                                <div className={styles.jobHeader}>
                                    <div className={styles.companyLogo} style={{ background: job.logoColor }}>
                                        {job.company.substring(0, 1)}
                                    </div>
                                    <div className={styles.jobTime}>
                                        <AccessTimeOutlinedIcon sx={{ fontSize: 14 }} /> {job.posted}
                                    </div>
                                </div>
                                <div className={styles.jobBody}>
                                    <h3 className={styles.jobTitle}>{job.title}</h3>
                                    <p className={styles.companyName}>{job.company}</p>
                                    <div className={styles.specialityBadge}>{job.speciality}</div>
                                </div>
                                <div className={styles.jobMeta}>
                                    <div className={styles.metaItem}>
                                        <LocationOnOutlinedIcon sx={{ fontSize: 16 }} /> {job.location}
                                    </div>
                                    <div className={styles.metaItem}>
                                        <AttachMoneyOutlinedIcon sx={{ fontSize: 16 }} /> {job.salary}
                                    </div>
                                </div>
                                <div className={styles.jobFooter}>
                                    <span className={styles.jobType}>{job.type}</span>
                                    <Link href={`/jobs/${job.id}`} className={styles.applyBtn}>Apply Now</Link>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className={styles.emptyState}>
                            <p>No jobs found in this sector matching your search.</p>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
};

export default JobBoard;

