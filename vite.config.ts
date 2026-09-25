/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/la-bonne-passe/',
  plugins: [react()],
  test: {
    // `npm run rapport` joue les parties simulées de l'équilibrage (fichiers *.rapport.ts), sans rien vérifier.
    include: process.env.RAPPORT ? ['src/**/*.rapport.ts'] : ['src/**/*.test.ts'],
    environment: 'node',
  },
});
