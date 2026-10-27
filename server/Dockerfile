# Build context: the repository root (docker build -f server/Dockerfile .)

# Stage 1: install every workspace's dependencies from the lockfile
FROM oven/bun:1.4-alpine AS deps
WORKDIR /app
COPY package.json bun.lock bunfig.toml ./
COPY server/package.json ./server/
COPY client/package.json ./client/
RUN bun install --frozen-lockfile

# Stage 2: bundle the server and the migrator into server/dist
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
COPY --from=build --chown=bun:bun /app/server/dist ./dist
COPY --from=build --chown=bun:bun /app/server/templates ./templates
COPY --from=build --chown=bun:bun /app/server/db/migrations ./db/migrations
COPY --chown=bun:bun server/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh
USER bun
EXPOSE 8000
ENTRYPOINT ["./entrypoint.sh"]
