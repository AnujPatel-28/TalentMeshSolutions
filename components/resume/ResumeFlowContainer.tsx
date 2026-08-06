"use client";

import React, { useState } from 'react';
import ParseProgress, { ParseStage } from './ParseProgress';
import ResumeReview from './ResumeReview';
import ParseSuccess from './ParseSuccess';
import { ResumeUploader } from './ResumeUploader';
import { CandidatesApi } from '@/lib/api/candidates';
import { useAuth } from '@/lib/auth/AuthContext';
import { ParsedResume } from '@/lib/validators/resume';

type FlowStep = 'upload' | 'processing' | 'review' | 'success';

interface ResumeFlowContainerProps {
  onComplete?: () => void;
}

export const ResumeFlowContainer: React.FC<ResumeFlowContainerProps> = ({ onComplete }) => {
  const { user } = useAuth();
  const [step, setStep] = useState<FlowStep>('upload');
  const [parseStage, setParseStage] = useState<ParseStage>('uploading');
  const [parsedData, setParsedData] = useState<ParsedResume | null>(null);
  const [error, setError] = useState<string | undefined>();
  const [strengthIncrease, setStrengthIncrease] = useState(0);

  const handleUpload = async (file: File) => {
    setStep('processing');
    setParseStage('uploading');

    try {
      // Simulate/Show uploading state for 1s
      await new Promise(r => setTimeout(r, 1000));
      setParseStage('parsing');

      const baseUrl = process.env.NEXT_PUBLIC_INSFORGE_URL?.replace('ap-southeast.', 'functions.');
      const url = `${baseUrl}/resume-parse`;

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(url, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Parsing failed');
      }

      const result: ParsedResume = await response.json();
      
      setParseStage('mapping');
      await new Promise(r => setTimeout(r, 1000));
      
      setParsedData(result);
      setStep('review');
    } catch (err: any) {
      setParseStage('error');
      setError(err.message);
    }
  };

  const handleConfirm = async (finalData: any) => {
    if (!user) return;

    try {
      // Mapping to CandidateProfile type fields for CandidatesApi.update
      const updates = {
        name: finalData.name,
        role: finalData.role,
        skills: finalData.skills,
        yearsExp: finalData.yearsExp,
        location: finalData.location,
      };

      const { error } = await CandidatesApi.update(user.id, updates as any);
      
      if (error) throw new Error(error);

      // Simulate a strength increase for the success UI
      setStrengthIncrease(Math.floor(Math.random() * 15) + 10);
      setStep('success');
    } catch (err: any) {
      alert(`Save failed: ${err.message}`);
    }
  };

  const handleReset = () => {
    setStep('upload');
    setParsedData(null);
    setError(undefined);
  };

  return (
    <div className="min-h-[400px] flex flex-col items-center justify-center p-4">
      {step === 'upload' && (
        <div className="w-full max-w-lg">
          <h3 className="text-xl font-bold text-gray-800 mb-6 text-center italic">Start with your Resume</h3>
          <ResumeUploader onUpload={handleUpload} />
        </div>
      )}

      {step === 'processing' && (
        <ParseProgress stage={parseStage} error={error} />
      )}

      {step === 'review' && parsedData && (
        <ResumeReview 
          data={{
            name: parsedData.contact.name,
            role: parsedData.profile.headline,
            skills: parsedData.profile.skills,
            yearsExp: parsedData.profile.experience_years,
            location: parsedData.profile.location || parsedData.contact.location || '',
          }} 
          onConfirm={handleConfirm}
          onCancel={handleReset}
        />
      )}

      {step === 'success' && (
        <ParseSuccess 
          strengthIncrease={strengthIncrease}
          onViewProfile={() => {
             if (onComplete) onComplete();
             else window.location.href = `/dashboard/candidate/${user?.id}`;
          }} 
        />
      )}
    </div>
  );
};
