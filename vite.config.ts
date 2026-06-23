import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'serve-download-folder',
      configureServer(server) {
        server.middlewares.use('/download', (req, res, next) => {
          const filePath = path.resolve(__dirname, 'download', path.basename(req.url || ''));
          if (fs.existsSync(filePath)) {
            res.setHeader('Content-Disposition', `attachment; filename="${path.basename(filePath)}"`);
            res.setHeader('Content-Type', 'application/octet-stream');
            fs.createReadStream(filePath).pipe(res);
          } else {
            next();
          }
        });
      },
    },
  ],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    copyPublicDir: true,
    rollupOptions: {
      plugins: [
        {
          name: 'copy-download-folder',
          generateBundle() {
            const downloadDir = path.resolve(__dirname, 'download');
            const outDir = path.resolve(__dirname, 'dist/download');
            if (fs.existsSync(downloadDir)) {
              if (!fs.existsSync(outDir)) {
                fs.mkdirSync(outDir, { recursive: true });
              }
              const files = fs.readdirSync(downloadDir);
              for (const file of files) {
                fs.copyFileSync(path.join(downloadDir, file), path.join(outDir, file));
              }
            }
          },
        },
      ],
    },
  },
});
