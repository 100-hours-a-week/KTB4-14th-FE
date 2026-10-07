import * as Sentry from '@sentry/react';
import './sentry';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/pages.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Sentry.ErrorBoundary fallback={<div>일시적인 오류가 발생했습니다.</div>}>
      <App />
    </Sentry.ErrorBoundary>
  </StrictMode>,
);
