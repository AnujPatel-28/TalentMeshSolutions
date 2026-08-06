import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Terms of Service",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-16 px-4">
      <div className="max-w-4xl mx-auto bg-white p-8 md:p-12 rounded-3xl shadow-sm border border-slate-100">
        <Link href="/" className="text-slate-500 hover:text-slate-900 mb-8 inline-flex items-center gap-2 transition-colors">
          &larr; Back to Home
        </Link>
        <h1 className="text-4xl font-extrabold text-slate-900 mb-6">Terms of Service</h1>
        <p className="text-slate-500 mb-8">Last updated: May 2026</p>

        <div className="prose prose-slate max-w-none">
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">1. Acceptance of Terms</h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              By accessing or using TalentMesh, you agree to be bound by these Terms of Service. If you disagree with any part of the terms, you may not access our service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">2. User Accounts</h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              When you create an account with us, you must provide information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account on our Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">3. Privacy Policy</h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              Please refer to our <Link href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link> for information on how we collect, use, and disclose your personal data.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">4. Intellectual Property</h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              The Service and its original content, features, and functionality are and will remain the exclusive property of TalentMesh and its licensors.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">5. Contact Us</h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              If you have any questions about these Terms, please contact us at info@talentmeshsolutions.com.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">6. Legal Identity</h2>
            <p className="text-slate-600 leading-relaxed mb-1">
              TALENTMESH SOLUTIONS (OPC) PRIVATE LIMITED
            </p>
            <p className="text-slate-600 leading-relaxed mb-1">
              CIN: U78100GJ2025OPC162430
            </p>
            <p className="text-slate-600 leading-relaxed mb-1">
              Contact: info@talentmeshsolutions.com
            </p>
            {/* TODO(DPDP L-5): grievance officer name, designation, postal address before launch */}
            <p className="text-slate-600 leading-relaxed mb-4">
              Grievance Officer: [TO BE APPOINTED — contact info@talentmeshsolutions.com]
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
