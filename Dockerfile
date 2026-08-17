# syntax=docker/dockerfile:1

###############################################################################
# VOICE — multi-stage production image
#
# Three stages so that the layer which changes most often (application source)
# sits above the layer that changes least (node_modules): editing a component
# does not re-run `npm ci`. The final stage copies only Next.js's standalone
# output, so neither the dev dependencies nor the build cache ship in the image.
###############################################################################

ARG NODE_VERSION=24-alpine

# --- Stage 1: dependencies ---------------------------------------------------
FROM node:${NODE_VERSION} AS deps
WORKDIR /app

# Only the manifests, so this layer is cached until a dependency actually changes.
COPY package.json package-lock.json ./
RUN npm ci


# --- Stage 2: build ----------------------------------------------------------
FROM node:${NODE_VERSION} AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build-time API keys are optional. Next.js reads them at *runtime* here (they
# are only ever touched inside route handlers and server components), so the
# image contains no baked-in secrets and one image runs in any environment.
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build


# --- Stage 3: runtime --------------------------------------------------------
FROM node:${NODE_VERSION} AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# Run as an unprivileged user rather than root.
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

# `output: "standalone"` (see next.config.ts) emits a minimal server bundle with
# only the modules actually reached at runtime — no node_modules copy needed.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/sources').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
