'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { invokeFunction, insforge } from '@/lib/insforge';
import { useAuth } from '@/lib/auth/AuthContext';

// ─── Types ───────────────────────────────────────────────────────────────────

export type AnnouncementType = 'info' | 'success' | 'warning' | 'critical';
export type AudienceKey = 'all' | 'recruiters' | 'candidates';

export interface FanoutJob {
  status: string;
  processed_count: number;
  total_count: number;
}

export interface Announcement {
  id: string;
  title: string;
  message: string;
  type: AnnouncementType;
  target_roles: string[];
  is_active: boolean;
  show_as_banner: boolean;
  image_url: string | null;
  scheduled_at: string | null;
  expires_at: string | null;
  view_count: number;
  dismiss_count: number;
  created_at: string;
  updated_at: string;
  fanout_job?: FanoutJob | null;
}

export interface FormState {
  title: string;
  message: string;
  type: AnnouncementType;
  audience: AudienceKey;
  is_active: boolean;
  show_as_banner: boolean;
  image_url: string;
  scheduled_at: string;
  expires_at: string;
}

export const defaultForm: FormState = {
  title: '',
  message: '',
  type: 'info',
  audience: 'all',
  is_active: true,
  show_as_banner: false,
  image_url: '',
  scheduled_at: '',
  expires_at: '',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

export const AUDIENCE_MAP: Record<AudienceKey, string[]> = {
  all:        ['candidate', 'recruiter'],
  recruiters: ['recruiter'],
  candidates: ['candidate'],
};

export const AUDIENCE_LABEL: Record<string, string> = {
  all:        'All Users',
  recruiters: 'Recruiters Only',
  candidates: 'Candidates Only',
};

export function rolestoAudience(roles: string[]): AudienceKey {
  if (!roles || roles.length === 0) return 'all';
  if (roles.includes('recruiter') && roles.includes('candidate')) return 'all';
  if (roles.includes('recruiter')) return 'recruiters';
  return 'candidates';
}

export function getAudienceLabel(roles: string[]): string {
  return AUDIENCE_LABEL[rolestoAudience(roles)] ?? 'All Users';
}

export function useAdminAnnouncements() {
  const { user } = useAuth();

  const [items, setItems]       = useState<Announcement[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('');
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');

  // Composer state
  const [isComposing, setIsComposing] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Announcement | null>(null);
  const [form, setForm] = useState<FormState>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Image upload state
  const [imagePreview, setImagePreview] = useState<string>('');
  const [uploading, setUploading]       = useState(false);
  const [dragOver, setDragOver]         = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Data Fetching ────────────────────────────────────────────────────────

  const fetchAnnouncements = useCallback(async (
    q = search,
    type = typeFilter,
    status = statusFilter,
  ) => {
    setLoading(true);
    try {
      const { data, error: fetchErr } = await invokeFunction('admin-announcements', {
        method: 'GET',
        queries: {
          search: q || undefined,
          type: type !== 'all' ? type : undefined,
          status: status || undefined,
        },
      });

      if (fetchErr) throw new Error(fetchErr.message);
      setItems(Array.isArray(data?.announcements) ? data.announcements : []);
    } catch (err: any) {
      setError('Failed to load announcements');
    } finally {
      setLoading(false);
    }
  }, [search, typeFilter, statusFilter]);

  useEffect(() => {
    if (user) fetchAnnouncements();
  }, [user, fetchAnnouncements]);

  // Auto-clear banners
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(''), 5000);
    return () => clearTimeout(t);
  }, [error]);

  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => setSuccess(''), 4000);
    return () => clearTimeout(t);
  }, [success]);

  // ── Composer Actions ─────────────────────────────────────────────────────

  const openCreate = () => {
    setSelectedItem(null);
    setForm(defaultForm);
    setImagePreview('');
    setFormError('');
    setFormSuccess('');
    setIsComposing(true);
  };

  const openEdit = (item: Announcement) => {
    setSelectedItem(item);
    setForm({
      title:          item.title,
      message:        item.message,
      type:           item.type,
      audience:       rolestoAudience(item.target_roles),
      is_active:      item.is_active,
      show_as_banner: item.show_as_banner,
      image_url:      item.image_url ?? '',
      scheduled_at:   item.scheduled_at
        ? new Date(item.scheduled_at).toISOString().slice(0, 16)
        : '',
      expires_at:     item.expires_at
        ? new Date(item.expires_at).toISOString().slice(0, 16)
        : '',
    });
    setImagePreview(item.image_url ?? '');
    setFormError('');
    setFormSuccess('');
    setIsComposing(true);
  };

  const closeComposer = () => {
    setIsComposing(false);
    setSelectedItem(null);
  };

  // ── Image Upload ─────────────────────────────────────────────────────────

  const uploadImage = async (file: File) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.type)) {
      setFormError('Only JPEG, PNG, WebP or GIF images are allowed.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setFormError('Image must be under 5 MB.');
      return;
    }
    setUploading(true);
    setFormError('');
    try {
      const path = `announcements/${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
      const { data, error: upErr } = await insforge.storage
        .from('announcement_images')
        .upload(path, file);
      if (upErr) throw upErr;
      const directUrl = `${process.env.NEXT_PUBLIC_INSFORGE_URL}/api/storage/buckets/announcement_images/objects/${encodeURIComponent(path)}`;
      const url: string = (data as any)?.url || directUrl;
      setForm(p => ({ ...p, image_url: url }));
      setImagePreview(url);
    } catch (err: any) {
      setFormError(err.message || 'Image upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadImage(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadImage(file);
  };

  const removeImage = () => {
    setForm(p => ({ ...p, image_url: '' }));
    setImagePreview('');
  };

  // ── Mutation Actions ─────────────────────────────────────────────────────

  const handleSave = async (publishNow = false) => {
    if (!form.title.trim() || !form.message.trim()) {
      setFormError('Title and message are required');
      return;
    }
    setSaving(true);
    setFormError('');

    const payload = {
      title:          form.title.trim(),
      message:        form.message.trim(),
      type:           form.type,
      target_roles:   AUDIENCE_MAP[form.audience],
      is_active:      publishNow ? true : form.is_active,
      show_as_banner: form.show_as_banner,
      image_url:      form.image_url || null,
      scheduled_at:   form.scheduled_at || null,
      expires_at:     form.expires_at || null,
    };

    try {
      const { error: saveErr } = await invokeFunction('admin-announcements', {
        method: selectedItem ? 'PATCH' : 'POST',
        path:   selectedItem ? `/${selectedItem.id}` : undefined,
        body:   payload,
      });

      if (saveErr) throw new Error(saveErr.message);

      setFormSuccess(selectedItem ? 'Broadcast updated!' : 'Broadcast published!');
      setSuccess(selectedItem ? 'Announcement updated' : 'New broadcast created');
      fetchAnnouncements();
      setTimeout(closeComposer, 1200);
    } catch (err: any) {
      setFormError(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (item: Announcement) => {
    try {
      const { error: patchErr } = await invokeFunction('admin-announcements', {
        method: 'PATCH',
        path:   `/${item.id}`,
        body:   { is_active: !item.is_active },
      });
      if (patchErr) throw new Error(patchErr.message);
      setItems(prev =>
        prev.map(a => a.id === item.id ? { ...a, is_active: !a.is_active } : a)
      );
    } catch {
      setError('Failed to update status');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this announcement? This cannot be undone.')) return;
    try {
      const { error: delErr } = await invokeFunction('admin-announcements', {
        method: 'DELETE',
        path:   `/${id}`,
      });
      if (delErr) throw new Error(delErr.message);
      setItems(prev => prev.filter(a => a.id !== id));
      setSuccess('Announcement deleted');
    } catch {
      setError('Failed to delete');
    }
  };

  return {
    items,
    loading,
    search,
    setSearch,
    typeFilter,
    setTypeFilter,
    statusFilter,
    setStatusFilter,
    error,
    setError,
    success,
    setSuccess,
    isComposing,
    setIsComposing,
    selectedItem,
    setSelectedItem,
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
  };
}
