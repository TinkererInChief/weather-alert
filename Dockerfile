#############################################
# Use Debian-based image to avoid musl/SSL issues
#############################################
FROM node:18-bookworm-slim AS base
ENV PNPM_HOME=/usr/local/pnpm \
    PATH=/usr/local/pnpm:$PATH \
    NODE_ENV=production
RUN corepack enable && apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates openssl libssl3 \
  && rm -rf /var/lib/apt/lists/*

FROM base AS deps
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json pnpm-lock.yaml* ./
RUN pnpm i --frozen-lockfile --ignore-scripts

FROM base AS builder
ENV SKIP_SECRETS_VALIDATION=true
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN pnpm run db:generate

# Build the application
ENV SKIP_MONITORING=1 NEXT_TELEMETRY_DISABLED=1
RUN pnpm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/prisma ./prisma
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/scripts ./scripts
COPY --from=builder --chown=node:node /app/lib ./lib
COPY --from=builder --chown=node:node /app/tsconfig.json ./tsconfig.json

USER node

EXPOSE 3000

ENV HOSTNAME 0.0.0.0

CMD ["node", "server.js"]
