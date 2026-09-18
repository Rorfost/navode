import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { NavodeShell } from '@navode/ui';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <NavodeShell onCommand={(command) => console.info('Navode command submitted:', command)} />
  </StrictMode>,
);
