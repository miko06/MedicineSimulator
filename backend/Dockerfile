FROM oven/bun:1-alpine AS builder

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY prisma/ ./prisma/
COPY prisma.config.ts ./
COPY .env.example .env
RUN bunx prisma generate

FROM oven/bun:1-alpine AS runner

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src/generated ./src/generated
COPY src/ ./src/
COPY prisma/ ./prisma/
COPY prisma.config.ts ./
COPY package.json bun.lock ./

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

CMD ["bun", "run", "src/index.ts"]
