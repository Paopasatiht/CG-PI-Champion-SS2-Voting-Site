# PI Champion Season 2 — live scoring server (zero npm dependencies)
FROM node:22-alpine
ENV NODE_ENV=production PORT=8080 HOST=0.0.0.0 DATA_DIR=/app/data
WORKDIR /app
COPY --chown=node:node index.html admin.html robots.txt package.json ./
COPY --chown=node:node assets/css ./assets/css
COPY --chown=node:node assets/js ./assets/js
COPY --chown=node:node assets/img ./assets/img
COPY --chown=node:node server ./server
RUN mkdir -p /app/data && chown node:node /app/data
USER node
VOLUME ["/app/data"]
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:8080/api/health || exit 1
# First run: generate codes into the volume if none exist yet, then start.
CMD ["sh", "-c", "[ -f /app/data/judges.json ] || node server/generate-codes.mjs; exec node server/server.mjs"]
