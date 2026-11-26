# Sandbox image for sigpro-prototype: Node (npm), git and the agent CLI.
#   docker build --build-context project=. -t cradleworks/sigpro-prototype-dev:1 .factory/image
FROM node:22.23.4-bookworm-slim
RUN apt-get update \
 && apt-get install -y --no-install-recommends git ca-certificates \
 && rm -rf /var/lib/apt/lists/*
RUN npm install -g @anthropic-ai/claude-code@2.1.319 \
 && npm cache clean --force
WORKDIR /workspace
