# syntax=docker/dockerfile:1

# Two editions (COLTEX_EDITION, see docker-compose.yml):
#   standard (default): the full TeX Live scheme without package manuals and
#     sources (about 9 GB); compiles the same as full.
#   full: also the manuals and sources (about 20 GB), which the AI assistant
#     can read (texlive_doc), and the extra Noto CJK weights.
# BuildKit only fetches the TeX Live image of the edition being built.
ARG EDITION=standard
# TeX Live is pinned (user's decision): it moves to each year's release, and within a year
# only for a serious security fix. An update that keeps it downloads only the layers that
# changed, ColTex's own last. `coltex update` compares these with the running compiler's
# labels to say when an update brings a new TeX Live. Change the year with the digests.
ARG TEXLIVE_YEAR=2026
ARG TEXLIVE_STANDARD=texlive/texlive:latest@sha256:540d736c78e2803cdd7b6a196bd21339c30185948db55e04e75a415959102ca8
ARG TEXLIVE_FULL=texlive/texlive:latest-full-doc-src@sha256:acee1c3f738c681f1c3014621bbd4fcbb9412cfc10cfb0d70e5bab805843bf8a

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

# ---- TeX Live (per edition) + fonts ----
FROM ${TEXLIVE_STANDARD} AS tex-standard
FROM ${TEXLIVE_FULL} AS tex-full
FROM tex-${EDITION} AS assembled
ARG EDITION
ARG TEXLIVE_YEAR
# The digests must be the year's release.
RUN test -d /usr/local/texlive/${TEXLIVE_YEAR}
# ghostscript for EPS and PostScript; poppler's pdftotext reads PDF manuals (full)
# and pdftoppm turns PDF figures into pictures for Word; pandoc writes .docx.
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      fonts-noto-cjk fonts-noto-core fonts-liberation2 ghostscript poppler-utils pandoc \
      $([ "$EDITION" = full ] && echo fonts-noto-cjk-extra) \
 && rm -rf /var/lib/apt/lists/* \
 && fc-cache -f
# tlcockpit is a graphical front end to tlmgr, which can't open in a container; its jar
# bundles old Java libraries (Jackson, Logback) with known vulnerabilities.
RUN rm -rf /usr/local/texlive/*/texmf-dist/scripts/tlcockpit /usr/local/texlive/*/bin/*/tlcockpit

# The base image already ships an unprivileged `texlive` user (uid 1000).
RUN mkdir -p /work /data && chown texlive:texlive /work /data
# biber is a PAR-packed program that unpacks itself (160 MB) before it runs. Unpacked here once,
# read-only, as a user without a name (PAR's "SYSTEM" folder, like the projects' users), and
# shared by every build through a link in its own folder (src/sandbox.ts).
RUN mkdir -m 777 /opt/biber-par \
 && setpriv --reuid=12345678 --regid=12345678 --clear-groups env PAR_GLOBAL_TMPDIR=/opt/biber-par biber --version \
 && chown -R root:root /opt/biber-par && chmod -R a-w,a+rX /opt/biber-par

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
ARG TEXLIVE_YEAR
ARG TEXLIVE_STANDARD
ARG TEXLIVE_FULL
LABEL org.coltex.texlive.year=${TEXLIVE_YEAR} org.coltex.texlive.standard=${TEXLIVE_STANDARD} org.coltex.texlive.full=${TEXLIVE_FULL}
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
# ColTex's worker last: an update that changes only it downloads only these layers.
COPY --from=deps /usr/local/bin/node /usr/local/bin/node
COPY --from=deps /app /app
# What the TeX Live image set (a new image starts without it).
ENV PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin \
    LANG=C.UTF-8 LC_ALL=C.UTF-8 TEXLIVE_INSTALL_NO_CONTEXT_CACHE=1 NOPERLDOC=1
USER texlive
WORKDIR /app/services/compiler
ENV DATA_DIR=/data WORK_DIR=/work NODE_ENV=production COLTEX_EDITION=${EDITION}
CMD ["node", "src/worker.ts"]
