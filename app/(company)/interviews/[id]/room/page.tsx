import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { insforge } from '@/lib/insforge';
import { InterviewRoom } from '@/components/interview/InterviewRoom';
import { Box } from '@mui/material';

export const metadata: Metadata = {
  title: 'AI Interview Room | TalentMesh',
  description: 'Real-time AI-powered interview session.',
};

interface RoomPageProps {
  params: Promise<{ id: string }>;
}

import { InterviewApi, Question } from '@/lib/api/interview';

export default async function InterviewRoomPage({ params }: RoomPageProps) {
  const { id } = await params;

  // 1. Fetch interview details with full context for AI
  const { data: interview, error } = await insforge.database
    .from('interviews')
    .select(`
      *,
      candidate:profiles!candidate_id (
        id,
        name,
        profile:candidate_profiles (
          headline,
          skills,
          experience_years,
          work_history
        )
      ),
      job:jobs (
        id,
        title,
        description,
        requirements,
        skills_required
      )
    `)
    .eq('id', id)
    .single();

  if (error || !interview) {
    console.error('Interview Load Error:', error);
    return notFound();
  }

  // 2. AI Question Generation Logic
  let questions: Question[] = (interview as any).questions || [];

  if (questions.length === 0 && interview.job && interview.candidate) {
    console.log('Generating AI Questions for session:', id);
    
    // Map to the expected format for the AI service
    const jobContext = interview.job as any;
    const candidateContext = {
      name: interview.candidate.name || 'Candidate',
      role: interview.candidate.profile?.headline || 'Candidate',
      skills: interview.candidate.profile?.skills || [],
      yearsExp: interview.candidate.profile?.experience_years || 0,
      work_history: interview.candidate.profile?.work_history || []
    };

    const { data: generatedQuestions } = await InterviewApi.generateInterviewQuestions(
      jobContext,
      candidateContext
    );

    if (generatedQuestions && generatedQuestions.length > 0) {
      questions = generatedQuestions;
      // Persist to DB
      await InterviewApi.saveQuestions(id, questions);
    }
  }

  // 3. Prepare Display Data
  const candidateName = interview.candidate?.name || 'Candidate';
    
  const roleTitle = interview.job?.title || 'Unknown Role';

  return (
    <Box sx={{ height: '100vh', width: '100vw', bgcolor: '#0f172a' }}>
      <InterviewRoom 
        interviewId={id}
        candidateName={candidateName}
        roleTitle={roleTitle}
        questions={questions}
      />
    </Box>
  );
}
