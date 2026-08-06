"use client";
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallbackText?: string;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = { hasError: false };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Dashboard widget caught an error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '1.5rem',
          background: '#fef2f2',
          border: '1px dashed #fca5a5',
          borderRadius: '16px',
          color: '#ef4444',
          textAlign: 'center',
          fontSize: '0.95rem',
          fontWeight: 600,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          minHeight: '120px',
          margin: '0.5rem 0'
        }}>
          <span style={{ fontSize: '1.5rem' }}>⚠️</span>
          <p style={{ margin: 0 }}>{this.props.fallbackText || "Unable to load this section. Please refresh."}</p>
        </div>
      );
    }
    return this.props.children;
  }
}
