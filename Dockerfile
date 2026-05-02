# Multi-stage: Vite build → nginx static
# Pin npm 10.x before `npm ci` so the image matches lockfile resolution (see .github/workflows/ci.yml).
# Do not switch to `npm install -g npm@11` without regenerating package-lock.json with that npm and committing it.
FROM node:20-alpine AS builder

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install -g npm@10.8.2 && npm ci

COPY . .

ARG VITE_API_BASE_URL=http://localhost:4000
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN npm run build

FROM nginx:1.27-alpine
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
