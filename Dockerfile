# Build stage
FROM node:alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm i
COPY . .
ENV NODE_ENV=production
RUN npm run build

# Production dependencies stage
FROM node:alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm i --only=production

# Final stage
FROM gcr.io/distroless/nodejs:latest
WORKDIR /app
COPY --from=deps /app/node_modules/ ./node_modules/
COPY --from=builder /app/dist/ ./dist/
COPY --from=builder /app/package.json ./

EXPOSE 5432/tcp
CMD ["dist/index.js"]