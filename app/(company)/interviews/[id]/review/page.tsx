import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { insforge } from '@/lib/insforge';
import { 
  Box, 
  Container, 
  Typography, 
  Grid, 
  Paper, 
  Avatar, 
  Chip, 
  LinearProgress, 
  Divider,
  Stack,
  Button
} from '@mui/material';
import { 
  CheckCircle, 
  Award, 
  Users, 
  Target, 
  FileText, 
  MessageSquare, 
  ChevronLeft,
  Calendar,
  Clock,
  ExternalLink,
  BrainCircuit
} from 'lucide-react';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Interview Review | TalentMesh',
  description: 'AI-assisted recruiter review of interview performance.',
};

interface ReviewPageProps {
  params: Promise<{ id: string }>;
}

export default async function InterviewReviewPage({ params }: ReviewPageProps) {
  const { id } = await params;

  // Fetch interview with candidate and profile data
  const { data: interview, error } = await insforge.database
    .from('interviews')
    .select(`
      *,
      candidate:profiles!candidate_id (
        id,
        name,
        email,
        profile:candidate_profiles (
          headline,
          ai_score,
          skill_alignment,
          experience_fit,
          cultural_match,
          skills
        )
      ),
      job:jobs (
        title,
        department
      )
    `)
    .eq('id', id)
    .single();

  if (error || !interview) {
    console.error('Interview Load Error:', error);
    return notFound();
  }

  const candidate = interview.candidate;
  const profile = candidate?.profile;
  const job = interview.job;

  const scoreCards = [
    { label: 'Overall AI Score', value: profile?.ai_score || 0, icon: <Award size={20} color="#60a5fa" />, color: '#3b82f6' },
    { label: 'Skill Alignment', value: profile?.skill_alignment || 0, icon: <Target size={20} color="#34d399" />, color: '#10b981' },
    { label: 'Experience Fit', value: profile?.experience_fit || 0, icon: <FileText size={20} color="#f59e0b" />, color: '#f59e0b' },
    { label: 'Cultural Match', value: profile?.cultural_match || 0, icon: <Users size={20} color="#a855f7" />, color: '#8b5cf6' },
  ];

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#0b0f1a', color: 'white', pb: 10 }}>
      {/* Header Bar */}
      <Box sx={{ 
        borderBottom: '1px solid rgba(255,255,255,0.05)', 
        bgcolor: 'rgba(15, 23, 42, 0.5)', 
        backdropFilter: 'blur(20px)',
        sticky: 'top',
        zIndex: 100,
        py: 2
      }}>
        <Container maxWidth="xl">
          <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
            <Stack direction="row" spacing={2} alignItems="center">
              <Link href="/dashboard/recruiter" passHref>
                <Button 
                  variant="text" 
                  startIcon={<ChevronLeft size={18} />}
                  sx={{ color: 'rgba(255,255,255,0.5)', '&:hover': { color: 'white' } }}
                >
                  Dashboard
                </Button>
              </Link>
              <Divider orientation="vertical" flexItem sx={{ bgcolor: 'rgba(255,255,255,0.1)' }} />
              <Box>
                <Typography variant="h6" fontWeight={800} sx={{ letterSpacing: '-0.02em' }}>
                  Review: {candidate?.name}
                </Typography>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                  {job?.title} • {job?.department}
                </Typography>
              </Box>
            </Stack>
            <Chip 
              icon={<CheckCircle size={14} color="#10b981" />} 
              label="Interview Completed" 
              sx={{ bgcolor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', fontWeight: 700, border: '1px solid rgba(16, 185, 129, 0.2)' }}
            />
          </Stack>
        </Container>
      </Box>

      <Container maxWidth="xl" sx={{ mt: 4 }}>
        <Grid container spacing={3}>
          {/* Top Score Cards */}
          {scoreCards.map((card, i) => (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={i}>
              <Paper sx={{ 
                p: 3, 
                borderRadius: 4, 
                bgcolor: 'rgba(30, 41, 59, 0.3)', 
                border: '1px solid rgba(255,255,255,0.05)',
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                transition: 'transform 0.2s',
                '&:hover': { transform: 'translateY(-4px)', borderColor: 'rgba(255,255,255,0.1)' }
              }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box sx={{ p: 1, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.03)' }}>{card.icon}</Box>
                  <Typography variant="h4" fontWeight={900} sx={{ color: card.color }}>{card.value}%</Typography>
                </Stack>
                <Typography variant="body2" fontWeight={700} sx={{ color: 'rgba(255,255,255,0.6)' }}>{card.label}</Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={card.value} 
                  sx={{ 
                    height: 6, 
                    borderRadius: 3, 
                    bgcolor: 'rgba(255,255,255,0.05)',
                    '& .MuiLinearProgress-bar': { bgcolor: card.color, borderRadius: 3 }
                  }} 
                />
              </Paper>
            </Grid>
          ))}

          {/* Left Column: AI Analysis & Transcript */}
          <Grid size={{ xs: 12, md: 8 }}>
            <Stack spacing={3}>
              {/* AI Analysis Reasoning */}
              <Paper sx={{ 
                p: 4, 
                borderRadius: 5, 
                bgcolor: 'rgba(30, 41, 59, 0.2)', 
                border: '1px solid rgba(255,255,255,0.05)',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <Box sx={{ 
                  position: 'absolute', 
                  top: 0, 
                  right: 0, 
                  p: 3, 
                  opacity: 0.05,
                  transform: 'rotate(-15deg)'
                }}>
                  <BrainCircuit size={120} />
                </Box>
                
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 3 }}>
                  <BrainCircuit size={24} color="#60a5fa" />
                  <Typography variant="h5" fontWeight={800}>AI Evaluation Reasoning</Typography>
                </Stack>
                
                <Typography 
                  variant="body1" 
                  sx={{ 
                    color: 'rgba(255,255,255,0.8)', 
                    lineHeight: 1.8,
                    whiteSpace: 'pre-wrap',
                    zIndex: 1
                  }}
                >
                  {interview.analysis || "Analysis pending generation..."}
                </Typography>
              </Paper>

              {/* Transcript Section */}
              <Paper sx={{ 
                p: 4, 
                borderRadius: 5, 
                bgcolor: 'rgba(15, 23, 42, 0.4)', 
                border: '1px solid rgba(255,255,255,0.05)'
              }}>
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 4 }} justifyContent="space-between">
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <MessageSquare size={24} color="#a855f7" />
                    <Typography variant="h5" fontWeight={800}>Interview Transcript</Typography>
                  </Stack>
                  <Button variant="outlined" size="small" sx={{ borderColor: 'rgba(255,255,255,0.1)', color: 'white', textTransform: 'none' }}>
                    Download PDF
                  </Button>
                </Stack>

                <Box sx={{ 
                  maxHeight: '600px', 
                  overflowY: 'auto', 
                  pr: 2,
                  '&::-webkit-scrollbar': { width: '6px' },
                  '&::-webkit-scrollbar-track': { bgcolor: 'transparent' },
                  '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(255,255,255,0.1)', borderRadius: '10px' }
                }}>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      fontFamily: 'monospace', 
                      color: 'rgba(255,255,255,0.6)', 
                      lineHeight: 1.8,
                      fontSize: '0.9rem',
                      whiteSpace: 'pre-wrap'
                    }}
                  >
                    {interview.transcript || "No transcript available for this session."}
                  </Typography>
                </Box>
              </Paper>
            </Stack>
          </Grid>

          {/* Right Column: Candidate Profile Quick View */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Stack spacing={3}>
              <Paper sx={{ 
                p: 4, 
                borderRadius: 5, 
                bgcolor: 'rgba(30, 41, 59, 0.3)', 
                border: '1px solid rgba(255,255,255,0.05)'
              }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', mb: 4 }}>
                  <Avatar 
                    sx={{ 
                      width: 100, 
                      height: 100, 
                      bgcolor: '#2563eb', 
                      fontSize: '2.5rem', 
                      fontWeight: 900,
                      mb: 2,
                      border: '4px solid rgba(255,255,255,0.05)',
                      boxShadow: '0 20px 40px rgba(0,0,0,0.4)'
                    }}
                  >
                    {candidate?.name?.split(' ').map((n: string) => n[0]).join('')}
                  </Avatar>
                  <Typography variant="h5" fontWeight={800}>{candidate?.name}</Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)', mb: 2 }}>{profile?.headline}</Typography>
                  
                  <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                    <Chip size="small" label="Premium Candidate" sx={{ bgcolor: 'rgba(96, 165, 250, 0.1)', color: '#60a5fa', fontWeight: 600 }} />
                    <Chip size="small" label="Active Pipeline" sx={{ bgcolor: 'rgba(168, 85, 247, 0.1)', color: '#a855f7', fontWeight: 600 }} />
                  </Stack>
                </Box>

                <Divider sx={{ my: 3, borderColor: 'rgba(255,255,255,0.05)' }} />

                <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 2, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  Top Skills Identified
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {profile?.skills?.map((skill: string, idx: number) => (
                    <Chip 
                      key={idx} 
                      label={skill} 
                      variant="outlined" 
                      size="small"
                      sx={{ borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.8)', bgcolor: 'rgba(255,255,255,0.02)' }} 
                    />
                  ))}
                </Box>

                <Stack spacing={2} sx={{ mt: 4 }}>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Calendar size={18} color="rgba(255,255,255,0.4)" />
                    <Typography variant="body2">Intervied on April 18, 2026</Typography>
                  </Stack>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Clock size={18} color="rgba(255,255,255,0.4)" />
                    <Typography variant="body2">Duration: 42 minutes</Typography>
                  </Stack>
                </Stack>

                <Button 
                  fullWidth 
                  variant="contained" 
                  sx={{ 
                    mt: 5, 
                    borderRadius: 3, 
                    py: 1.5, 
                    fontWeight: 800, 
                    bgcolor: '#2563eb',
                    '&:hover': { bgcolor: '#1d4ed8' }
                  }}
                  endIcon={<ChevronLeft size={18} style={{ transform: 'rotate(180deg)' }} />}
                >
                  View Full Candidate Profile
                </Button>
              </Paper>
            </Stack>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
