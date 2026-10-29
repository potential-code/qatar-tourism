import path from 'node:path'
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { parseClientEnv } from './src/config/env.schema.ts'

const clientRoot = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(clientRoot, '..')

export default defineConfig(({ mode }) => {
  // .env lives at the repository root. Process env (Docker build args, CI) takes precedence.
  const fileEnv = loadEnv(mode, repoRoot, ['VITE_', 'CLIENT_'])
  // The dev server port: CLIENT_PORT when set, else 5173. A --port flag overrides both.
  const devPort = Number(process.env.CLIENT_PORT ?? fileEnv.CLIENT_PORT) || 5173
  try {
    parseClientEnv({ ...fileEnv, ...process.env })
  } catch (error) {
    throw new Error(`${(error as Error).message} Set it in the root .env or the environment.`)
  }

  return {
    root: clientRoot,
    envDir: repoRoot,
    plugins: [
      // Must run before the React plugin so generated route files are transformed.
      tanstackRouter({
        target: 'react',
        autoCodeSplitting: true,
        routesDirectory: path.resolve(clientRoot, 'src/routes'),
        generatedRouteTree: path.resolve(clientRoot, 'src/routeTree.gen.ts'),
        quoteStyle: 'single',
        semicolons: false,
      }),
      react(),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        '@': path.resolve(clientRoot, 'src'),
        '@shared': path.resolve(repoRoot, 'shared'),
      },
    },
    server: { port: devPort, strictPort: true },
    preview: { port: 5000 },
    build: {
      outDir: path.resolve(clientRoot, 'dist'),
      emptyOutDir: true,
      rolldownOptions: {
        output: {
          // Vendor code changes far less often than app code. Separate chunks keep it cached
          // in the browser across deploys instead of re-downloading one large entry file.
          codeSplitting: {
            groups: [
              { name: 'react', test: /\/node_modules\/(react|react-dom|scheduler)\//, priority: 4 },
              { name: 'tanstack', test: /\/node_modules\/@tanstack\//, priority: 3 },
              { name: 'core', test: /\/node_modules\/(zod|i18next|react-i18next)\//, priority: 1 },
            ],
          },
        },
      },
    },
  }
})
