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
FROM tex-${EDITION} AS assembled
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

# ---- The image in layers of about a gigabyte ----
# TeX Live arrives as a single layer of 2.4 GB (standard) or 7 GB (full).
# Copied in parts, each is uploaded and downloaded on its own: Alibaba
# Cloud's registry cut the 7 GB layer off every time, and a download that
# breaks only has to fetch the part it was on again. The manuals' latex
# folder is split by package name; a part the standard edition doesn't have
# is an empty layer. The files, owners and modes are the same as in
# `assembled`.
FROM scratch
ARG EDITION
COPY --from=assembled --exclude=usr/local/texlive / /
COPY --from=assembled --parents /usr/local/texlive/*/texmf-dist/fonts/type1 /usr/local/texlive/*/texmf-dist/fonts/afm /
COPY --from=assembled --parents /usr/local/texlive/*/texmf-dist/fonts/tfm /usr/local/texlive/*/texmf-dist/fonts/vf /
COPY --from=assembled --parents /usr/local/texlive/*/texmf-dist/fonts/opentype /usr/local/texlive/*/texmf-dist/fonts/truetype /
COPY --from=assembled --parents /usr/local/texlive/*/texmf-dist/doc/latex/[0-9a-e]* /
COPY --from=assembled --parents /usr/local/texlive/*/texmf-dist/doc/latex/[f-o]* /
COPY --from=assembled --parents /usr/local/texlive/*/texmf-dist/doc/latex/[p-z]* /
COPY --from=assembled --parents /usr/local/texlive/*/texmf-dist/doc/generic /usr/local/texlive/*/texmf-dist/doc/fonts /
COPY --from=assembled --parents /usr/local/texlive/*/texmf-dist/doc/context /usr/local/texlive/*/texmf-dist/doc/metapost /usr/local/texlive/*/texmf-dist/doc/lualatex /usr/local/texlive/*/texmf-dist/doc/latex-dev /usr/local/texlive/*/texmf-dist/doc/support /
COPY --from=assembled --parents /usr/local/texlive/*/texmf-dist/source /
# Everything else of TeX Live (programs, the macros, the remaining manuals).
COPY --from=assembled \
     --exclude=*/texmf-dist/fonts/type1 \
     --exclude=*/texmf-dist/fonts/afm \
     --exclude=*/texmf-dist/fonts/tfm \
     --exclude=*/texmf-dist/fonts/vf \
     --exclude=*/texmf-dist/fonts/opentype \
     --exclude=*/texmf-dist/fonts/truetype \
     --exclude=*/texmf-dist/doc/latex/[0-9a-e]* \
     --exclude=*/texmf-dist/doc/latex/[f-o]* \
     --exclude=*/texmf-dist/doc/latex/[p-z]* \
     --exclude=*/texmf-dist/doc/generic \
     --exclude=*/texmf-dist/doc/fonts \
     --exclude=*/texmf-dist/doc/context \
     --exclude=*/texmf-dist/doc/metapost \
     --exclude=*/texmf-dist/doc/lualatex \
     --exclude=*/texmf-dist/doc/latex-dev \
     --exclude=*/texmf-dist/doc/support \
     --exclude=*/texmf-dist/source \
     /usr/local/texlive /usr/local/texlive
# What the TeX Live image set (a new image starts without it).
ENV PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin \
    LANG=C.UTF-8 LC_ALL=C.UTF-8 TEXLIVE_INSTALL_NO_CONTEXT_CACHE=1 NOPERLDOC=1
USER texlive
WORKDIR /app/services/compiler
# biber is a PAR-packed binary that unpacks itself before running; /tmp is
# mounted noexec in compose, so let it unpack into the work volume instead.
ENV DATA_DIR=/data WORK_DIR=/work NODE_ENV=production PAR_GLOBAL_TMPDIR=/work COLTEX_EDITION=${EDITION}
CMD ["node", "src/worker.ts"]
