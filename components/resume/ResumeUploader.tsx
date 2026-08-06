"use client";

import React, { useState, useRef, useCallback } from 'react';
import { FileText, Upload, X, Check, FileWarning } from 'lucide-react';
import styles from './ResumeUploader.module.css';

interface ResumeUploaderProps {
  onUpload?: (file: File) => void;
  onClear?: () => void;
  existingUrl?: string;
  maxSizeMB?: number;
  acceptedFormats?: string[];
}

export const ResumeUploader: React.FC<ResumeUploaderProps> = ({
  onUpload,
  onClear,
  existingUrl,
  maxSizeMB = 5,
  acceptedFormats = ['.pdf']
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulatedProgress, setSimulatedProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): boolean => {
    setError(null);
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (extension !== '.pdf') {
      setError('Only PDF resumes are supported.');
      return false;
    }
    if (file.type !== 'application/pdf') {
      setError('Only PDF resumes are supported.');
      return false;
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`File is too large. Maximum size is ${maxSizeMB}MB.`);
      return false;
    }
    return true;
  };

  const handleFiles = async (files: FileList) => {
    const selectedFile = files[0];
    if (selectedFile && validateFile(selectedFile)) {
      const bytes = new Uint8Array(await selectedFile.slice(0, 5).arrayBuffer());
      const isPdf =
        bytes[0] === 0x25 &&
        bytes[1] === 0x50 &&
        bytes[2] === 0x44 &&
        bytes[3] === 0x46 &&
        bytes[4] === 0x2D;
      if (!isPdf) {
        setError('Only PDF resumes are supported.');
        return;
      }
      setFile(selectedFile);
      setIsSimulating(true);
      setSimulatedProgress(0);
      
      let progress = 0;
      const interval = setInterval(() => {
        progress += 20;
        setSimulatedProgress(progress);
        if (progress >= 100) {
          clearInterval(interval);
          setIsSimulating(false);
          onUpload?.(selectedFile);
        }
      }, 150);
    }
  };

  const clearFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFile(null);
    setError(null);
    setIsSimulating(false);
    setSimulatedProgress(0);
    onClear?.();
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getExistingFileName = (url: string) => {
    try {
      const decoded = decodeURIComponent(url);
      const parts = decoded.split('/');
      const fileName = parts[parts.length - 1].split('?')[0];
      // Remove timestamp prefix if exists (e.g. 171343..._filename.pdf)
      return fileName.replace(/^\d+_/, '');
    } catch {
      return 'Existing resume';
    }
  };

  const showPreview = file || existingUrl;

  return (
    <div className={styles.container}>
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
        accept={acceptedFormats.join(',')}
        className="hidden"
        style={{ display: 'none' }}
      />

      <div
        className={`${styles.uploader} ${isDragging ? styles.uploaderActive : ''} ${showPreview ? styles.hasFile : ''}`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => { e.preventDefault(); setIsDragging(false); e.dataTransfer.files && handleFiles(e.dataTransfer.files); }}
        onClick={() => !showPreview && fileInputRef.current?.click()}
        role="button"
        tabIndex={showPreview ? -1 : 0}
      >
        {!showPreview ? (
          <>
            <div className={styles.icon}>
              <Upload size={32} strokeWidth={2} />
            </div>
            <p className={styles.text}>Drag & drop your resume</p>
            <p className={styles.hint}>
              PDF only (max {maxSizeMB}MB)
            </p>
          </>
        ) : (
          <div className={styles.preview}>
            <div className={styles.fileIcon}>
              <FileText size={20} />
            </div>
            <div className={styles.fileInfo}>
              <span className={styles.fileName}>
                {file ? file.name : getExistingFileName(existingUrl!)}
              </span>
              <span className={styles.fileMeta}>
                {file ? formatSize(file.size) : 'Previously uploaded'} • {isSimulating ? 'Preparing...' : 'Ready'}
              </span>
            </div>
            {!isSimulating && (
              <div className={styles.successIcon}>
                <Check size={18} color="#10b981" />
              </div>
            )}
            <button
              type="button"
              className={styles.clearBtn}
              onClick={clearFile}
              aria-label="Remove file"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {isSimulating && (
          <div className={styles.progressBarContainer}>
            <div 
              className={styles.progressBar} 
              style={{ width: `${simulatedProgress}%` }}
            />
          </div>
        )}
      </div>

      {error && (
        <div className={styles.error}>
          <FileWarning size={14} style={{ marginRight: '8px' }} />
          {error}
        </div>
      )}
    </div>
  );
};
