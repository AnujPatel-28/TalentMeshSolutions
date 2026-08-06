"use client";

import React, { useState, useEffect, useRef } from 'react';
import styles from './ResumeManager.module.css';
import { insforge } from '@/lib/insforge';
import { useAuth } from '@/lib/auth/AuthContext';
import Toast from '@/components/ui/Toast';
import { getPathFromUrl } from '@/lib/api/storage';
import { getPublicStorageUrl } from '@/lib/utils/storage-url';

interface Resume {
    id: string;
    candidate_id: string;
    label: string;
    file_url: string;
    file_name: string;
    file_size_bytes: number;
    is_default: boolean;
    upload_count: number;
    created_at: string;
}

interface ResumeManagerProps {
    candidateId: string;
}

import * as Icons from '@/components/ui/icons';

const IC = {
    pdf: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><path d="M9 15h3a2 2 0 0 0 0-4H9v4z" /><path d="M9 11v9" /></svg>,
    plus: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>,
    trash: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>,
    eye: <Icons.Eye width="16" height="16" strokeWidth="2" />,
    check: <Icons.Check />,
    upload: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>,
    alert: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>,
};

export default function ResumeManager({ candidateId }: ResumeManagerProps) {
    const { user } = useAuth();
    const [resumes, setResumes] = useState<Resume[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editLabel, setEditLabel] = useState('');
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
    const [primaryResumeId, setPrimaryResumeId] = useState<string | null>(null);
    
    // Delete Confirmation state
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [resumeToDelete, setResumeToDelete] = useState<Resume | null>(null);
    const [deleteWarningMsg, setDeleteWarningMsg] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [uploadedFile, setUploadedFile] = useState<{ url: string, name: string, size: number } | null>(null);
    const [newLabel, setNewLabel] = useState('');
    const [isDefault, setIsDefault] = useState(false);

    const [dragActive, setDragActive] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const activeCandidateId = (candidateId && candidateId !== 'undefined') ? candidateId : user?.id;

    useEffect(() => {
        if (activeCandidateId) {
            fetchResumes();
        }
    }, [activeCandidateId]);

    const fetchResumes = async () => {
        if (!activeCandidateId) return;
        try {
            const { data, error } = await insforge.database
                .from('candidate_resumes')
                .select('*')
                .eq('candidate_id', activeCandidateId)
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            setResumes(data || []);

            // Fetch primary resume ID from candidate profile
            const { data: profileData, error: profileErr } = await insforge.database
                .from('candidate_profiles')
                .select('primary_resume_id')
                .eq('id', activeCandidateId)
                .single();
            
            if (profileErr) {
                console.warn('Failed to fetch primary resume ID:', profileErr.message);
            } else {
                setPrimaryResumeId(profileData?.primary_resume_id || null);
            }
        } catch (err: any) {
            setToast({ message: 'Failed to fetch resumes: ' + err.message, type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleFile = async (file: File) => {
        if (!activeCandidateId) return;

        if (file.size > 5 * 1024 * 1024) {
            setToast({ message: 'File too large. Max 5MB allowed.', type: 'error' });
            return;
        }

        const ext = '.' + file.name.split('.').pop()?.toLowerCase();
        if (ext !== '.pdf') {
            setToast({ message: 'Only PDF resumes are supported.', type: 'error' });
            return;
        }

        if (file.type !== 'application/pdf') {
            setToast({ message: 'Only PDF resumes are supported.', type: 'error' });
            return;
        }

        const bytes = new Uint8Array(await file.slice(0, 5).arrayBuffer());
        const isPdf =
            bytes[0] === 0x25 &&
            bytes[1] === 0x50 &&
            bytes[2] === 0x44 &&
            bytes[3] === 0x46 &&
            bytes[4] === 0x2d;
        if (!isPdf) {
            setToast({ message: 'Only PDF resumes are supported.', type: 'error' });
            return;
        }

        setUploading(true);
        try {
            const path = `${activeCandidateId}/${Date.now()}_${file.name}`;
            const { data, error } = await (insforge.storage.from('resumes') as any).upload(path, file, { contentType: file.type || 'application/pdf' });
            
            if (error) throw error;
            
            setUploadedFile({
                url: data?.url || '',
                name: file.name,
                size: file.size
            });
            // Auto-fill label with the file name (excluding extension) for better UX
            const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
            setNewLabel(baseName);
            setIsDefault(resumes.length === 0);
            setShowModal(true);
        } catch (err: any) {
            setToast({ message: 'Upload failed: ' + err.message, type: 'error' });
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            await handleFile(file);
        }
    };

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            await handleFile(e.dataTransfer.files[0]);
        }
    };

    const saveNewResume = async () => {
        if (!uploadedFile || !newLabel.trim() || !activeCandidateId) return;

        if (newLabel.trim().length > 255) {
            setToast({ message: 'Resume label must be 255 characters or less.', type: 'error' });
            return;
        }

        try {
            if (isDefault) {
                await insforge.database
                    .from('candidate_resumes')
                    .update({ is_default: false })
                    .eq('candidate_id', activeCandidateId);
            }

            const { data: insertedData, error } = await insforge.database
                .from('candidate_resumes')
                .insert([{
                    candidate_id: activeCandidateId,
                    label: newLabel.trim(),
                    file_url: uploadedFile.url,
                    file_name: uploadedFile.name,
                    file_size_bytes: uploadedFile.size,
                    is_default: isDefault
                }])
                .select()
                .single();

            if (error) throw error;

            if (isDefault || !primaryResumeId) {
                const updatePayload: any = {};
                if (isDefault) updatePayload.resume_url = uploadedFile.url;
                if (isDefault || !primaryResumeId) updatePayload.primary_resume_id = insertedData.id;

                await insforge.database
                    .from('candidate_profiles')
                    .update(updatePayload)
                    .eq('id', activeCandidateId);
            }

            setToast({ message: 'Resume added successfully!', type: 'success' });
            setShowModal(false);
            setUploadedFile(null);
            fetchResumes();
        } catch (err: any) {
            setToast({ message: 'Failed to save: ' + err.message, type: 'error' });
        }
    };

    const setPrimaryResume = async (resumeId: string) => {
        if (!activeCandidateId) return;
        try {
            // Find the file_url of the selected resume so we can sync resume_url too
            const selectedResume = resumes.find(r => r.id === resumeId);
            const updatePayload: Record<string, any> = { primary_resume_id: resumeId };
            if (selectedResume?.file_url) {
                updatePayload.resume_url = selectedResume.file_url;
            }

            const { error } = await insforge.database
                .from('candidate_profiles')
                .update(updatePayload)
                .eq('id', activeCandidateId);
            
            if (error) throw error;
            setPrimaryResumeId(resumeId);
            setToast({ message: 'Primary resume set successfully!', type: 'success' });
        } catch (err: any) {
            setToast({ message: 'Failed to set primary resume: ' + err.message, type: 'error' });
        }
    };

    const toggleDefault = async (resume: Resume) => {
        if (resume.is_default || !activeCandidateId) return;

        // Optimistic UI
        const oldResumes = [...resumes];
        setResumes(resumes.map(r => ({
            ...r,
            is_default: r.id === resume.id
        })));

        try {
            const { error } = await insforge.database.rpc('set_default_resume', {
                p_resume_id: resume.id
            });

            if (error) throw error;

            // Also sync resume_url and primary_resume_id so profile page shows the right resume
            await insforge.database
                .from('candidate_profiles')
                .update({ resume_url: resume.file_url, primary_resume_id: resume.id })
                .eq('id', activeCandidateId);

            setPrimaryResumeId(resume.id);
        } catch (err: any) {
            setResumes(oldResumes);
            setToast({ message: 'Failed to set default: ' + err.message, type: 'error' });
        }
    };

    const deleteResume = (resume: Resume) => {
        if (resume.is_default && resumes.length === 1) {
            setToast({ message: 'Cannot delete your only default resume.', type: 'error' });
            return;
        }

        const isPrimary = resume.id === primaryResumeId;
        let warnMsg = 'Are you sure you want to delete this resume?';

        if (isPrimary && resume.upload_count > 0) {
            warnMsg = 'This resume has been used in previous applications. Deleting it will not affect submitted applications because snapshots are preserved. Do you want to continue?';
        } else if (resume.upload_count > 0) {
            warnMsg = `This resume has been used in ${resume.upload_count} applications. Are you sure you want to delete it?`;
        }

        setResumeToDelete(resume);
        setDeleteWarningMsg(warnMsg);
        setDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!resumeToDelete) return;
        setIsDeleting(true);
        try {
            // 1. Delete physical file from storage bucket first
            const filePath = getPathFromUrl(resumeToDelete.file_url, 'resumes');
            if (filePath) {
                const { error: storageError } = await insforge.storage.from('resumes').remove(filePath);
                if (storageError) {
                    console.error('Storage deletion failed:', storageError.message);
                }
            }

            // 2. Delete from candidate_resumes table
            const { error } = await insforge.database
                .from('candidate_resumes')
                .delete()
                .eq('id', resumeToDelete.id);

            if (error) throw error;

            setToast({ message: 'Resume deleted successfully.', type: 'success' });
            setDeleteModalOpen(false);
            setResumeToDelete(null);
            fetchResumes();
        } catch (err: any) {
            setToast({ message: 'Delete failed: ' + err.message, type: 'error' });
        } finally {
            setIsDeleting(false);
        }
    };

    const handleSecureView = async (resume: Resume) => {
        try {
            const token = window.sessionStorage.getItem('tm_token');
            const targetUrl = `${window.location.origin}/api/v1/remote/functions/resume-proxy?resumeId=${resume.id}&accessType=viewed`;
            const response = await fetch(targetUrl, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!response.ok) throw new Error('Failed to fetch from proxy');
            const blob = await response.blob();
            const fileBlob = new Blob([blob], { type: 'application/pdf' });
            const blobUrl = window.URL.createObjectURL(fileBlob);
            window.open(blobUrl, '_blank');
        } catch (err: any) {
            console.error('Failed to view resume:', err);
            setToast({ message: 'Failed to view resume: ' + err.message, type: 'error' });
        }
    };

    const updateLabel = async (id: string) => {
        if (!editLabel.trim()) {
            setEditingId(null);
            return;
        }

        if (editLabel.trim().length > 255) {
            setToast({ message: 'Resume label must be 255 characters or less.', type: 'error' });
            return;
        }

        try {
            const { error } = await insforge.database
                .from('candidate_resumes')
                .update({ label: editLabel.trim() })
                .eq('id', id);

            if (error) throw error;
            setResumes(resumes.map(r => r.id === id ? { ...r, label: editLabel.trim() } : r));
            setEditingId(null);
        } catch (err: any) {
            setToast({ message: 'Failed to update label: ' + err.message, type: 'error' });
        }
    };

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    if (loading) {
        return (
            <div className={styles.manager}>
                <div className={styles.loading}>
                    <div className={styles.spinner} />
                </div>
            </div>
        );
    }

    return (
        <div className={styles.manager}>
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            
            {resumes.length < 5 ? (
                <div 
                    className={`${styles.dropzone} ${dragActive ? styles.dropzoneActive : ''}`}
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                >
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        style={{ display: 'none' }} 
                        accept=".pdf"
                        onChange={handleFileChange}
                    />
                    <div className={styles.dropzoneIcon}>
                        {uploading ? <div className={styles.spinner} /> : IC.upload}
                    </div>
                    <p className={styles.dropzoneTitle}>
                        {uploading ? 'Uploading your file...' : 'Drag & drop your resume here, or click to browse'}
                    </p>
                    <p className={styles.dropzoneHint}>Supports PDF (Max 5MB)</p>
                </div>
            ) : (
                <div className={styles.limitNotice}>
                    {IC.alert}
                    <span>You've reached the 5 resume limit. Delete one to upload a new version.</span>
                </div>
            )}

            <div style={{ marginTop: '2rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                    Uploaded Resumes ({resumes.length}/5)
                </h3>
            </div>

            <div className={styles.list}>
                {resumes.length === 0 ? (
                    <div className={styles.empty}>
                        <div className={styles.emptyIcon}>{IC.pdf}</div>
                        <p>No resumes uploaded yet. Drag & drop a file to get started.</p>
                    </div>
                ) : (
                    resumes.map(resume => (
                        <div key={resume.id} className={`${styles.card} ${resume.is_default ? styles.cardDefault : ''}`}>
                            <div className={styles.iconWrapper}>
                                {IC.pdf}
                            </div>
                            <div className={styles.content}>
                                <div className={styles.labelRow}>
                                    {editingId === resume.id ? (
                                        <input 
                                            className={styles.labelInput}
                                            autoFocus
                                            value={editLabel}
                                            onChange={(e) => setEditLabel(e.target.value)}
                                            maxLength={255}
                                            onBlur={() => updateLabel(resume.id)}
                                            onKeyDown={(e) => e.key === 'Enter' && updateLabel(resume.id)}
                                        />
                                    ) : (
                                        <span 
                                            className={styles.label}
                                            onClick={() => {
                                                setEditingId(resume.id);
                                                setEditLabel(resume.label);
                                            }}
                                            title="Click to rename"
                                        >
                                            {resume.label}
                                        </span>
                                    )}
                                    {resume.is_default && <span className={`${styles.badge} ${styles.defaultBadge}`}>Default</span>}
                                    {resume.id === primaryResumeId && <span className={`${styles.badge} ${styles.primaryBadge}`}>⭐ Primary</span>}
                                </div>
                                <div className={styles.meta}>
                                    <div className={styles.metaItem} title={resume.file_name}>{resume.file_name}</div>
                                    <div className={styles.metaItem}>•</div>
                                    <div className={styles.metaItem}>{formatSize(resume.file_size_bytes)}</div>
                                    <div className={styles.metaItem}>•</div>
                                    <div className={styles.metaItem}>{new Date(resume.created_at).toLocaleDateString()}</div>
                                    <div className={styles.metaItem}>•</div>
                                    <div className={styles.metaItem}>Used {resume.upload_count} times</div>
                                </div>
                            </div>
                            <div className={styles.actions}>
                                <button 
                                    type="button"
                                    className={styles.actionBtn}
                                    onClick={() => handleSecureView(resume)}
                                    title="Preview Resume"
                                >
                                    {IC.eye}
                                </button>
                                {!resume.is_default && (
                                    <button 
                                        className={`${styles.actionBtn} ${styles.defaultBtn}`} 
                                        onClick={() => toggleDefault(resume)}
                                        title="Make default resume"
                                    >
                                        Make Default
                                    </button>
                                )}
                                {resume.id !== primaryResumeId && (
                                    <button 
                                        className={`${styles.actionBtn} ${styles.primaryBtn}`} 
                                        onClick={() => setPrimaryResume(resume.id)}
                                        title="Set as primary resume"
                                    >
                                        ⭐ Set as Primary
                                    </button>
                                )}
                                <button 
                                    className={`${styles.actionBtn} ${styles.deleteBtn}`} 
                                    onClick={() => deleteResume(resume)}
                                    title="Delete Resume"
                                >
                                    {IC.trash}
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Upload Modal */}
            {showModal && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modal}>
                        <h3 className={styles.modalTitle}>Label this resume</h3>
                        <p className={styles.modalDesc}>Give this version a name to help you identify it when applying.</p>
                        
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Resume Label</label>
                            <input 
                                className={styles.formInput}
                                placeholder="e.g. Frontend Developer, Senior PM"
                                value={newLabel}
                                onChange={(e) => setNewLabel(e.target.value)}
                                maxLength={255}
                                autoFocus
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.checkboxGroup}>
                                <input 
                                    type="checkbox" 
                                    className={styles.checkbox}
                                    checked={isDefault}
                                    onChange={(e) => setIsDefault(e.target.checked)}
                                />
                                <span style={{ fontSize: '0.9rem', color: '#4b5563', fontWeight: 500 }}>Set as my default resume</span>
                            </label>
                        </div>

                        <div className={styles.modalActions}>
                            <button className={`${styles.modalBtn} ${styles.btnCancel}`} onClick={() => setShowModal(false)}>Cancel</button>
                            <button 
                                className={`${styles.modalBtn} ${styles.btnSave}`} 
                                onClick={saveNewResume}
                                disabled={!newLabel.trim()}
                            >
                                Save Resume
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteModalOpen && resumeToDelete && (
                <div className={styles.modalOverlay} onClick={() => !isDeleting && setDeleteModalOpen(false)}>
                    <div className={styles.modal} onClick={e => e.stopPropagation()} style={{ maxWidth: '460px', borderTop: '4px solid #ef4444' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                            <div style={{
                                width: '40px', height: '40px', borderRadius: '50%',
                                background: '#fef2f2', color: '#ef4444',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0
                            }}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                                    <line x1="12" y1="9" x2="12" y2="13" />
                                    <line x1="12" y1="17" x2="12.01" y2="17" />
                                </svg>
                            </div>
                            <h3 className={styles.modalTitle} style={{ margin: 0, fontSize: '1.25rem' }}>Delete Resume?</h3>
                        </div>

                        <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '0.85rem 1rem', border: '1px solid #e2e8f0', marginBottom: '1.25rem' }}>
                            <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.25rem' }}>
                                {resumeToDelete.label}
                            </div>
                            <div style={{ fontSize: '0.78rem', color: '#64748b', wordBreak: 'break-all' }}>
                                {resumeToDelete.file_name} • {formatSize(resumeToDelete.file_size_bytes)}
                            </div>
                        </div>

                        <p className={styles.modalDesc} style={{ marginBottom: '1.5rem', color: '#475569', fontSize: '0.85rem', lineHeight: '1.5' }}>
                            {deleteWarningMsg}
                        </p>

                        <div className={styles.modalActions} style={{ gap: '0.75rem' }}>
                            <button
                                className={`${styles.modalBtn} ${styles.btnCancel}`}
                                onClick={() => setDeleteModalOpen(false)}
                                disabled={isDeleting}
                                style={{ padding: '0.7rem' }}
                            >
                                No
                            </button>
                            <button
                                className={styles.modalBtn}
                                onClick={confirmDelete}
                                disabled={isDeleting}
                                style={{
                                    background: '#ef4444',
                                    color: 'white',
                                    padding: '0.7rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.5rem',
                                    boxShadow: '0 4px 12px rgba(239, 68, 68, 0.2)',
                                    border: 'none',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    fontSize: '0.9rem',
                                    borderRadius: '10px',
                                    flex: 1
                                }}
                            >
                                {isDeleting ? (
                                    <>
                                        <span style={{
                                            width: 14, height: 14,
                                            border: '2px solid rgba(255,255,255,0.3)',
                                            borderTopColor: 'white',
                                            borderRadius: '50%',
                                            animation: 'spin 0.8s linear infinite',
                                            display: 'inline-block'
                                        }} />
                                        Deleting...
                                    </>
                                ) : (
                                    <>
                                        Yes
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
