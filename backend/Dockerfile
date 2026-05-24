# ── Stage 1: instalar dependencias de producción ──────────────────────────
FROM node:22-slim AS deps

RUN corepack enable

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN pnpm install --frozen-lockfile --prod

# ── Stage 2: imagen final mínima ──────────────────────────────────────────
FROM node:22-slim

RUN groupadd -r app && useradd -r -g app app

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY src/            ./src/
COPY scripts/        ./scripts/
COPY package.json    ./

# CREAR carpeta y dar permisos EN EL STAGE FINAL
RUN mkdir -p /app/logs \
    && chown -R app:app /app

USER app

EXPOSE 3002

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3002/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "src/server.js"]