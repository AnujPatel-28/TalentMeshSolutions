'use client';

import React, { useState, useRef, useEffect } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { Box, Typography, TextField, List, ListItemButton, ListItemText, CircularProgress, Paper, InputAdornment, Chip } from '@mui/material';
import { Search, ChevronDown, Check, Sparkles } from 'lucide-react';

export interface SuggestionItem {
  label: string;
  source: 'exact' | 'ai';
  description?: string;
}

interface ComboboxProps {
  query: string;
  onQueryChange: (query: string) => void;
  suggestions: SuggestionItem[];
  isLoading?: boolean;
  onSelect: (item: SuggestionItem) => void;
  placeholder?: string;
}

export function Combobox({
  query,
  onQueryChange,
  suggestions,
  isLoading,
  onSelect,
  placeholder = 'Search...',
}: ComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSelectedIndex(-1);
  }, [suggestions, isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      setIsOpen(true);
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : prev));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          onSelect(suggestions[selectedIndex]);
          setIsOpen(false);
        } else if (query.trim()) {
           // Allow free-form entry if no selection
           onSelect({ label: query.trim(), source: 'exact' });
           setIsOpen(false);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  };

  return (
    <Popover.Root open={isOpen} onOpenChange={setIsOpen}>
      <Popover.Trigger asChild>
        <Box sx={{ position: 'relative', width: '100%' }}>
          <TextField
            fullWidth
            size="small"
            placeholder={placeholder}
            value={query}
            onChange={(e) => {
              onQueryChange(e.target.value);
              if (!isOpen) setIsOpen(true);
            }}
            onKeyDown={handleKeyDown}
            inputRef={inputRef}
            autoComplete="off"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={16} color="#94a3b8" />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  {isLoading ? (
                    <CircularProgress size={16} />
                  ) : (
                    <ChevronDown size={16} color="#94a3b8" />
                  )}
                </InputAdornment>
              ),
              sx: { borderRadius: 3, bgcolor: 'background.paper', px: 1 }
            }}
          />
        </Box>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={5}
          onOpenAutoFocus={(e) => e.preventDefault()}
          style={{
            zIndex: 1400,
            width: inputRef.current?.offsetWidth || 300,
          }}
        >
          <Paper 
            elevation={8} 
            sx={{ 
                maxHeight: 280, 
                overflowY: 'auto', 
                borderRadius: 4, 
                border: '1px solid',
                borderColor: 'divider',
                overflowX: 'hidden'
            }}
          >
            {suggestions.length === 0 && !isLoading ? (
              <Box sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  No suggestions found. Press Enter to use "{query}"
                </Typography>
              </Box>
            ) : (
              <List disablePadding>
                {suggestions.map((item, index) => (
                  <ListItemButton
                    key={`${item.label}-${index}`}
                    onClick={() => {
                        onSelect(item);
                        setIsOpen(false);
                    }}
                    selected={selectedIndex === index}
                    sx={{
                      py: 1,
                      px: 2,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      '&.Mui-selected': {
                        bgcolor: 'blue.50',
                        '&:hover': { bgcolor: 'blue.100' }
                      },
                      '&:hover': { bgcolor: 'grey.50' }
                    }}
                  >
                    <ListItemText 
                      primary={item.label} 
                      primaryTypographyProps={{ 
                        variant: 'body2', 
                        fontWeight: 600,
                        color: 'text.primary'
                      }}
                    />
                    
                    {item.source === 'ai' && (
                      <Chip 
                        icon={<Sparkles size={10} />} 
                        label="AI" 
                        size="small" 
                        sx={{ 
                          height: 18, 
                          fontSize: '9px', 
                          fontWeight: 800,
                          bgcolor: 'indigo.50',
                          color: 'indigo.600',
                          border: '1px solid',
                          borderColor: 'indigo.100',
                          '& .MuiChip-icon': { color: 'inherit', ml: 0.5 }
                        }} 
                      />
                    )}
                    
                    {selectedIndex === index && <Check size={14} color="#2563eb" />}
                  </ListItemButton>
                ))}
              </List>
            )}
          </Paper>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
