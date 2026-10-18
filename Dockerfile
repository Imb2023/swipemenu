# Build static assets once. Runtime needs no compiler or npm packages.
FROM node:24-alpine AS build
WORKDIR /app
COPY . .
RUN npm run build

FROM node:24-alpine AS runtime
ENV NODE_ENV=production PORT=3000
WORKDIR /app
LABEL org.opencontainers.image.title="IsmaSigns Specials" \
      org.opencontainers.image.description="A fast restaurant specials viewer and menu package builder" \
      org.opencontainers.image.source="https://github.com/Imb2023/swipemenu" \
      org.opencontainers.image.licenses="MIT"
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/api ./api
COPY --from=build --chown=node:node /app/lib ./lib
COPY --from=build --chown=node:node /app/server.mjs /app/package.json /app/vercel.json /app/menu.config.json /app/menu.snapshot.json /app/site.config.json /app/LICENSE ./
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 CMD node -e "fetch('http://127.0.0.1:3000/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.mjs"]
