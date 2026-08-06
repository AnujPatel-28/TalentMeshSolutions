'use client';

import React from 'react';
import * as Ico from 'lucide-react';
import styles from './announcements.module.css';
import { useAuth } from '@/lib/auth/AuthContext';
import { useAdminAnnouncements } from '@/lib/hooks/useAdminAnnouncements';
import AnnouncementComposer from './_components/AnnouncementComposer';
import AnnouncementCard from './_components/AnnouncementCard';

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

export default function AdminAnnouncementsPage() {
  const { isLoading: authLoading } = useAuth();
  const {
    items,
    loading,
    search,
    setSearch,
    typeFilter,
    setTypeFilter,
    statusFilter,
    setStatusFilter,
    error,
    success,
    isComposing,
    selectedItem,
    form,
    setForm,
    saving,
    formError,
    formSuccess,
    imagePreview,
    uploading,
    dragOver,
    setDragOver,
    fileInputRef,
    fetchAnnouncements,
    openCreate,
    openEdit,
    closeComposer,
    handleFilePick,
    handleDrop,
    removeImage,
    handleSave,
    toggleActive,
    handleDelete,
  } = useAdminAnnouncements();

  // Derived stats
  const totalActive    = items.filter(a => a.is_active).length;
  const totalBanners   = items.filter(a => a.show_as_banner).length;
  const totalScheduled = items.filter(a => a.scheduled_at && !a.is_active).length;

  if (isComposing) {
    return (
      <AnnouncementComposer
        form={form}
        setForm={setForm}
        saving={saving}
        formError={formError}
        formSuccess={formSuccess}
        imagePreview={imagePreview}
        uploading={uploading}
        dragOver={dragOver}
        setDragOver={setDragOver}
        fileInputRef={fileInputRef}
        handleFilePick={handleFilePick}
        handleDrop={handleDrop}
        removeImage={removeImage}
        handleSave={handleSave}
        closeComposer={closeComposer}
        selectedItem={selectedItem}
      />
    );
  }

  return (
    <div className={styles.page}>
      {/* Hero */}
      <header className={styles.hero}>
        <div className={styles.heroInfo}>
          <span className={styles.eyebrow}>Broadcasts</span>
          <h1 className={styles.title}>Announcements</h1>
          <p className={styles.subtitle}>
            Publish platform-wide broadcasts, alerts, and banners to candidates and recruiters.
          </p>
        </div>
        <button className={styles.primaryBtn} onClick={openCreate} type="button">
          <Ico.Megaphone size={18} /> New Broadcast
        </button>
      </header>

      {/* Global banners */}
      {error   && <div className={styles.errorBanner}><Ico.AlertCircle size={16} /> {error}</div>}
      {success && <div className={styles.successBanner}><Ico.CheckCircle size={16} /> {success}</div>}

      {/* Stats */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Total</span>
          <strong className={styles.statValue}>{items.length}</strong>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Active</span>
          <strong className={styles.statValue}>{totalActive}</strong>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Banners</span>
          <strong className={styles.statValue}>{totalBanners}</strong>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Scheduled</span>
          <strong className={styles.statValue}>{totalScheduled}</strong>
        </div>
      </div>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.searchWrapper}>
          <Ico.Search className={styles.searchIcon} size={16} />
          <input
            className={styles.searchInput}
            placeholder="Search by title or message..."
            value={search}
            onChange={e => {
              setSearch(e.target.value);
              fetchAnnouncements(e.target.value, typeFilter, statusFilter);
            }}
          />
        </div>
        <select
          className={styles.filterSelect}
          value={typeFilter}
          onChange={e => {
            setTypeFilter(e.target.value);
            fetchAnnouncements(search, e.target.value, statusFilter);
          }}
        >
          <option value="all">All Types</option>
          <option value="info">Info</option>
          <option value="success">Success</option>
          <option value="warning">Warning</option>
          <option value="critical">Critical</option>
        </select>
        <select
          className={styles.filterSelect}
          value={statusFilter}
          onChange={e => {
            setStatusFilter(e.target.value);
            fetchAnnouncements(search, typeFilter, e.target.value);
          }}
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* List */}
      {(authLoading || loading) ? (
        <div className={styles.listLoadingWrapper}>
          <Ico.Loader2 size={36} className={styles.loaderIcon} />
        </div>
      ) : items.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}><Ico.Megaphone size={28} /></div>
          <p className={styles.emptyTitle}>No broadcasts yet</p>
          <p className={styles.emptySubtitle}>Create your first announcement to reach your platform users.</p>
          <button className={`${styles.primaryBtn} ${styles.toggleRowMargin}`} onClick={openCreate} type="button">
            <Ico.Plus size={16} /> New Broadcast
          </button>
        </div>
      ) : (
        <div className={styles.list}>
          {items.map(item => (
            <AnnouncementCard
              key={item.id}
              item={item}
              fmtDate={fmtDate}
              toggleActive={toggleActive}
              openEdit={openEdit}
              handleDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
