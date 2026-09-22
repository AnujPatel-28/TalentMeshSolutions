"use client";

import React, { useEffect } from 'react';
import styles from './skeleton.module.css';

interface ErrorViewProps {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
  message?: string;
}

export default function ErrorView({
  error,
  reset,
  title = "Something went wrong",
  message = "We encountered an unexpected error while processing your request. Please try again."
}: ErrorViewProps) {

  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Boundary Error:', error);
  }, [error]);

  const isTechnicalError = 
    !error.message ||
    error.message.includes('is not a function') ||
    error.message.includes('Cannot read properties') ||
    error.message.includes('undefined') ||
    error.message.includes('null') ||
    error.message.includes('JSON') ||
    error.message.includes('token') ||
    error.message.includes('fetch');

  const displayMessage = isTechnicalError ? message : error.message;

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center animate-fade-in">
      <div className="mb-6 p-4 rounded-full bg-red-50 text-red-500">
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>

      <h2 className="text-2xl font-bold text-slate-900 mb-2">{title}</h2>
      <p className="text-slate-600 max-w-md mb-8">
        {displayMessage}
      </p>

      <div className="flex gap-4">
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2.5 rounded-xl border border-slate-200 font-medium text-slate-600 hover:bg-slate-50 transition-all"
        >
          Refresh Page
        </button>
        <button
          onClick={() => reset()}
          className="px-6 py-2.5 rounded-xl bg-blue-600 font-medium text-white hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all active:scale-95"
        >
          Try Again
        </button>
      </div>

      {error.digest && (
        <p className="mt-8 text-xs text-slate-400 font-mono">
          Error ID: {error.digest}
        </p>
      )}
    </div>
  );
}
