"use client";
import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/AuthContext';
import { insforge } from '@/lib/insforge';
import styles from './interviews.module.css';
import AnimateOnScroll from '@/components/AnimateOnScroll';
import { getPublicStorageUrl } from '@/lib/utils/storage-url';

import * as Icons from '@/components/ui/icons';

// ─── Icons ──────────────────────────────────────────────────────────────────────
const IC = {
  Calendar: () => <Icons.Calendar width="20" height="20" strokeWidth="2" />,
  Clock: () => <Icons.Clock width="16" height="16" />,
  Video: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 8-6 4 6 4V8Z" /><rect x="2" y="6" width="14" height="12" rx="2" ry="2" /></svg>,
  Phone: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>,
  User: () => <Icons.User width="16" height="16" />,
  ChevronDown: () => <Icons.ChevronDown width="18" height="18" />,
  External: () => <Icons.External />,
  Download: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>,
  Google: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12.48 10.92v3.28h4.74c-.2 1.06-.9 1.95-1.8 2.56l2.9 2.26c1.7-1.57 2.68-3.88 2.68-6.52 0-.61-.05-1.21-.15-1.8H12.48z" fill="#4285F4"/><path d="M12.48 24c3.24 0 5.95-1.08 7.93-2.91l-2.9-2.26c-.81.54-1.85.86-2.97.86-2.28 0-4.21-1.54-4.9-3.62l-3.01 2.33c1.48 2.94 4.5 4.93 7.85 4.93z" fill="#34A853"/><path d="M7.58 16.07c-.17-.52-.27-1.08-.27-1.65s.1-1.13.27-1.65l-3.01-2.33c-.63 1.25-.99 2.67-.99 4.18s.36 2.93.99 4.18l3.01-2.33z" fill="#FBBC05"/><path d="M12.48 4.75c1.76 0 3.35.61 4.59 1.8l3.43-3.43C18.42 1.07 15.71 0 12.48 0 9.13 0 6.11 1.99 4.63 4.93l3.01 2.33c.69-2.08 2.62-3.62 4.9-3.62z" fill="#EA4335"/></svg>,
  Star: ({ filled }: { filled: boolean }) => (
    <Icons.Star filled={filled} className={filled ? styles.starFilled : styles.starEmpty} />
  ),
  TipCheck: () => <Icons.Check width="13" height="13" strokeWidth="3.5" />,
};

