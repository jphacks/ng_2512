# syntax=docker/dockerfile:1

FROM node:22-bullseye-slim AS base

ENV NODE_ENV=production \
    CI=1 \
    npm_config_loglevel=warn

WORKDIR /app


FROM base AS deps

COPY package*.json ./
RUN npm install --include=dev


FROM deps AS test

COPY . .
RUN npm test -- --runInBand


FROM deps AS build

COPY . .
RUN npx expo export --platform web


FROM nginx:1.27-alpine AS prod

COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
