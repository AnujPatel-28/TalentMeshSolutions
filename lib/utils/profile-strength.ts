export interface ProfileStrengthInputs {
  avatar_url?: string | null;
  resume_url?: string | null;
  bio?: string | null;
  skills?: string[] | null;
  experience?: any[] | null;
  education?: string | any[] | null;
  location?: string | null;
  linkedin_url?: string | null;
}

export function calculateProfileStrength(params: ProfileStrengthInputs): number {
  let score = 0;
  if (params.avatar_url) score += 10;
  if (params.resume_url) score += 20;
  
  const bioStr = params.bio || '';
  if (bioStr.trim().length >= 30) score += 15;
  
  if (params.skills && params.skills.length >= 5) score += 15;
  if (Array.isArray(params.experience) && params.experience.length >= 1) score += 15;
  
  const edu = params.education;
  const hasEducation = edu && (
    Array.isArray(edu) 
      ? edu.length >= 1 
      : typeof edu === 'string' && edu.trim().length > 0
  );
  if (hasEducation) score += 10;
  
  if (params.linkedin_url) score += 10;
  if (params.location) score += 5;
  return score;
}
