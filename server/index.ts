import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { createApp } from './app.js';

const port = Number(process.env.PORT ?? 8787);
const currentDir = path.dirname(fileURLToPath(import.meta.url));

const distCandidates = [
  path.resolve(currentDir, '../dist'),
  path.resolve(currentDir, '../../dist')
];

const distDir =
  distCandidates.find((candidate) =>
    existsSync(path.join(candidate, 'index.html'))
  ) ?? distCandidates[0];

const app = createApp();

app.use(express.static(distDir));

app.use((request, response, next) => {
  if (request.method !== 'GET' || request.path.startsWith('/api')) {
    next();
    return;
  }

  response.sendFile(path.join(distDir, 'index.html'));
});

app.listen(port, () => {
  console.log(`Multibuscador disponible en http://localhost:${port}`);
});
