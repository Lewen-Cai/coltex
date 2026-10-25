# syntax=docker/dockerfile:1

FROM node:24-trixie-slim AS base
RUN npm install -g pnpm@11.26.0
WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.base.json ./
COPY patches patches
COPY packages/shared/package.json packages/shared/
COPY packages/review/package.json packages/review/
COPY packages/convert/package.json packages/convert/
COPY apps/server/package.json apps/server/
COPY apps/web/package.json apps/web/
COPY packages/latex-language/package.json packages/latex-language/

# ---- Spell-check dictionaries ----
# Same pinned file and checksum as apps/web/scripts/dictionaries.ts (keep them in
# step). tar streams, so this stays small in memory, unlike installing ~270 MB through pnpm.
FROM base AS dictionaries
ADD --checksum=sha256:c8da867b784c9d7a0e47962b43df1f817e95be055ea85bf4e3f85176c779cd15 \
    https://github.com/overleaf/dictionaries/archive/refs/tags/v0.0.3.tar.gz /tmp/dictionaries.tar.gz
RUN mkdir -p /dictionaries \
    && tar -xzf /tmp/dictionaries.tar.gz -C /dictionaries --strip-components=2 dictionaries-0.0.3/dictionaries \
    && echo 0.0.3 > /dictionaries/.version

# ---- Build the web app ----
FROM base AS web
RUN pnpm install --frozen-lockfile --filter @coltex/web...
COPY packages/shared packages/shared
COPY packages/review packages/review
COPY packages/latex-language packages/latex-language
COPY apps/web apps/web
COPY --from=dictionaries /dictionaries apps/web/vendor/dictionaries
RUN pnpm --filter @coltex/web build

# ---- Server runtime (TypeScript runs directly via Node type stripping) ----
FROM base AS runtime
# git stores project snapshots (taken before AI changes are applied).
# pg_dump/psql (backups, restore) must be at least the server's version, 18;
# Debian ships 17, so they come from the PostgreSQL project's repository.
ADD --checksum=sha256:0144068502a1eddd2a0280ede10ef607d1ec592ce819940991203941564e8e76 \
    https://www.postgresql.org/media/keys/ACCC4CF8.asc /usr/share/keyrings/pgdg.asc
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates git \
    && chmod 644 /usr/share/keyrings/pgdg.asc \
    && echo "deb [signed-by=/usr/share/keyrings/pgdg.asc] https://apt.postgresql.org/pub/repos/apt trixie-pgdg main" > /etc/apt/sources.list.d/pgdg.list \
    && apt-get update && apt-get install -y --no-install-recommends postgresql-client-18 \
    && rm -rf /var/lib/apt/lists/*
# The package managers are only needed for the install: the server runs with node alone, and
# so does `coltex cli`. They bundle packages of their own that vulnerability scans report.
RUN pnpm install --frozen-lockfile --prod --filter @coltex/server... \
    && rm -rf /usr/local/lib/node_modules /opt/yarn-* \
    && cd /usr/local/bin && rm -f npm npx pnpm pnpx pn pnx corepack yarn yarnpkg
COPY packages/shared packages/shared
COPY packages/review packages/review
COPY packages/convert packages/convert
COPY apps/server apps/server
# ip2region's databases, for the place next to a sign-in's address. Same pinned commit and
# checksums as apps/server/scripts/ip2region.ts (keep them in step). The folder first: one
# made by ADD would get the files' mode, and nobody could open it.
RUN mkdir -p /app/apps/server/vendor/ip2region
ADD --chmod=644 --checksum=sha256:27ecba8c9a6d5e3b280aedbe7ee15c65372b179fbd0dad3845d8c608f2fcace1 \
    https://raw.githubusercontent.com/lionsoul2014/ip2region/1bf6cabfb63c1a14af0971749c2120a3e5c77d72/data/ip2region_v4.xdb /app/apps/server/vendor/ip2region/
ADD --chmod=644 --checksum=sha256:939f6b46bd2b8bec3cf7c5ceb8ba782266ae9b1f35b5ba7916700dec0b7506ed \
    https://raw.githubusercontent.com/lionsoul2014/ip2region/1bf6cabfb63c1a14af0971749c2120a3e5c77d72/data/ip2region_v6.xdb /app/apps/server/vendor/ip2region/
COPY --from=web /app/apps/web/dist /app/apps/web/dist
# The built-in Tailscale (Settings → Network): tailscaled only, run by the server when turned on.
COPY --from=tailscale/tailscale:v1.104.2 /usr/local/bin/tailscaled /usr/local/bin/tailscaled
# The built-in Cloudflare Tunnel (a tunnel only; ColTex's accounts sign people in).
COPY --from=cloudflare/cloudflared:2026.10.3 /usr/local/bin/cloudflared /usr/local/bin/cloudflared
RUN mkdir -p /data && chown node:node /data
USER node
WORKDIR /app/apps/server
ENV NODE_ENV=production DATA_DIR=/data WEB_DIST=/app/apps/web/dist PORT=3690
EXPOSE 3690
CMD ["node", "src/index.ts"]
