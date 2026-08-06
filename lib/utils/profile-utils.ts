/**
 * Calculates candidate profile strength (0-100)
 * 
 * Rules:
 * - name (from profiles): 10pts
 * - avatar: 10pts
 * - skills 3+: 20pts
 * - experience: 15pts
 * - resume: 20pts
 * - linkedin: 10pts
 * - bio: 15pts
 */
export function calculateProfileStrength(profile: any, candidateProfile: any): number {
    let score = 0;

    // 1. Name (10pts)
    if (profile?.name && profile.name.trim().length > 0) {
        score += 10;
    }

    // 2. Avatar (10pts)
    if (profile?.avatar_url) {
        score += 10;
    }

    // 3. Skills 3+ (20pts)
    if (candidateProfile?.skills && Array.isArray(candidateProfile.skills) && candidateProfile.skills.length >= 3) {
        score += 20;
    }

    // 4. Experience (15pts)
    if (candidateProfile?.experience_years !== undefined && candidateProfile.experience_years !== null) {
        score += 15;
    }

    // 5. Resume (20pts)
    if (candidateProfile?.resume_url) {
        score += 20;
    }

    // 6. LinkedIn (10pts)
    if (candidateProfile?.linkedin_url) {
        score += 10;
    }

    // 7. Bio (15pts)
    // Assuming 'headline' or a field in profiles maps to bio if not explicitly named 'bio'
    // Following candidate_profiles schema, let's check for 'headline'
    if (candidateProfile?.headline && candidateProfile.headline.trim().length > 0) {
        score += 15;
    }

    return Math.min(score, 100);
}
