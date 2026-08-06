'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Box, Typography, IconButton, Button, Paper, Divider, Chip, Tooltip } from '@mui/material';
import { 
  Mic, MicOff, Video, VideoOff, 
  PhoneOff, Clock, MessageSquare, 
  Sparkles, Zap 
} from 'lucide-react';
import { QuestionPanel } from './QuestionPanel';
import { Question } from '@/lib/api/interview';

interface InterviewRoomProps {
  interviewId: string;
  candidateName: string;
  roleTitle: string;
  questions: Question[];
  onQuestionStatusUpdate?: (index: number, status: string | null) => void;
}

export const InterviewRoom: React.FC<InterviewRoomProps> = ({
  interviewId,
  candidateName,
  roleTitle,
  questions = [],
  onQuestionStatusUpdate = () => {}
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [timer, setTimer] = useState(0);

  // Fake Transcript Data for demonstration
  const [transcript, setTranscript] = useState([
    { speaker: 'Interviewer', text: 'Welcome to the interview! Can you introduce yourself?' },
    { speaker: 'Candidate', text: 'Hi, thank you. I am a software engineer with 5 years of experience...' },
  ]);

  useEffect(() => {
    const interval = setInterval(() => setTimer(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Box sx={{ 
      display: 'flex', 
      height: '100vh', 
      bgcolor: '#0f172a', 
      color: 'white',
      overflow: 'hidden'
    }}>
      {/* Main Content Area */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
        
        {/* Header Info */}
        <Box sx={{ 
          p: 2.5, 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          background: 'linear-gradient(to bottom, rgba(15, 23, 42, 0.8), transparent)',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 10
        }}>
          <Box>
            <Typography variant="h6" fontWeight={700}>{candidateName}</Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>
              Interviewing for <span style={{ color: '#60a5fa' }}>{roleTitle}</span>
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Chip 
              icon={<Clock size={14} color="#60a5fa" />} 
              label={formatTime(timer)} 
              sx={{ bgcolor: 'rgba(30, 41, 59, 0.8)', color: '#60a5fa', fontWeight: 700, border: '1px solid rgba(96, 165, 250, 0.3)' }}
            />
            <Chip 
              label="Live Session" 
              sx={{ bgcolor: '#ef4444', color: 'white', fontWeight: 700, animation: 'pulse 2s infinite' }} 
            />
          </Box>
        </Box>

        {/* Video Grid */}
        <Box sx={{ 
          flex: 1, 
          display: 'grid', 
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, 
          gap: 2, 
          p: 2,
          mt: 8
        }}>
          {/* Interviewer/AI Panel */}
          <Paper sx={{ 
            bgcolor: '#1e293b', 
            borderRadius: 6, 
            overflow: 'hidden', 
            position: 'relative',
            border: '2px solid rgba(96, 165, 250, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
             <Box sx={{ textAlign: 'center' }}>
                <Box sx={{ width: 120, height: 120, borderRadius: '50%', bgcolor: '#334155', mx: 'auto', mb: 2, display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center' }}>
                   <Sparkles size={64} color="#60a5fa" />
                </Box>
                <Typography variant="h6" color="primary.main" fontWeight={800}>TalentMesh AI</Typography>
                <Typography variant="caption" color="text.secondary">Processing Response...</Typography>
             </Box>
             <Box sx={{ position: 'absolute', bottom: 16, left: 16 }}>
               <Chip label="Interviewer (AI)" size="small" sx={{ bgcolor: 'rgba(0,0,0,0.5)', color: 'white' }} />
             </Box>
          </Paper>

          {/* Candidate Panel */}
          <Paper sx={{ 
            bgcolor: '#1e293b', 
            borderRadius: 6, 
            overflow: 'hidden', 
            position: 'relative',
            border: '2px solid rgba(148, 163, 184, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {isVideoOff ? (
              <Box sx={{ textAlign: 'center' }}>
                <VideoOff size={64} color="#64748b" />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>Camera is Turned Off</Typography>
              </Box>
            ) : (
                <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">Video Feed Initializing...</Typography>
                </Box>
            )}
            <Box sx={{ position: 'absolute', bottom: 16, left: 16 }}>
               <Chip label={candidateName} size="small" sx={{ bgcolor: 'rgba(0,0,0,0.5)', color: 'white' }} />
             </Box>
          </Paper>
        </Box>

        {/* Control Bar */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          p: 3,
          background: 'linear-gradient(to top, rgba(15, 23, 42, 0.8), transparent)',
        }}>
          <Paper elevation={12} sx={{ 
            px: 4, 
            py: 1.5, 
            borderRadius: 10, 
            bgcolor: 'rgba(30, 41, 59, 0.95)', 
            backdropFilter: 'blur(10px)',
            display: 'flex', 
            alignItems: 'center', 
            gap: 2.5,
            border: '1px solid rgba(255,255,255,0.1)'
          }}>
            <Tooltip title={isMuted ? "Unmute" : "Mute"}>
              <IconButton 
                onClick={() => setIsMuted(!isMuted)}
                sx={{ 
                  bgcolor: isMuted ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255,255,255,0.05)',
                  color: isMuted ? '#ef4444' : 'white',
                  '&:hover': { bgcolor: isMuted ? 'rgba(239, 68, 68, 0.3)' : 'rgba(255,255,255,0.1)' }
                }}
              >
                {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
              </IconButton>
            </Tooltip>

            <Tooltip title={isVideoOff ? "Start Video" : "Stop Video"}>
              <IconButton 
                onClick={() => setIsVideoOff(!isVideoOff)}
                sx={{ 
                  bgcolor: isVideoOff ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255,255,255,0.05)',
                  color: isVideoOff ? '#ef4444' : 'white',
                  '&:hover': { bgcolor: isVideoOff ? 'rgba(239, 68, 68, 0.3)' : 'rgba(255,255,255,0.1)' }
                }}
              >
                {isVideoOff ? <VideoOff size={22} /> : <Video size={22} />}
              </IconButton>
            </Tooltip>

            <Divider orientation="vertical" flexItem sx={{ bgcolor: 'rgba(255,255,255,0.1)', my: 1 }} />

            <Button 
              variant="contained" 
              color="error" 
              startIcon={<PhoneOff size={18} />}
              sx={{ 
                borderRadius: 4, 
                px: 3, 
                fontWeight: 800,
                bgcolor: '#ef4444',
                '&:hover': { bgcolor: '#dc2626' }
              }}
            >
              End Session
            </Button>
          </Paper>
        </Box>
      </Box>

      {/* Sidebar */}
      <Box sx={{ 
        width: 380, 
        bgcolor: '#1e293b', 
        borderLeft: '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 3, overflow: 'hidden' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
            <Sparkles size={20} color="#60a5fa" />
            <Typography variant="subtitle1" fontWeight={800}>AI Interview Panel</Typography>
          </Box>
          
          <Box sx={{ flex: 1, overflow: 'hidden' }}>
            <QuestionPanel 
              questions={questions} 
              onStatusChange={onQuestionStatusUpdate}
            />
          </Box>
        </Box>

        <Divider sx={{ bgcolor: 'rgba(255,255,255,0.1)' }} />

        {/* Live Transcript Panel */}
        <Box sx={{ height: '60%', display: 'flex', flexDirection: 'column', p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
            <MessageSquare size={20} color="#60a5fa" />
            <Typography variant="subtitle1" fontWeight={800}>Live Transcript</Typography>
            <Chip 
              label="Real-time" 
              size="small" 
              sx={{ height: 16, fontSize: '9px', fontWeight: 800, bgcolor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.2)' }} 
            />
          </Box>
          
          <Box sx={{ 
            flex: 1, 
            overflowY: 'auto', 
            bgcolor: 'rgba(15, 23, 42, 0.4)', 
            borderRadius: 4,
            p: 2,
            display: 'flex',
            flexDirection: 'column',
            gap: 2
          }}>
            {transcript.map((msg, i) => (
              <Box key={i}>
                <Typography 
                  variant="caption" 
                  fontWeight={800} 
                  sx={{ 
                    color: msg.speaker === 'Interviewer' ? '#60a5fa' : '#a78bfa',
                    textTransform: 'uppercase',
                    fontSize: '0.65rem',
                    letterSpacing: '0.05em'
                  }}
                >
                  {msg.speaker}
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)', lineHeight: 1.6, mt: 0.5 }}>
                  {msg.text}
                </Typography>
              </Box>
            ))}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
               <Box sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: '#60a5fa', animation: 'pulse 1s infinite' }} />
               <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }}>Candidate is typing...</Typography>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};
