# PI Champion Season 2 — live scoring server (Node, zero npm dependencies)
#   docker compose up -d --build        # build + run (see docker-compose.yml)
# Codes, scores and the audit log live in the /app/data volume, never in the image.
FROM node:22-alpine

LABEL org.opencontainers.image.title="pi-champion-s2" \
      org.opencontainers.image.description="KAsset PI Champion Season 2 live judge scoring" \
      org.opencontainers.image.source="https://github.com/Paopasatiht/CG-PI-Champion-SS2-Voting-Site"

ENV NODE_ENV=production \
    PORT=8080 \
    HOST=0.0.0.0 \
    DATA_DIR=/app/data \
    JUDGES=7 \
    TZ=Asia/Bangkok

WORKDIR /app
COPY --chown=node:node index.html admin.html robots.txt package.json ./
COPY --chown=node:node assets/css ./assets/css
COPY --chown=node:node assets/js/app.js assets/js/event-config.js assets/js/ribbon3d.js ./assets/js/
COPY --chown=node:node assets/img ./assets/img
COPY --chown=node:node server ./server
RUN mkdir -p /app/data && chown node:node /app/data

USER node
VOLUME ["/app/data"]
EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/api/health >/dev/null || exit 1

# First start: create the 7 judge codes + admin code in the volume if none exist yet.
CMD ["sh", "-c", "[ -f \"$DATA_DIR/judges.json\" ] || node server/generate-codes.mjs; exec node server/server.mjs"]
