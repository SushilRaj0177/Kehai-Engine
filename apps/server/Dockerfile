FROM node:22-slim AS base
WORKDIR /app
RUN corepack enable
# See apps/web/Dockerfile for why: Render's free build tier caps memory at
# 512Mi, and pnpm's default install concurrency can exceed that.
ENV NODE_OPTIONS=--max-old-space-size=384

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/server/package.json apps/server/package.json
RUN pnpm install --filter server --frozen-lockfile --network-concurrency=4

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/server/node_modules ./apps/server/node_modules
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/server apps/server
RUN pnpm --filter server prisma:generate
RUN pnpm --filter server build

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/server/node_modules ./apps/server/node_modules
COPY --from=build /app/apps/server/dist ./apps/server/dist
COPY --from=build /app/apps/server/prisma ./apps/server/prisma
COPY --from=build /app/apps/server/package.json ./apps/server/package.json

WORKDIR /app/apps/server
EXPOSE 4000
# Invoke the prisma binary directly, never `pnpm exec` — pnpm validates
# its own workspace state (pnpm-workspace.yaml, root package.json, lockfile)
# before running anything, none of which exist in this runtime image, so
# `pnpm exec` was silently re-running a full `pnpm install` on every boot
# instead of just running the command (see apps/web/Dockerfile for the
# same bug, hit first there).
CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy && node dist/index.js"]
