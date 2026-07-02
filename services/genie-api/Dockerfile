FROM node:24-slim AS base
RUN apt-get update && apt-get install -y python3 make g++ libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev && rm -rf /var/lib/apt/lists/*
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS builder
WORKDIR /app
COPY . .
# Install all dependencies to ensure workspaces are linked
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

FROM base AS runner
WORKDIR /app
# We run directly from the source using tsx since there's no build step for the API yet
# In a real production environment, we might compile it to JS first.
COPY --from=builder /app /app

EXPOSE 3000
# Ensure we run from the correct directory
WORKDIR /app/services/genie-api

# Run as non-root user for security
RUN chown -R node:node /app
USER node

CMD ["pnpm", "tsx", "index.ts"]
