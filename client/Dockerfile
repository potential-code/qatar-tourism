# Vite SPA served by nginx. Build context is the repository root:
#   docker build -f client/Dockerfile --build-arg VITE_API_URL=https://api.example.com .

FROM oven/bun:1.4-alpine AS build
WORKDIR /app
COPY package.json bun.lock bunfig.toml ./
COPY server/package.json ./server/
COPY client/package.json ./client/
# Full install: Vite, Tailwind and the TypeScript toolchain are devDependencies.
RUN bun install --frozen-lockfile
COPY tsconfig.json ./
COPY client ./client
COPY shared ./shared
# No server sources: `import type { AppType }` is erased before bundling, and the
# forbid-server-code plugin fails the build if anything tries to bundle server code.
# Baked into the bundle at build time; the build fails if it is missing or not a URL.
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
WORKDIR /app/client
RUN bunx --bun vite build

FROM nginx:stable-alpine AS runner
COPY --from=build /app/client/dist /usr/share/nginx/html
COPY client/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 5000
CMD ["nginx", "-g", "daemon off;"]
