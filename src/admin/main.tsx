import React from 'react';
import { createRoot } from 'react-dom/client';
import '../index.css';
import { AdminApp, AdminErrorBoundary } from './AdminApp';

const rootEl = document.getElementById('admin-root');
if (rootEl) {
  createRoot(rootEl).render(
    <React.StrictMode>
      <AdminErrorBoundary>
        <AdminApp />
      </AdminErrorBoundary>
    </React.StrictMode>
  );
}
