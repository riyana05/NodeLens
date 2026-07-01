# ── Stage 1: build the C++ graph engine ─────────────────────────
FROM debian:bookworm-slim AS engine-builder

RUN apt-get update && apt-get install -y --no-install-recommends \
    g++ cmake make curl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /engine
COPY graph-engine/ ./

RUN mkdir -p build && cd build \
    && cmake .. -DCMAKE_BUILD_TYPE=Release -DCMAKE_CXX_FLAGS_RELEASE="-O3 -DNDEBUG" \
    && make -j"$(nproc)"

# ── Stage 2: Node backend runtime ───────────────────────────────
FROM node:20-bookworm-slim AS runtime

WORKDIR /app/backend

# Install backend dependencies (production only)
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev

# Copy backend source
COPY backend/ ./

# Bring in the compiled engine binary at the path CPP_ENGINE_PATH expects
COPY --from=engine-builder /engine/build/graph-engine /app/graph-engine/build/graph-engine
RUN chmod +x /app/graph-engine/build/graph-engine

ENV NODE_ENV=production
ENV CPP_ENGINE_PATH=/app/graph-engine/build/graph-engine

EXPOSE 5000
CMD ["node", "server.js"]
