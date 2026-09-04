FROM node:22-slim AS base
WORKDIR /app
RUN corepack enable
# Render's free build tier caps memory at 512Mi; pnpm's default install
# concurrency and V8's default heap sizing can exceed that on this size of
# dependency tree. Capping both keeps the build inside the limit instead of
# getting OOM-killed mid-install.
ENV NODE_OPTIONS=--max-old-space-size=384

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/web/package.json apps/web/package.json
RUN pnpm install --filter web --frozen-lockfile --network-concurrency=4

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/web apps/web
RUN pnpm --filter web build

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /app/apps/web/.next ./apps/web/.next
COPY --from=build /app/apps/web/public ./apps/web/public
COPY --from=build /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=build /app/apps/web/package.json ./apps/web/package.json
COPY --from=build /app/apps/web/next.config.mjs ./apps/web/next.config.mjs

WORKDIR /app/apps/web
EXPOSE 3000
CMD ["pnpm", "exec", "next", "start", "-p", "3000"]
