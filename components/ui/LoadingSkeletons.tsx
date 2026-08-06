"use client";

import React from 'react';
import Skeleton from './Skeleton';
import styles from './skeleton.module.css';

export function DashboardHomeSkeleton() {
  return (
    <div className="animate-fade-in p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <Skeleton width={200} height="2rem" className="mb-2" />
          <Skeleton width={300} height="1rem" />
        </div>
        <Skeleton width={120} height="2.5rem" className="rounded-xl" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="p-6 rounded-2xl bg-white border border-slate-100 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <Skeleton width={80} height="0.8rem" />
              <Skeleton width={32} height={32} circle />
            </div>
            <Skeleton width={100} height="1.8rem" className="mb-2" />
            <Skeleton width={60} height="0.6rem" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 rounded-2xl bg-white border border-slate-100 shadow-sm">
            <Skeleton width={150} height="1.2rem" className="mb-6" />
            {[1, 2, 3].map(i => (
              <div key={i} className="flex gap-4 p-4 mb-4 rounded-xl border border-slate-50">
                <Skeleton width={48} height={48} className="rounded-lg" />
                <div className="flex-1">
                  <Skeleton width="60%" height="1rem" className="mb-2" />
                  <Skeleton width="40%" height="0.7rem" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-white border border-slate-100 shadow-sm">
            <Skeleton width={120} height="1.2rem" className="mb-6" />
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex gap-3 mb-4">
                <Skeleton width={32} height={32} circle />
                <div className="flex-1">
                  <Skeleton width="100%" height="0.7rem" className="mb-1" />
                  <Skeleton width="50%" height="0.5rem" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ListSkeleton({ title = true, action = true, count = 5 }) {
  return (
    <div className="animate-fade-in p-6">
      <div className="flex justify-between items-center mb-8">
        {title ? <Skeleton width={250} height="2rem" /> : <div />}
        {action ? <Skeleton width={150} height="2.5rem" className="rounded-xl" /> : <div />}
      </div>
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="p-6 border-b border-slate-50 last:border-0">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <Skeleton width="40%" height="1.2rem" className="mb-2" />
                <Skeleton width="20%" height="0.8rem" />
              </div>
              <Skeleton width={80} height="1.5rem" className="rounded-full" />
            </div>
            <div className="flex gap-2">
              <Skeleton width={60} height="1rem" className="rounded-md" />
              <Skeleton width={60} height="1rem" className="rounded-md" />
              <Skeleton width={100} height="1rem" className="rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div className="animate-fade-in p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <Skeleton width={100} height="1rem" className="mb-4" />
        <Skeleton width="70%" height="2.5rem" className="mb-2" />
        <Skeleton width="40%" height="1.2rem" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 space-y-8">
          <div className="space-y-4">
            <Skeleton width={150} height="1.2rem" />
            <Skeleton width="100%" height="1rem" />
            <Skeleton width="100%" height="1rem" />
            <Skeleton width="80%" height="1rem" />
          </div>
          <div className="space-y-4">
            <Skeleton width={150} height="1.2rem" />
            <Skeleton width="100%" height="4rem" />
          </div>
        </div>
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-white border border-slate-100">
            <Skeleton width="100%" height="1rem" className="mb-4" />
            <Skeleton width="100%" height="3rem" className="rounded-xl mb-3" />
            <Skeleton width="100%" height="3rem" className="rounded-xl border border-slate-200" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function FormSkeleton({ fields = 4 }) {
  return (
    <div className="animate-fade-in p-6 max-w-2xl mx-auto">
      <div className="mb-10 text-center">
        <Skeleton width={150} height="2rem" className="mx-auto mb-2" />
        <Skeleton width={250} height="1rem" className="mx-auto" />
      </div>
      <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm space-y-6">
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i}>
            <Skeleton width={120} height="0.9rem" className="mb-2" />
            <Skeleton width="100%" height="3rem" className="rounded-xl" />
          </div>
        ))}
        <div className="pt-4">
          <Skeleton width="100%" height="3.2rem" className="rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export function PublicPageSkeleton() {
  return (
    <div className="animate-fade-in">
      {/* Hero Section */}
      <div className="h-[600px] bg-slate-50 flex flex-col items-center justify-center text-center px-4">
        <Skeleton width={150} height="1rem" className="mb-6 rounded-full" />
        <Skeleton width="60%" height="4rem" className="mb-6" />
        <Skeleton width="40%" height="1.5rem" className="mb-10" />
        <div className="flex gap-4">
          <Skeleton width={160} height="3.5rem" className="rounded-full" />
          <Skeleton width={160} height="3.5rem" className="rounded-full" />
        </div>
      </div>
      {/* Content Sections */}
      <div className="py-20 max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {[1, 2, 3].map(i => (
            <div key={i} className="space-y-4">
              <Skeleton width={64} height={64} className="rounded-2xl" />
              <Skeleton width="80%" height="1.5rem" />
              <Skeleton width="100%" height="1rem" />
              <Skeleton width="100%" height="1rem" />
              <Skeleton width="60%" height="1rem" />
            </div>
          ))}
        </div>
      </div>
      {/* Features Grid */}
      <div className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <Skeleton width={200} height="2.5rem" className="mx-auto mb-4" />
            <Skeleton width={400} height="1.2rem" className="mx-auto" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div key={i} className="p-8 bg-white rounded-3xl space-y-4 shadow-sm border border-slate-100">
                <Skeleton width={40} height={40} circle />
                <Skeleton width="70%" height="1.2rem" />
                <Skeleton width="100%" height="0.8rem" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
