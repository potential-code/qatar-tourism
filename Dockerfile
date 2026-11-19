# syntax=docker/dockerfile:1

# Qatar Tourism Academy mockup: a Vite/React SPA built once with bun, then served by nginx.
# No backend and no database: the demo data lives in each visitor's browser (IndexedDB).
#
#   docker build -t qatar-tourism .

##############################################################################
# Stage 1: build the static bundle
##############################################################################
FROM oven/bun:1.4-alpine AS builder

WORKDIR /app

# Manifests first so the install layer stays cached until a dependency changes.
COPY package.json bun.lock bunfig.toml ./
COPY client/package.json ./client/
RUN bun install --frozen-lockfile

COPY . .

# Optional: move every "Day +N" in the seed (YYYY-MM-DD). Unset keeps the fixed date.
ARG VITE_DEMO_REFERENCE_DATE=
ENV VITE_DEMO_REFERENCE_DATE=$VITE_DEMO_REFERENCE_DATE

# Typecheck + vite build (see package.json). Output: client/dist.
RUN bun run build

##############################################################################
# Stage 2: serve
##############################################################################
FROM nginx:1.30.7-alpine AS runtime

# htpasswd, for the Basic Auth file rebuilt on each start.
RUN apk add --no-cache apache2-utils

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY docker/security-headers.conf /etc/nginx/security-headers.conf
COPY docker/basic-auth.sh /docker-entrypoint.d/20-basic-auth.sh

# Fail closed: if the entrypoint script never runs, every guarded location answers 503
# instead of serving the site unprotected.
RUN chmod +x /docker-entrypoint.d/20-basic-auth.sh \
    && printf 'return 503;\n' > /etc/nginx/basic-auth.conf

COPY --from=builder /app/client/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -q -O /dev/null http://127.0.0.1/healthz || exit 1
