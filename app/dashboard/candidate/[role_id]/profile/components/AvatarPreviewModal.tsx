'use client';
import React, { useEffect, useState, useRef } from 'react';

interface AvatarPreviewModalProps {
  isOpen: boolean;
  imageSrc: string | null;
  fileName: string;
  fileSize: number;
  isSaving: boolean;
  onSave: (croppedBlob: Blob) => void;
  onCancel: () => void;
}

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = 2;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

export default function AvatarPreviewModal({
  isOpen,
  imageSrc,
  fileName,
  fileSize,
  isSaving,
  onSave,
  onCancel,
}: AvatarPreviewModalProps) {
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSaving) onCancel();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
      // Reset values when opened
      setZoom(1);
      setPanX(0);
      setPanY(0);
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onCancel, isSaving]);

  if (!isOpen || !imageSrc) return null;

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setStartX(e.clientX - panX);
    setStartY(e.clientY - panY);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPanX(e.clientX - startX);
    setPanY(e.clientY - startY);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setIsDragging(true);
    setStartX(touch.clientX - panX);
    setStartY(touch.clientY - panY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    setPanX(touch.clientX - startX);
    setPanY(touch.clientY - startY);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    const newZoom = Math.min(Math.max(zoom - e.deltaY * 0.002, 1), 3);
    setZoom(newZoom);
  };

  const handleSave = () => {
    if (!imageSrc) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 300;
      canvas.height = 300;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Clear canvas
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 300, 300);

        // Apply transform match
        const scale = 300 / 140;
        ctx.scale(scale, scale);

        ctx.translate(70 + panX, 70 + panY);
        ctx.scale(zoom, zoom);
        ctx.translate(-70, -70);

        const iw = img.naturalWidth;
        const ih = img.naturalHeight;
        const ar = iw / ih;

        let drawW = 140;
        let drawH = 140;
        let drawX = 0;
        let drawY = 0;

        if (ar > 1) {
          drawW = 140 * ar;
          drawX = (140 - drawW) / 2;
        } else {
          drawH = 140 / ar;
          drawY = (140 - drawH) / 2;
        }

        ctx.drawImage(img, drawX, drawY, drawW, drawH);

        canvas.toBlob((blob) => {
          if (blob) {
            onSave(blob);
          }
        }, 'image/jpeg', 0.9);
      }
    };
    img.src = imageSrc;
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="avatar-preview-title"
    >
      {/* Backdrop */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
        }}
        onClick={() => {
          if (!isSaving) onCancel();
        }}
      />

      {/* Modal Card */}
      <div
        style={{
          position: 'relative',
          background: 'white',
          borderRadius: '16px',
          padding: '2rem',
          maxWidth: '440px',
          width: '100%',
          boxShadow: '0 20px 60px rgba(15, 23, 42, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1.5rem',
          border: '1px solid #e2e8f0',
          animation: 'scaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <style>{`
          @keyframes scaleIn {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
          }
        `}</style>

        <h3
          id="avatar-preview-title"
          style={{
            margin: 0,
            fontSize: '1.25rem',
            fontWeight: 800,
            color: '#0f172a',
            textAlign: 'center',
          }}
        >
          Position and Zoom Photo
        </h3>

        {/* Golden-ratio styled preview area */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem',
            width: '100%',
            padding: '1.5rem',
            background: '#f8fafc',
            borderRadius: '12px',
            border: '1px dashed #cbd5e1',
          }}
        >
          {/* Main circular picture preview container */}
          <div
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleMouseUp}
            onWheel={handleWheel}
            style={{
              width: 140,
              height: 140,
              borderRadius: '50%',
              overflow: 'hidden',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)',
              border: '4px solid #ffffff',
              backgroundColor: '#EFF6FF',
              cursor: isDragging ? 'grabbing' : 'grab',
              position: 'relative',
              userSelect: 'none',
              touchAction: 'none'
            }}
          >
            <img
              src={imageSrc}
              alt="Avatar Crop Preview"
              draggable="false"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                pointerEvents: 'none',
                transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
                transformOrigin: 'center center',
                transition: isDragging ? 'none' : 'transform 0.1s ease-out'
              }}
            />
          </div>

          {/* Zoom controls */}
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Drag to position · Scroll / slide to zoom</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', maxWidth: '240px' }}>
              <span style={{ fontSize: '12px', color: '#64748b', userSelect: 'none' }}>➖</span>
              <input 
                type="range"
                min="1"
                max="3"
                step="0.01"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                style={{
                  flex: 1,
                  cursor: 'pointer',
                  accentColor: 'var(--primary-blue)'
                }}
              />
              <span style={{ fontSize: '12px', color: '#64748b', userSelect: 'none' }}>➕</span>
            </div>
          </div>

          {/* Metadata */}
          <div style={{ textAlign: 'center', wordBreak: 'break-all' }}>
            <div
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: '#334155',
                marginBottom: '2px',
              }}
            >
              {fileName}
            </div>
            <div style={{ fontSize: '11px', color: '#64748b' }}>
              Size: {formatBytes(fileSize)}
            </div>
          </div>
        </div>

        {/* Buttons (Separated, Right Aligned) */}
        <div
          style={{
            display: 'flex',
            width: '100%',
            gap: '12px',
            justifyContent: 'flex-end',
            marginTop: '0.5rem'
          }}
        >
          <button
            type="button"
            disabled={isSaving}
            onClick={onCancel}
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: 700,
              backgroundColor: '#ffffff',
              color: '#475569',
              border: '1px solid #cbd5e1',
              cursor: isSaving ? 'not-allowed' : 'pointer',
              borderRadius: '8px',
              transition: 'all 0.15s ease',
              fontFamily: 'inherit',
            }}
            onMouseOver={(e) => {
              if (!isSaving) e.currentTarget.style.backgroundColor = '#f8fafc';
            }}
            onMouseOut={(e) => {
              if (!isSaving) e.currentTarget.style.backgroundColor = '#ffffff';
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={handleSave}
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: 700,
              backgroundColor: isSaving ? '#60a5fa' : 'var(--primary-blue)',
              color: '#ffffff',
              border: 'none',
              cursor: isSaving ? 'not-allowed' : 'pointer',
              borderRadius: '8px',
              transition: 'all 0.15s ease',
              fontFamily: 'inherit',
              boxShadow: '0 2px 8px rgba(37, 99, 235, 0.15)'
            }}
            onMouseOver={(e) => {
              if (!isSaving) e.currentTarget.style.backgroundColor = '#1d4ed8';
            }}
            onMouseOut={(e) => {
              if (!isSaving) e.currentTarget.style.backgroundColor = 'var(--primary-blue)';
            }}
          >
            {isSaving ? 'Uploading...' : 'Save Photo'}
          </button>
        </div>
      </div>
    </div>
  );
}
