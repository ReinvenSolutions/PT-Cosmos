# Native addons (LiveKit rtc-node + onnxruntime) need glibc + libstdc++.
# node:slim without these libs makes the voice job throw "error in entry function".
FROM node:22-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    libstdc++6 \
    libgcc-s1 \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production=false

COPY . .

RUN npm run build

EXPOSE 5000

CMD ["npm", "start"]
