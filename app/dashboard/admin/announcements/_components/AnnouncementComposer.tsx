'use client';

import React from 'react';
import * as Ico from 'lucide-react';
import styles from '../announcements.module.css';
import RichTextEditor from '@/components/ui/RichTextEditor';
import { 
  FormState, 
  Announcement, 
  AnnouncementType, 
  AudienceKey, 
  AUDIENCE_LABEL 
} from '@/lib/hooks/useAdminAnnouncements';

interface AnnouncementComposerProps {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  saving: boolean;
  formError: string;
  formSuccess: string;
  imagePreview: string;
  uploading: boolean;
  dragOver: boolean;
  setDragOver: (b: boolean) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleFilePick: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleDrop: (e: React.DragEvent) => void;
  removeImage: () => void;
  handleSave: (publishNow?: boolean) => void;
  closeComposer: () => void;
  selectedItem: Announcement | null;
}

const TypeIcon = ({ type, size = 20 }: { type: AnnouncementType; size?: number }) => {
  switch (type) {
    case 'success':  return <Ico.CheckCircle size={size} />;
    case 'warning':  return <Ico.AlertTriangle size={size} />;
    case 'critical': return <Ico.AlertCircle size={size} />;
    default:         return <Ico.Info size={size} />;
  }
};

function getFileNameFromUrl(url: string): string {
  if (!url) return '';
  try {
    const decoded = decodeURIComponent(url);
    const lastPart = decoded.split('/').pop()?.split('?')[0] || '';
    return lastPart.replace(/^\d+_/, '');
  } catch (e) {
    return 'Attached Image';
  }
}

