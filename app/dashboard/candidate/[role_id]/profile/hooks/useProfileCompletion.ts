import { useMemo } from 'react';

interface CompletionParams {
  avatar_url?: string | null;
  resume_url?: string | null;
  bio?: string | null;
  skills?: string[] | null;
  experience?: any[] | null;
  education?: string | any[] | null;
  location?: string | null;
  linkedin_url?: string | null;
}

export function useProfileCompletion(params: CompletionParams) {
  return useMemo(() => {
    const fields = [
      { key: 'avatar', label: 'Profile Photo', points: 10, completed: !!params.avatar_url, anchor: 'photo' },
      { key: 'resume', label: 'Resume Uploaded', points: 20, completed: !!params.resume_url, anchor: 'resume' },
      { key: 'bio', label: 'Professional Summary', points: 15, completed: (params.bio?.trim().length ?? 0) >= 30, anchor: 'bio' },
      { key: 'skills', label: 'Skills Added (5+)', points: 15, completed: (params.skills?.length ?? 0) >= 5, anchor: 'skills' },
      { key: 'experience', label: 'Work Experience', points: 15, completed: Array.isArray(params.experience) && params.experience.length >= 1, anchor: 'experience' },
      { key: 'education', label: 'Education Details', points: 10, completed: Array.isArray(params.education) && params.education.length >= 1, anchor: 'education' },
      { key: 'linkedin', label: 'LinkedIn Connected', points: 10, completed: !!params.linkedin_url, anchor: 'linkedin' },
      { key: 'location', label: 'Location Specified', points: 5, completed: !!params.location, anchor: 'location' }
    ];

    const totalScore = fields.filter(f => f.completed).reduce((sum, f) => sum + f.points, 0);
    const incompleteFields = fields.filter(f => !f.completed).map(f => f.label);

    return {
      score: totalScore,
      incompleteFields,
      fields
    };
  }, [
    params.avatar_url,
    params.resume_url,
    params.bio,
    params.skills,
    params.experience,
    params.education,
    params.location,
    params.linkedin_url
  ]);
}

