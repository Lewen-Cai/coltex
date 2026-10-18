# syntax=docker/dockerfile:1

# Two editions (COLTEX_EDITION, see docker-compose.yml):
#   standard (default): the full TeX Live scheme without package manuals and
#     sources (about 9 GB); compiles the same as full.
#   full: also the manuals and sources (about 20 GB), which the AI assistant
#     can read (texlive_doc), and the extra Noto CJK weights.
# BuildKit only fetches the TeX Live image of the edition being built.
ARG EDITION=standard

# ---- Install the worker's Node dependencies ----
FROM node:24-trixie-slim AS deps
RUN npm install -g pnpm@11.26.0
WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.base.json ./
COPY patches patches
COPY packages/shared/package.json packages/shared/
COPY packages/log-parser/package.json packages/log-parser/
COPY services/compiler/package.json services/compiler/
RUN pnpm install --frozen-lockfile --prod --filter @coltex/compiler...
COPY packages/shared packages/shared
COPY packages/log-parser packages/log-parser
COPY services/compiler services/compiler

# ---- TeX Live (per edition) + fonts + Node runtime ----
FROM texlive/texlive:latest AS tex-standard
FROM texlive/texlive:latest-full-doc-src AS tex-full
FROM tex-${EDITION}
ARG EDITION
# ghostscript for EPS and PostScript; poppler's pdftotext reads PDF manuals (full).
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      fonts-noto-cjk fonts-noto-core fonts-liberation2 ghostscript poppler-utils \
      $([ "$EDITION" = full ] && echo fonts-noto-cjk-extra) \
 && rm -rf /var/lib/apt/lists/* \
 && fc-cache -f
COPY --from=deps /usr/local/bin/node /usr/local/bin/node
COPY --from=deps /app /app

# The base image already ships an unprivileged `texlive` user (uid 1000).
RUN mkdir -p /work /data && chown texlive:texlive /work /data
USER texlive
WORKDIR /app/services/compiler
# biber is a PAR-packed binary that unpacks itself before running; /tmp is
# mounted noexec in compose, so let it unpack into the work volume instead.
ENV DATA_DIR=/data WORK_DIR=/work NODE_ENV=production PAR_GLOBAL_TMPDIR=/work COLTEX_EDITION=${EDITION}
CMD ["node", "src/worker.ts"]
