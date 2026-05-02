# Multi-stage: Vite build → nginx static (verify remote: panda281/cherka-frontend)
FROM node:20-alpine AS builder

WORKDIR /app
COPY package.json package-lock.json ./
# Match npm major used when generating package-lock.json (avoids npm ci EUSAGE in Alpine vs dev machine)
RUN npm install -g npm@11
RUN npm ci

COPY . .

ARG VITE_API_BASE_URL=http://localhost:4000
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN npm run build

FROM nginx:1.27-alpine
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