export default function AnnouncementComposer({
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
  handleFilePick,
  handleDrop,
  removeImage,
  handleSave,
  closeComposer,
  selectedItem,
}: AnnouncementComposerProps) {
  return (
    <div className={styles.overlay}>
      <header className={styles.overlayHeader}>
        <div className={styles.overlayHeaderLeft}>
          <button className={styles.iconBtn} onClick={closeComposer} title="Back">
            <Ico.ChevronLeft size={18} />
          </button>
          <input
            className={styles.overlayTitleInput}
            placeholder="Broadcast title..."
            value={form.title}
            onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
            autoFocus
          />
        </div>
        <div className={styles.overlayHeaderRight}>
          <button
            className={styles.secondaryBtn}
            onClick={() => handleSave(false)}
            disabled={saving}
          >
            {saving ? <Ico.Loader2 size={16} className="animate-spin" /> : <Ico.Save size={16} />}
            Save Draft
          </button>
          <button
            className={styles.primaryBtn}
            onClick={() => handleSave(true)}
            disabled={saving}
          >
            {saving ? <Ico.Loader2 size={16} className="animate-spin" /> : <Ico.Send size={16} />}
            {selectedItem ? 'Update' : 'Publish Now'}
          </button>
        </div>
      </header>

      <div className={styles.overlayBody}>
        {/* ── Main Content ── */}
        <div className={styles.overlayMain}>
          {formError && (
            <div className={styles.errorBanner}>
              <Ico.AlertCircle size={16} /> {formError}
            </div>
          )}
          {formSuccess && (
            <div className={styles.successBanner}>
              <Ico.CheckCircle size={16} /> {formSuccess}
            </div>
          )}

          <RichTextEditor
            value={form.message}
            onChange={html => setForm(p => ({ ...p, message: html }))}
            placeholder="Write your broadcast message here. Use the formatting bar above to style your message..."
          />

          {form.message && (
            <div className={styles.preview}>
              <div className={styles.previewLabel}>Preview</div>
              <div className={styles.previewContent}>
                <strong>{form.title}</strong>
                {' — '}
                <span dangerouslySetInnerHTML={{ __html: form.message }} />
              </div>
            </div>
          )}

          {/* ── Image Upload Zone ── */}
          <div className={styles.imageUploadContainer}>
            <p className={styles.imageUploadLabel}>
              Attachment Image <span className={styles.imageUploadLabelOptional}>(optional)</span>
            </p>

            {imagePreview ? (
              /* ── Show uploaded image preview ── */
              <div className={styles.imagePreviewWrapper}>
                <img
                  src={imagePreview}
                  alt="Announcement image"
                  className={styles.imagePreviewImg}
                />
                <button
                  onClick={removeImage}
                  className={styles.imageRemoveBtn}
                  title="Remove image"
                >
                  <Ico.X size={14} />
                </button>
                <div className={styles.imageMetaBar}>
                  <Ico.ImageIcon size={12} />
                  <span className={styles.imageMetaFilename}>
                    {getFileNameFromUrl(form.image_url)}
                  </span>
                  <span> — Attached</span>
                </div>
              </div>
            ) : (
              /* ── Drop zone ── */
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`${styles.dropzone} ${dragOver ? styles.dragOver : ''}`}
              >
                {uploading ? (
                  <Ico.Loader2 size={28} className={styles.loaderIcon} />
                ) : (
                  <Ico.ImageIcon size={28} className={styles.imageIcon} />
                )}
                <span className={styles.dropzoneText}>
                  {uploading ? 'Uploading…' : 'Drop image here or click to browse'}
                </span>
                <span className={styles.dropzoneSubtext}>
                  JPEG, PNG, WebP, GIF — max 5 MB
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  style={{ display: 'none' }}
                  onChange={handleFilePick}
                />
              </div>
            )}
          </div>
        </div>

        {/* ── Sidebar ── */}
        <aside className={styles.overlaySidebar}>
          {/* Type */}
          <div className={styles.sidebarSection}>
            <span className={styles.sidebarLabel}>Broadcast Type</span>
            <div className={styles.typePicker}>
              {(['info', 'success', 'warning', 'critical'] as AnnouncementType[]).map(t => (
                <button
                  type="button"
                  key={t}
                  className={`${styles.typePill} ${styles[t]} ${form.type === t ? styles.activeType : ''}`}
                  onClick={() => setForm(p => ({ ...p, type: t }))}
                >
                  <TypeIcon type={t} size={13} />
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Audience */}
          <div className={styles.sidebarSection}>
            <span className={styles.sidebarLabel}>Target Audience</span>
            <div className={styles.audiencePicker}>
              {(['all', 'recruiters', 'candidates'] as AudienceKey[]).map(aud => (
                <button
                  type="button"
                  key={aud}
                  className={`${styles.audiencePill} ${form.audience === aud ? styles.activeAudience : ''}`}
                  onClick={() => setForm(p => ({ ...p, audience: aud }))}
                >
                  {aud === 'all' && <Ico.Users size={14} />}
                  {aud === 'recruiters' && <Ico.Briefcase size={14} />}
                  {aud === 'candidates' && <Ico.User size={14} />}
                  {AUDIENCE_LABEL[aud]}
                </button>
              ))}
            </div>
          </div>

          {/* Show as banner toggle */}
          <div className={styles.sidebarSection}>
            <span className={styles.sidebarLabel}>Banner Options</span>
            <div className={styles.toggleRow}>
              <span className={styles.toggleRowLabel}>Show as Banner</span>
              <label className={styles.toggle}>
                <input
                  type="checkbox"
                  checked={form.show_as_banner}
                  onChange={e => setForm(p => ({ ...p, show_as_banner: e.target.checked }))}
                />
                <div className={styles.toggleTrack} />
                <div className={styles.toggleThumb} />
              </label>
            </div>

            {/* Live banner preview */}
            {form.show_as_banner && (
              <div className={styles.previewContainer}>
                <span className={styles.previewTitleLabel}>
                  Preview
                </span>
                <div className={styles.bannerPreviewBox}>
                  <div className={`${styles.bannerPreviewContent} ${styles[form.type]}`}>
                    {/* Icon */}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className={styles.bannerPreviewIcon}>
                      {form.type === 'success' ? (
                        <><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></>
                      ) : form.type === 'warning' ? (
                        <><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></>
                      ) : form.type === 'critical' ? (
                        <><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></>
                      ) : (
                        <><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></>
                      )}
                    </svg>
                    <div className={styles.bannerPreviewBody}>
                      <strong className={styles.bannerPreviewTitle}>
                        {form.title || 'Announcement Title'}
                      </strong>
                      {form.message ? (
                        <span dangerouslySetInnerHTML={{ __html: form.message }} />
                      ) : (
                        <span className={styles.bannerPreviewPlaceholder}>Your message will appear here…</span>
                      )}
                    </div>
                    {/* Dismiss X */}
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={styles.bannerPreviewDismiss}>
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </div>
                  <div className={styles.bannerPreviewFooter}>
                    This is how the banner appears at the top of each page
                  </div>
                </div>
              </div>
            )}

            <div className={`${styles.toggleRow} ${form.show_as_banner ? styles.toggleRowMargin : ''}`}>
              <span className={styles.toggleRowLabel}>Published Status</span>
              <label className={styles.toggle}>
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))}
                />
                <div className={styles.toggleTrack} />
                <div className={styles.toggleThumb} />
              </label>
            </div>
          </div>

          {/* Schedule */}
          <div className={styles.sidebarSection}>
            <span className={styles.sidebarLabel}>Scheduling</span>
            <label className={`${styles.sidebarLabel} ${styles.scheduledLabelNoCaps}`}>
              Show from
            </label>
            <input
              type="datetime-local"
              className={styles.sidebarInput}
              value={form.scheduled_at}
              onChange={e => setForm(p => ({ ...p, scheduled_at: e.target.value }))}
            />
            <label className={`${styles.sidebarLabel} ${styles.scheduledLabelNoCaps}`}>
              Expires at
            </label>
            <input
              type="datetime-local"
              className={styles.sidebarInput}
              value={form.expires_at}
              onChange={e => setForm(p => ({ ...p, expires_at: e.target.value }))}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}
