FROM node:22-bookworm

WORKDIR /app
COPY package*.json ./
RUN npm ci
RUN npx playwright install --with-deps chromium
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

EXPOSE 8080
CMD ["node", "dist/index.js"]
