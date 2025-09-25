#############################################
# Use Debian-based image to avoid musl/SSL issues
#############################################
FROM node:18-bookworm-slim AS base

FROM base AS deps
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl libssl3 ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json pnpm-lock.yaml* ./
RUN corepack enable pnpm && pnpm i --frozen-lockfile

FROM base AS builder
WORKDIR /app
# Ensure OpenSSL is available during prisma generate and Next build
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl libssl3 ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN corepack enable pnpm && pnpm run db:generate

# Build the application
RUN pnpm run build

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Install OpenSSL libraries required by Prisma
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl libssl3 ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Install Prisma CLI globally to run migrations at startup
ENV PNPM_HOME=/usr/local/pnpm-global
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable pnpm \
  && pnpm config set global-dir $PNPM_HOME \
  && pnpm add -g prisma@5.22.0 \
  && chown -R node:node $PNPM_HOME

# Copy the built application
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/prisma ./prisma
COPY --from=builder --chown=node:node /app/node_modules/@prisma ./node_modules/@prisma
# Copy all dependencies that Twilio needs at runtime
COPY --from=builder --chown=node:node /app/node_modules/.pnpm ./node_modules/.pnpm
COPY --from=builder --chown=node:node /app/node_modules/twilio ./node_modules/twilio
COPY --from=builder --chown=node:node /app/node_modules/axios ./node_modules/axios

USER node

EXPOSE 3000

ENV HOSTNAME 0.0.0.0

# Create a startup script
COPY --chown=node:node <<EOF /app/start.sh
#!/bin/sh
set -e

echo "Starting Emergency Alert System..."
echo "Node.js version: \$(node --version)"
echo "Environment: \$NODE_ENV"
echo "Port: \$PORT"

# Prisma client already generated during build
echo "Prisma client ready..."

# Start the application first
echo "Starting application (server)..."
(
  if command -v prisma >/dev/null 2>&1; then
    echo "Running Prisma migrations in background..."
    if [ -d "/app/prisma/migrations" ] && [ "$(ls -A /app/prisma/migrations)" ]; then
      if ! prisma migrate deploy; then
        echo "prisma migrate deploy failed (likely baseline required); running prisma db push --skip-generate --accept-data-loss"
        prisma db push --skip-generate --accept-data-loss || true
      fi
    else
      echo "No Prisma migrations found; running prisma db push --skip-generate --accept-data-loss"
      prisma db push --skip-generate --accept-data-loss || true
    fi
    echo "Prisma migrations finished (or skipped)."
  else
    echo "Prisma CLI not found in PATH; skipping automatic migrations"
  fi
) &

exec node server.js
EOF

RUN chmod +x /app/start.sh

CMD ["/app/start.sh"]
