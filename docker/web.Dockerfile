FROM node:24-alpine AS build
WORKDIR /app
ARG API_ORIGIN=http://api:3000
ENV API_ORIGIN=${API_ORIGIN}
COPY package*.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/docs/package.json apps/docs/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm ci
COPY apps/web apps/web
RUN npm run web:build

FROM node:24-alpine
ENV NODE_ENV=production
ARG API_ORIGIN=http://api:3000
ENV API_ORIGIN=${API_ORIGIN}
WORKDIR /app
COPY --from=build /app/package*.json ./
COPY --from=build /app/apps/api/package.json apps/api/package.json
COPY --from=build /app/apps/docs/package.json apps/docs/package.json
COPY --from=build /app/apps/web/package.json apps/web/package.json
RUN npm ci --omit=dev
COPY --from=build /app/apps/web/.next apps/web/.next
COPY --from=build /app/apps/web/next.config.ts apps/web/next.config.ts
# Only runtime caches are writable; application code remains root-owned.
RUN mkdir -p /app/apps/web/.next/server/route-cache /app/apps/web/.next/cache \
    && chown -R node:node /app/apps/web/.next/server/route-cache /app/apps/web/.next/cache
WORKDIR /app/apps/web
USER node
EXPOSE 3001
CMD ["npm", "run", "start"]
