'use client';

import React, { useState } from 'react';
import { 
  Box, Typography, Paper, Button, Chip, 
  IconButton, Tooltip, Divider, Stack 
} from '@mui/material';
import { 
  CheckCircle2, Flag, SkipForward, 
  ChevronLeft, ChevronRight, Info,
  AlertCircle, Zap
} from 'lucide-react';
import { Question } from '@/lib/api/interview';

interface QuestionPanelProps {
  questions: Question[];
  onStatusChange?: (index: number, status: 'answered' | 'skipped' | 'flagged' | null) => void;
}

export const QuestionPanel: React.FC<QuestionPanelProps> = ({ 
  questions, 
  onStatusChange 
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [statuses, setStatuses] = useState<Record<number, 'answered' | 'skipped' | 'flagged' | null>>({});

  if (!questions || questions.length === 0) {
    return (
      <Box sx={{ p: 4, textAlign: 'center', opacity: 0.6 }}>
        <Typography variant="body2">No questions generated yet.</Typography>
      </Box>
    );
  }

  const currentQuestion = questions[currentIndex];
  const currentStatus = statuses[currentIndex];

  const updateStatus = (status: 'answered' | 'skipped' | 'flagged') => {
    const newStatus = statuses[currentIndex] === status ? null : status;
    const newStatuses = { ...statuses, [currentIndex]: newStatus };
    setStatuses(newStatuses);
    onStatusChange?.(currentIndex, newStatus);
    
    // Auto-advance on answer or skip
    if (newStatus === 'answered' || newStatus === 'skipped') {
      if (currentIndex < questions.length - 1) {
        setTimeout(() => setCurrentIndex(currentIndex + 1), 300);
      }
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return '#10b981';
      case 'medium': return '#f59e0b';
      case 'hard': return '#ef4444';
      default: return '#94a3b8';
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Progress Header */}
      <Stack direction="row" spacing={1} sx={{ mb: 3, px: 0.5 }}>
        {questions.map((_, i) => (
          <Box
            key={i}
            sx={{
              flex: 1,
              height: 4,
              borderRadius: 2,
              bgcolor: i === currentIndex 
                ? '#60a5fa' 
                : statuses[i] === 'answered'
                ? '#10b981'
                : statuses[i] === 'flagged'
                ? '#ef4444'
                : 'rgba(255,255,255,0.1)',
              transition: 'all 0.3s ease'
            }}
          />
        ))}
      </Stack>

      {/* Question Card */}
      <Paper sx={{ 
        p: 3, 
        borderRadius: 4, 
        bgcolor: 'rgba(15, 23, 42, 0.4)', 
        border: '1px solid rgba(255,255,255,0.05)',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Badges */}
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <Chip 
            label={currentQuestion.category.toUpperCase()} 
            size="small" 
            sx={{ 
              fontSize: '10px', 
              fontWeight: 800, 
              bgcolor: 'rgba(96, 165, 250, 0.1)', 
              color: '#60a5fa',
              border: '1px solid rgba(96, 165, 250, 0.2)'
            }} 
          />
          <Chip 
            label={currentQuestion.difficulty.toUpperCase()} 
            size="small" 
            sx={{ 
              fontSize: '10px', 
              fontWeight: 800, 
              bgcolor: `${getDifficultyColor(currentQuestion.difficulty)}1a`, 
              color: getDifficultyColor(currentQuestion.difficulty),
              border: `1px solid ${getDifficultyColor(currentQuestion.difficulty)}33`
            }} 
          />
          {currentStatus && (
            <Chip 
              icon={currentStatus === 'answered' ? <CheckCircle2 size={12} /> : currentStatus === 'flagged' ? <AlertCircle size={12} /> : undefined}
              label={currentStatus.toUpperCase()} 
              size="small" 
              color={currentStatus === 'flagged' ? 'error' : currentStatus === 'answered' ? 'success' : 'default'}
              sx={{ fontSize: '10px', fontWeight: 800 }} 
            />
          )}
        </Box>

        {/* Text */}
        <Typography variant="h6" sx={{ lineWeight: 1.4, mb: 3, color: 'white' }}>
          {currentQuestion.text}
        </Typography>

        <Box sx={{ flex: 1 }} />

        {/* Expected Keywords Tooltip/Hint */}
        <Box sx={{ mt: 'auto', p: 2, borderRadius: 3, bgcolor: 'rgba(30, 41, 59, 0.5)', border: '1px dashed rgba(255,255,255,0.1)' }}>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', gap: 0.5, mb: 1, fontWeight: 700 }}>
             <Zap size={12} /> LISTENING FOR
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {currentQuestion.expectedKeywords.map((kw, i) => (
              <Chip 
                key={i} 
                label={kw} 
                size="small" 
                sx={{ 
                  height: 20, 
                  fontSize: '0.65rem', 
                  bgcolor: 'rgba(255,255,255,0.05)', 
                  color: 'rgba(255,255,255,0.6)',
                  border: '1px solid rgba(255,255,255,0.05)'
                }} 
              />
            ))}
          </Box>
        </Box>
      </Paper>

      {/* Controls */}
      <Box sx={{ display: 'flex', mt: 3, gap: 1.5, alignItems: 'center' }}>
        <IconButton 
          disabled={currentIndex === 0}
          onClick={() => setCurrentIndex(i => i - 1)}
          sx={{ color: 'white', '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' } }}
        >
          <ChevronLeft size={20} />
        </IconButton>

        <Button 
          fullWidth
          variant="outlined"
          color="inherit"
          startIcon={<SkipForward size={18} />}
          onClick={() => updateStatus('skipped')}
          sx={{ borderRadius: 3, color: 'rgba(255,255,255,0.6)', borderColor: 'rgba(255,255,255,0.1)' }}
        >
          Skip
        </Button>

        <Tooltip title="Flag for Review">
          <IconButton 
            onClick={() => updateStatus('flagged')}
            sx={{ 
              bgcolor: statuses[currentIndex] === 'flagged' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255,255,255,0.05)',
              color: statuses[currentIndex] === 'flagged' ? '#ef4444' : 'white',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' }
            }}
          >
            <Flag size={20} />
          </IconButton>
        </Tooltip>

        <Button 
          fullWidth
          variant="contained"
          color="primary"
          startIcon={<CheckCircle2 size={18} />}
          onClick={() => updateStatus('answered')}
          sx={{ borderRadius: 3, fontWeight: 800, bgcolor: '#2563eb', '&:hover': { bgcolor: '#1d4ed8' } }}
        >
          Answered
        </Button>

        <IconButton 
          disabled={currentIndex === questions.length - 1}
          onClick={() => setCurrentIndex(i => i + 1)}
          sx={{ color: 'white', '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' } }}
        >
          <ChevronRight size={20} />
        </IconButton>
      </Box>
    </Box>
  );
};
