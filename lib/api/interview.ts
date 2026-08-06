import { insforge, handleApiCall } from './index';
import { Job, ApiState } from '@/types/dashboard';
import { ScoreSchema, ScoringResult } from '../validators/scores';

export interface Question {
  text: string;
  category: 'technical' | 'behavioural' | 'cultural';
  difficulty: 'easy' | 'medium' | 'hard';
  expectedKeywords: string[];
  status?: 'answered' | 'skipped' | 'flagged';
}

export const InterviewApi = {
  /**
   * Generates AI-powered interview questions based on job requirements and candidate profile.
   * Focuses on identifying and probing skill gaps.
   */
  async generateInterviewQuestions(job: Job, candidate: any): Promise<ApiState<Question[]>> {
    return handleApiCall(async () => {
      const anyJob = job as any;
      const prompt = `
        You are a world-class Technical Interviewer for TalentMesh.
        Based on the Job Description and the Candidate's Profile provided below, generate 5-8 high-quality interview questions.
        
        CRITICAL GOAL: Identify the "Skill Gaps" between the job requirements and the candidate's actual experience. 
        Focus your questions on these gaps or on verifying their high-priority skills.

        JOB CONTEXT:
        Title: ${anyJob.title}
        Type: ${anyJob.type}
        Requirements: ${Array.isArray(anyJob.requirements) ? anyJob.requirements.join(', ') : 'Not specified'}
        Skills Required: ${Array.isArray(anyJob.skills_required) ? anyJob.skills_required.join(', ') : 'Not specified'}
        Description: ${anyJob.description || 'Not specified'}

        CANDIDATE PROFILE:
        Name: ${candidate.name}
        Current Role: ${candidate.role}
        Skills: ${Array.isArray(candidate.skills) ? candidate.skills.join(', ') : 'Not specified'}
        Experience: ${candidate.yearsExp} years
        Work History: ${JSON.stringify(candidate.work_history || [])}

        RESPONSE FORMAT:
        You must return ONLY a JSON array of objects. Each object must strictly follow this structure:
        {
          "text": "The question text",
          "category": "technical" | "behavioural" | "cultural",
          "difficulty": "easy" | "medium" | "hard",
          "expectedKeywords": ["keyword1", "keyword2"]
        }

        Do not include any preamble, markdown formatting (no \`\`\`json), or post-text.
      `;

      const completion = await insforge.ai.chat.completions.create({
        model: 'anthropic/claude-sonnet-4.5',
        messages: [
          { role: 'system', content: 'You are an elite recruiter assistant. You generate deep-dive interview questions tailored to specific candidates.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
      });

      const content = completion.choices[0].message.content || '[]';
      const jsonStr = content.replace(/```json/g, '').replace(/```/g, '').trim();
      
      try {
        const questions: Question[] = JSON.parse(jsonStr);
        return questions;
      } catch (e) {
        console.error('Failed to parse AI response as JSON:', content);
        throw new Error('AI generated invalid question format');
      }
    });
  },

  /**
   * Persists generated questions to the interview record.
   */
  async saveQuestions(interviewId: string, questions: Question[]): Promise<ApiState<any>> {
    return handleApiCall(async () => {
      return insforge.database
        .from('interviews')
        .update({ questions })
        .eq('id', interviewId)
        .select()
        .single() as any;
    });
  },

  /**
   * Scores an interview session based on the transcript and job/candidate context.
   */
  async scoreInterviewSession(id: string, transcript: string): Promise<ApiState<ScoringResult>> {
    return handleApiCall(async () => {
      // 1. Fetch deep context
      const { data: interview, error: fetchError } = await insforge.database
        .from('interviews')
        .select(`
          *,
          candidate:profiles!candidate_id (
            id,
            name,
            profile:candidate_profiles (*)
          ),
          job:jobs (*)
        `)
        .eq('id', id)
        .single();

      if (fetchError || !interview) throw new Error('Interview context not found');

      const job = interview.job as any;
      const candidateProfile = interview.candidate?.profile as any;
      const candidateName = interview.candidate?.name || 'Candidate';

      // 2. Build Scoring Prompt
      const prompt = `
        Evaluate the following interview transcript for candidate ${candidateName} applying for the "${job.title}" role.
        
        JOB REQUIREMENTS:
        ${Array.isArray(job.requirements) ? job.requirements.join('\n') : job.description}
        
        EXPECTED KEYWORDS:
        ${(interview as any).questions?.flatMap((q: any) => q.expectedKeywords || []).join(', ')}

        CANDIDATE CONTEXT:
        Current Role: ${candidateProfile?.headline}
        Key Skills: ${candidateProfile?.skills?.join(', ')}

        TRANSCRIPT:
        ${transcript}

        TASK:
        Evaluate the candidate on a scale of 0-100 across 4 categories:
        1. aiScore: Overall performance and fit for the role.
        2. skillAlignment: How well their demonstrated skills match the job requirements.
        3. experienceFit: Relevance of their past experience to the current role's seniority.
        4. culturalMatch: Communication style and value alignment.

        Include a detailed reasoning (analysis) explaining the scores.

        RESPONSE FORMAT (STRICT JSON):
        {
          "aiScore": number,
          "skillAlignment": number,
          "experienceFit": number,
          "culturalMatch": number,
          "reasoning": "Detailed technical analysis string"
        }
      `;

      // 3. Call AI
      const completion = await insforge.ai.chat.completions.create({
        model: 'anthropic/claude-sonnet-4.5',
        messages: [
          { role: 'system', content: 'You are a Senior Technical Recruiter with over 20 years of experience. Your evaluations are objective, critical, and data-driven.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.2,
      });

      const content = completion.choices[0].message.content || '{}';
      const jsonStr = content.replace(/```json/g, '').replace(/```/g, '').trim();
      
      const rawScores = JSON.parse(jsonStr);
      const validated = ScoreSchema.parse(rawScores);

      // 4. Persist to DB
      await insforge.database
        .from('interviews')
        .update({ 
          transcript,
          analysis: validated.reasoning,
          status: 'completed'
        })
        .eq('id', id);

      if (interview.candidate_id) {
        await insforge.database
          .from('candidate_profiles')
          .update({
            ai_score: validated.aiScore,
            skill_alignment: validated.skillAlignment,
            experience_fit: validated.experienceFit,
            cultural_match: validated.culturalMatch
          })
          .eq('id', interview.candidate_id);
      }

      return validated;
    });
  }
};
