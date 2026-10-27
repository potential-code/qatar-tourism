# Build context: the repository root (docker build -f server/Dockerfile .)

# Stage 1: install every workspace's dependencies from the lockfile
FROM oven/bun:1.4-alpine AS deps
WORKDIR /app
COPY package.json bun.lock bunfig.toml ./
COPY server/package.json ./server/
COPY client/package.json ./client/
RUN bun install --frozen-lockfile

# Stage 2: bundle the server, the migrator and the demo reset into server/dist
FROM oven/bun:1.4-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json bunfig.toml tsconfig.json ./
COPY shared/ ./shared/
COPY server/ ./server/
RUN bun run server/build.ts

# Stage 3: runtime. The bundle is self-contained, so no node_modules here.
FROM oven/bun:1.4-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8000
# Layout matters: dist/*.js resolve ../templates and ../db/migrations at runtime.
# dist/reset.js re-seeds the demo snapshot: `docker compose exec server bun dist/reset.js`.
COPY --from=build --chown=bun:bun /app/server/dist ./dist
COPY --from=build --chown=bun:bun /app/server/templates ./templates
COPY --from=build --chown=bun:bun /app/server/db/migrations ./db/migrations
COPY --chown=bun:bun server/entrypoint.sh ./entrypoint.sh
# Uploads are written at runtime by the non-root user (compose mounts a named volume here).
RUN chmod +x ./entrypoint.sh && mkdir -p ./uploads && chown bun:bun ./uploads
USER bun
EXPOSE 8000
ENTRYPOINT ["./entrypoint.sh"]