export default function InterviewsPage() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const roleId = params.role_id as string;

  const [interviews, setInterviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pastExpanded, setPastExpanded] = useState(false);

  const fetchData = async () => {
    if (!user) return;
    try {
      const { data, error } = await insforge.database
        .from('interviews')
        .select(`
          *,
          application:applications(
            job:jobs(
              id, title, 
              company:companies(name, logo_url)
            )
          ),
          recruiter:profiles!recruiter_id(id, name, avatar_url)
        `)
        .eq('candidate_id', user.id)
        .order('scheduled_at', { ascending: true });

      if (error) throw error;
      setInterviews(data || []);
    } catch (err) {
      console.error('Failed to fetch interviews:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const now = useMemo(() => new Date(), []);

  const { upcoming, past, nextSoon } = useMemo(() => {
    const sorted = [...interviews];
    const up = sorted.filter(i => new Date(i.scheduled_at) > now && i.status === 'scheduled');
    const ps = sorted.filter(i => new Date(i.scheduled_at) <= now || i.status !== 'scheduled');
    
    // Reverse past to show most recent first
    ps.sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime());

    // Next interview within 24 hours
    const soon = up.find(i => {
      const diff = new Date(i.scheduled_at).getTime() - now.getTime();
      return diff > 0 && diff < 24 * 60 * 60 * 1000;
    });

    return { upcoming: up, past: ps, nextSoon: soon };
  }, [interviews, now]);

  const generateICS = (interview: any) => {
    const start = new Date(interview.scheduled_at);
    const duration = interview.duration_mins || 45;
    const end = new Date(start.getTime() + duration * 60000);
    
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VEVENT',
      `DTSTART:${start.toISOString().replace(/[-:]/g,'').split('.')[0]}Z`,
      `DTEND:${end.toISOString().replace(/[-:]/g,'').split('.')[0]}Z`,
      `SUMMARY:Interview - ${interview.application?.job?.title || 'Job'}`,
      `DESCRIPTION:Interview with ${interview.recruiter?.name || 'Recruiter'}${interview.meeting_link ? '\\nJoin: ' + interview.meeting_link : ''}`,
      `LOCATION:${interview.meeting_link || 'TBD'}`,
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `interview-${interview.id.substring(0,8)}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getGoogleCalendarLink = (interview: any) => {
    const start = new Date(interview.scheduled_at);
    const duration = interview.duration_mins || 45;
    const end = new Date(start.getTime() + duration * 60000);
    
    const fmt = (d: Date) => d.toISOString().replace(/-|:|\.\d+/g, '');
    const dates = `${fmt(start)}/${fmt(end)}`;
    const title = encodeURIComponent(`Interview - ${interview.application?.job?.title || 'Job'}`);
    const details = encodeURIComponent(`Interview with ${interview.recruiter?.name || 'Recruiter'}${interview.meeting_link ? '\nJoin: ' + interview.meeting_link : ''}`);
    const location = encodeURIComponent(interview.meeting_link || 'Online');

    return `https://www.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}&location=${location}`;
  };

  const formatFullDateTime = (isoString: string) => {
    const date = new Date(isoString);
    const day = date.toLocaleDateString('en-IN', { weekday: 'long' });
    const d = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long' });
    const t = date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
    return `${day}, ${d} · ${t} IST`;
  };

  if (loading) {
    return (
      <div className={styles.dash} style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
        <style>{`
          @keyframes sk-pulse {
            0%, 100% { opacity: 0.6; }
            50% { opacity: 1; }
          }
          .sk-pulse {
            animation: sk-pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
            background-color: #e2e8f0;
          }
        `}</style>
        <div className={styles.pageHeader}>
          <div className="sk-pulse" style={{ width: '200px', height: '28px', borderRadius: '4px' }} />
        </div>

        <div className={styles.mainLayout}>
          <div className={styles.contentCol} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Countdown card skeleton */}
            <div className="sk-pulse" style={{ width: '100%', height: '140px', borderRadius: '12px' }} />

            {/* Interviews List section header skeleton */}
            <div className="sk-pulse" style={{ width: '150px', height: '20px', borderRadius: '4px', marginTop: '10px' }} />

            {/* Interviews List card skeleton */}
            {[1, 2].map(i => (
              <div 
                key={i} 
                style={{ 
                  background: '#ffffff', border: '1px solid #e2e5ea', borderRadius: '12px', 
                  padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' 
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div className="sk-pulse" style={{ width: '35%', height: '16px', borderRadius: '4px' }} />
                  <div className="sk-pulse" style={{ width: '15%', height: '14px', borderRadius: '4px' }} />
                </div>
                <div className="sk-pulse" style={{ width: '50%', height: '12px', borderRadius: '4px' }} />
                <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                  <div className="sk-pulse" style={{ width: '100px', height: '32px', borderRadius: '6px' }} />
                  <div className="sk-pulse" style={{ width: '120px', height: '32px', borderRadius: '6px' }} />
                </div>
              </div>
            ))}
          </div>

          {/* Sidebar tips skeleton */}
          <div className={styles.sidebarCol} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="sk-pulse" style={{ width: '100%', height: '280px', borderRadius: '12px' }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.dash}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>My Interviews</h1>
      </div>

      <div className={styles.mainLayout}>
        <div className={styles.contentCol}>
          
          {/* Countdown Card */}
          {nextSoon && (
            <AnimateOnScroll animation="fadeUp">
              <div className={styles.countdownCard}>
                <div className={styles.countdownLabel}>
                  <IC.Clock /> Upcoming in {Math.max(1, Math.floor((new Date(nextSoon.scheduled_at).getTime() - now.getTime()) / 3600000))} hours
                </div>
                <div className={styles.countdownTimer}>
                  {nextSoon.application?.job?.title} with {nextSoon.application?.job?.company?.name}
                </div>
                <div className={styles.cardActions} style={{ marginTop: '0.5rem' }}>
                  {nextSoon.meeting_link && (
                    <a href={nextSoon.meeting_link} target="_blank" rel="noopener noreferrer" className={styles.btnPrimary}>
                      Join Video Call <IC.External />
                    </a>
                  )}
                  <button className={styles.btnSecondary} onClick={() => generateICS(nextSoon)}>
                    Add to Calendar <IC.Calendar />
                  </button>
                </div>
              </div>
            </AnimateOnScroll>
          )}

          {/* Upcoming Section */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Upcoming Interviews</h2>
            </div>

            {upcoming.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon} style={{ transform: 'scale(2.5)', marginBottom: '1rem' }}><IC.Calendar /></div>
                <h3 className={styles.emptyTitle}>No interviews scheduled yet</h3>
                <p className={styles.emptyText}>When a recruiter schedules an interview, it will appear here.</p>
                <Link href={`/dashboard/candidate/${roleId}`} className={styles.btnPrimary}>Browse Open Jobs</Link>
              </div>
            ) : (
              upcoming.map((inv, i) => (
                <AnimateOnScroll key={inv.id} animation="fadeUp" delay={i * 50}>
                  <InterviewCard 
                    interview={inv} 
                    onICS={() => generateICS(inv)} 
                    onGoogle={() => window.open(getGoogleCalendarLink(inv), '_blank')}
                    formatFull={formatFullDateTime}
                  />
                </AnimateOnScroll>
              ))
            )}
          </div>

          {/* Past Section */}
          {past.length > 0 && (
            <div className={styles.section}>
              <div className={styles.sectionHeader} onClick={() => setPastExpanded(!pastExpanded)} style={{ borderBottom: 'none' }}>
                <h2 className={styles.sectionTitle}>Past Interviews ({past.length})</h2>
                <div className={`${styles.transition} ${pastExpanded ? styles.rotate180 : ''}`}>
                  <IC.ChevronDown />
                </div>
              </div>

              {pastExpanded && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
                  {past.map((inv, i) => (
                    <InterviewCard 
                      key={inv.id} 
                      interview={inv} 
                      isPast 
                      formatFull={formatFullDateTime}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className={styles.sidebar}>
          <AnimateOnScroll animation="fadeLeft">
            <div className={styles.tipsCard}>
              <h3 className={styles.tipsTitle}>Interview Tips</h3>
              <div className={styles.tipsList}>
                {[
                  "Research the company beforehand",
                  "Test your video/audio 10 minutes early",
                  "Have your resume ready to share",
                  "Prepare 3 questions to ask the interviewer"
                ].map((tip, i) => (
                  <div key={i} className={styles.tipItem}>
                    <span className={styles.tipIcon}><IC.TipCheck /></span>
                    <span>{tip}</span>
                  </div>
                ))}
              </div>
            </div>
          </AnimateOnScroll>
        </aside>
      </div>
    </div>
  );
}

function InterviewCard({ interview, isPast, onICS, onGoogle, formatFull }: any) {
  const job = interview.application?.job;
  const recruiter = interview.recruiter;
  const status = interview.status;

  return (
    <div className={styles.interviewCard}>
      <div className={styles.cardTop}>
        <div className={styles.companyInfo}>
          <div className={styles.logo}>
            {job?.company?.logo_url ? (
              <img src={getPublicStorageUrl('company-logos', job.company.logo_url)} alt={job.company.name} />
            ) : (
              job?.company?.name?.charAt(0) || '?'
            )}
          </div>
          <div className={styles.jobMeta}>
            <h3 className={styles.jobTitle}>{job?.title || 'Job Title'}</h3>
            <span className={styles.companyName}>{job?.company?.name || 'Company'}</span>
          </div>
        </div>
        <span className={`${styles.statusBadge} ${
          status === 'scheduled' ? styles.statusConfirmed :
          status === 'completed' ? styles.statusCompleted :
          styles.statusCancelled
        }`}>
          {status === 'scheduled' ? 'Confirmed' : status}
        </span>
      </div>

      <div className={styles.cardBody}>
        <div className={styles.infoItem}>
          <IC.User /> <span>With {recruiter?.name || 'Recruiter'}</span>
        </div>
        <div className={styles.infoItem}>
          <IC.Calendar /> <span>{formatFull(interview.scheduled_at)}</span>
        </div>
        <div className={styles.infoItem}>
          <IC.Clock /> <span>{interview.duration_mins || 45} Minutes</span>
        </div>
        <div className={styles.typeBadge}>
          {interview.type?.toLowerCase().includes('video') ? <IC.Video /> : <IC.Phone />}
          {interview.type || 'Video Call'}
        </div>
      </div>

      {!isPast && (
        <div className={styles.cardActions}>
          {interview.meeting_link && (
            <a href={interview.meeting_link} target="_blank" rel="noopener noreferrer" className={styles.btnPrimary}>
              Join Video Call <IC.External />
            </a>
          )}
          <button className={styles.btnSecondary} onClick={onICS}>
            <IC.Download /> .ICS
          </button>
          <button className={styles.btnSecondary} onClick={onGoogle}>
            <IC.Google /> Google
          </button>
        </div>
      )}

      {isPast && status === 'completed' && interview.rating && (
        <div className={styles.feedback}>
          <span className={styles.feedbackLabel}>Feedback Received</span>
          <div className={styles.stars}>
            {[1, 2, 3, 4, 5].map(s => (
              <IC.Star key={s} filled={s <= interview.rating} />
            ))}
          </div>
        </div>
      )}

      {isPast && status === 'cancelled' && (
        <div className={styles.feedback}>
          <span className={styles.statusCancelled} style={{ fontSize: '0.875rem', fontWeight: 650, background: 'none', padding: 0 }}>
            Cancelled by recruiter on {new Date(interview.updated_at || interview.created_at).toLocaleDateString()}
          </span>
        </div>
      )}
    </div>
  );
}
