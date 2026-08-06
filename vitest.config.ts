import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    // This is now a marketing site with no backend/business logic left to unit test.
    // No tests exist yet — pass rather than fail CI until some are added.
    passWithNoTests: true,
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.{idea,git,cache,output,temp}/**',
      'e2e/**',
      // Sibling git worktrees carry their own test + Playwright e2e trees; running them
      // here just inflates the failure count with specs vitest can never execute.
      '**/.claude/worktrees/**',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        '.next/',
        'out/',
        'public/',
        '**/*.config.{js,ts,mjs}',
        '**/*.d.ts',
        '__tests__/**',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      'server-only': path.resolve(__dirname, './vitest.stubs/server-only.ts'),
    },
  },
});
