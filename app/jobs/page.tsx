'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './jobs.module.css';
import { useAuth } from '@/lib/auth/AuthContext';
import { invokeFunction } from '@/lib/insforge';
import { SectionHeader } from '@/components/ui';
import { JobCard } from '@/components/jobs/JobCard';
import { CustomSelect } from '@/components/ui/CustomSelect';

// Icons
const Ico = {
  Search: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>,
  Location: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>,
  Briefcase: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" /></svg>,
  Filter: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg>,
  Sparkle: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3 1.912 5.885L20 10.8l-5.088 1.912L13 18.6l-1.912-5.888L6 10.8l5.088-1.915Z" /></svg>,
};

const CATEGORIES = ['Engineering', 'Design', 'Marketing', 'Product', 'Sales', 'Support', 'Finance', 'HR'];
const JOB_TYPES = ['Full-time', 'Part-time', 'Freelance', 'Remote', 'Contract'];
const SALARY_RANGES = [
  { label: 'Any', value: 'any' },
  { label: '₹0 - ₹5L', value: '0-5' },
  { label: '₹5L - ₹15L', value: '5-15' },
  { label: '₹15L - ₹30L', value: '15-30' },
  { label: '₹30L+', value: '30+' },
];

export default function JobsBrowsePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Search & Filter State
  const [search, setSearch] = useState('');
  const [location, setLocation] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeTypes, setActiveTypes] = useState<string[]>([]);
  const [salaryRange, setSalaryRange] = useState('any');
  const [isRemoteOnly, setIsRemoteOnly] = useState(false);
  const [sortBy, setSortBy] = useState('Latest');

  useEffect(() => {
    async function fetchJobs() {
      try {
        const { data, error } = await invokeFunction('jobs', {
          method: 'GET',
          queries: { status: 'active', is_approved: 'true' }
        });
        if (!error) {
          setJobs(data?.data || data || []);
        }
      } catch (err) {
        console.error('Fetch error:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchJobs();
  }, []);

  const toggleType = (type: string) => {
    setActiveTypes(prev => 
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      const matchesSearch = !search || job.title.toLowerCase().includes(search.toLowerCase()) || job.company_name?.toLowerCase().includes(search.toLowerCase());
      const matchesLocation = !location || job.location.toLowerCase().includes(location.toLowerCase());
      const matchesCategory = !activeCategory || job.category === activeCategory || job.department === activeCategory;
      const matchesType = activeTypes.length === 0 || activeTypes.includes(job.type);
      const matchesRemote = !isRemoteOnly || job.type === 'Remote' || job.location.toLowerCase().includes('remote');
      
      // Salary filter logic (simplified)
      let matchesSalary = true;
      if (salaryRange !== 'any') {
        const [min, max] = salaryRange.split('-').map(Number);
        if (max) {
          matchesSalary = job.salary_min >= min * 100000 && job.salary_max <= max * 100000;
        } else {
          matchesSalary = job.salary_min >= min * 100000;
        }
      }

      return matchesSearch && matchesLocation && matchesCategory && matchesType && matchesRemote && matchesSalary;
    });
  }, [jobs, search, location, activeCategory, activeTypes, salaryRange, isRemoteOnly]);

  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <div className="premium-container">
          <div className={styles.heroContent}>
            <SectionHeader
              centered
              tag="Job Marketplace"
              title={<>Discover Your <span className="text-gradient">Dream Role</span></>}
              description="Browse the latest job opportunities, apply with ease, and share to earn rewards."
            />

            <div className={styles.searchCard}>
              <div className={styles.searchField}>
                <Ico.Search />
                <input 
                  type="text" 
                  placeholder="Job title or company" 
                  className={styles.searchInput}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className={styles.searchDivider} />
              <div className={styles.searchField}>
                <Ico.Location />
                <input 
                  type="text" 
                  placeholder="City or Remote" 
                  className={styles.searchInput}
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
              <button className={styles.searchBtn}>
                <Ico.Search /> Search
              </button>
            </div>

            <div className={styles.popularTags}>
              <span className={styles.popularLabel}>Popular Categories:</span>
              {CATEGORIES.slice(0, 5).map(cat => (
                <button 
                  key={cat} 
                  className={`${styles.popularTag} ${activeCategory === cat ? styles.tagActive : ''}`}
                  onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <div className="premium-container">
        <div className={styles.body}>
          <aside className={styles.sidebar}>
            <div className={styles.sidebarTitle}><Ico.Filter /> Filters</div>
            
            <div className={styles.filterGroup}>
              <span className={styles.filterLabel}>Job Category</span>
              <div className={styles.filterList}>
                {CATEGORIES.map(cat => (
                  <label key={cat} className={styles.filterCheck}>
                    <input 
                      type="radio" 
                      name="category"
                      checked={activeCategory === cat}
                      onChange={() => setActiveCategory(cat)}
                    />
                    <span>{cat}</span>
                  </label>
                ))}
                <button 
                  className={styles.clearFilter} 
                  onClick={() => setActiveCategory(null)}
                  style={{ display: activeCategory ? 'block' : 'none' }}
                >
                  Clear Category
                </button>
              </div>
            </div>

            <div className={styles.filterGroup}>
              <span className={styles.filterLabel}>Job Type</span>
              <div className={styles.filterList}>
                {JOB_TYPES.map(type => (
                  <label key={type} className={styles.filterCheck}>
                    <input 
                      type="checkbox" 
                      checked={activeTypes.includes(type)}
                      onChange={() => toggleType(type)}
                    />
                    <span>{type}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className={styles.filterGroup}>
              <span className={styles.filterLabel}>Salary Range (Annual)</span>
              <div className={styles.filterList}>
                {SALARY_RANGES.map(range => (
                  <label key={range.value} className={styles.filterCheck}>
                    <input 
                      type="radio" 
                      name="salary"
                      checked={salaryRange === range.value}
                      onChange={() => setSalaryRange(range.value)}
                    />
                    <span>{range.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className={styles.filterGroup}>
              <label className={styles.filterCheck}>
                <input 
                  type="checkbox" 
                  checked={isRemoteOnly}
                  onChange={(e) => setIsRemoteOnly(e.target.checked)}
                />
                <span style={{ fontWeight: 600, color: '#fff' }}>Remote Only</span>
              </label>
            </div>
          </aside>

          <section className={styles.main}>
            <div className={styles.resultsHdr}>
              <span className={styles.resultsCount}>
                Showing <strong>{filteredJobs.length}</strong> available positions
              </span>
              <div className={styles.sortWrapper}>
                <span className={styles.resultsCount}>Sort by: </span>
                <CustomSelect 
                  className={styles.sortSelect}
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value)}
                  options={['Latest', 'Most Applied', 'Most Shared']}
                />
              </div>
            </div>

            {loading ? (
              <div className={styles.loading}>
                {[1, 2, 3].map(i => <div key={i} className="skeleton-card" style={{ height: 200, marginBottom: 16 }} />)}
              </div>
            ) : filteredJobs.length > 0 ? (
              <div className={styles.jobGrid}>
                {filteredJobs.map(job => (
                  <JobCard key={job.id} job={job} showActions={true} />
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>
                <h3 className={styles.emptyTitle}>No matching jobs found</h3>
                <p className={styles.emptyDesc}>Try adjusting your search or clearing filters to see more opportunities.</p>
                <button 
                  className={styles.searchBtn} 
                  style={{ marginTop: '1.5rem', marginInline: 'auto' }}
                  onClick={() => {
                    setSearch('');
                    setLocation('');
                    setActiveCategory(null);
                    setActiveTypes([]);
                    setSalaryRange('any');
                    setIsRemoteOnly(false);
                  }}
                >
                  Clear All Filters
                </button>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
