FROM node:20-slim

WORKDIR /app

# Install all system deps Chromium needs (including libXfixes)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
    libxkbcommon0 libxcomposite1 libxdamage1 libxrandr2 libgbm1 \
    libpango-1.0-0 libcairo2 libasound2 libxshmfence1 \
    libxfixes3 libx11-xcb1 libxcb1 libxext6 libx11-6 \
    libxcb-dri3-0 libdrm-amdgpu1 libglib2.0-0 libdbus-1-3 \
    fonts-liberation wget ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY package.json ./

RUN npm install --omit=dev

# Install Chromium browser
RUN npx playwright install chromium

COPY . .

EXPOSE 10000

ENV NODE_ENV=production
ENV PORT=10000

CMD ["npm", "start"]
