"use client";

import React, { useState, useEffect, useCallback } from 'react';
import styles from './admin-notifications.module.css';
import NotificationCenter from '@/components/notifications/NotificationCenter';
import { insforge, invokeFunction } from '@/lib/insforge';
import toast, { Toaster } from 'react-hot-toast';

export default function AdminNotificationsPage() {
  const [activeTab, setActiveTab] = useState<'center' | 'monitor'>('center');
  
  // Queue stats state
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    queued: 0,
    sent: 0,
    delivered: 0,
    failed: 0,
    throttled: 0,
    opened: 0,
    clicked: 0,
    dismissed: 0
  });

  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Template previewer state
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<string>('');
  const [payloadVariables, setPayloadVariables] = useState<Record<string, string>>({});

  const fetchQueueStats = useCallback(async () => {
    setIsLoadingStats(true);
    try {
      // 1. Fetch Job counts by status
      const { data: jobs, error: jobsError } = await insforge.database
        .from('notification_jobs')
        .select('status');
      
      if (jobsError) throw jobsError;

      // 2. Fetch Receipts counts
      const { data: receipts, error: recError } = await insforge.database
        .from('notification_receipts')
        .select('read_at, clicked_at, dismissed_at');

      if (recError) throw recError;

      const jobCounts = {
        total: jobs?.length || 0,
        pending: 0,
        queued: 0,
        sent: 0,
        delivered: 0,
        failed: 0,
        throttled: 0
      };

      jobs?.forEach((j: any) => {
        if (j.status in jobCounts) {
          jobCounts[j.status as keyof typeof jobCounts]++;
        }
      });

      const receiptCounts = {
        opened: receipts?.filter((r: any) => r.read_at).length || 0,
        clicked: receipts?.filter((r: any) => r.clicked_at).length || 0,
        dismissed: receipts?.filter((r: any) => r.dismissed_at).length || 0,
      };

      setStats({
        ...jobCounts,
        ...receiptCounts
      });
    } catch (err: any) {
      console.error('Error fetching queue stats:', err.message || err);
    } finally {
      setIsLoadingStats(false);
    }
  }, []);

  const fetchTemplates = useCallback(async () => {
    try {
      const { data, error } = await insforge.database
        .from('notification_templates')
        .select('*');
      if (!error && data) {
        setTemplates(data);
        if (data.length > 0) {
          setSelectedTemplateKey(data[0].key);
        }
      }
    } catch (err) {
      console.error('Error fetching templates:', err);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'monitor') {
      fetchQueueStats();
      fetchTemplates();
    }
  }, [activeTab, fetchQueueStats, fetchTemplates]);

  // Set default sample values when template changes
  useEffect(() => {
    if (selectedTemplateKey) {
      const activeTemplate = templates.find(t => t.key === selectedTemplateKey);
      const allowed = activeTemplate?.allowed_variables || [];
      const sampleVals: Record<string, string> = {};
      
      allowed.forEach((v: string) => {
        if (v === 'candidate') sampleVals[v] = 'Gauri';
        else if (v === 'job') sampleVals[v] = 'Senior Full-Stack Developer';
        else if (v === 'company') sampleVals[v] = 'TalentMesh Solutions';
        else if (v === 'status') sampleVals[v] = 'Approved';
        else if (v === 'time') sampleVals[v] = 'Friday, 10:00 AM';
        else if (v === 'ip_address') sampleVals[v] = '192.168.1.45';
        else if (v === 'export_type') sampleVals[v] = 'Recruiter Report';
        else if (v === 'test_val') sampleVals[v] = 'Active';
        else sampleVals[v] = '';
      });
      setPayloadVariables(sampleVals);
    }
  }, [selectedTemplateKey, templates]);

  const handleRunWorker = async () => {
    setIsActionLoading(true);
    const resolveToast = toast.loading('Running Notification Worker...');
    try {
      const { data, error } = await invokeFunction('notification-worker');
      if (error) throw new Error(error.message);
      toast.success(data?.message || 'Worker completed execution successfully.', { id: resolveToast });
      fetchQueueStats();
    } catch (err: any) {
      toast.error(err.message || 'Worker execution failed.', { id: resolveToast });
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleRetryFailed = async () => {
    setIsActionLoading(true);
    const resolveToast = toast.loading('Retrying failed notification jobs...');
    try {
      const { error } = await insforge.database
        .from('notification_jobs')
        .update({
          status: 'pending',
          retry_count: 0,
          next_attempt_at: new Date().toISOString()
        })
        .eq('status', 'failed');
      
      if (error) throw error;
      toast.success('Failed jobs queued for retry.', { id: resolveToast });
      fetchQueueStats();
    } catch (err: any) {
      toast.error(err.message || 'Failed to retry jobs.', { id: resolveToast });
    } finally {
      setIsActionLoading(false);
    }
  };

  // Safe variable interpolation for preview
  const activeTemplate = templates.find(t => t.key === selectedTemplateKey);
  const titleTemplate = activeTemplate?.title_template || '';
  const bodyTemplate = activeTemplate?.body_template || '';
  const allowed = activeTemplate?.allowed_variables || [];

  const interpolate = (templateStr: string) => {
    return templateStr.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
      const trimmed = key.trim();
      if (allowed.includes(trimmed)) {
        return payloadVariables[trimmed] || `[${trimmed}]`;
      }
      return ''; // Safe fallback for non-whitelisted variables
    });
  };

  const finalTitle = interpolate(titleTemplate);
  const finalBody = interpolate(bodyTemplate);

  // Stats helpers
  const deliveryRate = stats.delivered + stats.failed > 0
    ? Math.round((stats.delivered / (stats.delivered + stats.failed)) * 100)
    : 100;

  const openRate = stats.delivered > 0
    ? Math.round((stats.opened / stats.delivered) * 100)
    : 0;

  const clickRate = stats.opened > 0
    ? Math.round((stats.clicked / stats.opened) * 100)
    : 0;

  return (
    <div className={styles.container}>
      <Toaster />
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Notifications Control Center</h1>
          <p className={styles.subtitle}>Manage real-time notifications, templates, and delivery pipelines.</p>
        </div>
        
        <div className={styles.tabs}>
          <button 
            className={`${styles.tab} ${activeTab === 'center' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('center')}
          >
            My Inbox
          </button>
          <button 
            className={`${styles.tab} ${activeTab === 'monitor' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('monitor')}
          >
            Queue Monitor
          </button>
        </div>
      </header>

      {activeTab === 'center' ? (
        <div style={{ height: 'calc(100vh - 200px)', display: 'flex', flexDirection: 'column' }}>
          <NotificationCenter role="admin" />
        </div>
      ) : (
        <div>
          {/* Metrics dashboard */}
          <div className={styles.dashboardGrid}>
            <div className={`${styles.card} ${styles.cardPrimary}`}>
              <div className={styles.cardHeader}>Total Notification Jobs</div>
              <div className={styles.cardValue}>{stats.total}</div>
              <div className={styles.cardFooter}>All channels tracked</div>
            </div>
            
            <div className={`${styles.card} ${styles.cardSuccess}`}>
              <div className={styles.cardHeader}>Delivery Success</div>
              <div className={styles.cardValue}>{deliveryRate}%</div>
              <div className={styles.cardFooter}>{stats.delivered} delivered successfully</div>
            </div>

            <div className={`${styles.card} ${styles.cardWarning}`}>
              <div className={styles.cardHeader}>Opened / Open Rate</div>
              <div className={styles.cardValue}>{openRate}%</div>
              <div className={styles.cardFooter}>{stats.opened} of {stats.delivered} read</div>
            </div>

            <div className={`${styles.card} ${styles.cardDanger}`}>
              <div className={styles.cardHeader}>Failed Jobs</div>
              <div className={styles.cardValue}>{stats.failed}</div>
              <div className={styles.cardFooter}>Needs manual recycle</div>
            </div>
          </div>

          <div className={styles.previewLayout}>
            {/* Left Column: Funnel & Actions */}
            <div>
              {/* Funnel Section */}
              <div className={styles.section}>
                <h2 className={styles.sectionTitle}>
                  <span>📊</span> Delivery Funnel Metrics
                </h2>
                
                <div className={styles.funnelContainer}>
                  {/* Queued */}
                  <div className={styles.funnelRow}>
                    <span className={styles.funnelLabel}>Queued / Pending</span>
                    <div className={styles.funnelBarContainer}>
                      <div 
                        className={styles.funnelBar}
                        style={{ 
                          width: `${stats.total > 0 ? ((stats.queued + stats.pending) / stats.total) * 100 : 0}%`,
                          background: 'linear-gradient(to right, #60a5fa, #3b82f6)' 
                        }}
                      >
                        {stats.queued + stats.pending > 0 && `${Math.round(((stats.queued + stats.pending) / stats.total) * 100)}%`}
                      </div>
                    </div>
                    <span className={styles.funnelValue}>{stats.queued + stats.pending}</span>
                  </div>

                  {/* Throttled */}
                  <div className={styles.funnelRow}>
                    <span className={styles.funnelLabel}>Throttled</span>
                    <div className={styles.funnelBarContainer}>
                      <div 
                        className={styles.funnelBar}
                        style={{ 
                          width: `${stats.total > 0 ? (stats.throttled / stats.total) * 100 : 0}%`,
                          background: 'linear-gradient(to right, #fbbf24, #f59e0b)' 
                        }}
                      >
                        {stats.throttled > 0 && `${Math.round((stats.throttled / stats.total) * 100)}%`}
                      </div>
                    </div>
                    <span className={styles.funnelValue}>{stats.throttled}</span>
                  </div>

                  {/* Delivered */}
                  <div className={styles.funnelRow}>
                    <span className={styles.funnelLabel}>Delivered</span>
                    <div className={styles.funnelBarContainer}>
                      <div 
                        className={styles.funnelBar}
                        style={{ 
                          width: `${stats.total > 0 ? (stats.delivered / stats.total) * 100 : 0}%`,
                          background: 'linear-gradient(to right, #34d399, #10b981)' 
                        }}
                      >
                        {stats.delivered > 0 && `${Math.round((stats.delivered / stats.total) * 100)}%`}
                      </div>
                    </div>
                    <span className={styles.funnelValue}>{stats.delivered}</span>
                  </div>

                  {/* Opened */}
                  <div className={styles.funnelRow}>
                    <span className={styles.funnelLabel}>Opened</span>
                    <div className={styles.funnelBarContainer}>
                      <div 
                        className={styles.funnelBar}
                        style={{ 
                          width: `${stats.total > 0 ? (stats.opened / stats.total) * 100 : 0}%`,
                          background: 'linear-gradient(to right, #a78bfa, #8b5cf6)' 
                        }}
                      >
                        {stats.opened > 0 && `${Math.round((stats.opened / stats.total) * 100)}%`}
                      </div>
                    </div>
                    <span className={styles.funnelValue}>{stats.opened}</span>
                  </div>

                  {/* Clicked */}
                  <div className={styles.funnelRow}>
                    <span className={styles.funnelLabel}>Clicked</span>
                    <div className={styles.funnelBarContainer}>
                      <div 
                        className={styles.funnelBar}
                        style={{ 
                          width: `${stats.total > 0 ? (stats.clicked / stats.total) * 100 : 0}%`,
                          background: 'linear-gradient(to right, #f472b6, #ec4899)' 
                        }}
                      >
                        {stats.clicked > 0 && `${Math.round((stats.clicked / stats.total) * 100)}%`}
                      </div>
                    </div>
                    <span className={styles.funnelValue}>{stats.clicked}</span>
                  </div>
                </div>
              </div>

              {/* Controls Section */}
              <div className={styles.section}>
                <h2 className={styles.sectionTitle}>
                  <span>⚙️</span> Queue Controls
                </h2>
                
                <div className={styles.controlsGrid}>
                  <div className={styles.actionBox}>
                    <div>
                      <h4 style={{ fontWeight: 600, color: '#0f172a', marginBottom: '0.25rem' }}>Run Notification Worker</h4>
                      <p className={styles.actionDesc}>Simulate the cron trigger to lock, interpolate, and process pending and throttled notification jobs.</p>
                    </div>
                    <button 
                      onClick={handleRunWorker}
                      disabled={isActionLoading}
                      className={styles.btnPrimary}
                    >
                      🚀 Run Worker
                    </button>
                  </div>

                  <div className={styles.actionBox}>
                    <div>
                      <h4 style={{ fontWeight: 600, color: '#0f172a', marginBottom: '0.25rem' }}>Retry Failed Jobs</h4>
                      <p className={styles.actionDesc}>Reset the state of all failed jobs back to pending, allowing the worker to claim and attempt delivery again.</p>
                    </div>
                    <button 
                      onClick={handleRetryFailed}
                      disabled={isActionLoading || stats.failed === 0}
                      className={styles.btnSecondary}
                    >
                      🔄 Retry Failed ({stats.failed})
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Live Template Preview */}
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>
                <span>👁️</span> Safe Live Template Preview
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Select Template</label>
                  <select 
                    className={styles.select}
                    value={selectedTemplateKey}
                    onChange={(e) => setSelectedTemplateKey(e.target.value)}
                  >
                    {templates.map(t => (
                      <option key={t.key} value={t.key}>{t.key}</option>
                    ))}
                  </select>
                </div>

                {/* Display whitelisted inputs dynamically */}
                {allowed.length > 0 && (
                  <div>
                    <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.75rem' }}>
                      Allowed Template Variables:
                    </h4>
                    {allowed.map((variable: string) => (
                      <div className={styles.formGroup} key={variable}>
                        <label className={styles.label}>{variable}</label>
                        <input 
                          type="text"
                          className={styles.input}
                          value={payloadVariables[variable] || ''}
                          onChange={(e) => setPayloadVariables(prev => ({
                            ...prev,
                            [variable]: e.target.value
                          }))}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Premium Phone Preview frame */}
              <div className={styles.previewPhone}>
                <div className={styles.phoneScreen}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textAlign: 'center', marginBottom: '0.5rem' }}>
                    Lock Screen Preview
                  </div>
                  
                  <div className={styles.notifBubble}>
                    <div className={styles.bubbleHeader}>
                      <span>TalentMesh Portal</span>
                      <span>Now</span>
                    </div>
                    <div className={styles.bubbleTitle}>
                      {finalTitle || 'No Title Template'}
                    </div>
                    <div className={styles.bubbleBody}>
                      {finalBody || 'No Body Template'}
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
