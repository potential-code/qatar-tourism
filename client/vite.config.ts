import { timingSafeEqual } from 'node:crypto'
import type { IncomingMessage, ServerResponse } from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import { parseClientEnv } from './src/config/env.schema.ts'

const clientRoot = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(clientRoot, '..')

/**
 * HTTP Basic Auth for the dev and preview servers. One realm for every path, so the browser
 * asks once and reuses the credentials across the whole site (every dashboard).
 * Defaults to admin / Potential. Override with BASIC_AUTH_USER / BASIC_AUTH_PASS;
 * BASIC_AUTH=off disables it. The Docker image does the same job in nginx.
 */
function basicAuth(env: Record<string, string | undefined>): Plugin {
  const user = env.BASIC_AUTH_USER || 'admin'
  const pass = env.BASIC_AUTH_PASS || 'Potential'
  const expected = Buffer.from(`Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}`)
  const middleware = (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const given = Buffer.from(req.headers.authorization ?? '')
    if (given.length === expected.length && timingSafeEqual(given, expected)) return next()
    res.statusCode = 401
    res.setHeader('WWW-Authenticate', 'Basic realm="Qatar Tourism Academy mockup", charset="UTF-8"')
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.end('Authentication required')
  }
  return {
    name: 'basic-auth',
    apply: () => env.BASIC_AUTH !== 'off',
    configureServer: (server) => {
      server.middlewares.use(middleware)
    },
    configurePreviewServer: (server) => {
      server.middlewares.use(middleware)
    },
  }
}

export default defineConfig(({ mode }) => {
  // .env lives at the repository root. Process env (Docker build args, CI) takes precedence.
  const fileEnv = loadEnv(mode, repoRoot, ['VITE_', 'CLIENT_', 'BASIC_AUTH'])
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
    // Playwright gives its server a separate dependency cache: two dev servers re-optimising one
    // cache at once can stall the other's first page load past the webServer timeout.
    cacheDir: process.env.VITE_CACHE_DIR || undefined,
    plugins: [
      basicAuth({ ...fileEnv, ...process.env }),
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
