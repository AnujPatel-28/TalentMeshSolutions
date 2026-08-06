import { describe, it, expect } from 'vitest';
import { 
  CandidateSchema, 
  JobSchema, 
  InterviewSchema,
  JobStatusSchema,
  CompanyKpisSchema
} from '@/lib/validators/dashboard';

describe('Dashboard Zod Validators', () => {
  
  describe('Score Validation', () => {
    it('should pass for valid scores between 0 and 100', () => {
      const result = JobSchema.safeParse({
        id: 'job-1',
        title: 'Backend Engineer',
        department: 'Engineering',
        type: 'full-time',
        applicants: 12,
        newApplicants: 3,
        postedDays: 5,
        status: 'active',
        location: 'Remote',
        salary: '$120k',
        aiMatchRate: 85
      });
      expect(result.success).toBe(true);
    });

    it('should fail for scores > 100', () => {
      const result = JobSchema.safeParse({
        id: 'job-1',
        title: 'Backend Engineer',
        department: 'Engineering',
        type: 'full-time',
        applicants: 12,
        newApplicants: 3,
        postedDays: 5,
        status: 'active',
        location: 'Remote',
        salary: '$120k',
        aiMatchRate: 150 // Invalid (> 100)
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const issue = result.error.issues[0];
        expect(issue).toBeDefined();
        // Be flexible with the message as different Zod versions might vary slightly
        expect(issue?.message.toLowerCase()).toMatch(/at most 100|too big/);
      }
    });

    it('should fail for negative scores', () => {
      const result = JobSchema.safeParse({
        id: 'job-1',
        title: 'Backend Engineer',
        department: 'Engineering',
        type: 'full-time',
        applicants: 12,
        newApplicants: 3,
        postedDays: 5,
        status: 'active',
        location: 'Remote',
        salary: '$120k',
        aiMatchRate: -5 // Invalid (< 0)
      });
      expect(result.success).toBe(false);
    });
  });

  describe('Date Validation (ISO 8601)', () => {
    const validCandidate = {
      id: 'can-1',
      name: 'Alice Johnson',
      avatar: 'AJ',
      role: 'Frontend Developer',
      stage: 'screening',
      aiScore: 92,
      skillAlignment: 88,
      experienceFit: 90,
      culturalMatch: 95,
      skills: ['React', 'TypeScript'],
      yearsExp: 5,
      location: 'SF',
      appliedAt: '2024-03-24T14:44:40Z', // Valid ISO
      urgent: false,
      status: 'applied',
      salary: '$150k'
    };

    it('should pass for valid ISO 8601 datetime strings', () => {
      const result = CandidateSchema.safeParse(validCandidate);
      expect(result.success).toBe(true);
    });

    it('should fail for invalid date strings', () => {
      const invalidCandidate = { ...validCandidate, appliedAt: '2024-13-40' }; // Invalid date
      const result = CandidateSchema.safeParse(invalidCandidate);
      expect(result.success).toBe(false);
    });

    it('should fail for non-ISO formats', () => {
      const invalidCandidate = { ...validCandidate, appliedAt: 'March 24, 2024' };
      const result = CandidateSchema.safeParse(invalidCandidate);
      expect(result.success).toBe(false);
    });
  });

  describe('Enum Validation', () => {
    it('should pass for valid JobStatus values', () => {
      expect(JobStatusSchema.safeParse('active').success).toBe(true);
      expect(JobStatusSchema.safeParse('paused').success).toBe(true);
      expect(JobStatusSchema.safeParse('closed').success).toBe(true);
      expect(JobStatusSchema.safeParse('draft').success).toBe(true);
    });

    it('should fail for invalid JobStatus values', () => {
      const result = JobStatusSchema.safeParse('on-vacation');
      expect(result.success).toBe(false);
      if (!result.success) {
        const issue = result.error.issues[0];
        expect(issue).toBeDefined();
        // Accommodate different error messages (e.g., standard Zod vs custom if any)
        expect(issue?.message.toLowerCase()).toMatch(/invalid enum value|invalid option|expected/);
      }
    });
  });

  describe('Complex Objects (Company KPIs)', () => {
    it('should validate full KPI objects with nested trends', () => {
      const validKpis = {
        activeJobs: 15,
        totalApplicants: 450,
        interviewsToday: 8,
        avgTimeToHire: 22,
        offerAcceptRate: 90,
        openOffers: 5,
        trends: {
          activeJobs: 2,
          totalApplicants: 50,
          interviewsToday: 1,
          avgTimeToHire: -2
        }
      };
      const result = CompanyKpisSchema.safeParse(validKpis);
      expect(result.success).toBe(true);
    });
  });
});
