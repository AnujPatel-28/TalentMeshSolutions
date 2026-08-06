'use client';

import React from 'react';

type SafeBlogContentProps = {
  content: string;
  className?: string;
};

function renderLine(line: string, index: number) {
  const trimmed = line.trim();

  if (!trimmed) {
    return <div key={`spacer-${index}`} style={{ height: '1rem' }} />;
  }

  if (trimmed.startsWith('### ')) {
    return <h3 key={index} style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: '2rem 0 1rem' }}>{trimmed.slice(4)}</h3>;
  }

  if (trimmed.startsWith('## ')) {
    return <h2 key={index} style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a', margin: '2.5rem 0 1rem' }}>{trimmed.slice(3)}</h2>;
  }

  if (trimmed.startsWith('# ')) {
    return <h1 key={index} style={{ fontSize: '2.1rem', fontWeight: 800, color: '#0f172a', margin: '2.5rem 0 1rem' }}>{trimmed.slice(2)}</h1>;
  }

  if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
    return <li key={index} style={{ marginBottom: '0.65rem' }}>{trimmed.slice(2)}</li>;
  }

  if (/^\d+\.\s/.test(trimmed)) {
    return <li key={index} style={{ marginBottom: '0.65rem' }}>{trimmed.replace(/^\d+\.\s/, '')}</li>;
  }

  return <p key={index} style={{ margin: '0 0 1.2rem', lineHeight: 1.9 }}>{trimmed}</p>;
}

export function SafeBlogContent({ content, className }: SafeBlogContentProps) {
  const lines = content.split('\n');
  const blocks: React.ReactNode[] = [];
  let pendingList: React.ReactNode[] = [];

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    const isListItem = trimmed.startsWith('- ') || trimmed.startsWith('* ') || /^\d+\.\s/.test(trimmed);

    if (isListItem) {
      pendingList.push(renderLine(line, index));
      return;
    }

    if (pendingList.length > 0) {
      blocks.push(
        <ul key={`list-${index}`} style={{ margin: '0 0 1.5rem 1.4rem', color: '#334155', lineHeight: 1.8 }}>
          {pendingList}
        </ul>,
      );
      pendingList = [];
    }

    blocks.push(renderLine(line, index));
  });

  if (pendingList.length > 0) {
    blocks.push(
      <ul key="list-tail" style={{ margin: '0 0 1.5rem 1.4rem', color: '#334155', lineHeight: 1.8 }}>
        {pendingList}
      </ul>,
    );
  }

  return <div className={className}>{blocks}</div>;
}
