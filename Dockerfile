# Build stage
FROM node:lts-bookworm-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm i
COPY . .
ENV NODE_ENV=production
RUN npm run build

# Production dependencies
FROM node:20-bookworm-slim AS deps
WORKDIR /app
COPY package*.json ./
RUN npm i --only=production

# Final stage
FROM gcr.io/distroless/nodejs20-debian12
WORKDIR /app
COPY --from=deps /app/node_modules/ ./node_modules/
COPY --from=builder /app/dist/ ./dist/
COPY --from=builder /app/package.json ./

EXPOSE 5432/tcp
CMD ["./dist/index.js"]
