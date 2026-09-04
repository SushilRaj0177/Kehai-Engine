FROM node:22-slim AS base
WORKDIR /app
RUN corepack enable
# Render's free build tier caps memory at 512Mi; pnpm's default install
# concurrency and V8's default heap sizing can exceed that on this size of
# dependency tree. Capping both keeps the build inside the limit instead of
# getting OOM-killed mid-install.
ENV NODE_OPTIONS=--max-old-space-size=300

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

# next.config.mjs sets output: "standalone" — next build traces every
# module actually imported at runtime and copies just that into
# .next/standalone/node_modules, self-contained (no symlinks reaching
# back into a pnpm store this image doesn't have). Running that directly
# with plain `node`, never `pnpm exec`, is what actually fixes this: pnpm
# was detecting the (previously) incomplete node_modules copy and quietly
# re-running a full `pnpm install` — including all devDependencies — on
# every container boot, which is what was blowing past the 512Mi limit at
# *runtime*, not build time.
FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /app/apps/web/.next/standalone ./
COPY --from=build /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /app/apps/web/public ./apps/web/public

WORKDIR /app/apps/web
EXPOSE 3000
ENV PORT=3000
CMD ["node", "server.js"]
