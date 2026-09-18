import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { findCommand, type Command } from '@navode/core';
import { NavodeShell } from '@navode/ui';
import './styles.css';

const starterCommands: Command[] = [
  { id: 'google', label: 'google', kind: 'search', template: 'https://www.google.com/search?q={query}', aliases: ['g'] },
  { id: 'youtube', label: 'youtube', kind: 'search', template: 'https://www.youtube.com/results?search_query={query}', aliases: ['yt'] },
];

function runCommand(input: string) {
  const command = findCommand(starterCommands, input);
  if (!command) return;
  const [, ...argument] = input.trim().split(/\s+/);
  const url = command.template.replace('{query}', encodeURIComponent(argument.join(' ')));
  window.open(url, '_blank', 'noopener,noreferrer');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <NavodeShell onCommand={runCommand} />
  </StrictMode>,
);
