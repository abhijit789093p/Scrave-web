FROM mcr.microsoft.com/playwright:v1.52.0-noble

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

EXPOSE 10000

ENV NODE_ENV=production
ENV PORT=10000

CMD ["npm", "start"]
