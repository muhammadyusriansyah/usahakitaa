import fs from 'fs';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    appType: 'mpa',
    build: {
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html'),
          masuk: path.resolve(__dirname, 'masuk.html'),
          daftar: path.resolve(__dirname, 'daftar.html'),
          app: path.resolve(__dirname, 'app/index.html'),
          admin: path.resolve(__dirname, 'admin/index.html'),
          toko: path.resolve(__dirname, 'toko/index.html'),
        },
      },
    },
    plugins: [
      {
        name: 'copy-static-vanilla-assets',
        apply: 'build',
        closeBundle(error?: Error): void {
          if (error) return;
          const distDir = path.resolve(__dirname, 'dist');
          if (!fs.existsSync(distDir)) return;
          const dirsToCopy = ['assets', 'app/js', 'admin/js', 'docs'];
          for (const rel of dirsToCopy) {
            const src = path.resolve(__dirname, rel);
            const dest = path.resolve(distDir, rel);
            if (fs.existsSync(src)) {
              fs.cpSync(src, dest, {recursive: true, force: true});
            }
          }
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
