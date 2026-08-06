'use client';

import React, { useState } from 'react';
import { Container, Typography, Box, Paper, Divider } from '@mui/material';
import { SkillsInput } from '@/components/forms/SkillsInput';

export default function DebugAIPage() {
  const [skills, setSkills] = useState<string[]>(['React', 'TypeScript']);

  return (
    <Container maxWidth="md" sx={{ py: 8 }}>
      <Paper elevation={0} sx={{ p: 4, borderRadius: 6, border: '1px solid', borderColor: 'divider' }}>
        <Typography variant="h4" fontWeight={900} gutterBottom sx={{ 
          background: 'linear-gradient(45deg, #2563eb, #7c3aed)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          mb: 4
        }}>
          AI Semantic Suggestion Debug
        </Typography>

        <Box sx={{ mb: 6 }}>
          <Typography variant="h6" fontWeight={700} gutterBottom>
            Interactive Skills Input
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Current Skills context: <b>{skills.join(', ')}</b>. 
            AI will suggest complementary skills based on these.
          </Typography>
          
          <SkillsInput 
            selectedSkills={skills} 
            onChange={setSkills} 
            label="Try searching for 'Backend', 'Cloud', or 'Design'"
          />
        </Box>

        <Divider sx={{ my: 4 }} />

        <Box>
          <Typography variant="subtitle1" fontWeight={700} gutterBottom>
            Implementation Details:
          </Typography>
          <ul style={{ fontSize: '14px', color: '#475569', lineHeight: '1.8' }}>
            <li><b>Model:</b> Claude 3.5 Sonnet (InsForge SDK)</li>
            <li><b>Debounce:</b> 400ms (to prevent excessive API calls)</li>
            <li><b>Timeout:</b> 2000ms fallback to local exact matches</li>
            <li><b>Caching:</b> Results cached in local memory Map</li>
          </ul>
        </Box>
      </Paper>
    </Container>
  );
}
