import path from 'node:path'
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, normalizePath, type Plugin } from 'vite'
import { parseClientEnv } from './src/config/env.schema.ts'

const clientRoot = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(clientRoot, '..')
const serverRoot = normalizePath(path.resolve(repoRoot, 'server'))

/**
 * The client may import the server's *types* (`import type { AppType } from '@server/app'`),
 * which are erased before module resolution. A value import would drag server code, and
 * possibly secrets, into the browser bundle. This plugin turns that into a build error.
 *
 * Note: with `verbatimModuleSyntax`, `import { type X } from '@server/...'` still leaves an
 * empty side-effect import behind, so use `import type { X }` for server types.
 */
function forbidServerCode(): Plugin {
  const message = (what: string, importer?: string) =>
    `[forbid-server-code] ${what} is server code and cannot be bundled into the client` +
    `${importer ? ` (imported from ${importer})` : ''}. Use \`import type\` for server types.`

  return {
    name: 'forbid-server-code',
    enforce: 'pre',
    resolveId(source, importer) {
      if (source === '@server' || source.startsWith('@server/')) {
        this.error(message(source, importer))
      }
      return null
    },
    load(id) {
      const file = normalizePath(id.split('?')[0] ?? id)
      if (file === serverRoot || file.startsWith(`${serverRoot}/`)) {
        this.error(message(path.relative(repoRoot, file)))
      }
      return null
    },
  }
}

export default defineConfig(({ mode }) => {
  // .env lives at the repository root, shared with the server. Process env (Docker build
  // args, CI) takes precedence over the file.
  const fileEnv = loadEnv(mode, repoRoot, 'VITE_')
  // The dev server listens on the port in CLIENT_URL, the origin the API's CORS allows.
  const clientUrl = process.env.CLIENT_URL ?? loadEnv(mode, repoRoot, 'CLIENT_').CLIENT_URL
  const devPort = Number(clientUrl ? new URL(clientUrl).port : '') || 5173
  try {
    parseClientEnv({ ...fileEnv, ...process.env })
  } catch (error) {
    throw new Error(`${(error as Error).message} Set it in the root .env or the environment.`)
  }

  return {
    root: clientRoot,
    envDir: repoRoot,
    plugins: [
      forbidServerCode(),
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
              {
                name: 'auth',
                test: /\/node_modules\/(better-auth|@better-auth|better-call|nanostores)\//,
                priority: 2,
              },
              { name: 'core', test: /\/node_modules\/(zod|i18next|react-i18next)\//, priority: 1 },
            ],
          },
        },
      },
    },
  }
})
