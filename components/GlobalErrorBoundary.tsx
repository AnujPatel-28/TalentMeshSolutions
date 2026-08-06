"use client";
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props { children: ReactNode; }
interface State { hasError: boolean; error: Error | null; errorInfo: ErrorInfo | null; }

export class GlobalErrorBoundary extends Component<Props, State> {
  public state: State = { hasError: false, error: null, errorInfo: null };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', background: '#ff000022', color: 'red', border: '1px solid red', borderRadius: '8px', margin: '2rem' }}>
          <h2>React Error in Children</h2>
          <p><strong>{this.state.error?.name}:</strong> {this.state.error?.message}</p>
          <pre style={{ overflow: 'auto', maxHeight: '400px', fontSize: '12px', background: '#111', color: '#fff', padding: '1rem' }}>
            {this.state.error?.stack}
          </pre>
          <pre style={{ overflow: 'auto', maxHeight: '400px', fontSize: '12px', background: '#222', color: '#aaa', padding: '1rem', marginTop: '1rem' }}>
            {this.state.errorInfo?.componentStack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}
