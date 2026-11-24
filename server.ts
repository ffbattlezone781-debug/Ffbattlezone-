import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, 'dist');
const port = Number(process.env.PORT) || 3000;

async function startServer() {
  const app = express();
  app.disable('x-powered-by');

  app.get('/api/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  const hasDist = fs.existsSync(path.join(distDir, 'index.html'));

  if (hasDist) {
    app.get(['/admin', '/admin/'], (_req, res) => {
      res.sendFile(path.join(distDir, 'admin.html'));
    });

    app.use(
      express.static(distDir, {
        index: 'index.html',
        extensions: ['html'],
      })
    );

    app.use((req, res, next) => {
      if (req.method !== 'GET' || req.path.startsWith('/api/')) {
        return next();
      }
      if (path.extname(req.path)) {
        return res.status(404).end();
      }
      if (req.path === '/admin' || req.path.startsWith('/admin/')) {
        return res.sendFile(path.join(distDir, 'admin.html'));
      }
      return res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        allowedHosts: true,
      },
      appType: 'mpa',
    });
    app.use(vite.middlewares);
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`FF Battle Zone server listening on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
